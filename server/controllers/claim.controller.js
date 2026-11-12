import QRCode from "qrcode";
import Claim, { ACTIVE_CLAIM_STATUSES, CLAIM_STATUSES } from "../models/Claim.js";
import FoundItem from "../models/FoundItem.js";
import LostItem from "../models/LostItem.js";
import ItemMatch from "../models/ItemMatch.js";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import { isStaffOrAdmin } from "../middleware/auth.js";
import { generateToken, hashToken } from "../utils/crypto.js";
import { saveImages } from "../services/upload.service.js";
import { logActivity } from "../services/activityLog.service.js";
import { notifyUser, notifyRoles } from "../services/notification.service.js";
import { getSettings } from "../services/settings.service.js";
import { getPagination, getSort, paginated, searchFilter, isValidObjectId, dateRangeFilter } from "../utils/query.js";
import { POPULATE_PUBLIC } from "./itemHelpers.js";

const QR_PREFIX = "SLF-CLAIM:";
const MAX_PROOF_IMAGES = 5;

// Which status changes staff are allowed to make
const TRANSITIONS = {
  pending: ["under_review", "info_required", "approved", "rejected"],
  under_review: ["info_required", "approved", "rejected"],
  info_required: ["under_review", "approved", "rejected"],
  approved: ["rejected"], // e.g. approval revoked after suspected fraud
};

const STAFF_POPULATE = [
  { path: "foundItem", select: "+identifyingDetails +storageLocation", populate: POPULATE_PUBLIC },
  { path: "lostItem", select: "+identifyingDetails", populate: POPULATE_PUBLIC },
  { path: "claimant", select: "firstName lastName email studentId department contactNumber" },
  { path: "reviewedBy", select: "firstName lastName" },
  { path: "releasedBy", select: "firstName lastName" },
  { path: "history.by", select: "firstName lastName role" },
];

const STUDENT_POPULATE = [
  { path: "foundItem", populate: POPULATE_PUBLIC },
  { path: "lostItem", select: "itemName dateLost status" },
  { path: "history.by", select: "firstName lastName role" },
];

const isClaimant = (claim, user) => String(claim.claimant?._id || claim.claimant) === String(user._id);

// Removes staff-only information before sending a claim to a student
const toStudentJson = (claim) => {
  const json = claim.toJSON();
  delete json.verificationNotes;
  delete json.qrTokenHash;
  return json;
};

const claimLink = (role, id) => `/${role === "student" ? "student" : "staff"}/claims/${id}`;

// POST /api/claims   (student)
export const createClaim = async (req, res) => {
  const { foundItemId, lostItemId, ownershipExplanation, identifyingDetails } = req.body;

  const item = await FoundItem.findById(foundItemId);
  if (!item || item.status !== "available") {
    throw new AppError("This item is not available for claiming right now.", 400);
  }
  if (String(item.reportedBy) === String(req.user._id)) {
    throw new AppError("You reported finding this item, so you can't claim it.", 400);
  }
  if (await Claim.exists({ foundItem: item._id, claimant: req.user._id, status: { $in: ACTIVE_CLAIM_STATUSES } })) {
    throw new AppError("You already have an active claim for this item.", 409);
  }

  let lostItem = null;
  if (lostItemId) {
    if (!isValidObjectId(String(lostItemId))) throw new AppError("Invalid lost item.", 422);
    lostItem = await LostItem.findOne({ _id: lostItemId, reportedBy: req.user._id });
    if (!lostItem) throw new AppError("You can only link your own lost item report.", 422);
  }

  const proofImages = await saveImages(req.files, "proofs");
  const claim = await Claim.create({
    foundItem: item._id,
    claimant: req.user._id,
    lostItem: lostItem?._id,
    ownershipExplanation,
    identifyingDetails,
    proofImages,
    history: [{ status: "pending", note: "Claim submitted", by: req.user._id }],
  });

  if (lostItem) {
    await ItemMatch.updateOne({ lostItem: lostItem._id, foundItem: item._id }, { $set: { status: "claimed" } });
  }

  await logActivity(req, { action: "CLAIM_SUBMITTED", entityType: "claim", entityId: claim._id, description: `Claim for "${item.itemName}"` });
  await notifyUser(req.user._id, {
    type: "claim",
    title: "Claim submitted",
    message: `Your claim for "${item.itemName}" was submitted and is waiting for staff review.`,
    link: claimLink("student", claim._id),
    email: true,
  });
  await notifyRoles(["staff", "admin"], {
    type: "claim",
    title: "New claim to review",
    message: `${req.user.firstName} ${req.user.lastName} submitted a claim for "${item.itemName}".`,
    link: claimLink("staff", claim._id),
  });

  res.status(201).json({ success: true, message: "Claim submitted.", claim });
};

// GET /api/claims/mine   (student)
export const getMyClaims = async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { claimant: req.user._id };
  if (CLAIM_STATUSES.includes(req.query.status)) filter.status = req.query.status;

  const [claims, total] = await Promise.all([
    Claim.find(filter)
      .populate({ path: "foundItem", select: "itemName images status", populate: POPULATE_PUBLIC })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Claim.countDocuments(filter),
  ]);
  res.json({ success: true, ...paginated(claims.map(toStudentJson), total, page, limit) });
};

// GET /api/claims   (staff/admin)  ?status=&q=&from=&to=
export const listClaims = async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, 15);
  const filter = { ...dateRangeFilter("createdAt", req.query.from, req.query.to) };

  if (req.query.status === "active") filter.status = { $in: ["pending", "under_review", "info_required"] };
  else if (CLAIM_STATUSES.includes(req.query.status)) filter.status = req.query.status;

  if (req.query.q) {
    const [items, users] = await Promise.all([
      FoundItem.find(searchFilter(req.query.q, ["itemName"])).select("_id").limit(200),
      User.find(searchFilter(req.query.q, ["firstName", "lastName", "email", "studentId"])).select("_id").limit(200),
    ]);
    filter.$or = [{ foundItem: { $in: items.map((i) => i._id) } }, { claimant: { $in: users.map((u) => u._id) } }];
  }

  const [claims, total] = await Promise.all([
    Claim.find(filter)
      .populate([
        { path: "foundItem", select: "itemName images status", populate: POPULATE_PUBLIC },
        { path: "claimant", select: "firstName lastName email studentId" },
        { path: "reviewedBy", select: "firstName lastName" },
        { path: "releasedBy", select: "firstName lastName" },
      ])
      .sort(getSort(req.query.sort, ["createdAt", "updatedAt", "releasedAt"]))
      .skip(skip)
      .limit(limit),
    Claim.countDocuments(filter),
  ]);
  res.json({ success: true, ...paginated(claims, total, page, limit) });
};

// GET /api/claims/:id
export const getClaim = async (req, res) => {
  const staff = isStaffOrAdmin(req.user);
  const claim = await Claim.findById(req.params.id).populate(staff ? STAFF_POPULATE : STUDENT_POPULATE);
  if (!claim) throw new AppError("Claim not found.", 404);
  if (!staff && !isClaimant(claim, req.user)) throw new AppError("Claim not found.", 404);

  let otherClaims = [];
  if (staff) {
    otherClaims = await Claim.find({ foundItem: claim.foundItem._id, _id: { $ne: claim._id } })
      .select("status createdAt claimant")
      .populate("claimant", "firstName lastName studentId");
  }

  const { officeLocation, officeHours } = await getSettings();
  res.json({
    success: true,
    claim: staff ? claim.toJSON() : toStudentJson(claim),
    otherClaims,
    office: { officeLocation, officeHours },
  });
};

// PATCH /api/claims/:id/status   (staff)  { status, note, message, reason }
export const updateClaimStatus = async (req, res) => {
  const { status, note, message, reason } = req.body;
  const claim = await Claim.findById(req.params.id).populate("foundItem");
  if (!claim) throw new AppError("Claim not found.", 404);

  const allowed = TRANSITIONS[claim.status] || [];
  if (!allowed.includes(status)) {
    throw new AppError(`A ${claim.status.replace("_", " ")} claim can't be changed to ${status.replace("_", " ")}.`, 400);
  }
  if (status === "info_required" && !message) throw new AppError("Please write what information the student must provide.", 422);
  if (status === "rejected" && !reason) throw new AppError("Please give a reason for rejecting the claim.", 422);

  const item = claim.foundItem;
  const previous = claim.status;

  if (status === "approved") {
    // Atomic: only one claim can win the item, even if two staff click "approve" at the same time
    const locked = await FoundItem.updateOne({ _id: item._id, status: "available" }, { $set: { status: "claimed" } });
    if (locked.modifiedCount === 0) {
      throw new AppError("This item is no longer available. It may already have an approved claim.", 409);
    }
  }
  if (previous === "approved" && status === "rejected") {
    await FoundItem.updateOne({ _id: item._id, status: "claimed" }, { $set: { status: "available" } });
    claim.qrTokenHash = undefined;
    claim.qrTokenExpiresAt = undefined;
  }

  const historyNotes = {
    under_review: "Claim is now under review",
    info_required: message,
    approved: "Claim approved. Ownership verified.",
    rejected: reason,
  };

  claim.status = status;
  claim.reviewedBy = req.user._id;
  claim.reviewedAt = new Date();
  if (note) claim.verificationNotes = note;
  if (status === "info_required") claim.infoRequestMessage = message;
  if (status === "rejected") claim.rejectionReason = reason;
  claim.history.push({ status, note: historyNotes[status], by: req.user._id });
  await claim.save();

  await logActivity(req, {
    action: `CLAIM_${status.toUpperCase()}`,
    entityType: "claim",
    entityId: claim._id,
    description: `"${item.itemName}": ${previous} → ${status}`,
  });

  const { officeLocation, officeHours } = await getSettings();
  const messages = {
    under_review: { title: "Claim under review", text: `Staff are now reviewing your claim for "${item.itemName}".` },
    info_required: { title: "More information needed", text: `Staff need more information about your claim for "${item.itemName}": ${message}` },
    approved: {
      title: "Claim approved!",
      text: `Your claim for "${item.itemName}" was approved. Open your claim to get your QR code, then bring it and a valid ID to the ${officeLocation} (${officeHours}).`,
    },
    rejected: { title: "Claim rejected", text: `Your claim for "${item.itemName}" was rejected. Reason: ${reason}` },
  };
  await notifyUser(claim.claimant, {
    type: "claim",
    title: messages[status].title,
    message: messages[status].text,
    link: claimLink("student", claim._id),
    email: status !== "under_review",
  });

  // When one claim is approved, other open claims for the same item are rejected automatically
  if (status === "approved") {
    const others = await Claim.find({
      foundItem: item._id,
      _id: { $ne: claim._id },
      status: { $in: ["pending", "under_review", "info_required"] },
    });
    for (const other of others) {
      other.status = "rejected";
      other.rejectionReason = "Another claim for this item was verified and approved.";
      other.history.push({ status: "rejected", note: other.rejectionReason, by: req.user._id });
      await other.save();
      await notifyUser(other.claimant, {
        type: "claim",
        title: "Claim rejected",
        message: `Your claim for "${item.itemName}" was rejected because another claim was verified.`,
        link: claimLink("student", other._id),
        email: true,
      });
    }
  }

  res.json({ success: true, message: "Claim updated.", claim });
};

// PATCH /api/claims/:id/respond   (student)  { response } + optional images
export const respondToInfoRequest = async (req, res) => {
  const claim = await Claim.findById(req.params.id).populate("foundItem", "itemName");
  if (!claim || !isClaimant(claim, req.user)) throw new AppError("Claim not found.", 404);
  if (claim.status !== "info_required") throw new AppError("Staff haven't asked for more information.", 400);
  if (claim.proofImages.length + (req.files?.length || 0) > MAX_PROOF_IMAGES) {
    throw new AppError(`A claim can have up to ${MAX_PROOF_IMAGES} proof images.`, 400);
  }

  const newImages = await saveImages(req.files, "proofs");
  claim.studentResponse = req.body.response;
  claim.proofImages.push(...newImages);
  claim.status = "under_review";
  claim.history.push({ status: "under_review", note: "Student provided additional information", by: req.user._id });
  await claim.save();

  await logActivity(req, { action: "CLAIM_INFO_PROVIDED", entityType: "claim", entityId: claim._id });
  const payload = {
    type: "claim",
    title: "Student responded to your request",
    message: `The claimant for "${claim.foundItem.itemName}" provided more information.`,
    link: claimLink("staff", claim._id),
  };
  if (claim.reviewedBy) await notifyUser(claim.reviewedBy, payload);
  else await notifyRoles(["staff", "admin"], payload);

  res.json({ success: true, message: "Information sent to staff.", claim: toStudentJson(claim) });
};

// PATCH /api/claims/:id/cancel   (student)
export const cancelClaim = async (req, res) => {
  const claim = await Claim.findById(req.params.id);
  if (!claim || !isClaimant(claim, req.user)) throw new AppError("Claim not found.", 404);
  if (!ACTIVE_CLAIM_STATUSES.includes(claim.status)) throw new AppError("This claim can no longer be cancelled.", 400);

  if (claim.status === "approved") {
    await FoundItem.updateOne({ _id: claim.foundItem, status: "claimed" }, { $set: { status: "available" } });
    claim.qrTokenHash = undefined;
    claim.qrTokenExpiresAt = undefined;
  }
  claim.status = "cancelled";
  claim.history.push({ status: "cancelled", note: "Cancelled by student", by: req.user._id });
  await claim.save();

  await logActivity(req, { action: "CLAIM_CANCELLED", entityType: "claim", entityId: claim._id });
  res.json({ success: true, message: "Claim cancelled." });
};

// GET /api/claims/:id/qr   (student, approved claims only)
// Each time this is opened a NEW token is created and the old QR stops working.
export const getClaimQr = async (req, res) => {
  const claim = await Claim.findById(req.params.id).populate("foundItem", "itemName");
  if (!claim || !isClaimant(claim, req.user)) throw new AppError("Claim not found.", 404);
  if (claim.status !== "approved") throw new AppError("A QR code is only available for approved claims.", 400);

  const { qrExpiryHours } = await getSettings();
  const token = generateToken(32);
  claim.qrTokenHash = hashToken(token);
  claim.qrTokenExpiresAt = new Date(Date.now() + qrExpiryHours * 60 * 60 * 1000);
  await claim.save();

  const qrCode = await QRCode.toDataURL(`${QR_PREFIX}${token}`, { width: 320, margin: 2, errorCorrectionLevel: "M" });
  await logActivity(req, { action: "CLAIM_QR_GENERATED", entityType: "claim", entityId: claim._id });

  res.json({ success: true, qrCode, code: token, expiresAt: claim.qrTokenExpiresAt });
};

const readToken = (raw) => {
  const token = String(raw || "").trim().replace(QR_PREFIX, "");
  if (!/^[A-Za-z0-9_-]{30,100}$/.test(token)) throw new AppError("Invalid QR code.", 400, "QR_INVALID");
  return token;
};

// Explains exactly why a QR code can't be used
const findClaimForToken = async (req, token) => {
  const claim = await Claim.findOne({ qrTokenHash: hashToken(token) }).populate(STAFF_POPULATE);
  const fail = async (message, status, code) => {
    await logActivity(req, {
      action: "QR_VERIFY_FAILED",
      entityType: "claim",
      entityId: claim?._id,
      status: "failure",
      description: message,
    });
    throw new AppError(message, status, code);
  };

  if (!claim) await fail("Invalid QR code. It may be fake or replaced by a newer one.", 404, "QR_INVALID");
  if (claim.status === "completed" || claim.qrUsedAt) await fail("This QR code was already used. The item has been released.", 409, "QR_USED");
  if (claim.status !== "approved") await fail(`This claim is ${claim.status.replace("_", " ")}, not approved.`, 400, "QR_NOT_APPROVED");
  if (claim.qrTokenExpiresAt < new Date()) {
    await fail("This QR code has expired. Ask the student to open their claim page to get a new one.", 410, "QR_EXPIRED");
  }
  return claim;
};

// POST /api/claims/qr/verify   (staff)  { token }  -> preview only, nothing changes yet
export const verifyQr = async (req, res) => {
  const claim = await findClaimForToken(req, readToken(req.body.token));
  await logActivity(req, { action: "QR_VERIFIED", entityType: "claim", entityId: claim._id });
  res.json({ success: true, message: "QR code is valid. Check the student's ID before releasing.", claim });
};

// POST /api/claims/qr/release   (staff)  { token, releaseNotes }
export const releaseWithQr = async (req, res) => {
  const token = readToken(req.body.token);
  const now = new Date();

  // Atomic update: works only ONCE. A second scan finds nothing to update.
  const tokenHash = hashToken(token);
  const result = await Claim.updateOne(
    { qrTokenHash: tokenHash, status: "approved", qrUsedAt: null, qrTokenExpiresAt: { $gt: now } },
    {
      $set: {
        status: "completed",
        qrUsedAt: now,
        releasedBy: req.user._id,
        releasedAt: now,
        releaseNotes: req.body.releaseNotes || undefined,
      },
      $push: { history: { status: "completed", note: "Item released to owner after QR verification", by: req.user._id, at: now } },
    }
  );

  if (result.modifiedCount === 0) {
    await findClaimForToken(req, token); // throws the specific reason
    throw new AppError("This QR code can't be used.", 400);
  }

  const claim = await Claim.findOne({ qrTokenHash: tokenHash });
  await FoundItem.updateOne({ _id: claim.foundItem }, { $set: { status: "released", releasedClaim: claim._id } });
  const item = await FoundItem.findById(claim.foundItem).select("itemName");

  // Mark the student's matching lost report as resolved
  const lostIds = new Set();
  if (claim.lostItem) lostIds.add(String(claim.lostItem));
  const matches = await ItemMatch.find({ foundItem: claim.foundItem }).populate("lostItem", "reportedBy");
  for (const m of matches) {
    if (m.lostItem && String(m.lostItem.reportedBy) === String(claim.claimant)) lostIds.add(String(m.lostItem._id));
  }
  if (lostIds.size) {
    await LostItem.updateMany({ _id: { $in: [...lostIds] }, status: "open" }, { $set: { status: "resolved", resolvedByClaim: claim._id } });
  }

  await logActivity(req, {
    action: "ITEM_RELEASED",
    entityType: "claim",
    entityId: claim._id,
    description: `"${item?.itemName}" released to claimant`,
  });
  await notifyUser(claim.claimant, {
    type: "release",
    title: "Item released",
    message: `"${item?.itemName}" has been released to you. Thank you for using Lost and Found!`,
    link: claimLink("student", claim._id),
    email: true,
  });

  res.json({ success: true, message: "Item released successfully. The QR code can no longer be used." });
};

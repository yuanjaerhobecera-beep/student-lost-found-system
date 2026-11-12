import FoundItem, { FOUND_STATUSES } from "../models/FoundItem.js";
import Claim, { ACTIVE_CLAIM_STATUSES } from "../models/Claim.js";
import ItemMatch from "../models/ItemMatch.js";
import AppError from "../utils/AppError.js";
import { isStaffOrAdmin } from "../middleware/auth.js";
import { saveImages, deleteImages } from "../services/upload.service.js";
import { logActivity } from "../services/activityLog.service.js";
import { notifyUser, notifyRoles } from "../services/notification.service.js";
import { findMatchesForFoundItem } from "../services/matching.service.js";
import { getSettings } from "../services/settings.service.js";
import { getPagination, getSort, searchFilter, dateRangeFilter, paginated, isValidObjectId } from "../utils/query.js";
import { pickItemFields, checkCategoryAndLocation, parseRemoveImages, POPULATE_PUBLIC, POPULATE_STAFF } from "./itemHelpers.js";

const MAX_IMAGES = 3;
const SORT_FIELDS = ["createdAt", "dateFound", "itemName"];
const STUDENT_VISIBLE = ["available", "claimed"];

const isReporter = (item, user) => String(item.reportedBy?._id || item.reportedBy) === String(user._id);

const loadItem = async (id, user) => {
  const item = await FoundItem.findById(id)
    .select("+identifyingDetails +storageLocation")
    .populate(isStaffOrAdmin(user) ? [...POPULATE_STAFF, { path: "receivedBy", select: "firstName lastName" }] : POPULATE_PUBLIC);
  if (!item) throw new AppError("Found item not found.", 404);
  return item;
};

// Staff see everything. The student who reported it sees identifying details.
// Everyone else sees only public information.
const toSafeJson = (item, user) => {
  const json = item.toJSON();
  if (!isStaffOrAdmin(user)) {
    delete json.storageLocation;
    if (!isReporter(item, user)) delete json.identifyingDetails;
  }
  return json;
};

const buildFilter = (query) => {
  const filter = { ...searchFilter(query.q, ["itemName", "description"]), ...dateRangeFilter("dateFound", query.from, query.to) };
  if (isValidObjectId(query.category)) filter.category = query.category;
  if (isValidObjectId(query.location)) filter.location = query.location;
  return filter;
};

// POST /api/found-items
export const createFoundItem = async (req, res) => {
  const fields = pickItemFields(req.body, "dateFound");
  await checkCategoryAndLocation(fields);
  if (fields.dateFound > new Date()) throw new AppError("Date found cannot be in the future.", 422);

  const staff = isStaffOrAdmin(req.user);
  const images = await saveImages(req.files, "items");
  const item = await FoundItem.create({
    ...fields,
    images,
    reportedBy: req.user._id,
    // Items reported by staff are already in the office. Student reports wait for turnover.
    status: staff ? "available" : "pending",
    ...(staff && {
      storageLocation: req.body.storageLocation ? String(req.body.storageLocation).trim() : undefined,
      receivedBy: req.user._id,
      receivedAt: new Date(),
    }),
  });

  await logActivity(req, { action: "FOUND_ITEM_REPORTED", entityType: "found_item", entityId: item._id, description: item.itemName });

  if (!staff) {
    const { officeLocation } = await getSettings();
    await notifyUser(req.user._id, {
      type: "found_item",
      title: "Thank you for reporting a found item",
      message: `Please bring "${item.itemName}" to the ${officeLocation} so staff can keep it safe.`,
      link: `/student/items/found/${item._id}`,
    });
    await notifyRoles(["staff", "admin"], {
      type: "found_item",
      title: "New found item reported",
      message: `A student reported finding "${item.itemName}". Waiting for turnover.`,
      link: `/staff/items/found/${item._id}`,
    });
  }

  findMatchesForFoundItem(item._id);
  res.status(201).json({ success: true, message: "Found item reported.", item });
};

// GET /api/found-items
export const listFoundItems = async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = buildFilter(req.query);
  const staff = isStaffOrAdmin(req.user);
  const status = req.query.status;

  if (staff) {
    if (FOUND_STATUSES.includes(status)) filter.status = status;
  } else {
    filter.status = STUDENT_VISIBLE.includes(status) ? status : "available";
  }

  const [items, total] = await Promise.all([
    FoundItem.find(filter)
      .select(staff ? "+storageLocation" : "")
      .populate(staff ? POPULATE_STAFF : POPULATE_PUBLIC)
      .sort(getSort(req.query.sort, SORT_FIELDS))
      .skip(skip)
      .limit(limit),
    FoundItem.countDocuments(filter),
  ]);

  res.json({ success: true, ...paginated(items, total, page, limit) });
};

// GET /api/found-items/mine
export const getMyFoundItems = async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { reportedBy: req.user._id, ...buildFilter(req.query) };
  if (FOUND_STATUSES.includes(req.query.status)) filter.status = req.query.status;

  const [items, total] = await Promise.all([
    FoundItem.find(filter).select("+identifyingDetails").populate(POPULATE_PUBLIC).sort({ createdAt: -1 }).skip(skip).limit(limit),
    FoundItem.countDocuments(filter),
  ]);
  res.json({ success: true, ...paginated(items, total, page, limit) });
};

// GET /api/found-items/:id
export const getFoundItem = async (req, res) => {
  const item = await loadItem(req.params.id, req.user);
  const staff = isStaffOrAdmin(req.user);
  if (!staff && !isReporter(item, req.user) && !STUDENT_VISIBLE.includes(item.status)) {
    throw new AppError("Found item not found.", 404);
  }

  let myActiveClaim = null;
  if (!staff) {
    myActiveClaim = await Claim.findOne({
      foundItem: item._id,
      claimant: req.user._id,
      status: { $in: ACTIVE_CLAIM_STATUSES },
    }).select("_id status");
  }

  res.json({ success: true, item: toSafeJson(item, req.user), isReporter: isReporter(item, req.user), myActiveClaim });
};

// PUT /api/found-items/:id
export const updateFoundItem = async (req, res) => {
  const item = await loadItem(req.params.id, req.user);
  const staff = isStaffOrAdmin(req.user);
  if (!staff && !(isReporter(item, req.user) && item.status === "pending")) {
    throw new AppError("You can only edit your own report before staff receive the item.", 403);
  }

  const fields = pickItemFields(req.body, "dateFound");
  await checkCategoryAndLocation(fields);
  if (staff && req.body.storageLocation !== undefined) fields.storageLocation = String(req.body.storageLocation).trim();

  const toRemove = parseRemoveImages(req.body.removeImages);
  const keptImages = item.images.filter((img) => !toRemove.includes(img.publicId));
  if (keptImages.length + (req.files?.length || 0) > MAX_IMAGES) {
    throw new AppError(`A report can have up to ${MAX_IMAGES} images.`, 400);
  }
  const removed = item.images.filter((img) => toRemove.includes(img.publicId));
  const newImages = await saveImages(req.files, "items");

  Object.assign(item, fields);
  item.images = [...keptImages, ...newImages];
  await item.save();
  await deleteImages(removed);

  await logActivity(req, { action: "FOUND_ITEM_UPDATED", entityType: "found_item", entityId: item._id, description: item.itemName });
  findMatchesForFoundItem(item._id);
  res.json({ success: true, message: "Found item updated.", item: toSafeJson(item, req.user) });
};

// PATCH /api/found-items/:id/status   (staff)  { status, storageLocation, note }
export const updateFoundItemStatus = async (req, res) => {
  const item = await loadItem(req.params.id, req.user);
  const { status, storageLocation } = req.body;
  const old = item.status;

  if (status === "released") {
    throw new AppError("Items are released only through QR verification of an approved claim.", 400);
  }
  if (status === "claimed" && old !== "claimed") {
    throw new AppError("An item becomes 'claimed' only when a claim is approved.", 400);
  }
  if (old === "released") throw new AppError("Released items can no longer change status.", 400);

  if (["available", "disposed", "pending"].includes(status) && old === "claimed") {
    const approved = await Claim.exists({ foundItem: item._id, status: "approved" });
    if (approved) throw new AppError("This item has an approved claim. Reject or complete it first.", 400);
  }

  item.status = status;
  if (storageLocation !== undefined) item.storageLocation = String(storageLocation).trim();
  if (status === "available" && old === "pending") {
    item.receivedBy = req.user._id;
    item.receivedAt = new Date();
  }
  await item.save();

  await logActivity(req, {
    action: "FOUND_ITEM_STATUS_CHANGED",
    entityType: "found_item",
    entityId: item._id,
    description: `${item.itemName}: ${old} → ${status}`,
  });

  if (old === "pending" && status === "available" && String(item.reportedBy._id) !== String(req.user._id)) {
    await notifyUser(item.reportedBy._id, {
      type: "found_item",
      title: "Found item received",
      message: `Staff received the "${item.itemName}" you reported. Thank you for your honesty!`,
      link: `/student/items/found/${item._id}`,
    });
  }
  if (status === "available") findMatchesForFoundItem(item._id);

  res.json({ success: true, message: "Status updated.", item: toSafeJson(item, req.user) });
};

// DELETE /api/found-items/:id
export const deleteFoundItem = async (req, res) => {
  const item = await loadItem(req.params.id, req.user);
  const isAdmin = req.user.role === "admin";
  if (!isAdmin && !(isReporter(item, req.user) && item.status === "pending")) {
    throw new AppError("You can't delete this item.", 403);
  }
  if (await Claim.exists({ foundItem: item._id, status: { $in: [...ACTIVE_CLAIM_STATUSES, "completed"] } })) {
    throw new AppError("This item has claims. Change its status instead of deleting it.", 400);
  }

  await ItemMatch.deleteMany({ foundItem: item._id });
  await item.deleteOne();
  await deleteImages(item.images);

  await logActivity(req, { action: "FOUND_ITEM_DELETED", entityType: "found_item", entityId: item._id, description: item.itemName });
  res.json({ success: true, message: "Found item deleted." });
};

import LostItem, { LOST_STATUSES } from "../models/LostItem.js";
import ItemMatch from "../models/ItemMatch.js";
import AppError from "../utils/AppError.js";
import { isStaffOrAdmin } from "../middleware/auth.js";
import { saveImages, deleteImages } from "../services/upload.service.js";
import { logActivity } from "../services/activityLog.service.js";
import { notifyUser } from "../services/notification.service.js";
import { findMatchesForLostItem } from "../services/matching.service.js";
import { getPagination, getSort, searchFilter, dateRangeFilter, paginated, isValidObjectId } from "../utils/query.js";
import { pickItemFields, checkCategoryAndLocation, parseRemoveImages, POPULATE_PUBLIC, POPULATE_STAFF } from "./itemHelpers.js";

const MAX_IMAGES = 3;
const SORT_FIELDS = ["createdAt", "dateLost", "itemName"];

const isOwner = (item, user) => String(item.reportedBy?._id || item.reportedBy) === String(user._id);

const loadItem = async (id, user) => {
  const item = await LostItem.findById(id)
    .select("+identifyingDetails")
    .populate(isStaffOrAdmin(user) ? POPULATE_STAFF : POPULATE_PUBLIC);
  if (!item) throw new AppError("Lost item report not found.", 404);
  return item;
};

// Hides private details from anyone who isn't the owner or staff
const toSafeJson = (item, user) => {
  const json = item.toJSON();
  if (!isStaffOrAdmin(user) && !isOwner(item, user)) delete json.identifyingDetails;
  return json;
};

const buildFilter = (query) => {
  const filter = { ...searchFilter(query.q, ["itemName", "description"]), ...dateRangeFilter("dateLost", query.from, query.to) };
  if (isValidObjectId(query.category)) filter.category = query.category;
  if (isValidObjectId(query.location)) filter.location = query.location;
  return filter;
};

// POST /api/lost-items
export const createLostItem = async (req, res) => {
  const fields = pickItemFields(req.body, "dateLost");
  await checkCategoryAndLocation(fields);
  if (fields.dateLost > new Date()) throw new AppError("Date lost cannot be in the future.", 422);

  const images = await saveImages(req.files, "items");
  const item = await LostItem.create({ ...fields, images, reportedBy: req.user._id });

  await logActivity(req, { action: "LOST_ITEM_REPORTED", entityType: "lost_item", entityId: item._id, description: item.itemName });
  await notifyUser(req.user._id, {
    type: "lost_item",
    title: "Lost item report submitted",
    message: `Your report for "${item.itemName}" was submitted. We'll notify you if a possible match is found.`,
    link: `/student/items/lost/${item._id}`,
  });

  findMatchesForLostItem(item._id); // runs in the background
  res.status(201).json({ success: true, message: "Lost item reported.", item });
};

// GET /api/lost-items
export const listLostItems = async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = buildFilter(req.query);
  const staff = isStaffOrAdmin(req.user);

  if (LOST_STATUSES.includes(req.query.status)) filter.status = req.query.status;
  else if (!staff) filter.status = "open";
  if (!staff && filter.status === "closed") filter.status = "open";

  const [items, total] = await Promise.all([
    LostItem.find(filter)
      .populate(staff ? POPULATE_STAFF : POPULATE_PUBLIC)
      .sort(getSort(req.query.sort, SORT_FIELDS))
      .skip(skip)
      .limit(limit),
    LostItem.countDocuments(filter),
  ]);

  res.json({ success: true, ...paginated(items, total, page, limit) });
};

// GET /api/lost-items/mine
export const getMyLostItems = async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { reportedBy: req.user._id, ...buildFilter(req.query) };
  if (LOST_STATUSES.includes(req.query.status)) filter.status = req.query.status;

  const [items, total] = await Promise.all([
    LostItem.find(filter).select("+identifyingDetails").populate(POPULATE_PUBLIC).sort({ createdAt: -1 }).skip(skip).limit(limit),
    LostItem.countDocuments(filter),
  ]);
  res.json({ success: true, ...paginated(items, total, page, limit) });
};

// GET /api/lost-items/:id
export const getLostItem = async (req, res) => {
  const item = await loadItem(req.params.id, req.user);
  if (!isStaffOrAdmin(req.user) && !isOwner(item, req.user) && item.status === "closed") {
    throw new AppError("Lost item report not found.", 404);
  }
  res.json({ success: true, item: toSafeJson(item, req.user), isOwner: isOwner(item, req.user) });
};

// PUT /api/lost-items/:id
export const updateLostItem = async (req, res) => {
  const item = await loadItem(req.params.id, req.user);
  const staff = isStaffOrAdmin(req.user);
  if (!staff && !isOwner(item, req.user)) throw new AppError("You can only edit your own reports.", 403);
  if (!staff && item.status !== "open") throw new AppError("Only open reports can be edited.", 400);

  const fields = pickItemFields(req.body, "dateLost");
  await checkCategoryAndLocation(fields);

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

  await logActivity(req, { action: "LOST_ITEM_UPDATED", entityType: "lost_item", entityId: item._id, description: item.itemName });
  findMatchesForLostItem(item._id);
  res.json({ success: true, message: "Report updated.", item: toSafeJson(item, req.user) });
};

// PATCH /api/lost-items/:id/status   { status }
export const updateLostItemStatus = async (req, res) => {
  const item = await loadItem(req.params.id, req.user);
  const staff = isStaffOrAdmin(req.user);
  const { status } = req.body;

  if (!staff) {
    if (!isOwner(item, req.user)) throw new AppError("You can only change your own reports.", 403);
    // Students can close their own report (e.g. they found it themselves) or reopen it
    if (!["open", "closed"].includes(status) || item.status === "resolved") {
      throw new AppError("You can only close or reopen your report.", 400);
    }
  }

  const old = item.status;
  item.status = status;
  await item.save();

  await logActivity(req, {
    action: "LOST_ITEM_STATUS_CHANGED",
    entityType: "lost_item",
    entityId: item._id,
    description: `${item.itemName}: ${old} → ${status}`,
  });
  if (status === "open") findMatchesForLostItem(item._id);

  res.json({ success: true, message: "Status updated.", item: toSafeJson(item, req.user) });
};

// DELETE /api/lost-items/:id
export const deleteLostItem = async (req, res) => {
  const item = await loadItem(req.params.id, req.user);
  const staff = isStaffOrAdmin(req.user);
  if (!staff && !isOwner(item, req.user)) throw new AppError("You can only delete your own reports.", 403);
  if (!staff && item.status === "resolved") throw new AppError("Resolved reports can't be deleted.", 400);

  await ItemMatch.deleteMany({ lostItem: item._id });
  await item.deleteOne();
  await deleteImages(item.images);

  await logActivity(req, { action: "LOST_ITEM_DELETED", entityType: "lost_item", entityId: item._id, description: item.itemName });
  res.json({ success: true, message: "Report deleted." });
};

// GET /api/lost-items/:id/matches
export const getLostItemMatches = async (req, res) => {
  const item = await loadItem(req.params.id, req.user);
  if (!isStaffOrAdmin(req.user) && !isOwner(item, req.user)) {
    throw new AppError("You can only view matches for your own reports.", 403);
  }

  const matches = await ItemMatch.find({ lostItem: item._id, status: "suggested" })
    .sort({ score: -1 })
    .populate({ path: "foundItem", populate: POPULATE_PUBLIC });

  // Only show found items that can still be claimed
  const visible = matches.filter((m) => m.foundItem && ["pending", "available"].includes(m.foundItem.status));
  res.json({ success: true, matches: visible });
};

// PATCH /api/lost-items/:id/matches/:matchId/dismiss
export const dismissMatch = async (req, res) => {
  const item = await loadItem(req.params.id, req.user);
  if (!isOwner(item, req.user)) throw new AppError("You can only manage your own matches.", 403);

  const match = await ItemMatch.findOne({ _id: req.params.matchId, lostItem: item._id });
  if (!match) throw new AppError("Match not found.", 404);
  match.status = "dismissed";
  await match.save();
  res.json({ success: true, message: "Match dismissed." });
};

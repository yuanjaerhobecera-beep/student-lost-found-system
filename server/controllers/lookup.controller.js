import Category from "../models/Category.js";
import CampusLocation from "../models/CampusLocation.js";
import LostItem from "../models/LostItem.js";
import FoundItem from "../models/FoundItem.js";
import AppError from "../utils/AppError.js";
import { logActivity } from "../services/activityLog.service.js";

// Categories and campus locations work the same way, so one "factory" builds
// the controller functions for both.
const makeController = (Model, entityType, label) => ({
  // GET  - everyone sees active ones; admins can pass ?all=true to see inactive too
  list: async (req, res) => {
    const showAll = req.query.all === "true" && req.user?.role === "admin";
    const items = await Model.find(showAll ? {} : { isActive: true }).sort({ name: 1 });
    res.json({ success: true, items });
  },

  create: async (req, res) => {
    const item = await Model.create({
      name: req.body.name,
      description: req.body.description,
      createdBy: req.user._id,
    });
    await logActivity(req, { action: `${label.toUpperCase()}_CREATED`, entityType, entityId: item._id, description: item.name });
    res.status(201).json({ success: true, message: `${label} created.`, item });
  },

  update: async (req, res) => {
    const item = await Model.findById(req.params.id);
    if (!item) throw new AppError(`${label} not found.`, 404);
    for (const field of ["name", "description", "isActive"]) {
      if (req.body[field] !== undefined) item[field] = req.body[field];
    }
    await item.save();
    await logActivity(req, { action: `${label.toUpperCase()}_UPDATED`, entityType, entityId: item._id, description: item.name });
    res.json({ success: true, message: `${label} updated.`, item });
  },

  // Deletes only if no report uses it. Otherwise, deactivate it instead.
  remove: async (req, res) => {
    const item = await Model.findById(req.params.id);
    if (!item) throw new AppError(`${label} not found.`, 404);
    const field = entityType === "category" ? "category" : "location";
    const inUse = (await LostItem.exists({ [field]: item._id })) || (await FoundItem.exists({ [field]: item._id }));
    if (inUse) throw new AppError(`This ${label.toLowerCase()} is used by reports. Deactivate it instead.`, 400);

    await item.deleteOne();
    await logActivity(req, { action: `${label.toUpperCase()}_DELETED`, entityType, entityId: item._id, description: item.name });
    res.json({ success: true, message: `${label} deleted.` });
  },
});

export const categoryController = makeController(Category, "category", "Category");
export const locationController = makeController(CampusLocation, "location", "Location");

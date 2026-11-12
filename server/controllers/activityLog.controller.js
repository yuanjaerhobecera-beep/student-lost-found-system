import ActivityLog from "../models/ActivityLog.js";
import { getPagination, paginated, searchFilter, dateRangeFilter } from "../utils/query.js";

const STAFF_ENTITY_TYPES = ["lost_item", "found_item", "claim"];

// GET /api/activity-logs?action=&status=&entityType=&q=&from=&to=
// Admins see everything. Staff see only item and claim activity.
export const listActivityLogs = async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, 20, 100);
  const isAdmin = req.user.role === "admin";

  const filter = {
    ...searchFilter(req.query.q, ["userEmail", "description", "action"]),
    ...dateRangeFilter("createdAt", req.query.from, req.query.to),
  };
  if (typeof req.query.action === "string" && /^[A-Z_]{2,60}$/.test(req.query.action)) filter.action = req.query.action;
  if (["success", "failure"].includes(req.query.status)) filter.status = req.query.status;

  const allowedTypes = isAdmin ? null : STAFF_ENTITY_TYPES;
  if (typeof req.query.entityType === "string" && (!allowedTypes || allowedTypes.includes(req.query.entityType))) {
    filter.entityType = req.query.entityType;
  } else if (allowedTypes) {
    filter.entityType = { $in: allowedTypes };
  }

  const [logs, total, actions] = await Promise.all([
    ActivityLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("user", "firstName lastName role"),
    ActivityLog.countDocuments(filter),
    ActivityLog.distinct("action", allowedTypes ? { entityType: { $in: allowedTypes } } : {}),
  ]);

  res.json({ success: true, actions: actions.sort(), ...paginated(logs, total, page, limit) });
};

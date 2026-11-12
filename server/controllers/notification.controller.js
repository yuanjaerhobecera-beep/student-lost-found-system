import Notification from "../models/Notification.js";
import AppError from "../utils/AppError.js";
import { getPagination, paginated } from "../utils/query.js";
import { notifyRoles } from "../services/notification.service.js";
import { logActivity } from "../services/activityLog.service.js";

// GET /api/notifications?unread=true
export const getNotifications = async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, 15);
  const filter = { recipient: req.user._id };
  if (req.query.unread === "true") filter.isRead = false;

  const [items, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: req.user._id, isRead: false }),
  ]);
  res.json({ success: true, unreadCount, ...paginated(items, total, page, limit) });
};

// PATCH /api/notifications/:id/read
export const markAsRead = async (req, res) => {
  const n = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user._id },
    { $set: { isRead: true, readAt: new Date() } },
    { returnDocument: "after" }
  );
  if (!n) throw new AppError("Notification not found.", 404);
  res.json({ success: true, notification: n });
};

// PATCH /api/notifications/read-all
export const markAllAsRead = async (req, res) => {
  await Notification.updateMany({ recipient: req.user._id, isRead: false }, { $set: { isRead: true, readAt: new Date() } });
  res.json({ success: true, message: "All notifications marked as read." });
};

// DELETE /api/notifications/:id
export const deleteNotification = async (req, res) => {
  const result = await Notification.deleteOne({ _id: req.params.id, recipient: req.user._id });
  if (!result.deletedCount) throw new AppError("Notification not found.", 404);
  res.json({ success: true, message: "Notification deleted." });
};

// POST /api/notifications/announcement   (admin)  { title, message, audience }
export const sendAnnouncement = async (req, res) => {
  const { title, message, audience } = req.body;
  const roles = audience === "all" ? ["student", "staff", "admin"] : [audience];
  const count = await notifyRoles(roles, { type: "announcement", title, message });

  await logActivity(req, {
    action: "ANNOUNCEMENT_SENT",
    entityType: "notification",
    description: `"${title}" sent to ${audience} (${count} users)`,
  });
  res.json({ success: true, message: `Announcement sent to ${count} user(s).` });
};

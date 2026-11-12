import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { emitToUser } from "./socket.service.js";
import { sendNotificationEmail } from "./email.service.js";

// Creates an in-app notification, pushes it live, and optionally sends an email.
// Errors are logged but never break the main action (e.g. a claim still saves if email fails).
export const notifyUser = async (userId, { type = "system", title, message, link, email = false }) => {
  try {
    const notification = await Notification.create({ recipient: userId, type, title, message, link });
    emitToUser(userId, "notification", notification.toJSON());

    if (email) {
      const user = await User.findById(userId).select("email firstName");
      if (user) await sendNotificationEmail(user, title, message, link);
    }
    return notification;
  } catch (err) {
    console.error("Notification failed:", err.message);
    return null;
  }
};

// Notify every active user with one of these roles (e.g. all staff and admins)
export const notifyRoles = async (roles, payload) => {
  try {
    const users = await User.find({ role: { $in: roles }, isActive: true, isEmailVerified: true }).select("_id");
    await Promise.all(users.map((u) => notifyUser(u._id, payload)));
    return users.length;
  } catch (err) {
    console.error("Role notification failed:", err.message);
    return 0;
  }
};

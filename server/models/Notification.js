import mongoose from "mongoose";
import { cleanJson } from "./shared.js";

export const NOTIFICATION_TYPES = [
  "account",
  "lost_item",
  "found_item",
  "match",
  "claim",
  "release",
  "announcement",
  "system",
];

// Collection: notifications
// In-app messages for one user. Also pushed live with Socket.IO.
const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, default: "system" },
    title: { type: String, required: true, maxlength: 150 },
    message: { type: String, required: true, maxlength: 1000 },
    link: { type: String, maxlength: 300 },
    isRead: { type: Boolean, default: false },
    readAt: Date,
  },
  { timestamps: true, toJSON: cleanJson }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

export default mongoose.model("Notification", notificationSchema, "notifications");

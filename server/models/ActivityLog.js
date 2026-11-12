import mongoose from "mongoose";
import { cleanJson } from "./shared.js";

// Collection: activityLogs
// Audit trail of important actions. NEVER store passwords or tokens here.
const activityLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    userEmail: { type: String, maxlength: 254 },
    role: { type: String },
    action: { type: String, required: true, maxlength: 60 },
    entityType: {
      type: String,
      enum: ["user", "lost_item", "found_item", "claim", "category", "location", "setting", "notification", "auth"],
    },
    entityId: { type: mongoose.Schema.Types.ObjectId },
    description: { type: String, maxlength: 500 },
    status: { type: String, enum: ["success", "failure"], default: "success" },
    ipAddress: String,
    userAgent: String,
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false }, toJSON: cleanJson }
);

activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });
activityLogSchema.index({ user: 1, createdAt: -1 });
activityLogSchema.index({ entityType: 1, createdAt: -1 });

export default mongoose.model("ActivityLog", activityLogSchema, "activityLogs");

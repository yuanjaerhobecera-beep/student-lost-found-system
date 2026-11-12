import mongoose from "mongoose";
import { imageSchema, maxImages, cleanJson } from "./shared.js";

export const LOST_STATUSES = ["open", "resolved", "closed"];

// Collection: lostItems
// A student's report of something they lost.
const lostItemSchema = new mongoose.Schema(
  {
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    itemName: { type: String, required: [true, "Item name is required"], trim: true, maxlength: 100 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: [true, "Category is required"] },
    description: { type: String, required: [true, "Description is required"], trim: true, maxlength: 1000 },
    dateLost: { type: Date, required: [true, "Date lost is required"] },
    timeLost: { type: String, trim: true, maxlength: 20 },
    location: { type: mongoose.Schema.Types.ObjectId, ref: "CampusLocation", required: [true, "Location is required"] },
    locationDetails: { type: String, trim: true, maxlength: 200 },
    images: { type: [imageSchema], default: [], validate: maxImages(3) },

    // PRIVATE: only the owner and staff can see this. Used to verify real ownership.
    identifyingDetails: { type: String, trim: true, maxlength: 1000, select: false },

    status: { type: String, enum: LOST_STATUSES, default: "open" },
    resolvedByClaim: { type: mongoose.Schema.Types.ObjectId, ref: "Claim" },
  },
  { timestamps: true, toJSON: cleanJson }
);

lostItemSchema.index({ status: 1, createdAt: -1 });
lostItemSchema.index({ reportedBy: 1, createdAt: -1 });
lostItemSchema.index({ category: 1, dateLost: -1 });
lostItemSchema.index({ location: 1 });
lostItemSchema.index({ itemName: "text", description: "text" });

export default mongoose.model("LostItem", lostItemSchema, "lostItems");

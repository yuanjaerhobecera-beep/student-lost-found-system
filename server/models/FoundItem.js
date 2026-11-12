import mongoose from "mongoose";
import { imageSchema, maxImages, cleanJson } from "./shared.js";

// pending   = reported by a student, waiting for staff to receive the item
// available = in the Lost and Found office, can be claimed
// claimed   = a claim was approved, waiting for the owner to pick it up
// released  = handed over to the owner (QR verified)
// disposed  = donated/discarded after the holding period
export const FOUND_STATUSES = ["pending", "available", "claimed", "released", "disposed"];

// Collection: foundItems
const foundItemSchema = new mongoose.Schema(
  {
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    itemName: { type: String, required: [true, "Item name is required"], trim: true, maxlength: 100 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: [true, "Category is required"] },
    description: { type: String, required: [true, "Description is required"], trim: true, maxlength: 1000 },
    dateFound: { type: Date, required: [true, "Date found is required"] },
    timeFound: { type: String, trim: true, maxlength: 20 },
    location: { type: mongoose.Schema.Types.ObjectId, ref: "CampusLocation", required: [true, "Location is required"] },
    locationDetails: { type: String, trim: true, maxlength: 200 },
    images: { type: [imageSchema], default: [], validate: maxImages(3) },

    // PRIVATE (staff + reporter only): details that only the real owner would know
    identifyingDetails: { type: String, trim: true, maxlength: 1000, select: false },
    // PRIVATE (staff only): where the item is kept, e.g. "Cabinet B, Shelf 2"
    storageLocation: { type: String, trim: true, maxlength: 200, select: false },

    status: { type: String, enum: FOUND_STATUSES, default: "pending" },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    receivedAt: Date,
    releasedClaim: { type: mongoose.Schema.Types.ObjectId, ref: "Claim" },
  },
  { timestamps: true, toJSON: cleanJson }
);

foundItemSchema.index({ status: 1, createdAt: -1 });
foundItemSchema.index({ reportedBy: 1, createdAt: -1 });
foundItemSchema.index({ category: 1, dateFound: -1 });
foundItemSchema.index({ location: 1 });
foundItemSchema.index({ itemName: "text", description: "text" });

export default mongoose.model("FoundItem", foundItemSchema, "foundItems");

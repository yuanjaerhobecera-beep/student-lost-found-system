import mongoose from "mongoose";
import { cleanJson } from "./shared.js";

// Collection: itemMatches
// A POSSIBLE match between a lost item and a found item, found by the matching algorithm.
// A match never proves ownership - the student must still submit a claim.
const itemMatchSchema = new mongoose.Schema(
  {
    lostItem: { type: mongoose.Schema.Types.ObjectId, ref: "LostItem", required: true },
    foundItem: { type: mongoose.Schema.Types.ObjectId, ref: "FoundItem", required: true },
    score: { type: Number, min: 0, max: 100, required: true },
    reasons: [{ type: String }],
    status: { type: String, enum: ["suggested", "dismissed", "claimed"], default: "suggested" },
  },
  { timestamps: true, toJSON: cleanJson }
);

itemMatchSchema.index({ lostItem: 1, foundItem: 1 }, { unique: true });
itemMatchSchema.index({ foundItem: 1 });

export default mongoose.model("ItemMatch", itemMatchSchema, "itemMatches");

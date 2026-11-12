import mongoose from "mongoose";
import { imageSchema, maxImages, cleanJson } from "./shared.js";

export const CLAIM_STATUSES = [
  "pending",
  "under_review",
  "info_required",
  "approved",
  "rejected",
  "completed",
  "cancelled",
];

// Claims that are still "in progress" (used to block duplicate claims)
export const ACTIVE_CLAIM_STATUSES = ["pending", "under_review", "info_required", "approved"];

const historySchema = new mongoose.Schema(
  {
    status: { type: String, enum: CLAIM_STATUSES, required: true },
    note: { type: String, maxlength: 1000 },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

// Collection: claims
// A student's request to receive a found item, reviewed by staff.
const claimSchema = new mongoose.Schema(
  {
    foundItem: { type: mongoose.Schema.Types.ObjectId, ref: "FoundItem", required: true },
    claimant: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    lostItem: { type: mongoose.Schema.Types.ObjectId, ref: "LostItem" },

    ownershipExplanation: {
      type: String,
      required: [true, "Please explain why this item is yours"],
      trim: true,
      minlength: 20,
      maxlength: 1500,
    },
    identifyingDetails: { type: String, trim: true, maxlength: 1000 },
    proofImages: { type: [imageSchema], default: [], validate: maxImages(5) },

    status: { type: String, enum: CLAIM_STATUSES, default: "pending" },
    history: { type: [historySchema], default: [] },

    infoRequestMessage: { type: String, maxlength: 1000 },
    studentResponse: { type: String, maxlength: 1500 },

    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: Date,
    verificationNotes: { type: String, maxlength: 1000 },
    rejectionReason: { type: String, maxlength: 1000 },

    // QR verification: only the HASH of the token is stored.
    qrTokenHash: { type: String, select: false },
    qrTokenExpiresAt: Date,
    qrUsedAt: Date,

    releasedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    releasedAt: Date,
    releaseNotes: { type: String, maxlength: 1000 },
  },
  { timestamps: true, toJSON: cleanJson }
);

claimSchema.index({ claimant: 1, createdAt: -1 });
claimSchema.index({ foundItem: 1, status: 1 });
claimSchema.index({ status: 1, createdAt: -1 });
claimSchema.index({ qrTokenHash: 1 }, { sparse: true });

export default mongoose.model("Claim", claimSchema, "claims");

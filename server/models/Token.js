import mongoose from "mongoose";

// Collection: tokens
// Email verification and password reset tokens. Only the HASH is stored.
// MongoDB deletes each document automatically when expiresAt passes (TTL index).
const tokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["email_verification", "password_reset"], required: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: Date,
  },
  { timestamps: true }
);

tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
tokenSchema.index({ user: 1, type: 1 });

export default mongoose.model("Token", tokenSchema, "tokens");

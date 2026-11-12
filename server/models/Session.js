import mongoose from "mongoose";

// Collection: sessions
// One document per logged-in device. Stores the HASH of the refresh token.
// Logging out (or changing password) deletes the session so the refresh token stops working.
const sessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    userAgent: String,
    ipAddress: String,
  },
  { timestamps: true }
);

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
sessionSchema.index({ user: 1 });

export default mongoose.model("Session", sessionSchema, "sessions");

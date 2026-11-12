import mongoose from "mongoose";

// Collection: settings
// System-wide settings that admins can change without editing code.
// One document per setting, e.g. { key: "qrExpiryHours", value: 72 }
const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, maxlength: 60 },
    value: { type: mongoose.Schema.Types.Mixed },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("Setting", settingSchema, "settings");

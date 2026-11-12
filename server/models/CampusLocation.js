import mongoose from "mongoose";
import { cleanJson } from "./shared.js";

// Collection: campusLocations (e.g. Library, Canteen). Managed by admins.
const campusLocationSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Name is required"], trim: true, maxlength: 80, unique: true },
    description: { type: String, trim: true, maxlength: 300 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, toJSON: cleanJson }
);

export default mongoose.model("CampusLocation", campusLocationSchema, "campusLocations");

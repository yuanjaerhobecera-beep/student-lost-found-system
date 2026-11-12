import mongoose from "mongoose";
import { cleanJson } from "./shared.js";

// Collection: categories (e.g. Electronics, IDs, Bags). Managed by admins.
const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Name is required"], trim: true, maxlength: 60, unique: true },
    description: { type: String, trim: true, maxlength: 300 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, toJSON: cleanJson }
);

export default mongoose.model("Category", categorySchema, "categories");

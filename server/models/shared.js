import mongoose from "mongoose";

// Reused by lost items, found items and claims.
// url = where the image can be viewed, publicId = used to delete it later.
export const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
  },
  { _id: false }
);

export const maxImages = (max) => ({
  validator: (arr) => !arr || arr.length <= max,
  message: `You can upload up to ${max} images.`,
});

// Removes internal fields from API responses.
export const cleanJson = {
  virtuals: true,
  transform: (_doc, ret) => {
    delete ret.__v;
    delete ret.id;
    return ret;
  },
};

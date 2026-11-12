import multer from "multer";
import AppError from "../utils/AppError.js";
import { env } from "../config/env.js";
import { sanitizeObject } from "./sanitize.js";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Files are kept in memory briefly, checked, then saved to Cloudinary (or the local uploads folder).
const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadMb * 1024 * 1024, files: 5, fields: 30 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) return cb(null, true);
    cb(new AppError("Only JPG, PNG or WEBP images are allowed.", 400));
  },
});

// Usage in a route: uploadImages("images", 3)
export const uploadImages = (field, max) => (req, res, next) => {
  multerUpload.array(field, max)(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      const messages = {
        LIMIT_FILE_SIZE: `Each image must be ${env.maxUploadMb}MB or smaller.`,
        LIMIT_FILE_COUNT: `You can upload up to ${max} images.`,
        LIMIT_UNEXPECTED_FILE: `You can upload up to ${max} images.`,
      };
      return next(new AppError(messages[err.code] || "Upload failed.", 400));
    }
    if (err) return next(err);
    // Form fields arrive after multer runs, so clean them here too.
    if (req.body) sanitizeObject(req.body);
    next();
  });
};

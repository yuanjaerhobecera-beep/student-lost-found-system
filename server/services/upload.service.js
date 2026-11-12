import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env.js";
import AppError from "../utils/AppError.js";
import { generateToken } from "../utils/crypto.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_DIR = path.join(__dirname, "..", "uploads");

export const isCloudinaryConfigured = () =>
  Boolean(env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret);

if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
    secure: true,
  });
}

// Checks the real file content ("magic bytes"), not just the file name or the type
// the browser claims. A renamed .exe will be rejected here.
const detectImageType = (buf) => {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
};

const uploadToCloudinary = (buffer, folder) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `lost-found/${folder}`, resource_type: "image" },
      (error, result) => {
        if (error) return reject(new AppError("Image upload failed. Please try again.", 502));
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });

const saveLocally = async (buffer, ext, folder) => {
  const dir = path.join(UPLOAD_DIR, folder);
  await fs.mkdir(dir, { recursive: true });
  const fileName = `${generateToken(16)}.${ext}`;
  await fs.writeFile(path.join(dir, fileName), buffer);
  return { url: `/uploads/${folder}/${fileName}`, publicId: `local:${folder}/${fileName}` };
};

// folder: "items" or "proofs"
export const saveImages = async (files = [], folder = "items") => {
  const saved = [];
  for (const file of files) {
    const ext = detectImageType(file.buffer);
    if (!ext) throw new AppError(`"${file.originalname}" is not a valid image file.`, 400);
    saved.push(
      isCloudinaryConfigured()
        ? await uploadToCloudinary(file.buffer, folder)
        : await saveLocally(file.buffer, ext, folder)
    );
  }
  return saved;
};

export const deleteImages = async (images = []) => {
  for (const img of images) {
    try {
      if (img.publicId.startsWith("local:")) {
        const relative = img.publicId.replace("local:", "");
        const full = path.join(UPLOAD_DIR, relative);
        if (full.startsWith(UPLOAD_DIR)) await fs.unlink(full);
      } else if (isCloudinaryConfigured()) {
        await cloudinary.uploader.destroy(img.publicId);
      }
    } catch {
      // Ignore: the file may already be gone
    }
  }
};

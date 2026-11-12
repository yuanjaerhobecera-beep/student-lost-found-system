import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import apiRoutes from "./routes/index.js";
import { protect, isStaffOrAdmin } from "./middleware/auth.js";
import { verifyCsrf } from "./middleware/csrf.js";
import { sanitizeRequest } from "./middleware/sanitize.js";
import { apiLimiter } from "./middleware/rateLimiters.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import { UPLOAD_DIR } from "./services/upload.service.js";
import Claim from "./models/Claim.js";
import AppError from "./utils/AppError.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIST = path.join(__dirname, "..", "client", "dist");

const app = express();

// When deployed behind a proxy (Render, Railway, Nginx), this makes req.ip the real visitor IP
if (process.env.TRUST_PROXY) app.set("trust proxy", Number(process.env.TRUST_PROXY) || 1);
app.disable("x-powered-by");

// ----- Security middleware -----
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "blob:", "https://res.cloudinary.com"],
        connectSrc: ["'self'", "ws:", "wss:"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        fontSrc: ["'self'", "data:"],
        scriptSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: "same-site" },
  })
);
app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(sanitizeRequest);

// ----- API -----
app.use("/api", apiLimiter, verifyCsrf, apiRoutes);
app.use("/api", notFound);

// ----- Uploaded images (only used when Cloudinary is not configured) -----
// Proof-of-ownership images are private: only staff/admins and the claimant can open them.
app.get("/uploads/proofs/:file", protect, async (req, res) => {
  const { file } = req.params;
  if (!/^[A-Za-z0-9_-]+\.(jpg|png|webp)$/.test(file)) throw new AppError("Not found.", 404);
  const allowed =
    isStaffOrAdmin(req.user) ||
    (await Claim.exists({ claimant: req.user._id, "proofImages.publicId": `local:proofs/${file}` }));
  if (!allowed) throw new AppError("Not found.", 404);
  res.sendFile(path.join(UPLOAD_DIR, "proofs", file), (err) => {
    if (err && !res.headersSent) res.status(404).end();
  });
});
app.use("/uploads/items", express.static(path.join(UPLOAD_DIR, "items"), { fallthrough: false, index: false }));

// ----- React app (production only: after running "npm run build" in client) -----
if (env.isProduction && fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST, { index: false }));
  app.use((req, res, next) => {
    if (req.method !== "GET") return next();
    res.sendFile(path.join(CLIENT_DIST, "index.html"));
  });
}

app.use(errorHandler);

export default app;

import { Router } from "express";
import { body } from "express-validator";
import * as claims from "../controllers/claim.controller.js";
import { protect, authorize } from "../middleware/auth.js";
import { validate, validateId } from "../middleware/validate.js";
import { uploadImages } from "../middleware/upload.js";
import { createLimiter } from "../middleware/rateLimiters.js";
import { optionalText } from "./validators.js";

const router = Router();
router.use(protect);

const staff = authorize("staff", "admin");
const student = authorize("student");

// Staff: QR verification and release (placed before "/:id" routes)
router.post("/qr/verify", staff, [body("token").isString().notEmpty().withMessage("QR code is required.")], validate, claims.verifyQr);
router.post(
  "/qr/release",
  staff,
  [body("token").isString().notEmpty().withMessage("QR code is required."), optionalText("releaseNotes", 1000)],
  validate,
  claims.releaseWithQr
);

// Student
router.get("/mine", student, claims.getMyClaims);
router.post(
  "/",
  student,
  createLimiter,
  uploadImages("proofImages", 5),
  [
    body("foundItemId").isMongoId().withMessage("Please choose an item to claim."),
    body("lostItemId").optional({ values: "falsy" }).isMongoId().withMessage("Invalid lost item."),
    body("ownershipExplanation").trim().isLength({ min: 20, max: 1500 }).withMessage("Explanation must be 20-1500 characters."),
    optionalText("identifyingDetails", 1000),
  ],
  validate,
  claims.createClaim
);
router.patch(
  "/:id/respond",
  student,
  validateId(),
  uploadImages("proofImages", 5),
  [body("response").trim().isLength({ min: 5, max: 1500 }).withMessage("Response must be 5-1500 characters.")],
  validate,
  claims.respondToInfoRequest
);
router.patch("/:id/cancel", student, validateId(), claims.cancelClaim);
router.get("/:id/qr", student, validateId(), claims.getClaimQr);

// Staff review
router.get("/", staff, claims.listClaims);
router.patch(
  "/:id/status",
  staff,
  validateId(),
  [
    body("status").isIn(["under_review", "info_required", "approved", "rejected"]).withMessage("Invalid status."),
    optionalText("note", 1000),
    optionalText("message", 1000),
    optionalText("reason", 1000),
  ],
  validate,
  claims.updateClaimStatus
);

// Both (the controller checks ownership)
router.get("/:id", validateId(), claims.getClaim);

export default router;

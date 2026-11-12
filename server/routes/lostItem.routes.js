import { Router } from "express";
import { body } from "express-validator";
import * as lost from "../controllers/lostItem.controller.js";
import { protect, authorize } from "../middleware/auth.js";
import { validate, validateId } from "../middleware/validate.js";
import { uploadImages } from "../middleware/upload.js";
import { createLimiter } from "../middleware/rateLimiters.js";
import { itemRules } from "./validators.js";
import { LOST_STATUSES } from "../models/LostItem.js";

const router = Router();
router.use(protect); // every route below requires login

router.get("/", lost.listLostItems);
router.get("/mine", lost.getMyLostItems);
router.post("/", authorize("student"), createLimiter, uploadImages("images", 3), itemRules("dateLost"), validate, lost.createLostItem);

router.get("/:id", validateId(), lost.getLostItem);
router.put("/:id", validateId(), uploadImages("images", 3), itemRules("dateLost", true), validate, lost.updateLostItem);
router.patch("/:id/status", validateId(), [body("status").isIn(LOST_STATUSES).withMessage("Invalid status.")], validate, lost.updateLostItemStatus);
router.delete("/:id", validateId(), lost.deleteLostItem);

router.get("/:id/matches", validateId(), lost.getLostItemMatches);
router.patch("/:id/matches/:matchId/dismiss", validateId(), validateId("matchId"), lost.dismissMatch);

export default router;

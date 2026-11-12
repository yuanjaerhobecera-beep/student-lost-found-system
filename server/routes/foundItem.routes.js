import { Router } from "express";
import { body } from "express-validator";
import * as found from "../controllers/foundItem.controller.js";
import { protect, authorize } from "../middleware/auth.js";
import { validate, validateId } from "../middleware/validate.js";
import { uploadImages } from "../middleware/upload.js";
import { createLimiter } from "../middleware/rateLimiters.js";
import { itemRules, optionalText } from "./validators.js";
import { FOUND_STATUSES } from "../models/FoundItem.js";

const router = Router();
router.use(protect);

router.get("/", found.listFoundItems);
router.get("/mine", found.getMyFoundItems);
router.post("/", createLimiter, uploadImages("images", 3), itemRules("dateFound"), validate, found.createFoundItem);

router.get("/:id", validateId(), found.getFoundItem);
router.put("/:id", validateId(), uploadImages("images", 3), itemRules("dateFound", true), validate, found.updateFoundItem);
router.patch(
  "/:id/status",
  authorize("staff", "admin"),
  validateId(),
  [body("status").isIn(FOUND_STATUSES).withMessage("Invalid status."), optionalText("storageLocation", 200)],
  validate,
  found.updateFoundItemStatus
);
router.delete("/:id", validateId(), found.deleteFoundItem);

export default router;

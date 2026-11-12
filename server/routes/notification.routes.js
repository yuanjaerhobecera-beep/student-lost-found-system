import { Router } from "express";
import { body } from "express-validator";
import * as n from "../controllers/notification.controller.js";
import { protect, authorize } from "../middleware/auth.js";
import { validate, validateId } from "../middleware/validate.js";

const router = Router();
router.use(protect);

router.get("/", n.getNotifications);
router.patch("/read-all", n.markAllAsRead);
router.post(
  "/announcement",
  authorize("admin"),
  [
    body("title").trim().isLength({ min: 3, max: 150 }).withMessage("Title must be 3-150 characters."),
    body("message").trim().isLength({ min: 5, max: 1000 }).withMessage("Message must be 5-1000 characters."),
    body("audience").isIn(["all", "student", "staff", "admin"]).withMessage("Invalid audience."),
  ],
  validate,
  n.sendAnnouncement
);
router.patch("/:id/read", validateId(), n.markAsRead);
router.delete("/:id", validateId(), n.deleteNotification);

export default router;

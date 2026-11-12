import { Router } from "express";
import { body } from "express-validator";
import * as auth from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { loginLimiter, sensitiveLimiter } from "../middleware/rateLimiters.js";
import { emailRule, passwordRule, nameRule, optionalText, contactRule, studentIdRule } from "./validators.js";

const router = Router();

router.post(
  "/register",
  sensitiveLimiter,
  [
    nameRule("firstName", "First name"),
    nameRule("lastName", "Last name"),
    emailRule(),
    passwordRule(),
    body("confirmPassword").custom((value, { req }) => value === req.body.password).withMessage("Passwords do not match."),
    studentIdRule(),
    optionalText("department", 100),
    contactRule(),
  ],
  validate,
  auth.register
);

router.post("/verify-email", [body("token").isString().notEmpty().withMessage("Token is required.")], validate, auth.verifyEmail);
router.post("/resend-verification", sensitiveLimiter, [emailRule()], validate, auth.resendVerification);

router.post(
  "/login",
  loginLimiter,
  [emailRule(), body("password").isString().notEmpty().withMessage("Password is required.").isLength({ max: 128 })],
  validate,
  auth.login
);

router.post("/refresh", auth.refresh);
router.post("/logout", auth.logout);
router.get("/me", protect, auth.getMe);

router.post("/forgot-password", sensitiveLimiter, [emailRule()], validate, auth.forgotPassword);
router.post(
  "/reset-password",
  sensitiveLimiter,
  [body("token").isString().notEmpty().withMessage("Token is required."), passwordRule()],
  validate,
  auth.resetPassword
);

router.patch(
  "/change-password",
  protect,
  [body("currentPassword").isString().notEmpty().withMessage("Current password is required."), passwordRule("newPassword")],
  validate,
  auth.changePassword
);

router.patch(
  "/profile",
  protect,
  [
    nameRule("firstName", "First name").optional(),
    nameRule("lastName", "Last name").optional(),
    optionalText("department", 100),
    contactRule(),
    studentIdRule(),
  ],
  validate,
  auth.updateProfile
);

export default router;

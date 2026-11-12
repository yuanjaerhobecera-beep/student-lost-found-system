import { Router } from "express";
import { body } from "express-validator";
import { protect, authorize } from "../middleware/auth.js";
import { validate, validateId } from "../middleware/validate.js";
import { emailRule, nameRule, optionalText, contactRule } from "./validators.js";
import * as users from "../controllers/user.controller.js";
import * as settings from "../controllers/setting.controller.js";
import * as reports from "../controllers/report.controller.js";
import * as dashboard from "../controllers/dashboard.controller.js";
import { listActivityLogs } from "../controllers/activityLog.controller.js";
import { categoryController, locationController } from "../controllers/lookup.controller.js";

const admin = authorize("admin");
const staffOrAdmin = authorize("staff", "admin");

// ---------- Users (admin only) ----------
export const userRouter = Router();
userRouter.use(protect, admin);
userRouter.get("/", users.listUsers);
userRouter.post(
  "/",
  [
    nameRule("firstName", "First name"),
    nameRule("lastName", "Last name"),
    emailRule(),
    body("role").isIn(["staff", "admin"]).withMessage("Role must be staff or admin."),
    optionalText("department", 100),
    contactRule(),
  ],
  validate,
  users.createUser
);
userRouter.get("/:id", validateId(), users.getUser);
userRouter.patch(
  "/:id",
  validateId(),
  [
    nameRule("firstName", "First name").optional(),
    nameRule("lastName", "Last name").optional(),
    body("role").optional().isIn(["student", "staff", "admin"]).withMessage("Invalid role."),
    optionalText("department", 100),
    contactRule(),
  ],
  validate,
  users.updateUser
);
userRouter.patch("/:id/status", validateId(), [body("isActive").isBoolean().withMessage("isActive must be true or false.")], validate, users.setUserStatus);
userRouter.post("/:id/unlock", validateId(), users.unlockUser);
userRouter.post("/:id/resend-setup", validateId(), users.resendSetupLink);

// ---------- Categories & Locations ----------
const lookupRules = (isUpdate) => [
  (isUpdate ? body("name").optional() : body("name")).trim().isLength({ min: 2, max: 80 }).withMessage("Name must be 2-80 characters."),
  optionalText("description", 300),
  body("isActive").optional().isBoolean(),
];

const makeLookupRouter = (controller) => {
  const r = Router();
  r.get("/", protect, controller.list);
  r.post("/", protect, admin, lookupRules(false), validate, controller.create);
  r.put("/:id", protect, admin, validateId(), lookupRules(true), validate, controller.update);
  r.delete("/:id", protect, admin, validateId(), controller.remove);
  return r;
};
export const categoryRouter = makeLookupRouter(categoryController);
export const locationRouter = makeLookupRouter(locationController);

// ---------- Settings ----------
export const settingRouter = Router();
settingRouter.get("/public", settings.getPublic);
settingRouter.get("/", protect, admin, settings.getAll);
settingRouter.put(
  "/",
  protect,
  admin,
  [
    optionalText("systemName", 100),
    optionalText("officeLocation", 150),
    optionalText("officeHours", 150),
    body("requireSchoolEmail").optional().isBoolean(),
    body("matchScoreThreshold").optional().isInt({ min: 20, max: 100 }).withMessage("Match threshold must be 20-100."),
    body("qrExpiryHours").optional().isInt({ min: 1, max: 720 }).withMessage("QR expiry must be 1-720 hours."),
    body("allowedEmailDomains").optional().isArray({ max: 10 }).withMessage("Up to 10 domains."),
    body("allowedEmailDomains.*").optional().isString().matches(/^@?[a-z0-9.-]+\.[a-z]{2,}$/i).withMessage("Invalid email domain."),
  ],
  validate,
  settings.update
);

// ---------- Dashboards ----------
export const dashboardRouter = Router();
dashboardRouter.use(protect);
dashboardRouter.get("/student", authorize("student"), dashboard.studentDashboard);
dashboardRouter.get("/staff", staffOrAdmin, dashboard.staffDashboard);
dashboardRouter.get("/admin", admin, dashboard.adminDashboard);

// ---------- Reports (admin) ----------
export const reportRouter = Router();
reportRouter.use(protect, admin);
reportRouter.get("/summary", reports.getSummary);
reportRouter.get("/export", reports.exportCsv);

// ---------- Activity logs (staff see limited logs) ----------
export const activityLogRouter = Router();
activityLogRouter.get("/", protect, staffOrAdmin, listActivityLogs);

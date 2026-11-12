import { Router } from "express";
import mongoose from "mongoose";
import authRoutes from "./auth.routes.js";
import lostItemRoutes from "./lostItem.routes.js";
import foundItemRoutes from "./foundItem.routes.js";
import claimRoutes from "./claim.routes.js";
import notificationRoutes from "./notification.routes.js";
import {
  userRouter,
  categoryRouter,
  locationRouter,
  settingRouter,
  dashboardRouter,
  reportRouter,
  activityLogRouter,
} from "./admin.routes.js";
import { issueCsrfToken } from "../middleware/csrf.js";

const router = Router();

// Health check: shows if the server AND database are working
router.get("/health", (_req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? "ok" : "error",
    server: "running",
    database: dbConnected ? "connected" : "disconnected",
  });
});

router.get("/csrf-token", issueCsrfToken);

router.use("/auth", authRoutes);
router.use("/lost-items", lostItemRoutes);
router.use("/found-items", foundItemRoutes);
router.use("/claims", claimRoutes);
router.use("/notifications", notificationRoutes);
router.use("/users", userRouter);
router.use("/categories", categoryRouter);
router.use("/locations", locationRouter);
router.use("/settings", settingRouter);
router.use("/dashboard", dashboardRouter);
router.use("/reports", reportRouter);
router.use("/activity-logs", activityLogRouter);

export default router;

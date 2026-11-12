import jwt from "jsonwebtoken";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import { env } from "../config/env.js";

// protect: only logged-in, active, verified users can continue.
// The user's role is read from the DATABASE, never from the frontend.
export const protect = async (req, _res, next) => {
  const token = req.cookies?.accessToken;
  if (!token) throw new AppError("Please log in to continue.", 401, "NOT_AUTHENTICATED");

  let payload;
  try {
    payload = jwt.verify(token, env.jwtAccessSecret, { algorithms: ["HS256"] });
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw new AppError("Your session has expired.", 401, "TOKEN_EXPIRED");
    }
    throw new AppError("Invalid session. Please log in again.", 401, "NOT_AUTHENTICATED");
  }

  const user = await User.findById(payload.sub).select("+passwordChangedAt");
  if (!user || !user.isActive) {
    throw new AppError("Your account is not active. Please contact the administrator.", 401, "NOT_AUTHENTICATED");
  }

  // Token was created before the password changed -> no longer valid
  if (user.passwordChangedAt && payload.iat * 1000 < user.passwordChangedAt.getTime()) {
    throw new AppError("Your password was changed. Please log in again.", 401, "NOT_AUTHENTICATED");
  }

  if (!user.isEmailVerified) {
    throw new AppError("Please verify your email address first.", 403, "EMAIL_NOT_VERIFIED");
  }

  req.user = user;
  next();
};

// authorize("staff", "admin"): only these roles can continue (Role-Based Access Control)
export const authorize =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError("You do not have permission to do this.", 403, "FORBIDDEN");
    }
    next();
  };

export const isStaffOrAdmin = (user) => user && (user.role === "staff" || user.role === "admin");

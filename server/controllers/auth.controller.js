import bcrypt from "bcrypt";
import User from "../models/User.js";
import Session from "../models/Session.js";
import AppError from "../utils/AppError.js";
import { env } from "../config/env.js";
import { hashToken } from "../utils/crypto.js";
import { clearAuthCookies } from "../utils/cookies.js";
import {
  createOneTimeToken,
  findValidToken,
  issueAuthCookies,
  revokeAllSessions,
} from "../services/token.service.js";
import { sendVerificationEmail, sendPasswordResetEmail } from "../services/email.service.js";
import { logActivity } from "../services/activityLog.service.js";
import { notifyUser } from "../services/notification.service.js";
import { isEmailDomainAllowed, getPublicSettings } from "../services/settings.service.js";

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;
// Used to keep login timing the same whether or not the email exists
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", 12);

const GENERIC_EMAIL_MESSAGE =
  "If an account with that email exists, we've sent an email with further instructions.";

// POST /api/auth/register
export const register = async (req, res) => {
  const { firstName, lastName, email, password, studentId, department, contactNumber } = req.body;

  if (!(await isEmailDomainAllowed(email))) {
    const { allowedEmailDomains } = await getPublicSettings();
    throw new AppError(`Please use your school email (${allowedEmailDomains.map((d) => "@" + d).join(", ")}).`, 422);
  }
  if (await User.exists({ email })) {
    throw new AppError("An account with this email already exists.", 409, "DUPLICATE");
  }
  if (studentId && (await User.exists({ studentId }))) {
    throw new AppError("This student ID is already registered.", 409, "DUPLICATE");
  }

  const user = await User.create({
    firstName,
    lastName,
    email,
    password,
    role: "student", // students can never register themselves as staff/admin
    studentId: studentId || undefined,
    department,
    contactNumber,
  });

  const token = await createOneTimeToken(user._id, "email_verification", 24);
  await sendVerificationEmail(user, `${env.clientUrl}/verify-email?token=${token}`);

  await logActivity(req, { action: "REGISTER", entityType: "user", entityId: user._id, user, description: "Student account created" });
  await notifyUser(user._id, {
    type: "account",
    title: "Welcome to Lost and Found!",
    message: "Your account was created successfully.",
  });

  res.status(201).json({
    success: true,
    message: "Registration successful! Please check your email to verify your account.",
  });
};

// POST /api/auth/verify-email   { token }
export const verifyEmail = async (req, res) => {
  const record = await findValidToken(req.body.token, "email_verification");
  if (!record) throw new AppError("This verification link is invalid or has expired.", 400, "INVALID_TOKEN");

  const user = await User.findById(record.user);
  if (!user) throw new AppError("Account not found.", 404);

  user.isEmailVerified = true;
  await user.save({ validateBeforeSave: false });
  record.usedAt = new Date();
  await record.save();

  await logActivity(req, { action: "EMAIL_VERIFIED", entityType: "user", entityId: user._id, user });
  await notifyUser(user._id, {
    type: "account",
    title: "Email verified",
    message: "Your email address has been verified. You can now use all features.",
  });

  res.json({ success: true, message: "Email verified! You can now log in." });
};

// POST /api/auth/resend-verification   { email }
export const resendVerification = async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (user && !user.isEmailVerified && user.isActive) {
    const token = await createOneTimeToken(user._id, "email_verification", 24);
    await sendVerificationEmail(user, `${env.clientUrl}/verify-email?token=${token}`);
  }
  // Same message either way, so attackers can't find out which emails are registered
  res.json({ success: true, message: GENERIC_EMAIL_MESSAGE });
};

// POST /api/auth/login   { email, password }
export const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+password +failedLoginAttempts +lockUntil");

  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH);
    await logActivity(req, { action: "LOGIN_FAILED", entityType: "auth", status: "failure", email, description: "Unknown email" });
    throw new AppError("Invalid email or password.", 401, "INVALID_CREDENTIALS");
  }

  if (user.isLocked()) {
    const minutes = Math.ceil((user.lockUntil - Date.now()) / 60000);
    await logActivity(req, { action: "LOGIN_BLOCKED", entityType: "auth", status: "failure", user, description: "Account locked" });
    throw new AppError(`Too many failed attempts. Try again in ${minutes} minute(s).`, 423, "ACCOUNT_LOCKED");
  }

  const correct = await user.comparePassword(password);
  if (!correct) {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    let description = `Wrong password (attempt ${user.failedLoginAttempts})`;
    if (user.failedLoginAttempts >= MAX_FAILED_LOGINS) {
      user.lockUntil = new Date(Date.now() + LOCK_MINUTES * 60000);
      user.failedLoginAttempts = 0;
      description = `Account locked for ${LOCK_MINUTES} minutes after ${MAX_FAILED_LOGINS} failed attempts`;
    }
    await user.save({ validateBeforeSave: false });
    await logActivity(req, { action: "LOGIN_FAILED", entityType: "auth", status: "failure", user, description });
    throw new AppError("Invalid email or password.", 401, "INVALID_CREDENTIALS");
  }

  if (!user.isActive) {
    throw new AppError("Your account has been deactivated. Please contact the administrator.", 403, "ACCOUNT_INACTIVE");
  }
  if (!user.isEmailVerified) {
    throw new AppError("Please verify your email before logging in.", 403, "EMAIL_NOT_VERIFIED");
  }

  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  await issueAuthCookies(req, res, user);
  await logActivity(req, { action: "LOGIN_SUCCESS", entityType: "auth", user });

  res.json({ success: true, message: "Logged in successfully.", user: user.toJSON() });
};

// POST /api/auth/refresh  (uses the refreshToken cookie)
export const refresh = async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) throw new AppError("Please log in.", 401, "NOT_AUTHENTICATED");

  // Each refresh token works only ONCE (rotation). We delete it and issue a new one.
  const session = await Session.findOneAndDelete({
    tokenHash: hashToken(token),
    expiresAt: { $gt: new Date() },
  });
  if (!session) {
    clearAuthCookies(res);
    throw new AppError("Your session has ended. Please log in again.", 401, "NOT_AUTHENTICATED");
  }

  const user = await User.findById(session.user);
  if (!user || !user.isActive || !user.isEmailVerified) {
    clearAuthCookies(res);
    throw new AppError("Please log in again.", 401, "NOT_AUTHENTICATED");
  }

  await issueAuthCookies(req, res, user);
  res.json({ success: true, user: user.toJSON() });
};

// POST /api/auth/logout
export const logout = async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (token) await Session.deleteOne({ tokenHash: hashToken(token) });
  clearAuthCookies(res);
  res.json({ success: true, message: "Logged out." });
};

// GET /api/auth/me
export const getMe = async (req, res) => {
  res.json({ success: true, user: req.user.toJSON() });
};

// POST /api/auth/forgot-password   { email }
export const forgotPassword = async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (user && user.isActive) {
    const token = await createOneTimeToken(user._id, "password_reset", 1);
    await sendPasswordResetEmail(user, `${env.clientUrl}/reset-password?token=${token}`);
    await logActivity(req, { action: "PASSWORD_RESET_REQUESTED", entityType: "auth", user });
  }
  res.json({ success: true, message: GENERIC_EMAIL_MESSAGE });
};

// POST /api/auth/reset-password   { token, password }
export const resetPassword = async (req, res) => {
  const record = await findValidToken(req.body.token, "password_reset");
  if (!record) throw new AppError("This reset link is invalid or has expired.", 400, "INVALID_TOKEN");

  const user = await User.findById(record.user).select("+password");
  if (!user || !user.isActive) throw new AppError("This reset link is invalid.", 400, "INVALID_TOKEN");

  user.password = req.body.password;
  user.isEmailVerified = true; // they proved they own the email by opening the link
  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();

  record.usedAt = new Date();
  await record.save();
  await revokeAllSessions(user._id); // log out every device

  await logActivity(req, { action: "PASSWORD_RESET", entityType: "auth", user });
  await notifyUser(user._id, {
    type: "account",
    title: "Password changed",
    message: "Your password was reset. If this wasn't you, contact the administrator immediately.",
    email: true,
  });

  res.json({ success: true, message: "Password updated. You can now log in." });
};

// PATCH /api/auth/change-password   { currentPassword, newPassword }
export const changePassword = async (req, res) => {
  const user = await User.findById(req.user._id).select("+password");
  if (!(await user.comparePassword(req.body.currentPassword))) {
    throw new AppError("Your current password is incorrect.", 400);
  }
  if (req.body.currentPassword === req.body.newPassword) {
    throw new AppError("The new password must be different from the current one.", 400);
  }

  user.password = req.body.newPassword;
  await user.save();
  await revokeAllSessions(user._id); // other devices are logged out
  await issueAuthCookies(req, res, user); // this device stays logged in

  await logActivity(req, { action: "PASSWORD_CHANGED", entityType: "user", entityId: user._id, user });
  await notifyUser(user._id, {
    type: "account",
    title: "Password changed",
    message: "Your password was changed. Other devices have been logged out.",
    email: true,
  });

  res.json({ success: true, message: "Password changed successfully." });
};

// PATCH /api/auth/profile
export const updateProfile = async (req, res) => {
  const allowed = ["firstName", "lastName", "department", "contactNumber"];
  const user = req.user;
  for (const field of allowed) {
    if (req.body[field] !== undefined) user[field] = req.body[field];
  }
  // Students can add a student ID once, but not change it afterwards
  if (user.role === "student" && !user.studentId && req.body.studentId) {
    if (await User.exists({ studentId: req.body.studentId })) {
      throw new AppError("This student ID is already registered.", 409);
    }
    user.studentId = req.body.studentId;
  }
  await user.save();

  await logActivity(req, { action: "PROFILE_UPDATED", entityType: "user", entityId: user._id });
  res.json({ success: true, message: "Profile updated.", user: user.toJSON() });
};

import User, { ROLES } from "../models/User.js";
import AppError from "../utils/AppError.js";
import { env } from "../config/env.js";
import { generateToken } from "../utils/crypto.js";
import { getPagination, getSort, paginated, searchFilter } from "../utils/query.js";
import { createOneTimeToken, revokeAllSessions } from "../services/token.service.js";
import { sendAccountSetupEmail } from "../services/email.service.js";
import { logActivity } from "../services/activityLog.service.js";
import { notifyUser } from "../services/notification.service.js";

// GET /api/users?role=&status=&q=   (admin)
export const listUsers = async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, 15);
  const filter = searchFilter(req.query.q, ["firstName", "lastName", "email", "studentId"]);

  if (req.query.role === "staff_admin") filter.role = { $in: ["staff", "admin"] };
  else if (ROLES.includes(req.query.role)) filter.role = req.query.role;
  if (req.query.status === "active") filter.isActive = true;
  if (req.query.status === "inactive") filter.isActive = false;
  if (req.query.status === "unverified") filter.isEmailVerified = false;

  const [users, total] = await Promise.all([
    User.find(filter).sort(getSort(req.query.sort, ["createdAt", "lastName", "lastLoginAt"])).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  res.json({ success: true, ...paginated(users, total, page, limit) });
};

// GET /api/users/:id   (admin)
export const getUser = async (req, res) => {
  const user = await User.findById(req.params.id).populate("createdBy", "firstName lastName");
  if (!user) throw new AppError("User not found.", 404);
  res.json({ success: true, user });
};

// POST /api/users   (admin creates staff or admin accounts)
// No password is chosen by the admin. The new user gets an email link to set their own.
export const createUser = async (req, res) => {
  const { firstName, lastName, email, role, department, contactNumber } = req.body;
  if (await User.exists({ email })) throw new AppError("An account with this email already exists.", 409);

  const user = await User.create({
    firstName,
    lastName,
    email,
    role,
    department,
    contactNumber,
    password: generateToken(24), // random, unknown to everyone; replaced when they set their password
    isEmailVerified: false,
    createdBy: req.user._id,
  });

  const token = await createOneTimeToken(user._id, "password_reset", 48);
  await sendAccountSetupEmail(user, `${env.clientUrl}/reset-password?token=${token}&setup=1`);

  await logActivity(req, {
    action: "ACCOUNT_CREATED",
    entityType: "user",
    entityId: user._id,
    description: `${role} account created for ${email}`,
  });
  res.status(201).json({
    success: true,
    message: `${role === "admin" ? "Admin" : "Staff"} account created. A setup link was sent to ${email}.`,
    user,
  });
};

// PATCH /api/users/:id   (admin)  { firstName, lastName, department, contactNumber, role }
export const updateUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError("User not found.", 404);

  const isSelf = String(user._id) === String(req.user._id);
  if (isSelf && req.body.role && req.body.role !== user.role) {
    throw new AppError("You can't change your own role.", 400);
  }

  for (const field of ["firstName", "lastName", "department", "contactNumber"]) {
    if (req.body[field] !== undefined) user[field] = req.body[field];
  }
  const oldRole = user.role;
  if (req.body.role && ROLES.includes(req.body.role)) user.role = req.body.role;
  await user.save();

  if (oldRole !== user.role) await revokeAllSessions(user._id); // must log in again with new permissions
  await logActivity(req, {
    action: "USER_UPDATED",
    entityType: "user",
    entityId: user._id,
    description: oldRole !== user.role ? `${user.email}: role ${oldRole} → ${user.role}` : `${user.email} updated`,
  });
  res.json({ success: true, message: "User updated.", user });
};

// PATCH /api/users/:id/status   (admin)  { isActive }
export const setUserStatus = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError("User not found.", 404);
  if (String(user._id) === String(req.user._id)) throw new AppError("You can't deactivate your own account.", 400);

  user.isActive = Boolean(req.body.isActive);
  await user.save({ validateBeforeSave: false });
  if (!user.isActive) await revokeAllSessions(user._id); // logs them out everywhere

  await logActivity(req, {
    action: user.isActive ? "ACCOUNT_ACTIVATED" : "ACCOUNT_DEACTIVATED",
    entityType: "user",
    entityId: user._id,
    description: user.email,
  });
  if (user.isActive) {
    await notifyUser(user._id, { type: "account", title: "Account activated", message: "Your account has been activated." });
  }
  res.json({ success: true, message: `Account ${user.isActive ? "activated" : "deactivated"}.`, user });
};

// POST /api/users/:id/unlock   (admin) - clears a login lockout
export const unlockUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError("User not found.", 404);
  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  await user.save({ validateBeforeSave: false });
  await logActivity(req, { action: "ACCOUNT_UNLOCKED", entityType: "user", entityId: user._id, description: user.email });
  res.json({ success: true, message: "Account unlocked." });
};

// POST /api/users/:id/resend-setup   (admin) - sends a new set-password link
export const resendSetupLink = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError("User not found.", 404);
  const token = await createOneTimeToken(user._id, "password_reset", 48);
  await sendAccountSetupEmail(user, `${env.clientUrl}/reset-password?token=${token}&setup=1`);
  await logActivity(req, { action: "SETUP_LINK_SENT", entityType: "user", entityId: user._id, description: user.email });
  res.json({ success: true, message: `A new setup link was sent to ${user.email}.` });
};

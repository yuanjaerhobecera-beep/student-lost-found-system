import ActivityLog from "../models/ActivityLog.js";

// Records an important action in the audit log.
// NEVER pass passwords, tokens, or secrets in `metadata`.
export const logActivity = async (
  req,
  { action, entityType, entityId, description, status = "success", user, email, metadata }
) => {
  try {
    const actor = user || req?.user;
    await ActivityLog.create({
      user: actor?._id,
      userEmail: actor?.email || email,
      role: actor?.role,
      action,
      entityType,
      entityId,
      description,
      status,
      ipAddress: req?.ip,
      userAgent: req?.get?.("user-agent")?.slice(0, 300),
      metadata,
    });
  } catch (err) {
    console.error("Activity log failed:", err.message);
  }
};

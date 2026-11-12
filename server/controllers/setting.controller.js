import { getSettings, getPublicSettings, updateSettings } from "../services/settings.service.js";
import { logActivity } from "../services/activityLog.service.js";

// GET /api/settings/public  (anyone)
export const getPublic = async (_req, res) => {
  res.json({ success: true, settings: await getPublicSettings() });
};

// GET /api/settings  (admin)
export const getAll = async (_req, res) => {
  res.json({ success: true, settings: await getSettings() });
};

// PUT /api/settings  (admin) - values are already validated by the route
export const update = async (req, res) => {
  const updates = {};
  const b = req.body;
  if (b.systemName !== undefined) updates.systemName = String(b.systemName).trim();
  if (b.officeLocation !== undefined) updates.officeLocation = String(b.officeLocation).trim();
  if (b.officeHours !== undefined) updates.officeHours = String(b.officeHours).trim();
  if (b.requireSchoolEmail !== undefined) updates.requireSchoolEmail = Boolean(b.requireSchoolEmail);
  if (b.matchScoreThreshold !== undefined) updates.matchScoreThreshold = Number(b.matchScoreThreshold);
  if (b.qrExpiryHours !== undefined) updates.qrExpiryHours = Number(b.qrExpiryHours);
  if (b.allowedEmailDomains !== undefined) {
    updates.allowedEmailDomains = [...new Set(b.allowedEmailDomains.map((d) => String(d).trim().toLowerCase().replace(/^@/, "")))].filter(Boolean);
  }

  const settings = await updateSettings(updates, req.user._id);
  await logActivity(req, {
    action: "SETTINGS_UPDATED",
    entityType: "setting",
    description: `Changed: ${Object.keys(updates).join(", ")}`,
  });
  res.json({ success: true, message: "Settings saved.", settings });
};

import Setting from "../models/Setting.js";
import { env } from "../config/env.js";

// Default values. Admins can change them on the System Settings page.
const defaults = () => ({
  systemName: "Student Lost and Found System",
  allowedEmailDomains: env.allowedEmailDomains,
  requireSchoolEmail: env.allowedEmailDomains.length > 0,
  matchScoreThreshold: 50,
  qrExpiryHours: 72,
  officeLocation: "Lost and Found Office",
  officeHours: "Monday to Friday, 8:00 AM - 5:00 PM",
});

export const SETTING_KEYS = Object.keys(defaults());

export const getSettings = async () => {
  const settings = defaults();
  const saved = await Setting.find({ key: { $in: SETTING_KEYS } }).lean();
  for (const doc of saved) settings[doc.key] = doc.value;
  return settings;
};

// Settings safe to show to anyone (e.g. on the register page)
export const getPublicSettings = async () => {
  const s = await getSettings();
  return {
    systemName: s.systemName,
    allowedEmailDomains: s.requireSchoolEmail ? s.allowedEmailDomains : [],
    officeLocation: s.officeLocation,
    officeHours: s.officeHours,
  };
};

export const updateSettings = async (updates, userId) => {
  for (const [key, value] of Object.entries(updates)) {
    if (!SETTING_KEYS.includes(key)) continue;
    await Setting.findOneAndUpdate(
      { key },
      { $set: { value, updatedBy: userId } },
      { upsert: true }
    );
  }
  return getSettings();
};

export const isEmailDomainAllowed = async (email) => {
  const s = await getSettings();
  if (!s.requireSchoolEmail || !s.allowedEmailDomains?.length) return true;
  const domain = String(email).split("@")[1]?.toLowerCase();
  return s.allowedEmailDomains.includes(domain);
};

// Central place for all settings read from server/.env
// Other files import `env` from here instead of reading process.env directly.

const toList = (value) =>
  (value || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

const toNumber = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",
  port: toNumber(process.env.PORT, 5000),
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",

  mongoUri: process.env.MONGO_URI,
  dbName: process.env.DB_NAME || "student_lost_found",
  dnsServers: toList(process.env.DNS_SERVERS),

  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  accessTokenMinutes: toNumber(process.env.ACCESS_TOKEN_MINUTES, 15),
  refreshTokenDays: toNumber(process.env.REFRESH_TOKEN_DAYS, 7),

  allowedEmailDomains: toList(process.env.ALLOWED_EMAIL_DOMAINS),

  smtp: {
    host: process.env.SMTP_HOST,
    port: toNumber(process.env.SMTP_PORT, 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  emailFrom: process.env.EMAIL_FROM || "Lost and Found <no-reply@example.com>",

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },

  maxUploadMb: toNumber(process.env.MAX_UPLOAD_MB, 5),
};

// Stops the server early with a clear message if an important setting is missing.
export function validateEnv() {
  const problems = [];

  if (!env.mongoUri) problems.push("MONGO_URI is missing.");
  if (!env.jwtAccessSecret) {
    problems.push("JWT_ACCESS_SECRET is missing.");
  } else if (env.jwtAccessSecret.length < 32) {
    problems.push("JWT_ACCESS_SECRET must be at least 32 characters long.");
  }

  if (problems.length > 0) {
    console.error("\n❌ Your server/.env file needs attention:");
    problems.forEach((p) => console.error(`   - ${p}`));
    console.error("   See server/.env.example for every setting.\n");
    process.exit(1);
  }
}

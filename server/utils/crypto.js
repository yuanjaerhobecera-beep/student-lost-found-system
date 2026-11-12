import crypto from "node:crypto";

// Creates a long, random, unguessable token (used for email links, QR codes, sessions).
export const generateToken = (bytes = 32) => crypto.randomBytes(bytes).toString("base64url");

// One-way hash. We store ONLY the hash in the database, never the real token.
// If the database leaks, the attacker cannot use the hashes as tokens.
export const hashToken = (token) =>
  crypto.createHash("sha256").update(String(token)).digest("hex");

// Compares two strings in constant time (prevents timing attacks).
export const safeEqual = (a, b) => {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
};

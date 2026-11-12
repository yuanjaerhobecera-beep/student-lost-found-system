import jwt from "jsonwebtoken";
import Token from "../models/Token.js";
import Session from "../models/Session.js";
import { env } from "../config/env.js";
import { generateToken, hashToken } from "../utils/crypto.js";
import { accessCookieOptions, refreshCookieOptions } from "../utils/cookies.js";

const HOUR = 60 * 60 * 1000;

// ----- Email verification / password reset tokens -----

// Creates a one-time token. Returns the REAL token (to put in the email link);
// only the hash is saved in the database.
export const createOneTimeToken = async (userId, type, hoursValid) => {
  await Token.deleteMany({ user: userId, type }); // old links stop working
  const token = generateToken(32);
  await Token.create({
    user: userId,
    type,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + hoursValid * HOUR),
  });
  return token;
};

// Finds a valid, unused, unexpired token. Returns the token document or null.
export const findValidToken = async (token, type) => {
  if (typeof token !== "string" || token.length < 20 || token.length > 200) return null;
  return Token.findOne({
    tokenHash: hashToken(token),
    type,
    usedAt: null,
    expiresAt: { $gt: new Date() },
  });
};

// ----- Login session tokens -----

const signAccessToken = (user) =>
  jwt.sign({ sub: String(user._id), role: user.role }, env.jwtAccessSecret, {
    expiresIn: `${env.accessTokenMinutes}m`,
    algorithm: "HS256",
  });

// Access token  = short-lived JWT (15 min) used on every request
// Refresh token = long random string (7 days) used only to get a new access token
export const issueAuthCookies = async (req, res, user) => {
  const refreshToken = generateToken(48);
  await Session.create({
    user: user._id,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + env.refreshTokenDays * 24 * HOUR),
    userAgent: req.get("user-agent")?.slice(0, 300),
    ipAddress: req.ip,
  });

  res.cookie("accessToken", signAccessToken(user), accessCookieOptions());
  res.cookie("refreshToken", refreshToken, refreshCookieOptions());
};

export const revokeAllSessions = (userId) => Session.deleteMany({ user: userId });

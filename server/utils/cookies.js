import { env } from "../config/env.js";

// HttpOnly  = JavaScript in the browser cannot read the cookie (protects against XSS theft)
// Secure    = cookie is only sent over HTTPS (turned on in production)
// SameSite  = cookie is not sent with requests from other websites (helps against CSRF)
const base = () => ({
  httpOnly: true,
  secure: env.isProduction,
  sameSite: "strict",
});

// The cookie stays as long as the login session, but the JWT inside it expires after
// ACCESS_TOKEN_MINUTES. The server then replies "TOKEN_EXPIRED" and the app refreshes it.
export const accessCookieOptions = () => ({
  ...base(),
  path: "/",
  maxAge: env.refreshTokenDays * 24 * 60 * 60 * 1000,
});

export const refreshCookieOptions = () => ({
  ...base(),
  path: "/api/auth",
  maxAge: env.refreshTokenDays * 24 * 60 * 60 * 1000,
});

export const csrfCookieOptions = () => ({ ...base(), path: "/" });

export const clearAuthCookies = (res) => {
  res.clearCookie("accessToken", { ...base(), path: "/" });
  res.clearCookie("refreshToken", { ...base(), path: "/api/auth" });
};

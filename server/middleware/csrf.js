import AppError from "../utils/AppError.js";
import { generateToken, safeEqual } from "../utils/crypto.js";
import { csrfCookieOptions } from "../utils/cookies.js";

// CSRF protection (double-submit pattern):
// 1. The app calls GET /api/csrf-token. The server puts a random token in an HttpOnly cookie
//    AND returns the same token in the response.
// 2. The app sends that token back in the "X-CSRF-Token" header on every change request.
// 3. Another website can make the browser send the cookie, but it can't read the token
//    to put in the header, so its request is rejected.

export const issueCsrfToken = (req, res) => {
  const token = req.cookies?.csrfToken || generateToken(24);
  res.cookie("csrfToken", token, csrfCookieOptions());
  res.json({ success: true, csrfToken: token });
};

const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

export const verifyCsrf = (req, _res, next) => {
  if (SAFE_METHODS.includes(req.method)) return next();

  const cookieToken = req.cookies?.csrfToken;
  const headerToken = req.get("x-csrf-token");

  if (!cookieToken || !headerToken || !safeEqual(cookieToken, headerToken)) {
    return next(new AppError("Security token missing or invalid. Please refresh the page.", 403, "CSRF_INVALID"));
  }
  next();
};

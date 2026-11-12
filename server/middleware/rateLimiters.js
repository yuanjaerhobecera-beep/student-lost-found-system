import rateLimit from "express-rate-limit";

const message = (text) => ({ success: false, message: text, code: "RATE_LIMITED" });

// All API routes: 300 requests per 15 minutes per IP
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: message("Too many requests. Please slow down and try again later."),
});

// Login: 10 attempts per 15 minutes per IP (stops password guessing)
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: message("Too many login attempts. Please try again in 15 minutes."),
});

// Registration, emails, password reset: 5 per hour per IP
export const sensitiveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: message("Too many requests. Please try again in an hour."),
});

// Creating reports/claims: 20 per hour per IP
export const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: message("You are submitting too quickly. Please try again later."),
});

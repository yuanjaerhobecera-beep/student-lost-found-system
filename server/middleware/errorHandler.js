import { env } from "../config/env.js";

export const notFound = (req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
};

// Sends clean error messages. Never leaks stack traces or database details in production.
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.isOperational ? err.message : "Something went wrong. Please try again.";
  let code = err.code;
  let errors;

  if (err.name === "ValidationError") {
    statusCode = 422;
    errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    message = errors[0]?.message || "Invalid data.";
  } else if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid ID or value.";
  } else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || "value";
    message = `That ${field} is already in use.`;
    code = "DUPLICATE";
  } else if (err.type === "entity.parse.failed") {
    statusCode = 400;
    message = "Invalid JSON in request.";
  } else if (err.type === "entity.too.large") {
    statusCode = 413;
    message = "Request is too large.";
  }

  if (statusCode >= 500) {
    console.error("💥 Server error:", err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(typeof code === "string" && { code }),
    ...(errors && { errors }),
    ...(!env.isProduction && statusCode >= 500 && { debug: err.message }),
  });
};

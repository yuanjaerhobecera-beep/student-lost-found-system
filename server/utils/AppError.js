// A custom error with an HTTP status code.
// Throw it anywhere in a controller: throw new AppError("Item not found", 404);
// The error handler middleware turns it into a clean JSON response.
export default class AppError extends Error {
  constructor(message, statusCode = 500, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

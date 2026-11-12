import { validationResult, param } from "express-validator";

// Runs after express-validator rules. If any rule failed, send a 422 with the messages.
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const list = errors.array().map((e) => ({ field: e.path, message: e.msg }));
    return res.status(422).json({ success: false, message: list[0].message, errors: list });
  }
  next();
};

// Checks that :id in the URL is a valid MongoDB ObjectId
export const validateId = (name = "id") => [
  param(name).isMongoId().withMessage("Invalid ID."),
  validate,
];

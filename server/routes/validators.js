import { body } from "express-validator";

// Shared validation rules used by several routes

export const emailRule = (field = "email") =>
  body(field).trim().isEmail().withMessage("Please enter a valid email address.").normalizeEmail({ gmail_remove_dots: false }).isLength({ max: 254 });

// At least 8 characters with uppercase, lowercase and a number
export const passwordRule = (field = "password") =>
  body(field)
    .isString()
    .isLength({ min: 8, max: 128 })
    .withMessage("Password must be 8-128 characters.")
    .bail()
    .isStrongPassword({ minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 0 })
    .withMessage("Password must include an uppercase letter, a lowercase letter, and a number.");

export const nameRule = (field, label) =>
  body(field).trim().notEmpty().withMessage(`${label} is required.`).isLength({ max: 50 }).withMessage(`${label} is too long.`)
    .matches(/^[\p{L} .'-]+$/u).withMessage(`${label} contains invalid characters.`);

export const optionalText = (field, max) =>
  body(field).optional({ values: "falsy" }).isString().trim().isLength({ max }).withMessage(`${field} must be at most ${max} characters.`);

export const contactRule = () =>
  body("contactNumber").optional({ values: "falsy" }).trim().matches(/^[0-9+\-\s()]{7,20}$/).withMessage("Please enter a valid contact number.");

export const studentIdRule = () =>
  body("studentId").optional({ values: "falsy" }).trim().matches(/^[A-Za-z0-9-]{3,30}$/).withMessage("Student ID may only contain letters, numbers and dashes.");

// Rules for lost/found item forms. `isUpdate` makes every field optional.
export const itemRules = (dateField, isUpdate = false) => {
  const req = (chain) => (isUpdate ? chain.optional() : chain);
  const timeField = dateField === "dateLost" ? "timeLost" : "timeFound";
  return [
    req(body("itemName")).trim().notEmpty().withMessage("Item name is required.").isLength({ max: 100 }),
    req(body("category")).isMongoId().withMessage("Please choose a category."),
    req(body("description")).trim().isLength({ min: 10, max: 1000 }).withMessage("Description must be 10-1000 characters."),
    req(body(dateField)).isISO8601().withMessage("Please enter a valid date."),
    req(body("location")).isMongoId().withMessage("Please choose a location."),
    body(timeField).optional({ values: "falsy" }).matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage("Time must be in HH:MM format."),
    optionalText("locationDetails", 200),
    optionalText("identifyingDetails", 1000),
    optionalText("storageLocation", 200),
  ];
};

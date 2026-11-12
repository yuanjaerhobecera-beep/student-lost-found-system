import Category from "../models/Category.js";
import CampusLocation from "../models/CampusLocation.js";
import AppError from "../utils/AppError.js";
import { isValidObjectId } from "../utils/query.js";

// Picks only the fields a user is allowed to send for an item report.
export const pickItemFields = (body, dateField) => {
  const fields = {};
  const text = ["itemName", "description", "locationDetails", "identifyingDetails"];
  for (const f of text) if (body[f] !== undefined) fields[f] = String(body[f]).trim();

  if (body.category !== undefined) fields.category = String(body.category);
  if (body.location !== undefined) fields.location = String(body.location);

  const timeField = dateField === "dateLost" ? "timeLost" : "timeFound";
  if (body[timeField] !== undefined) fields[timeField] = String(body[timeField]).trim();
  if (body[dateField] !== undefined) fields[dateField] = new Date(body[dateField]);
  return fields;
};

// Makes sure the chosen category and location exist and are active.
export const checkCategoryAndLocation = async ({ category, location }) => {
  if (category !== undefined) {
    if (!isValidObjectId(category) || !(await Category.exists({ _id: category, isActive: true }))) {
      throw new AppError("Please choose a valid category.", 422);
    }
  }
  if (location !== undefined) {
    if (!isValidObjectId(location) || !(await CampusLocation.exists({ _id: location, isActive: true }))) {
      throw new AppError("Please choose a valid campus location.", 422);
    }
  }
};

// Reads "removeImages" from the form (sent as a JSON string or list of publicIds)
export const parseRemoveImages = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [String(value)];
  }
};

export const POPULATE_PUBLIC = [
  { path: "category", select: "name" },
  { path: "location", select: "name" },
];

export const POPULATE_STAFF = [
  ...POPULATE_PUBLIC,
  { path: "reportedBy", select: "firstName lastName email studentId role contactNumber" },
];

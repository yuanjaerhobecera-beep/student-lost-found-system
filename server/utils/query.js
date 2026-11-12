import mongoose from "mongoose";

// Escapes special characters so user search text is treated as plain text, not a regex.
export const escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Builds a safe "contains" search across several fields.
export const searchFilter = (q, fields) => {
  const text = typeof q === "string" ? q.trim().slice(0, 100) : "";
  if (!text) return {};
  const regex = new RegExp(escapeRegex(text), "i");
  return { $or: fields.map((field) => ({ [field]: regex })) };
};

// Reads ?page= and ?limit= safely.
export const getPagination = (query, defaultLimit = 12, maxLimit = 50) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
};

// Allows only known sort fields, e.g. ?sort=-createdAt
export const getSort = (sortParam, allowedFields, fallback = { createdAt: -1 }) => {
  if (typeof sortParam !== "string" || !sortParam) return fallback;
  const desc = sortParam.startsWith("-");
  const field = desc ? sortParam.slice(1) : sortParam;
  if (!allowedFields.includes(field)) return fallback;
  return { [field]: desc ? -1 : 1 };
};

export const isValidObjectId = (id) =>
  typeof id === "string" && mongoose.Types.ObjectId.isValid(id) && /^[a-f\d]{24}$/i.test(id);

// Returns a date range filter from ?from=YYYY-MM-DD&to=YYYY-MM-DD
export const dateRangeFilter = (field, from, to) => {
  const range = {};
  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;
  if (fromDate && !isNaN(fromDate)) range.$gte = fromDate;
  if (toDate && !isNaN(toDate)) {
    toDate.setHours(23, 59, 59, 999);
    range.$lte = toDate;
  }
  return Object.keys(range).length ? { [field]: range } : {};
};

export const paginated = (items, total, page, limit) => ({
  items,
  pagination: { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) },
});

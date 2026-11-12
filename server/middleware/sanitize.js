// Prevents NoSQL injection.
// Example attack: sending { "email": { "$ne": "" } } to log in without knowing an email.
// This removes any key that starts with "$" or contains "." from the request body and URL params.

const clean = (value) => {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === "object" && !(value instanceof Date) && !Buffer.isBuffer(value)) {
    for (const key of Object.keys(value)) {
      if (key.startsWith("$") || key.includes(".")) {
        delete value[key];
      } else {
        value[key] = clean(value[key]);
      }
    }
  }
  return value;
};

export const sanitizeRequest = (req, _res, next) => {
  if (req.body) clean(req.body);
  if (req.params) clean(req.params);
  next();
};

export { clean as sanitizeObject };

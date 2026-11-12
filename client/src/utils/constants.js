// Labels and colors for every status. Colors are Bootstrap names (primary, success, ...).
export const STATUS = {
  lost: {
    open: { label: "Open", color: "primary" },
    resolved: { label: "Resolved", color: "success" },
    closed: { label: "Closed", color: "secondary" },
  },
  found: {
    pending: { label: "Pending Turnover", color: "warning" },
    available: { label: "Available", color: "primary" },
    claimed: { label: "Claimed", color: "info" },
    released: { label: "Released", color: "success" },
    disposed: { label: "Disposed", color: "secondary" },
  },
  claim: {
    pending: { label: "Pending", color: "warning" },
    under_review: { label: "Under Review", color: "info" },
    info_required: { label: "Info Required", color: "danger" },
    approved: { label: "Approved", color: "success" },
    rejected: { label: "Rejected", color: "secondary" },
    completed: { label: "Completed", color: "dark" },
    cancelled: { label: "Cancelled", color: "light" },
  },
};

export const ROLE_COLORS = { student: "primary", staff: "info", admin: "danger" };

export const PASSWORD_HINT = "At least 8 characters, with an uppercase letter, a lowercase letter, and a number.";
export const isStrongPassword = (pw) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}$/.test(pw);

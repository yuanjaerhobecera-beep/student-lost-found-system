import { Link } from "react-router-dom";
import { STATUS } from "../utils/constants";

// Small reusable building blocks used on many pages.

export function Loading({ text = "Loading..." }) {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center py-5 text-muted">
      <div className="spinner-border text-primary mb-2" role="status" aria-hidden="true"></div>
      <span>{text}</span>
    </div>
  );
}

export function EmptyState({ icon = "bi-inbox", title = "Nothing here yet", message, action }) {
  return (
    <div className="text-center py-5 px-3 text-muted">
      <i aria-hidden="true" className={`bi ${icon} display-5 d-block mb-2 opacity-50`}></i>
      <h6 className="fw-semibold text-body">{title}</h6>
      {message && <p className="mb-3 small">{message}</p>}
      {action}
    </div>
  );
}

export function ErrorAlert({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="alert alert-danger d-flex align-items-center justify-content-between gap-2" role="alert">
      <span>
        <i aria-hidden="true" className="bi bi-exclamation-triangle-fill me-2"></i>
        {message}
      </span>
      {onRetry && (
        <button className="btn btn-sm btn-outline-danger" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function StatusBadge({ type, status }) {
  const info = STATUS[type]?.[status] || { label: status, color: "secondary" };
  return <span className={`badge rounded-pill text-bg-${info.color}`}>{info.label}</span>;
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4">
      <div>
        <h1 className="h4 fw-bold mb-1">{title}</h1>
        {subtitle && <p className="text-muted mb-0 small">{subtitle}</p>}
      </div>
      {children && <div className="d-flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function StatCard({ icon, label, value, color = "primary", to }) {
  const body = (
    <div className="card stat-card h-100 border-0 shadow-sm">
      <div className="card-body d-flex align-items-center gap-3">
        <div className={`stat-icon bg-${color}-subtle text-${color}`}>
          <i aria-hidden="true" className={`bi ${icon}`}></i>
        </div>
        <div>
          <div className="fs-4 fw-bold lh-1">{value ?? 0}</div>
          <div className="text-muted small mt-1">{label}</div>
        </div>
      </div>
    </div>
  );
  return to ? (
    <Link to={to} className="text-decoration-none text-reset d-block h-100">
      {body}
    </Link>
  ) : (
    body
  );
}

export function Pagination({ pagination, onChange }) {
  if (!pagination || pagination.pages <= 1) return null;
  const { page, pages, total } = pagination;
  const nums = [];
  for (let p = Math.max(1, page - 2); p <= Math.min(pages, page + 2); p++) nums.push(p);

  return (
    <nav className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3" aria-label="Pagination">
      <small className="text-muted">
        Page {page} of {pages} · {total} total
      </small>
      <ul className="pagination pagination-sm mb-0">
        <li className={`page-item ${page <= 1 ? "disabled" : ""}`}>
          <button className="page-link" onClick={() => onChange(page - 1)} aria-label="Previous">
            <i aria-hidden="true" className="bi bi-chevron-left"></i>
          </button>
        </li>
        {nums.map((p) => (
          <li key={p} className={`page-item ${p === page ? "active" : ""}`}>
            <button className="page-link" onClick={() => onChange(p)}>
              {p}
            </button>
          </li>
        ))}
        <li className={`page-item ${page >= pages ? "disabled" : ""}`}>
          <button className="page-link" onClick={() => onChange(page + 1)} aria-label="Next">
            <i aria-hidden="true" className="bi bi-chevron-right"></i>
          </button>
        </li>
      </ul>
    </nav>
  );
}

// Shows an item photo, or a placeholder icon when there is no photo
export function ItemImage({ src, alt = "", className = "", height = 160 }) {
  if (!src) {
    return (
      <div className={`item-placeholder d-flex align-items-center justify-content-center ${className}`} style={{ height }}>
        <i aria-hidden="true" className="bi bi-image fs-1"></i>
      </div>
    );
  }
  return <img src={src} alt={alt} className={`object-fit-cover w-100 ${className}`} style={{ height }} loading="lazy" />;
}

export function InfoRow({ label, children }) {
  return (
    <div className="row py-2 border-bottom small">
      <div className="col-sm-4 text-muted">{label}</div>
      <div className="col-sm-8">{children || "-"}</div>
    </div>
  );
}

export function SubmitButton({ loading, children, className = "btn btn-primary", ...props }) {
  return (
    <button type="submit" className={className} disabled={loading} {...props}>
      {loading && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>}
      {children}
    </button>
  );
}

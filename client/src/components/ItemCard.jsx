import { Link } from "react-router-dom";
import { ItemImage, StatusBadge } from "./common";
import { formatDate } from "../utils/format";

// A card showing one lost or found item in a grid
export default function ItemCard({ item, type, to, footer }) {
  const date = type === "lost" ? item.dateLost : item.dateFound;
  return (
    <div className="card item-card h-100 border-0 shadow-sm">
      <Link to={to} className="text-reset text-decoration-none">
        <ItemImage src={item.images?.[0]?.url} alt={item.itemName} className="card-img-top" />
      </Link>
      <div className="card-body d-flex flex-column">
        <div className="d-flex justify-content-between align-items-start gap-2 mb-1">
          <Link to={to} className="text-reset text-decoration-none">
            <h6 className="card-title fw-semibold mb-0 text-break">{item.itemName}</h6>
          </Link>
          <StatusBadge type={type} status={item.status} />
        </div>
        <div className="small text-muted mb-2">
          <i aria-hidden="true" className="bi bi-tag me-1"></i>
          {item.category?.name || "Uncategorized"}
        </div>
        <p className="small text-body-secondary mb-2 line-clamp-2">{item.description}</p>
        <div className="small text-muted mt-auto">
          <div>
            <i aria-hidden="true" className="bi bi-geo-alt me-1"></i>
            {item.location?.name || "-"}
          </div>
          <div>
            <i aria-hidden="true" className="bi bi-calendar-event me-1"></i>
            {type === "lost" ? "Lost" : "Found"} {formatDate(date)}
          </div>
        </div>
      </div>
      {footer && <div className="card-footer bg-transparent border-0 pt-0">{footer}</div>}
    </div>
  );
}

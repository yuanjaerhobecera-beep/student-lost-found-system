import { StatusBadge } from "./common";
import { formatDateTime, fullName } from "../utils/format";

// Shows the history of a claim from newest to oldest
export default function ClaimTimeline({ history = [] }) {
  const items = [...history].reverse();
  return (
    <ul className="timeline list-unstyled mb-0">
      {items.map((h, i) => (
        <li key={i} className="timeline-item">
          <div className="d-flex flex-wrap align-items-center gap-2">
            <StatusBadge type="claim" status={h.status} />
            <small className="text-muted">{formatDateTime(h.at)}</small>
          </div>
          {h.note && <div className="small mt-1">{h.note}</div>}
          {h.by && (
            <div className="small text-muted">
              by {fullName(h.by)} {h.by.role && h.by.role !== "student" ? `(${h.by.role})` : ""}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

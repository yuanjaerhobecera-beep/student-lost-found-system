import { useState } from "react";
import useLookups from "../hooks/useLookups";
import { STATUS } from "../utils/constants";

// Search + filter bar for lost/found item lists.
// `statuses` = which statuses the user may filter by.
export default function ItemFilters({ type, filters, onChange, statuses }) {
  const { categories, locations } = useLookups();
  const [q, setQ] = useState(filters.q || "");
  const [showMore, setShowMore] = useState(false);
  const dateLabel = type === "lost" ? "dateLost" : "dateFound";

  const set = (key, value) => onChange({ ...filters, [key]: value, page: 1 });

  const submitSearch = (e) => {
    e.preventDefault();
    onChange({ ...filters, q: q.trim(), page: 1 });
  };

  const reset = () => {
    setQ("");
    onChange({ page: 1 });
  };

  return (
    <div className="card border-0 shadow-sm mb-3">
      <div className="card-body">
        <form className="row g-2" onSubmit={submitSearch}>
          <div className="col-12 col-md-5">
            <div className="input-group">
              <span className="input-group-text bg-white">
                <i aria-hidden="true" className="bi bi-search"></i>
              </span>
              <input
                type="search"
                className="form-control"
                placeholder="Search item name or description"
                value={q}
                maxLength={100}
                onChange={(e) => setQ(e.target.value)}
              />
              <button className="btn btn-primary" type="submit">
                Search
              </button>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <select className="form-select" value={filters.category || ""} onChange={(e) => set("category", e.target.value)} aria-label="Category">
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-6 col-md-2">
            <select className="form-select" value={filters.location || ""} onChange={(e) => set("location", e.target.value)} aria-label="Location">
              <option value="">All locations</option>
              {locations.map((l) => (
                <option key={l._id} value={l._id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-2 d-flex gap-2">
            <button type="button" className="btn btn-outline-secondary flex-grow-1" onClick={() => setShowMore((s) => !s)}>
              <i aria-hidden="true" className="bi bi-sliders me-1"></i>More
            </button>
            <button type="button" className="btn btn-light" onClick={reset} title="Clear filters" aria-label="Clear filters">
              <i aria-hidden="true" className="bi bi-x-lg"></i>
            </button>
          </div>

          {showMore && (
            <>
              {statuses?.length > 0 && (
                <div className="col-6 col-md-3">
                  <label className="form-label small text-muted mb-1">Status</label>
                  <select className="form-select" value={filters.status || ""} onChange={(e) => set("status", e.target.value)}>
                    <option value="">Default</option>
                    {statuses.map((s) => (
                      <option key={s} value={s}>
                        {STATUS[type][s]?.label || s}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="col-6 col-md-3">
                <label className="form-label small text-muted mb-1">From</label>
                <input type="date" className="form-control" value={filters.from || ""} onChange={(e) => set("from", e.target.value)} />
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label small text-muted mb-1">To</label>
                <input type="date" className="form-control" value={filters.to || ""} onChange={(e) => set("to", e.target.value)} />
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label small text-muted mb-1">Sort by</label>
                <select className="form-select" value={filters.sort || ""} onChange={(e) => set("sort", e.target.value)}>
                  <option value="">Newest reports</option>
                  <option value="createdAt">Oldest reports</option>
                  <option value={`-${dateLabel}`}>Most recent {type === "lost" ? "loss" : "find"} date</option>
                  <option value="itemName">Name (A-Z)</option>
                </select>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

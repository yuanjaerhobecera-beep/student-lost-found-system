import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api, { getErrorMessage } from "../../services/api";
import useBasePath from "../../hooks/useBasePath";
import { Loading, EmptyState, ErrorAlert, PageHeader, Pagination, StatusBadge, ItemImage } from "../../components/common";
import { formatDate, formatDateTime, fullName, timeAgo, cleanParams } from "../../utils/format";

const TABS = [
  ["active", "Needs Action"],
  ["pending", "Pending"],
  ["under_review", "Under Review"],
  ["info_required", "Info Required"],
  ["approved", "Approved"],
  ["rejected", "Rejected"],
  ["completed", "Completed"],
  ["", "All"],
];

// mode = "mine" (student's claims) | "manage" (staff review list) | "releases" (completed releases)
export default function ClaimsListPage({ mode }) {
  const base = useBasePath();
  const [searchParams] = useSearchParams();
  const initialQ = searchParams.get("q") || "";

  const [filters, setFilters] = useState({
    page: 1,
    status: mode === "manage" ? (initialQ ? "" : "active") : mode === "releases" ? "completed" : "",
    q: initialQ,
    ...(mode === "releases" && { sort: "-releasedAt" }),
  });
  const [search, setSearch] = useState(initialQ);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const url = mode === "mine" ? "/claims/mine" : "/claims";
      const res = await api.get(url, { params: cleanParams(filters) });
      setData(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [mode, filters]);

  useEffect(() => {
    load();
  }, [load]);

  const titles = {
    mine: ["My Claims", "Track the status of items you've claimed."],
    manage: ["Review Claims", "Verify ownership before approving. Approving one claim automatically rejects other open claims for the same item."],
    releases: ["Item Release Records", "Items released to their owners after QR verification."],
  };

  return (
    <>
      <PageHeader title={titles[mode][0]} subtitle={titles[mode][1]}>
        {mode !== "mine" && (
          <Link to={`${base}/verify-qr`} className="btn btn-primary">
            <i aria-hidden="true" className="bi bi-qr-code-scan me-1"></i>Verify QR Code
          </Link>
        )}
        {mode === "mine" && (
          <Link to={`${base}/found-items`} className="btn btn-primary">
            <i aria-hidden="true" className="bi bi-box-seam me-1"></i>Browse Found Items
          </Link>
        )}
      </PageHeader>

      {mode === "manage" && (
        <ul className="nav nav-pills flex-nowrap overflow-auto mb-3 pb-1">
          {TABS.map(([value, label]) => (
            <li key={label} className="nav-item">
              <button className={`nav-link text-nowrap ${filters.status === value ? "active" : ""}`} onClick={() => setFilters({ ...filters, status: value, page: 1 })}>
                {label}
              </button>
            </li>
          ))}
        </ul>
      )}

      {mode !== "mine" && (
        <form
          className="row g-2 mb-3"
          onSubmit={(e) => {
            e.preventDefault();
            setFilters({ ...filters, q: search.trim(), page: 1 });
          }}
        >
          <div className="col-md-6">
            <div className="input-group">
              <input type="search" className="form-control" placeholder="Search item, student name, email or ID" value={search} maxLength={100} onChange={(e) => setSearch(e.target.value)} />
              <button className="btn btn-primary" type="submit"><i aria-hidden="true" className="bi bi-search"></i></button>
            </div>
          </div>
          {mode === "releases" && (
            <>
              <div className="col-6 col-md-3">
                <input type="date" className="form-control" aria-label="From" value={filters.from || ""} onChange={(e) => setFilters({ ...filters, from: e.target.value, page: 1 })} />
              </div>
              <div className="col-6 col-md-3">
                <input type="date" className="form-control" aria-label="To" value={filters.to || ""} onChange={(e) => setFilters({ ...filters, to: e.target.value, page: 1 })} />
              </div>
            </>
          )}
        </form>
      )}

      {mode === "mine" && (
        <div className="mb-3" style={{ maxWidth: 260 }}>
          <select className="form-select" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })} aria-label="Filter by status">
            <option value="">All claims</option>
            {TABS.slice(1, -1).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      )}

      <ErrorAlert message={error} onRetry={load} />

      {loading ? (
        <Loading />
      ) : !data?.items.length ? (
        <div className="card border-0 shadow-sm">
          <EmptyState
            icon="bi-clipboard"
            title="No claims found"
            message={mode === "mine" ? "When you find your item in the found items list, submit a claim from its page." : "Nothing to show for this filter."}
          />
        </div>
      ) : mode === "mine" ? (
        <div className="list-group shadow-sm">
          {data.items.map((c) => (
            <Link key={c._id} to={`${base}/claims/${c._id}`} className="list-group-item list-group-item-action d-flex align-items-center gap-3 py-3">
              <div className="table-thumb overflow-hidden flex-shrink-0" style={{ width: 56, height: 56 }}>
                <ItemImage src={c.foundItem?.images?.[0]?.url} height={56} />
              </div>
              <div className="flex-grow-1 min-w-0">
                <div className="fw-semibold text-truncate">{c.foundItem?.itemName || "Item"}</div>
                <small className="text-muted">Submitted {formatDate(c.createdAt)} · updated {timeAgo(c.updatedAt)}</small>
                {c.status === "info_required" && <div className="small text-danger fw-semibold">Staff need more information from you</div>}
                {c.status === "approved" && <div className="small text-success fw-semibold">Approved! Open to get your QR code</div>}
              </div>
              <StatusBadge type="claim" status={c.status} />
            </Link>
          ))}
        </div>
      ) : (
        <div className="card border-0 shadow-sm">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>Item</th>
                  <th>Claimant</th>
                  {mode === "manage" ? (
                    <>
                      <th className="d-none d-md-table-cell">Submitted</th>
                      <th>Status</th>
                      <th className="d-none d-lg-table-cell">Reviewed By</th>
                    </>
                  ) : (
                    <>
                      <th>Released</th>
                      <th className="d-none d-md-table-cell">Released By</th>
                      <th className="d-none d-lg-table-cell">Notes</th>
                    </>
                  )}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((c) => (
                  <tr key={c._id}>
                    <td className="fw-semibold">{c.foundItem?.itemName}</td>
                    <td className="small">
                      {fullName(c.claimant)}
                      <div className="text-muted">{c.claimant?.studentId || c.claimant?.email}</div>
                    </td>
                    {mode === "manage" ? (
                      <>
                        <td className="d-none d-md-table-cell small">{timeAgo(c.createdAt)}</td>
                        <td><StatusBadge type="claim" status={c.status} /></td>
                        <td className="d-none d-lg-table-cell small">{c.reviewedBy ? fullName(c.reviewedBy) : <span className="text-muted">-</span>}</td>
                      </>
                    ) : (
                      <>
                        <td className="small">{formatDateTime(c.releasedAt)}</td>
                        <td className="d-none d-md-table-cell small">{fullName(c.releasedBy)}</td>
                        <td className="d-none d-lg-table-cell small text-muted">{c.releaseNotes || "-"}</td>
                      </>
                    )}
                    <td className="text-end">
                      <Link to={`${base}/claims/${c._id}`} className="btn btn-sm btn-outline-primary">
                        {mode === "manage" && ["pending", "under_review", "info_required"].includes(c.status) ? "Review" : "View"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination pagination={data?.pagination} onChange={(page) => setFilters({ ...filters, page })} />
    </>
  );
}

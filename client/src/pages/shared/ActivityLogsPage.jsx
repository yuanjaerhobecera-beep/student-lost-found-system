import { useCallback, useEffect, useState } from "react";
import api, { getErrorMessage } from "../../services/api";
import useAuth from "../../hooks/useAuth";
import { Loading, EmptyState, ErrorAlert, PageHeader, Pagination } from "../../components/common";
import { formatDateTime, fullName, humanize, cleanParams } from "../../utils/format";

const ENTITY_TYPES = ["auth", "user", "lost_item", "found_item", "claim", "category", "location", "setting", "notification"];

export default function ActivityLogsPage() {
  const { user } = useAuth();
  const isAdmin = user.role === "admin";
  const [filters, setFilters] = useState({ page: 1 });
  const [search, setSearch] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/activity-logs", { params: cleanParams(filters) });
      setData(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (key, value) => setFilters({ ...filters, [key]: value, page: 1 });

  return (
    <>
      <PageHeader
        title="Activity Logs"
        subtitle={isAdmin ? "A record of important actions across the system." : "Item and claim activity relevant to your work."}
      />

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <form
            className="row g-2"
            onSubmit={(e) => {
              e.preventDefault();
              set("q", search.trim());
            }}
          >
            <div className="col-md-4">
              <div className="input-group">
                <input type="search" className="form-control" placeholder="Search email or description" value={search} maxLength={100} onChange={(e) => setSearch(e.target.value)} />
                <button className="btn btn-primary" type="submit" aria-label="Search"><i aria-hidden="true" className="bi bi-search"></i></button>
              </div>
            </div>
            <div className="col-6 col-md-2">
              <select className="form-select" value={filters.action || ""} onChange={(e) => set("action", e.target.value)} aria-label="Action">
                <option value="">All actions</option>
                {data?.actions?.map((a) => (
                  <option key={a} value={a}>{humanize(a)}</option>
                ))}
              </select>
            </div>
            {isAdmin && (
              <div className="col-6 col-md-2">
                <select className="form-select" value={filters.entityType || ""} onChange={(e) => set("entityType", e.target.value)} aria-label="Type">
                  <option value="">All types</option>
                  {ENTITY_TYPES.map((t) => (
                    <option key={t} value={t}>{humanize(t)}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="col-6 col-md-2">
              <select className="form-select" value={filters.status || ""} onChange={(e) => set("status", e.target.value)} aria-label="Result">
                <option value="">Any result</option>
                <option value="success">Success</option>
                <option value="failure">Failure</option>
              </select>
            </div>
            <div className="col-6 col-md-1">
              <input type="date" className="form-control px-1" aria-label="From" value={filters.from || ""} onChange={(e) => set("from", e.target.value)} />
            </div>
            <div className="col-6 col-md-1">
              <input type="date" className="form-control px-1" aria-label="To" value={filters.to || ""} onChange={(e) => set("to", e.target.value)} />
            </div>
          </form>
        </div>
      </div>

      <ErrorAlert message={error} onRetry={load} />
      {loading && !data ? (
        <Loading />
      ) : !data?.items.length ? (
        <div className="card border-0 shadow-sm">
          <EmptyState icon="bi-clock-history" title="No activity found" />
        </div>
      ) : (
        <div className="card border-0 shadow-sm">
          <div className="table-responsive">
            <table className="table table-sm table-hover mb-0 small">
              <thead className="table-light">
                <tr>
                  <th>Time</th>
                  <th>User</th>
                  <th>Action</th>
                  <th className="d-none d-md-table-cell">Details</th>
                  <th>Result</th>
                  {isAdmin && <th className="d-none d-lg-table-cell">IP Address</th>}
                </tr>
              </thead>
              <tbody>
                {data.items.map((log) => (
                  <tr key={log._id}>
                    <td className="text-nowrap">{formatDateTime(log.createdAt)}</td>
                    <td>
                      {log.user ? fullName(log.user) : <span className="text-muted">{log.userEmail || "Unknown"}</span>}
                      {log.role && <div className="text-muted">{log.role}</div>}
                    </td>
                    <td className="fw-semibold">{humanize(log.action)}</td>
                    <td className="d-none d-md-table-cell text-body-secondary">{log.description || "-"}</td>
                    <td>
                      <span className={`badge text-bg-${log.status === "failure" ? "danger" : "success"}`}>{log.status}</span>
                    </td>
                    {isAdmin && <td className="d-none d-lg-table-cell text-muted">{log.ipAddress}</td>}
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

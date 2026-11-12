import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { getErrorMessage } from "../../services/api";
import { Loading, EmptyState, ErrorAlert, PageHeader, Pagination, StatusBadge, ItemImage } from "../../components/common";
import { formatDate } from "../../utils/format";

export default function MyReportsPage() {
  const [tab, setTab] = useState("lost");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/${tab}-items/mine`, { params: { page, limit: 10 } });
      setData(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [tab, page]);

  useEffect(() => {
    load();
  }, [load]);

  const switchTab = (t) => {
    setTab(t);
    setPage(1);
    setData(null);
  };

  return (
    <>
      <PageHeader title="My Reports" subtitle="Items you've reported as lost or found.">
        <Link to={`/student/report-${tab}`} className="btn btn-primary">
          <i aria-hidden="true" className="bi bi-plus-lg me-1"></i>New {tab === "lost" ? "Lost" : "Found"} Report
        </Link>
      </PageHeader>

      <ul className="nav nav-tabs mb-3">
        {[["lost", "Lost Items"], ["found", "Found Items"]].map(([t, label]) => (
          <li key={t} className="nav-item">
            <button className={`nav-link ${tab === t ? "active" : ""}`} onClick={() => switchTab(t)}>{label}</button>
          </li>
        ))}
      </ul>

      <ErrorAlert message={error} onRetry={load} />
      {loading ? (
        <Loading />
      ) : !data?.items.length ? (
        <div className="card border-0 shadow-sm">
          <EmptyState
            icon="bi-journal-text"
            title={`No ${tab} item reports`}
            action={<Link to={`/student/report-${tab}`} className="btn btn-sm btn-primary">Create one</Link>}
          />
        </div>
      ) : (
        <div className="list-group shadow-sm">
          {data.items.map((item) => (
            <Link key={item._id} to={`/student/items/${tab}/${item._id}`} className="list-group-item list-group-item-action d-flex align-items-center gap-3 py-3">
              <div className="table-thumb overflow-hidden flex-shrink-0" style={{ width: 56, height: 56 }}>
                <ItemImage src={item.images?.[0]?.url} height={56} />
              </div>
              <div className="flex-grow-1">
                <div className="fw-semibold">{item.itemName}</div>
                <small className="text-muted">
                  {item.category?.name} · {item.location?.name} · {formatDate(tab === "lost" ? item.dateLost : item.dateFound)}
                </small>
              </div>
              <StatusBadge type={tab} status={item.status} />
            </Link>
          ))}
        </div>
      )}
      <Pagination pagination={data?.pagination} onChange={setPage} />
    </>
  );
}

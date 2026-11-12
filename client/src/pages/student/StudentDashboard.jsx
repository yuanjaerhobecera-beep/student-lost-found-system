import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { getErrorMessage } from "../../services/api";
import useAuth from "../../hooks/useAuth";
import { Loading, ErrorAlert, StatCard, StatusBadge, EmptyState } from "../../components/common";
import { formatDate, timeAgo } from "../../utils/format";

export default function StudentDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await api.get("/dashboard/student");
      setData(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <ErrorAlert message={error} onRetry={load} />;
  if (!data) return <Loading />;
  const s = data.stats;

  return (
    <>
      <div className="mb-4">
        <h1 className="h4 fw-bold mb-1">Hi, {user.firstName}! 👋</h1>
        <p className="text-muted mb-0">Here's what's happening with your reports and claims.</p>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-6 col-xl-3"><StatCard icon="bi-question-circle" label="Open lost reports" value={s.openLostReports} color="danger" to="/student/my-reports" /></div>
        <div className="col-6 col-xl-3"><StatCard icon="bi-shuffle" label="Possible matches" value={s.possibleMatches} color="warning" to="/student/my-reports" /></div>
        <div className="col-6 col-xl-3"><StatCard icon="bi-hourglass-split" label="Claims in progress" value={s.activeClaims} color="info" to="/student/claims" /></div>
        <div className="col-6 col-xl-3"><StatCard icon="bi-patch-check" label="Ready for pickup" value={s.approvedClaims} color="success" to="/student/claims?status=approved" /></div>
      </div>

      {s.approvedClaims > 0 && (
        <div className="alert alert-success d-flex align-items-center gap-2">
          <i aria-hidden="true" className="bi bi-qr-code fs-4"></i>
          <div className="flex-grow-1">You have an approved claim. Open it to get your QR code for pickup.</div>
          <Link to="/student/claims" className="btn btn-sm btn-success">View</Link>
        </div>
      )}

      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <Link to="/student/report-lost" className="card border-0 shadow-sm text-decoration-none h-100">
            <div className="card-body d-flex align-items-center gap-3">
              <div className="stat-icon bg-danger-subtle text-danger"><i aria-hidden="true" className="bi bi-megaphone"></i></div>
              <div>
                <div className="fw-semibold text-body">I lost something</div>
                <small className="text-muted">Report it and get notified about matches</small>
              </div>
              <i aria-hidden="true" className="bi bi-chevron-right ms-auto text-muted"></i>
            </div>
          </Link>
        </div>
        <div className="col-md-6">
          <Link to="/student/report-found" className="card border-0 shadow-sm text-decoration-none h-100">
            <div className="card-body d-flex align-items-center gap-3">
              <div className="stat-icon bg-primary-subtle text-primary"><i aria-hidden="true" className="bi bi-hand-thumbs-up"></i></div>
              <div>
                <div className="fw-semibold text-body">I found something</div>
                <small className="text-muted">Help return it to its owner</small>
              </div>
              <i aria-hidden="true" className="bi bi-chevron-right ms-auto text-muted"></i>
            </div>
          </Link>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white d-flex justify-content-between align-items-center">
              <span className="fw-semibold">Recent claims</span>
              <Link to="/student/claims" className="small">View all</Link>
            </div>
            {data.recentClaims.length === 0 ? (
              <EmptyState icon="bi-clipboard" title="No claims yet" message="Browse found items to see if yours was turned in." />
            ) : (
              <ul className="list-group list-group-flush">
                {data.recentClaims.map((c) => (
                  <Link key={c._id} to={`/student/claims/${c._id}`} className="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                    <div>
                      <div className="fw-semibold">{c.foundItem?.itemName}</div>
                      <small className="text-muted">Updated {timeAgo(c.updatedAt)}</small>
                    </div>
                    <StatusBadge type="claim" status={c.status} />
                  </Link>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white d-flex justify-content-between align-items-center">
              <span className="fw-semibold">My lost item reports</span>
              <Link to="/student/my-reports" className="small">View all</Link>
            </div>
            {data.recentLost.length === 0 ? (
              <EmptyState icon="bi-journal" title="No lost reports" />
            ) : (
              <ul className="list-group list-group-flush">
                {data.recentLost.map((l) => (
                  <Link key={l._id} to={`/student/items/lost/${l._id}`} className="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                    <div>
                      <div className="fw-semibold">{l.itemName}</div>
                      <small className="text-muted">Lost {formatDate(l.dateLost)} · {l.location?.name}</small>
                    </div>
                    <StatusBadge type="lost" status={l.status} />
                  </Link>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

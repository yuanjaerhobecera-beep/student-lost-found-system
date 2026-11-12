import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { getErrorMessage } from "../../services/api";
import useAuth from "../../hooks/useAuth";
import { Loading, ErrorAlert, StatCard, StatusBadge, EmptyState, PageHeader } from "../../components/common";
import { fullName, timeAgo, humanize } from "../../utils/format";

export default function StaffDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await api.get("/dashboard/staff");
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
      <PageHeader title={`Good day, ${user.firstName}`} subtitle="Items and claims that need your attention.">
        <Link to="/staff/verify-qr" className="btn btn-primary">
          <i aria-hidden="true" className="bi bi-qr-code-scan me-1"></i>Verify QR
        </Link>
        <Link to="/staff/report-found" className="btn btn-outline-primary">
          <i aria-hidden="true" className="bi bi-plus-lg me-1"></i>Record Found Item
        </Link>
      </PageHeader>

      <div className="row g-3 mb-4">
        <div className="col-6 col-lg-3"><StatCard icon="bi-inbox" label="Items awaiting turnover" value={s.pendingFoundItems} color="warning" to="/staff/found-items" /></div>
        <div className="col-6 col-lg-3"><StatCard icon="bi-clipboard" label="New claims" value={s.pendingClaims} color="danger" to="/staff/claims" /></div>
        <div className="col-6 col-lg-3"><StatCard icon="bi-search" label="Claims under review" value={s.underReview} color="info" to="/staff/claims" /></div>
        <div className="col-6 col-lg-3"><StatCard icon="bi-patch-check" label="Approved, awaiting pickup" value={s.approvedClaims} color="success" to="/staff/claims" /></div>
        <div className="col-6 col-lg-3"><StatCard icon="bi-box-seam" label="Items available" value={s.availableItems} color="primary" to="/staff/found-items" /></div>
        <div className="col-6 col-lg-3"><StatCard icon="bi-question-circle" label="Open lost reports" value={s.openLostReports} color="secondary" to="/staff/lost-items" /></div>
        <div className="col-6 col-lg-3"><StatCard icon="bi-x-circle" label="Rejected claims" value={s.rejectedClaims} color="secondary" /></div>
        <div className="col-6 col-lg-3"><StatCard icon="bi-box-arrow-up-right" label="Released today" value={s.releasedToday} color="success" to="/staff/releases" /></div>
      </div>

      <div className="row g-4">
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white d-flex justify-content-between">
              <span className="fw-semibold">Claims waiting for review</span>
              <Link to="/staff/claims" className="small">View all</Link>
            </div>
            {data.pendingClaims.length === 0 ? (
              <EmptyState icon="bi-check2-all" title="All caught up!" />
            ) : (
              <ul className="list-group list-group-flush">
                {data.pendingClaims.map((c) => (
                  <Link key={c._id} to={`/staff/claims/${c._id}`} className="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                    <div>
                      <div className="fw-semibold">{c.foundItem?.itemName}</div>
                      <small className="text-muted">{fullName(c.claimant)} · {timeAgo(c.createdAt)}</small>
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
            <div className="card-header bg-white d-flex justify-content-between">
              <span className="fw-semibold">Found items to receive</span>
              <Link to="/staff/found-items" className="small">View all</Link>
            </div>
            {data.pendingItems.length === 0 ? (
              <EmptyState icon="bi-inbox" title="No items waiting" />
            ) : (
              <ul className="list-group list-group-flush">
                {data.pendingItems.map((i) => (
                  <Link key={i._id} to={`/staff/items/found/${i._id}`} className="list-group-item list-group-item-action">
                    <div className="fw-semibold">{i.itemName}</div>
                    <small className="text-muted">Reported by {fullName(i.reportedBy)} · {i.location?.name} · {timeAgo(i.createdAt)}</small>
                  </Link>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white d-flex justify-content-between">
              <span className="fw-semibold">Recent activity</span>
              <Link to="/staff/activity-logs" className="small">View logs</Link>
            </div>
            <ul className="list-group list-group-flush small">
              {data.recentActivity.map((a) => (
                <li key={a._id} className="list-group-item d-flex justify-content-between gap-2">
                  <span>
                    <b>{humanize(a.action)}</b> {a.description && `· ${a.description}`}
                    <span className="text-muted"> by {a.user ? fullName(a.user) : a.userEmail}</span>
                  </span>
                  <span className="text-muted text-nowrap">{timeAgo(a.createdAt)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}

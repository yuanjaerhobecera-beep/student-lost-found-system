import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Line, Doughnut } from "react-chartjs-2";
import api, { getErrorMessage } from "../../services/api";
import { Loading, ErrorAlert, StatCard, PageHeader } from "../../components/common";
import { fullName, timeAgo, humanize } from "../../utils/format";
import { STATUS } from "../../utils/constants";
import { CHART_COLORS } from "../../utils/chartSetup";

const BOOTSTRAP_HEX = { primary: "#0d6efd", warning: "#ffc107", info: "#0dcaf0", danger: "#dc3545", success: "#198754", secondary: "#6c757d", dark: "#212529", light: "#ced4da" };

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await api.get("/dashboard/admin");
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

  const lineData = {
    labels: data.monthly.labels,
    datasets: [
      { label: "Lost reports", data: data.monthly.lost, borderColor: CHART_COLORS.lost, backgroundColor: CHART_COLORS.lost, tension: 0.3 },
      { label: "Found reports", data: data.monthly.found, borderColor: CHART_COLORS.found, backgroundColor: CHART_COLORS.found, tension: 0.3 },
      { label: "Items released", data: data.monthly.released, borderColor: CHART_COLORS.released, backgroundColor: CHART_COLORS.released, tension: 0.3 },
    ],
  };

  const claimKeys = Object.keys(data.claimsByStatus);
  const doughnutData = {
    labels: claimKeys.map((k) => STATUS.claim[k]?.label || k),
    datasets: [{ data: claimKeys.map((k) => data.claimsByStatus[k]), backgroundColor: claimKeys.map((k) => BOOTSTRAP_HEX[STATUS.claim[k]?.color] || "#999") }],
  };

  return (
    <>
      <PageHeader title="Admin Dashboard" subtitle="System overview and security monitoring.">
        <Link to="/admin/reports" className="btn btn-outline-primary">
          <i aria-hidden="true" className="bi bi-bar-chart-line me-1"></i>Reports
        </Link>
      </PageHeader>

      {(s.failedLogins24h >= 10 || s.lockedAccounts > 0) && (
        <div className="alert alert-warning d-flex align-items-center gap-2">
          <i aria-hidden="true" className="bi bi-shield-exclamation fs-4"></i>
          <div className="flex-grow-1">
            <b>Security notice:</b> {s.failedLogins24h} failed login attempt(s) in the last 24 hours, {s.lockedAccounts} account(s) currently locked.
          </div>
          <Link to="/admin/activity-logs" className="btn btn-sm btn-warning">Review</Link>
        </div>
      )}

      <div className="row g-3 mb-4">
        <div className="col-6 col-lg-3"><StatCard icon="bi-people" label="Total users" value={s.totalUsers} color="primary" to="/admin/users" /></div>
        <div className="col-6 col-lg-3"><StatCard icon="bi-mortarboard" label="Students" value={s.totalStudents} color="info" to="/admin/users" /></div>
        <div className="col-6 col-lg-3"><StatCard icon="bi-person-badge" label="Staff" value={s.totalStaff} color="secondary" to="/admin/staff" /></div>
        <div className="col-6 col-lg-3"><StatCard icon="bi-graph-up-arrow" label="Recovery rate" value={`${s.recoveryRate}%`} color="success" to="/admin/reports" /></div>
        <div className="col-6 col-lg-3"><StatCard icon="bi-question-circle" label="Lost items" value={s.totalLostItems} color="danger" to="/admin/lost-items" /></div>
        <div className="col-6 col-lg-3"><StatCard icon="bi-box-seam" label="Found items" value={s.totalFoundItems} color="primary" to="/admin/found-items" /></div>
        <div className="col-6 col-lg-3"><StatCard icon="bi-hourglass-split" label="Pending claims" value={s.pendingClaims} color="warning" to="/admin/claims" /></div>
        <div className="col-6 col-lg-3"><StatCard icon="bi-check2-circle" label="Completed claims" value={s.completedClaims} color="success" to="/admin/releases" /></div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white fw-semibold">Last 6 months</div>
            <div className="card-body" style={{ height: 300 }}>
              <Line data={lineData} options={{ maintainAspectRatio: false, plugins: { legend: { position: "bottom" } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }} />
            </div>
          </div>
        </div>
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white fw-semibold">Claims by status</div>
            <div className="card-body d-flex align-items-center justify-content-center" style={{ height: 300 }}>
              {claimKeys.length ? (
                <Doughnut data={doughnutData} options={{ maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } }} />
              ) : (
                <span className="text-muted small">No claims yet</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white d-flex justify-content-between">
              <span className="fw-semibold">Recent system activity</span>
              <Link to="/admin/activity-logs" className="small">View all</Link>
            </div>
            <ul className="list-group list-group-flush small">
              {data.recentActivity.map((a) => (
                <li key={a._id} className="list-group-item d-flex justify-content-between gap-2">
                  <span>
                    <b>{humanize(a.action)}</b> {a.description && `· ${a.description}`}
                    <span className="text-muted"> by {a.user ? fullName(a.user) : a.userEmail || "system"}</span>
                  </span>
                  <span className="text-muted text-nowrap">{timeAgo(a.createdAt)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="col-lg-5">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white d-flex justify-content-between">
              <span className="fw-semibold"><i aria-hidden="true" className="bi bi-shield-exclamation me-1 text-danger"></i>Suspicious activity</span>
              <Link to="/admin/activity-logs" className="small">Investigate</Link>
            </div>
            <div className="card-body pb-0">
              <div className="row text-center g-2 mb-3">
                <div className="col-6"><div className="fs-4 fw-bold text-danger">{s.failedLogins24h}</div><small className="text-muted">Failed logins (24h)</small></div>
                <div className="col-6"><div className="fs-4 fw-bold text-warning">{s.lockedAccounts}</div><small className="text-muted">Locked accounts</small></div>
              </div>
            </div>
            <ul className="list-group list-group-flush small">
              {data.recentFailures.length === 0 && <li className="list-group-item text-muted">No failed actions recorded.</li>}
              {data.recentFailures.map((f) => (
                <li key={f._id} className="list-group-item">
                  <div className="d-flex justify-content-between">
                    <b>{humanize(f.action)}</b>
                    <span className="text-muted">{timeAgo(f.createdAt)}</span>
                  </div>
                  <div className="text-muted">{f.userEmail || "unknown"} · {f.description} · {f.ipAddress}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}

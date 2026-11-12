import { useCallback, useEffect, useState } from "react";
import { Bar, Line } from "react-chartjs-2";
import api, { getErrorMessage } from "../../services/api";
import { Loading, ErrorAlert, PageHeader, StatCard } from "../../components/common";
import { cleanParams } from "../../utils/format";
import { CHART_COLORS } from "../../utils/chartSetup";

export default function ReportsPage() {
  const [range, setRange] = useState({ from: "", to: "" });
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/reports/summary", { params: cleanParams(range) });
      setData(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  // The browser downloads the CSV directly; the login cookie is sent automatically
  const exportUrl = (type) => `/api/reports/export?${new URLSearchParams(cleanParams({ type, ...range }))}`;

  return (
    <>
      <PageHeader title="Reports & Analytics" subtitle="Lost and found statistics. Pick a date range or leave it empty for all time.">
        <div className="dropdown">
          <details className="position-relative">
            <summary className="btn btn-outline-primary list-unstyled">
              <i aria-hidden="true" className="bi bi-download me-1"></i>Export CSV
            </summary>
            <div className="dropdown-menu show position-absolute end-0 mt-1">
              <a className="dropdown-item" href={exportUrl("lost")}>Lost items</a>
              <a className="dropdown-item" href={exportUrl("found")}>Found items</a>
              <a className="dropdown-item" href={exportUrl("claims")}>Claims</a>
            </div>
          </details>
        </div>
      </PageHeader>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body row g-2 align-items-end">
          <div className="col-6 col-md-3">
            <label className="form-label small">From</label>
            <input type="date" className="form-control" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label small">To</label>
            <input type="date" className="form-control" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
          </div>
          <div className="col-md-3">
            <button className="btn btn-light" onClick={() => setRange({ from: "", to: "" })}>All time</button>
          </div>
        </div>
      </div>

      <ErrorAlert message={error} onRetry={load} />
      {loading && !data ? (
        <Loading />
      ) : data && (
        <>
          <div className="row g-3 mb-4">
            <div className="col-6 col-lg-2"><StatCard icon="bi-question-circle" label="Lost reports" value={data.summary.totalLost} color="danger" /></div>
            <div className="col-6 col-lg-2"><StatCard icon="bi-box-seam" label="Found reports" value={data.summary.totalFound} color="primary" /></div>
            <div className="col-6 col-lg-2"><StatCard icon="bi-clipboard" label="Claims" value={data.summary.totalClaims} color="warning" /></div>
            <div className="col-6 col-lg-2"><StatCard icon="bi-box-arrow-up-right" label="Released" value={data.summary.released} color="success" /></div>
            <div className="col-6 col-lg-2"><StatCard icon="bi-graph-up-arrow" label="Recovery rate" value={`${data.summary.recoveryRate}%`} color="success" /></div>
            <div className="col-6 col-lg-2"><StatCard icon="bi-stopwatch" label="Avg. days to release" value={data.summary.avgDaysToRelease} color="info" /></div>
          </div>

          <div className="row g-4">
            <div className="col-lg-7">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-white fw-semibold">Items by category</div>
                <div className="card-body" style={{ height: 340 }}>
                  <Bar
                    data={{
                      labels: data.byCategory.map((c) => c.name),
                      datasets: [
                        { label: "Lost", data: data.byCategory.map((c) => c.lost), backgroundColor: CHART_COLORS.lost },
                        { label: "Found", data: data.byCategory.map((c) => c.found), backgroundColor: CHART_COLORS.found },
                      ],
                    }}
                    options={{ maintainAspectRatio: false, indexAxis: "y", plugins: { legend: { position: "bottom" } }, scales: { x: { beginAtZero: true, ticks: { precision: 0 } } } }}
                  />
                </div>
              </div>
            </div>
            <div className="col-lg-5">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-white fw-semibold">Top locations</div>
                <div className="table-responsive">
                  <table className="table table-sm mb-0">
                    <thead className="table-light">
                      <tr><th>Location</th><th className="text-end">Lost</th><th className="text-end">Found</th></tr>
                    </thead>
                    <tbody>
                      {data.byLocation.length === 0 && (
                        <tr><td colSpan={3} className="text-muted small">No data for this range.</td></tr>
                      )}
                      {data.byLocation.slice(0, 10).map((l) => (
                        <tr key={l.name}><td>{l.name}</td><td className="text-end">{l.lost}</td><td className="text-end">{l.found}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="col-12">
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-white fw-semibold">Last 12 months</div>
                <div className="card-body" style={{ height: 300 }}>
                  <Line
                    data={{
                      labels: data.monthly.labels,
                      datasets: [
                        { label: "Lost", data: data.monthly.lost, borderColor: CHART_COLORS.lost, backgroundColor: CHART_COLORS.lost, tension: 0.3 },
                        { label: "Found", data: data.monthly.found, borderColor: CHART_COLORS.found, backgroundColor: CHART_COLORS.found, tension: 0.3 },
                        { label: "Released", data: data.monthly.released, borderColor: CHART_COLORS.released, backgroundColor: CHART_COLORS.released, tension: 0.3 },
                      ],
                    }}
                    options={{ maintainAspectRatio: false, plugins: { legend: { position: "bottom" } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }}
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

import { useEffect, useState } from "react";
import api from "../../services/api";

const SECURITY = [
  "Passwords are hashed with bcrypt and never stored as plain text",
  "Login sessions use secure HttpOnly cookies with automatic expiry",
  "Email verification is required for every student account",
  "Role-based access control protects staff and administrator functions",
  "Private item details are visible only to the owner and authorized staff",
  "Single-use QR codes, verified by the server, are required to release items",
  "Rate limiting, input validation and activity logs protect against abuse",
];

export default function AboutPage() {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    api.get("/settings/public").then((res) => setSettings(res.data.settings)).catch(() => {});
  }, []);

  return (
    <div className="container py-5" style={{ maxWidth: 900 }}>
      <h1 className="h3 fw-bold mb-3">About the System</h1>
      <p className="lead text-muted">
        The Web-Based Secured Student Lost and Found System gives the campus one trusted place to report, search, and recover lost
        belongings.
      </p>

      <div className="row g-4 mt-2">
        <div className="col-md-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h5 className="fw-semibold">
                <i aria-hidden="true" className="bi bi-people me-2 text-brand"></i>Who uses it
              </h5>
              <ul className="mb-0">
                <li><b>Students</b> report lost and found items, search, and submit claims.</li>
                <li><b>Staff</b> receive found items, review claims, and release items using QR verification.</li>
                <li><b>Administrators</b> manage accounts, categories, locations, settings, and reports.</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h5 className="fw-semibold">
                <i aria-hidden="true" className="bi bi-geo-alt me-2 text-brand"></i>Lost and Found Office
              </h5>
              <p className="mb-1">
                <b>Location:</b> {settings?.officeLocation || "-"}
              </p>
              <p className="mb-0">
                <b>Hours:</b> {settings?.officeHours || "-"}
              </p>
              <p className="small text-muted mt-3 mb-0">Bring a valid school ID and your claim QR code when picking up an item.</p>
            </div>
          </div>
        </div>
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h5 className="fw-semibold">
                <i aria-hidden="true" className="bi bi-shield-lock me-2 text-brand"></i>How we keep it secure
              </h5>
              <ul className="list-unstyled mb-0">
                {SECURITY.map((s) => (
                  <li key={s} className="mb-1">
                    <i aria-hidden="true" className="bi bi-check2-circle text-success me-2"></i>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

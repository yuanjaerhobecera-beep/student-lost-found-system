import { Link } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

const STEPS = [
  { icon: "bi-megaphone", color: "primary", title: "Report", text: "Lost something? Found something? Submit a report with photos in under a minute." },
  { icon: "bi-shuffle", color: "warning", title: "Match", text: "The system compares lost and found reports and notifies you about possible matches." },
  { icon: "bi-shield-check", color: "success", title: "Verify & Claim", text: "Staff verify ownership. You receive a one-time QR code to pick up your item." },
];

const FEATURES = [
  { icon: "bi-search", title: "Search & filter", text: "Find items by name, category, campus location, and date." },
  { icon: "bi-bell", title: "Real-time notifications", text: "Get notified instantly about matches and claim updates." },
  { icon: "bi-qr-code", title: "QR verification", text: "Secure, single-use QR codes make sure items go to the right owner." },
  { icon: "bi-lock", title: "Secure by design", text: "Encrypted passwords, verified accounts, and full activity logs." },
];

export default function HomePage() {
  const { user } = useAuth();

  return (
    <>
      <section className="hero py-5">
        <div className="container py-lg-5">
          <div className="row align-items-center g-4">
            <div className="col-lg-7">
              <span className="badge bg-light text-brand mb-3">For students, by the campus community</span>
              <h1 className="display-5 fw-bold mb-3">Lost something on campus? Let's get it back to you.</h1>
              <p className="lead opacity-75 mb-4">
                A secure, centralized place to report lost belongings, turn in found items, and claim what's yours.
              </p>
              <div className="d-flex flex-wrap gap-2">
                {user ? (
                  <Link to={`/${user.role}`} className="btn btn-light btn-lg">
                    <i aria-hidden="true" className="bi bi-speedometer2 me-2"></i>Go to Dashboard
                  </Link>
                ) : (
                  <>
                    <Link to="/register" className="btn btn-light btn-lg">
                      Get Started
                    </Link>
                    <Link to="/login" className="btn btn-outline-light btn-lg">
                      Log In
                    </Link>
                  </>
                )}
              </div>
            </div>
            <div className="col-lg-5 d-none d-lg-block text-center">
              <i aria-hidden="true" className="bi bi-box2-heart" style={{ fontSize: "11rem", opacity: 0.85 }}></i>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-5">
        <h2 className="h3 fw-bold text-center mb-4">How it works</h2>
        <div className="row g-4">
          {STEPS.map((s, i) => (
            <div key={s.title} className="col-md-4">
              <div className="card h-100 border-0 shadow-sm text-center p-3">
                <div className="card-body">
                  <div className={`feature-icon bg-${s.color}-subtle text-${s.color} mb-3`}>
                    <i aria-hidden="true" className={`bi ${s.icon}`}></i>
                  </div>
                  <h5 className="fw-semibold">
                    {i + 1}. {s.title}
                  </h5>
                  <p className="text-muted mb-0">{s.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white border-top border-bottom py-5">
        <div className="container">
          <div className="row g-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="col-sm-6 col-lg-3">
                <i aria-hidden="true" className={`bi ${f.icon} fs-3 text-brand`}></i>
                <h6 className="fw-semibold mt-2">{f.title}</h6>
                <p className="text-muted small mb-0">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container py-5 text-center">
        <h2 className="h4 fw-bold">Found something that isn't yours?</h2>
        <p className="text-muted">Report it and bring it to the Lost and Found office. Thank you for being honest!</p>
        <Link to={user ? `/${user.role}` : "/register"} className="btn btn-primary">
          Report a Found Item
        </Link>
      </section>
    </>
  );
}

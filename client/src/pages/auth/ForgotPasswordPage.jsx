import { useState } from "react";
import { Link } from "react-router-dom";
import api, { getErrorMessage } from "../../services/api";
import { SubmitButton } from "../../components/common";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email: email.trim() });
      setMessage(data.message);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container px-3">
      <div className="card auth-card border-0 shadow-sm">
        <div className="card-body p-4 p-md-5">
          <div className="text-center mb-4">
            <i aria-hidden="true" className="bi bi-key display-5 text-brand"></i>
            <h1 className="h4 fw-bold mt-2">Forgot your password?</h1>
            <p className="text-muted small mb-0">Enter your email and we'll send you a reset link.</p>
          </div>

          {message ? (
            <div className="alert alert-success small">
              <i aria-hidden="true" className="bi bi-envelope-check me-2"></i>
              {message} The link expires in 1 hour.
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && <div className="alert alert-danger small">{error}</div>}
              <label htmlFor="email" className="form-label">Email address</label>
              <input id="email" type="email" className="form-control mb-3" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <SubmitButton loading={loading} className="btn btn-primary w-100">Send Reset Link</SubmitButton>
            </form>
          )}

          <p className="text-center small mt-4 mb-0">
            <Link to="/login"><i aria-hidden="true" className="bi bi-arrow-left me-1"></i>Back to login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

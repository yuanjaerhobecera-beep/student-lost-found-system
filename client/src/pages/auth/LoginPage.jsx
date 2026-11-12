import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import api, { getErrorMessage } from "../../services/api";
import useAuth from "../../hooks/useAuth";
import useToast from "../../hooks/useToast";
import { SubmitButton } from "../../components/common";

export default function LoginPage() {
  const { user, login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resending, setResending] = useState(false);

  if (user) return <Navigate to={`/${user.role}`} replace />;

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setNeedsVerification(false);
    setLoading(true);
    try {
      const loggedIn = await login(form.email.trim(), form.password);
      showToast(`Welcome back, ${loggedIn.firstName}!`);
      const from = location.state?.from;
      navigate(from && from.startsWith(`/${loggedIn.role}`) ? from : `/${loggedIn.role}`, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
      if (err.response?.data?.code === "EMAIL_NOT_VERIFIED") setNeedsVerification(true);
    } finally {
      setLoading(false);
    }
  };

  const resendVerification = async () => {
    setResending(true);
    try {
      const { data } = await api.post("/auth/resend-verification", { email: form.email.trim() });
      showToast(data.message, "info");
    } catch (err) {
      showToast(getErrorMessage(err), "danger");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="container px-3">
      <div className="card auth-card border-0 shadow-sm">
        <div className="card-body p-4 p-md-5">
          <div className="text-center mb-4">
            <i aria-hidden="true" className="bi bi-person-circle display-5 text-brand"></i>
            <h1 className="h4 fw-bold mt-2">Log in</h1>
            <p className="text-muted small mb-0">Access your Lost and Found account</p>
          </div>

          {error && (
            <div className="alert alert-danger small" role="alert">
              {error}
              {needsVerification && (
                <div className="mt-2">
                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={resendVerification} disabled={resending}>
                    {resending ? "Sending..." : "Resend verification email"}
                  </button>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <label htmlFor="email" className="form-label">Email address</label>
              <input id="email" name="email" type="email" className="form-control" autoComplete="email" required value={form.email} onChange={handleChange} />
            </div>
            <div className="mb-2">
              <label htmlFor="password" className="form-label">Password</label>
              <div className="input-group">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  className="form-control"
                  autoComplete="current-password"
                  required
                  value={form.password}
                  onChange={handleChange}
                />
                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>
                  <i aria-hidden="true" className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`}></i>
                </button>
              </div>
            </div>
            <div className="text-end mb-3">
              <Link to="/forgot-password" className="small">Forgot password?</Link>
            </div>
            <SubmitButton loading={loading} className="btn btn-primary w-100" disabled={loading || !form.email || !form.password}>
              Log in
            </SubmitButton>
          </form>

          <p className="text-center small text-muted mt-4 mb-0">
            New student? <Link to="/register">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

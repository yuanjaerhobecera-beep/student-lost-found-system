import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api, { getErrorMessage } from "../../services/api";
import { SubmitButton } from "../../components/common";
import { PASSWORD_HINT, isStrongPassword } from "../../utils/constants";

// Used for "forgot password" AND for new staff accounts setting their first password (?setup=1)
export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const isSetup = params.get("setup") === "1";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!isStrongPassword(password)) return setError(PASSWORD_HINT);
    if (password !== confirm) return setError("Passwords do not match.");
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      setDone(true);
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
            <i aria-hidden="true" className={`bi ${isSetup ? "bi-person-check" : "bi-shield-lock"} display-5 text-brand`}></i>
            <h1 className="h4 fw-bold mt-2">{isSetup ? "Set up your account" : "Choose a new password"}</h1>
          </div>

          {!token ? (
            <div className="alert alert-danger small">
              This link is invalid. <Link to="/forgot-password">Request a new one</Link>.
            </div>
          ) : done ? (
            <div className="text-center">
              <div className="alert alert-success small">Your password has been saved.</div>
              <Link to="/login" className="btn btn-primary">Log in</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              {error && <div className="alert alert-danger small">{error}</div>}
              <div className="mb-3">
                <label htmlFor="password" className="form-label">New password</label>
                <input id="password" type="password" className="form-control" autoComplete="new-password" maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} />
                <div className="form-text">{PASSWORD_HINT}</div>
              </div>
              <div className="mb-3">
                <label htmlFor="confirm" className="form-label">Confirm password</label>
                <input id="confirm" type="password" className="form-control" autoComplete="new-password" maxLength={128} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
              <SubmitButton loading={loading} className="btn btn-primary w-100">Save Password</SubmitButton>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

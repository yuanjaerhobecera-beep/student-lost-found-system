import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api, { getErrorMessage } from "../../services/api";
import { Loading, SubmitButton } from "../../components/common";

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState(token ? "loading" : "error");
  const [message, setMessage] = useState(token ? "" : "This verification link is missing its token.");
  const [email, setEmail] = useState("");
  const [resendMsg, setResendMsg] = useState("");
  const [sending, setSending] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    // React StrictMode runs effects twice in development; the token can only be used once.
    if (!token || started.current) return;
    started.current = true;
    api
      .post("/auth/verify-email", { token })
      .then((res) => {
        setStatus("success");
        setMessage(res.data.message);
      })
      .catch((err) => {
        setStatus("error");
        setMessage(getErrorMessage(err));
      });
  }, [token]);

  const resend = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const { data } = await api.post("/auth/resend-verification", { email });
      setResendMsg(data.message);
    } catch (err) {
      setResendMsg(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="container px-3">
      <div className="card auth-card border-0 shadow-sm text-center">
        <div className="card-body p-5">
          {status === "loading" && <Loading text="Verifying your email..." />}
          {status === "success" && (
            <>
              <i aria-hidden="true" className="bi bi-patch-check-fill display-4 text-success"></i>
              <h1 className="h4 fw-bold mt-3">Email verified!</h1>
              <p className="text-muted">{message}</p>
              <Link to="/login" className="btn btn-primary">Log in now</Link>
            </>
          )}
          {status === "error" && (
            <>
              <i aria-hidden="true" className="bi bi-x-octagon-fill display-4 text-danger"></i>
              <h1 className="h4 fw-bold mt-3">Verification failed</h1>
              <p className="text-muted">{message}</p>
              <form onSubmit={resend} className="text-start mt-4">
                <label htmlFor="email" className="form-label small">Get a new verification link</label>
                <div className="input-group">
                  <input id="email" type="email" className="form-control" placeholder="Your email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  <SubmitButton loading={sending}>Send</SubmitButton>
                </div>
                {resendMsg && <div className="form-text">{resendMsg}</div>}
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

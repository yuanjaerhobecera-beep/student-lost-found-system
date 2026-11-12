import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import api, { getErrorMessage } from "../../services/api";
import useAuth from "../../hooks/useAuth";
import { SubmitButton } from "../../components/common";
import { PASSWORD_HINT, isStrongPassword } from "../../utils/constants";

const EMPTY = { firstName: "", lastName: "", email: "", studentId: "", department: "", contactNumber: "", password: "", confirmPassword: "" };

export default function RegisterPage() {
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState("");
  const [domains, setDomains] = useState([]);

  useEffect(() => {
    api.get("/settings/public").then((res) => setDomains(res.data.settings.allowedEmailDomains || [])).catch(() => {});
  }, []);

  if (user) return <Navigate to={`/${user.role}`} replace />;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
  };

  // Check the form in the browser first (the server checks again)
  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = "First name is required.";
    if (!form.lastName.trim()) e.lastName = "Last name is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email address.";
    else if (domains.length && !domains.includes(form.email.split("@")[1]?.toLowerCase())) {
      e.email = `Use your school email (${domains.map((d) => "@" + d).join(", ")}).`;
    }
    if (form.studentId && !/^[A-Za-z0-9-]{3,30}$/.test(form.studentId)) e.studentId = "Letters, numbers and dashes only.";
    if (!isStrongPassword(form.password)) e.password = PASSWORD_HINT;
    if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    if (!validate()) return;
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", form);
      setDone(data.message);
    } catch (err) {
      setServerError(getErrorMessage(err));
      const fieldErrors = err.response?.data?.errors;
      if (fieldErrors) setErrors(Object.fromEntries(fieldErrors.map((f) => [f.field, f.message])));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="container px-3">
        <div className="card auth-card border-0 shadow-sm text-center">
          <div className="card-body p-5">
            <i aria-hidden="true" className="bi bi-envelope-check display-4 text-success"></i>
            <h1 className="h4 fw-bold mt-3">Check your email</h1>
            <p className="text-muted">{done}</p>
            <p className="small text-muted">The link expires in 24 hours. Check your spam folder if you don't see it.</p>
            <Link to="/login" className="btn btn-primary">Go to Login</Link>
          </div>
        </div>
      </div>
    );
  }

  const field = (name, label, props = {}) => (
    <div className={props.col || "col-12"}>
      <label htmlFor={name} className="form-label">
        {label} {props.optional && <span className="text-muted small">(optional)</span>}
      </label>
      <input
        id={name}
        name={name}
        className={`form-control ${errors[name] ? "is-invalid" : ""}`}
        value={form[name]}
        onChange={handleChange}
        type={props.type || "text"}
        autoComplete={props.autoComplete}
        maxLength={props.maxLength || 100}
      />
      {errors[name] && <div className="invalid-feedback">{errors[name]}</div>}
      {props.help && !errors[name] && <div className="form-text">{props.help}</div>}
    </div>
  );

  return (
    <div className="container px-3">
      <div className="card auth-card border-0 shadow-sm" style={{ maxWidth: 620 }}>
        <div className="card-body p-4 p-md-5">
          <div className="text-center mb-4">
            <h1 className="h4 fw-bold">Create a student account</h1>
            <p className="text-muted small mb-0">Staff accounts are created by the administrator.</p>
          </div>
          {serverError && <div className="alert alert-danger small">{serverError}</div>}

          <form onSubmit={handleSubmit} noValidate className="row g-3">
            {field("firstName", "First name", { col: "col-md-6", autoComplete: "given-name", maxLength: 50 })}
            {field("lastName", "Last name", { col: "col-md-6", autoComplete: "family-name", maxLength: 50 })}
            {field("email", "School email", {
              type: "email",
              autoComplete: "email",
              help: domains.length ? `Must end with ${domains.map((d) => "@" + d).join(" or ")}` : "You'll need to verify this email.",
            })}
            {field("studentId", "Student ID", { col: "col-md-6", optional: true, maxLength: 30 })}
            {field("contactNumber", "Contact number", { col: "col-md-6", optional: true, type: "tel", maxLength: 20 })}
            {field("department", "Course / Department", { optional: true })}
            {field("password", "Password", { col: "col-md-6", type: "password", autoComplete: "new-password", help: PASSWORD_HINT, maxLength: 128 })}
            {field("confirmPassword", "Confirm password", { col: "col-md-6", type: "password", autoComplete: "new-password", maxLength: 128 })}
            <div className="col-12">
              <SubmitButton loading={loading} className="btn btn-primary w-100">Create Account</SubmitButton>
            </div>
          </form>

          <p className="text-center small text-muted mt-4 mb-0">
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

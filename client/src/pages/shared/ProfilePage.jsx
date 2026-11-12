import { useState } from "react";
import api, { getErrorMessage } from "../../services/api";
import useAuth from "../../hooks/useAuth";
import useToast from "../../hooks/useToast";
import { PageHeader, SubmitButton } from "../../components/common";
import { PASSWORD_HINT, isStrongPassword, ROLE_COLORS } from "../../utils/constants";
import { formatDateTime } from "../../utils/format";

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const { showToast } = useToast();

  const [profile, setProfile] = useState({
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    studentId: user.studentId || "",
    department: user.department || "",
    contactNumber: user.contactNumber || "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");

  const [pw, setPw] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [savingPw, setSavingPw] = useState(false);
  const [pwError, setPwError] = useState("");

  const saveProfile = async (e) => {
    e.preventDefault();
    setProfileError("");
    setSavingProfile(true);
    try {
      const body = { ...profile };
      if (user.role !== "student" || user.studentId) delete body.studentId;
      const { data } = await api.patch("/auth/profile", body);
      setUser(data.user);
      showToast("Profile updated.");
    } catch (err) {
      setProfileError(getErrorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setPwError("");
    if (!isStrongPassword(pw.newPassword)) return setPwError(PASSWORD_HINT);
    if (pw.newPassword !== pw.confirm) return setPwError("New passwords do not match.");
    setSavingPw(true);
    try {
      await api.patch("/auth/change-password", { currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      setPw({ currentPassword: "", newPassword: "", confirm: "" });
      showToast("Password changed. Other devices were logged out.");
    } catch (err) {
      setPwError(getErrorMessage(err));
    } finally {
      setSavingPw(false);
    }
  };

  const input = (name, label, props = {}) => (
    <div className={props.col || "col-md-6"}>
      <label htmlFor={name} className="form-label">{label}</label>
      <input
        id={name}
        className="form-control"
        value={profile[name]}
        disabled={props.disabled}
        maxLength={props.maxLength || 100}
        onChange={(e) => setProfile({ ...profile, [name]: e.target.value })}
      />
      {props.help && <div className="form-text">{props.help}</div>}
    </div>
  );

  return (
    <div style={{ maxWidth: 900 }}>
      <PageHeader title="My Profile" subtitle="Manage your personal information and password." />
      <div className="row g-4">
        <div className="col-lg-7">
          <form className="card border-0 shadow-sm" onSubmit={saveProfile}>
            <div className="card-body row g-3">
              <div className="col-12 d-flex align-items-center gap-3">
                <span className="avatar" style={{ width: 56, height: 56, fontSize: "1.2rem" }}>
                  {user.firstName?.[0]}{user.lastName?.[0]}
                </span>
                <div>
                  <div className="fw-semibold">{user.email}</div>
                  <span className={`badge text-bg-${ROLE_COLORS[user.role]} text-uppercase`}>{user.role}</span>
                  <div className="small text-muted">Last login: {formatDateTime(user.lastLoginAt)}</div>
                </div>
              </div>
              {profileError && <div className="col-12"><div className="alert alert-danger small mb-0">{profileError}</div></div>}
              {input("firstName", "First name", { maxLength: 50 })}
              {input("lastName", "Last name", { maxLength: 50 })}
              {user.role === "student" &&
                input("studentId", "Student ID", {
                  disabled: Boolean(user.studentId),
                  maxLength: 30,
                  help: user.studentId ? "Contact the administrator to change your student ID." : "You can add this once.",
                })}
              {input("contactNumber", "Contact number", { maxLength: 20 })}
              {input("department", user.role === "student" ? "Course / Department" : "Department / Office", { col: "col-12" })}
            </div>
            <div className="card-footer bg-white text-end py-3">
              <SubmitButton loading={savingProfile}>Save Profile</SubmitButton>
            </div>
          </form>
        </div>

        <div className="col-lg-5">
          <form className="card border-0 shadow-sm" onSubmit={changePassword} noValidate>
            <div className="card-body">
              <h6 className="fw-semibold mb-3"><i aria-hidden="true" className="bi bi-key me-2"></i>Change password</h6>
              {pwError && <div className="alert alert-danger small">{pwError}</div>}
              <div className="mb-3">
                <label htmlFor="currentPassword" className="form-label">Current password</label>
                <input id="currentPassword" type="password" className="form-control" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
              </div>
              <div className="mb-3">
                <label htmlFor="newPassword" className="form-label">New password</label>
                <input id="newPassword" type="password" className="form-control" autoComplete="new-password" maxLength={128} value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />
                <div className="form-text">{PASSWORD_HINT}</div>
              </div>
              <div className="mb-3">
                <label htmlFor="confirm" className="form-label">Confirm new password</label>
                <input id="confirm" type="password" className="form-control" autoComplete="new-password" maxLength={128} value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
              </div>
              <SubmitButton loading={savingPw} className="btn btn-outline-primary w-100" disabled={savingPw || !pw.currentPassword}>
                Change Password
              </SubmitButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

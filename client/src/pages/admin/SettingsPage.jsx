import { useEffect, useState } from "react";
import api, { getErrorMessage } from "../../services/api";
import useToast from "../../hooks/useToast";
import { Loading, ErrorAlert, PageHeader, SubmitButton } from "../../components/common";

export default function SettingsPage() {
  const { showToast } = useToast();
  const [form, setForm] = useState(null);
  const [domainsText, setDomainsText] = useState("");
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [announcement, setAnnouncement] = useState({ title: "", message: "", audience: "all" });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api
      .get("/settings")
      .then(({ data }) => {
        setForm(data.settings);
        setDomainsText((data.settings.allowedEmailDomains || []).join(", "));
      })
      .catch((err) => setLoadError(getErrorMessage(err)));
  }, []);

  if (loadError) return <ErrorAlert message={loadError} />;
  if (!form) return <Loading />;

  const save = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const allowedEmailDomains = domainsText.split(/[\s,]+/).map((d) => d.trim().replace(/^@/, "")).filter(Boolean);
      const { data } = await api.put("/settings", {
        systemName: form.systemName,
        officeLocation: form.officeLocation,
        officeHours: form.officeHours,
        requireSchoolEmail: form.requireSchoolEmail,
        allowedEmailDomains,
        matchScoreThreshold: Number(form.matchScoreThreshold),
        qrExpiryHours: Number(form.qrExpiryHours),
      });
      setForm(data.settings);
      setDomainsText(data.settings.allowedEmailDomains.join(", "));
      showToast("Settings saved.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const sendAnnouncement = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const { data } = await api.post("/notifications/announcement", announcement);
      showToast(data.message);
      setAnnouncement({ title: "", message: "", audience: "all" });
    } catch (err) {
      showToast(getErrorMessage(err), "danger");
    } finally {
      setSending(false);
    }
  };

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  return (
    <div style={{ maxWidth: 900 }}>
      <PageHeader title="System Settings" subtitle="Changes apply immediately to the whole system." />

      <form className="card border-0 shadow-sm mb-4" onSubmit={save}>
        <div className="card-body row g-3">
          <ErrorAlert message={error} />
          <div className="col-12"><h6 className="fw-semibold mb-0">General</h6></div>
          <div className="col-md-12">
            <label className="form-label">System name</label>
            <input className="form-control" maxLength={100} value={form.systemName} onChange={set("systemName")} />
          </div>
          <div className="col-md-6">
            <label className="form-label">Lost and Found office location</label>
            <input className="form-control" maxLength={150} value={form.officeLocation} onChange={set("officeLocation")} />
          </div>
          <div className="col-md-6">
            <label className="form-label">Office hours</label>
            <input className="form-control" maxLength={150} value={form.officeHours} onChange={set("officeHours")} />
          </div>

          <div className="col-12 mt-4"><h6 className="fw-semibold mb-0">Registration</h6></div>
          <div className="col-12">
            <div className="form-check form-switch">
              <input id="requireSchoolEmail" className="form-check-input" type="checkbox" checked={form.requireSchoolEmail} onChange={set("requireSchoolEmail")} />
              <label htmlFor="requireSchoolEmail" className="form-check-label">Only allow school email addresses to register</label>
            </div>
          </div>
          <div className="col-12">
            <label className="form-label">Allowed email domains</label>
            <input className="form-control" placeholder="e.g. yourschool.edu.ph" value={domainsText} disabled={!form.requireSchoolEmail} onChange={(e) => setDomainsText(e.target.value)} />
            <div className="form-text">Separate several domains with commas. Example: yourschool.edu.ph, student.yourschool.edu.ph</div>
          </div>

          <div className="col-12 mt-4"><h6 className="fw-semibold mb-0">Matching & QR verification</h6></div>
          <div className="col-md-6">
            <label className="form-label">Minimum match score (20-100)</label>
            <input type="number" min={20} max={100} className="form-control" value={form.matchScoreThreshold} onChange={set("matchScoreThreshold")} />
            <div className="form-text">Lower = more suggestions, but less accurate.</div>
          </div>
          <div className="col-md-6">
            <label className="form-label">QR code valid for (hours)</label>
            <input type="number" min={1} max={720} className="form-control" value={form.qrExpiryHours} onChange={set("qrExpiryHours")} />
          </div>
        </div>
        <div className="card-footer bg-white text-end py-3">
          <SubmitButton loading={saving}>Save Settings</SubmitButton>
        </div>
      </form>

      <form className="card border-0 shadow-sm" onSubmit={sendAnnouncement}>
        <div className="card-body">
          <h6 className="fw-semibold"><i aria-hidden="true" className="bi bi-megaphone me-2"></i>Send an announcement</h6>
          <p className="small text-muted">Appears as a notification for the selected users right away.</p>
          <div className="row g-2">
            <div className="col-md-8">
              <input className="form-control" placeholder="Title" maxLength={150} required value={announcement.title} onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })} />
            </div>
            <div className="col-md-4">
              <select className="form-select" value={announcement.audience} onChange={(e) => setAnnouncement({ ...announcement, audience: e.target.value })}>
                <option value="all">Everyone</option>
                <option value="student">Students</option>
                <option value="staff">Staff</option>
                <option value="admin">Admins</option>
              </select>
            </div>
            <div className="col-12">
              <textarea className="form-control" rows={3} placeholder="Message" maxLength={1000} required value={announcement.message} onChange={(e) => setAnnouncement({ ...announcement, message: e.target.value })} />
            </div>
          </div>
        </div>
        <div className="card-footer bg-white text-end py-3">
          <SubmitButton loading={sending} className="btn btn-outline-primary" disabled={sending || announcement.title.trim().length < 3 || announcement.message.trim().length < 5}>
            Send Announcement
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}

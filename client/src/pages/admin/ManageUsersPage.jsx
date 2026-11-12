import { useCallback, useEffect, useState } from "react";
import api, { getErrorMessage } from "../../services/api";
import useAuth from "../../hooks/useAuth";
import useToast from "../../hooks/useToast";
import ConfirmModal from "../../components/ConfirmModal";
import { Loading, EmptyState, ErrorAlert, PageHeader, Pagination } from "../../components/common";
import { formatDate, timeAgo, fullName, cleanParams } from "../../utils/format";
import { ROLE_COLORS } from "../../utils/constants";

const EMPTY_STAFF = { firstName: "", lastName: "", email: "", role: "staff", department: "", contactNumber: "" };

// mode = "students" (Manage Students) | "staff" (Manage Staff & Admins)
export default function ManageUsersPage({ mode }) {
  const { user: me } = useAuth();
  const { showToast } = useToast();
  const [filters, setFilters] = useState({ page: 1, role: mode === "students" ? "student" : "staff_admin" });
  const [search, setSearch] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [confirm, setConfirm] = useState(null); // { user, action }
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null); // user being edited, or "new"
  const [form, setForm] = useState(EMPTY_STAFF);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/users", { params: cleanParams(filters) });
      setData(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const runConfirm = async () => {
    const { user, action } = confirm;
    setBusy(true);
    try {
      let res;
      if (action === "activate" || action === "deactivate") res = await api.patch(`/users/${user._id}/status`, { isActive: action === "activate" });
      if (action === "unlock") res = await api.post(`/users/${user._id}/unlock`);
      if (action === "resend") res = await api.post(`/users/${user._id}/resend-setup`);
      showToast(res.data.message);
      setConfirm(null);
      load();
    } catch (err) {
      showToast(getErrorMessage(err), "danger");
    } finally {
      setBusy(false);
    }
  };

  const openEditor = (user) => {
    setFormError("");
    setEditing(user || "new");
    setForm(
      user
        ? { firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role, department: user.department || "", contactNumber: user.contactNumber || "" }
        : EMPTY_STAFF
    );
  };

  const saveUser = async () => {
    setFormError("");
    setBusy(true);
    try {
      if (editing === "new") {
        const { data } = await api.post("/users", form);
        showToast(data.message);
      } else {
        const { email: _email, ...body } = form;
        await api.patch(`/users/${editing._id}`, body);
        showToast("User updated.");
      }
      setEditing(null);
      load();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const confirmText = {
    activate: ["Activate this account?", "The user will be able to log in again.", "success"],
    deactivate: ["Deactivate this account?", "The user will be logged out everywhere and won't be able to log in.", "danger"],
    unlock: ["Unlock this account?", "This clears the lockout from failed login attempts.", "primary"],
    resend: ["Send a new setup link?", "The user will receive an email to set their password.", "primary"],
  }[confirm?.action] || [];

  return (
    <>
      <PageHeader
        title={mode === "students" ? "Manage Students" : "Manage Staff & Admins"}
        subtitle={mode === "students" ? "View, activate or deactivate student accounts." : "Create authorized staff accounts. New users receive an email to set their own password."}
      >
        {mode === "staff" && (
          <button className="btn btn-primary" onClick={() => openEditor(null)}>
            <i aria-hidden="true" className="bi bi-person-plus me-1"></i>Create Account
          </button>
        )}
      </PageHeader>

      <form
        className="row g-2 mb-3"
        onSubmit={(e) => {
          e.preventDefault();
          setFilters({ ...filters, q: search.trim(), page: 1 });
        }}
      >
        <div className="col-md-6">
          <div className="input-group">
            <input type="search" className="form-control" placeholder={`Search name, email${mode === "students" ? " or student ID" : ""}`} value={search} maxLength={100} onChange={(e) => setSearch(e.target.value)} />
            <button className="btn btn-primary" type="submit" aria-label="Search"><i aria-hidden="true" className="bi bi-search"></i></button>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <select className="form-select" value={filters.status || ""} onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })} aria-label="Status">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="unverified">Unverified</option>
          </select>
        </div>
        {mode === "staff" && (
          <div className="col-6 col-md-3">
            <select className="form-select" value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value, page: 1 })} aria-label="Role">
              <option value="staff_admin">Staff & Admins</option>
              <option value="staff">Staff only</option>
              <option value="admin">Admins only</option>
            </select>
          </div>
        )}
      </form>

      <ErrorAlert message={error} onRetry={load} />
      {loading && !data ? (
        <Loading />
      ) : !data?.items.length ? (
        <div className="card border-0 shadow-sm"><EmptyState icon="bi-people" title="No users found" /></div>
      ) : (
        <div className="card border-0 shadow-sm">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>Name</th>
                  <th className="d-none d-md-table-cell">{mode === "students" ? "Student ID" : "Role"}</th>
                  <th className="d-none d-lg-table-cell">Department</th>
                  <th className="d-none d-lg-table-cell">Last login</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((u) => (
                  <tr key={u._id}>
                    <td>
                      <div className="fw-semibold">{fullName(u)}</div>
                      <small className="text-muted">{u.email}</small>
                    </td>
                    <td className="d-none d-md-table-cell small">
                      {mode === "students" ? u.studentId || "-" : <span className={`badge text-bg-${ROLE_COLORS[u.role]}`}>{u.role}</span>}
                    </td>
                    <td className="d-none d-lg-table-cell small">{u.department || "-"}</td>
                    <td className="d-none d-lg-table-cell small" title={formatDate(u.lastLoginAt)}>{u.lastLoginAt ? timeAgo(u.lastLoginAt) : "Never"}</td>
                    <td>
                      <span className={`badge text-bg-${u.isActive ? "success" : "secondary"} me-1`}>{u.isActive ? "Active" : "Inactive"}</span>
                      {!u.isEmailVerified && <span className="badge text-bg-warning">Unverified</span>}
                    </td>
                    <td className="text-end text-nowrap">
                      {u._id !== me._id && (
                        <>
                          {mode === "staff" && (
                            <button className="btn btn-sm btn-light me-1" title="Edit" onClick={() => openEditor(u)}><i aria-hidden="true" className="bi bi-pencil"></i></button>
                          )}
                          {mode === "staff" && !u.isEmailVerified && (
                            <button className="btn btn-sm btn-light me-1" title="Resend setup link" onClick={() => setConfirm({ user: u, action: "resend" })}><i aria-hidden="true" className="bi bi-envelope"></i></button>
                          )}
                          <button className="btn btn-sm btn-light me-1" title="Unlock login" onClick={() => setConfirm({ user: u, action: "unlock" })}><i aria-hidden="true" className="bi bi-unlock"></i></button>
                          {u.isActive ? (
                            <button className="btn btn-sm btn-outline-danger" onClick={() => setConfirm({ user: u, action: "deactivate" })}>Deactivate</button>
                          ) : (
                            <button className="btn btn-sm btn-outline-success" onClick={() => setConfirm({ user: u, action: "activate" })}>Activate</button>
                          )}
                        </>
                      )}
                      {u._id === me._id && <span className="small text-muted">You</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Pagination pagination={data?.pagination} onChange={(page) => setFilters({ ...filters, page })} />

      <ConfirmModal
        show={Boolean(confirm)}
        title={confirmText[0]}
        message={confirm && `${fullName(confirm.user)} (${confirm.user.email}). ${confirmText[1]}`}
        variant={confirmText[2]}
        loading={busy}
        onConfirm={runConfirm}
        onCancel={() => setConfirm(null)}
      />

      <ConfirmModal
        show={Boolean(editing)}
        title={editing === "new" ? "Create staff or admin account" : "Edit account"}
        confirmText={editing === "new" ? "Create & Send Setup Link" : "Save"}
        loading={busy}
        disabled={!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()}
        onConfirm={saveUser}
        onCancel={() => setEditing(null)}
      >
        {formError && <div className="alert alert-danger small py-2">{formError}</div>}
        <div className="row g-2">
          <div className="col-6">
            <label className="form-label small">First name</label>
            <input className="form-control" maxLength={50} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          </div>
          <div className="col-6">
            <label className="form-label small">Last name</label>
            <input className="form-control" maxLength={50} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </div>
          <div className="col-12">
            <label className="form-label small">Email</label>
            <input type="email" className="form-control" disabled={editing !== "new"} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="col-6">
            <label className="form-label small">Role</label>
            <select className="form-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
              {editing !== "new" && <option value="student">Student</option>}
            </select>
          </div>
          <div className="col-6">
            <label className="form-label small">Contact number</label>
            <input className="form-control" maxLength={20} value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} />
          </div>
          <div className="col-12">
            <label className="form-label small">Department / Office</label>
            <input className="form-control" maxLength={100} value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          </div>
        </div>
        {editing === "new" && <p className="small text-muted mt-2 mb-0">No password is set here. The user gets a secure link (valid 48 hours) to choose their own.</p>}
      </ConfirmModal>
    </>
  );
}

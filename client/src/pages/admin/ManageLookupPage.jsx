import { useCallback, useEffect, useState } from "react";
import api, { getErrorMessage } from "../../services/api";
import useToast from "../../hooks/useToast";
import { clearLookupCache } from "../../hooks/useLookups";
import ConfirmModal from "../../components/ConfirmModal";
import { Loading, EmptyState, ErrorAlert, PageHeader } from "../../components/common";
import { formatDate } from "../../utils/format";

const CONFIG = {
  categories: { title: "Item Categories", singular: "Category", subtitle: "Categories students choose when reporting items.", placeholder: "e.g. Electronics" },
  locations: { title: "Campus Locations", singular: "Location", subtitle: "Places on campus where items are lost or found.", placeholder: "e.g. Library" },
};

// kind = "categories" | "locations"
export default function ManageLookupPage({ kind }) {
  const cfg = CONFIG[kind];
  const { showToast } = useToast();
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null); // item or "new"
  const [form, setForm] = useState({ name: "", description: "" });
  const [formError, setFormError] = useState("");
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await api.get(`/${kind}`, { params: { all: "true" } });
      setItems(res.data.items);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [kind]);

  useEffect(() => {
    load();
  }, [load]);

  const changed = () => {
    clearLookupCache();
    load();
  };

  const open = (item) => {
    setFormError("");
    setEditing(item || "new");
    setForm(item ? { name: item.name, description: item.description || "" } : { name: "", description: "" });
  };

  const save = async () => {
    setBusy(true);
    setFormError("");
    try {
      if (editing === "new") await api.post(`/${kind}`, form);
      else await api.put(`/${kind}/${editing._id}`, form);
      showToast(`${cfg.singular} saved.`);
      setEditing(null);
      changed();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (item) => {
    try {
      await api.put(`/${kind}/${item._id}`, { isActive: !item.isActive });
      showToast(`${item.name} ${item.isActive ? "deactivated" : "activated"}.`);
      changed();
    } catch (err) {
      showToast(getErrorMessage(err), "danger");
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`/${kind}/${deleting._id}`);
      showToast(`${cfg.singular} deleted.`);
      setDeleting(null);
      changed();
    } catch (err) {
      showToast(getErrorMessage(err), "danger");
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 900 }}>
      <PageHeader title={cfg.title} subtitle={cfg.subtitle}>
        <button className="btn btn-primary" onClick={() => open(null)}>
          <i aria-hidden="true" className="bi bi-plus-lg me-1"></i>Add {cfg.singular}
        </button>
      </PageHeader>

      <ErrorAlert message={error} onRetry={load} />
      {!items ? (
        <Loading />
      ) : items.length === 0 ? (
        <div className="card border-0 shadow-sm"><EmptyState title={`No ${kind} yet`} /></div>
      ) : (
        <div className="card border-0 shadow-sm">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>Name</th>
                  <th className="d-none d-md-table-cell">Description</th>
                  <th className="d-none d-md-table-cell">Added</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id} className={item.isActive ? "" : "text-muted"}>
                    <td className="fw-semibold">{item.name}</td>
                    <td className="d-none d-md-table-cell small">{item.description || "-"}</td>
                    <td className="d-none d-md-table-cell small">{formatDate(item.createdAt)}</td>
                    <td><span className={`badge text-bg-${item.isActive ? "success" : "secondary"}`}>{item.isActive ? "Active" : "Inactive"}</span></td>
                    <td className="text-end text-nowrap">
                      <button className="btn btn-sm btn-light me-1" onClick={() => open(item)} title="Edit"><i aria-hidden="true" className="bi bi-pencil"></i></button>
                      <button className="btn btn-sm btn-light me-1" onClick={() => toggle(item)} title={item.isActive ? "Deactivate" : "Activate"}>
                        <i aria-hidden="true" className={`bi ${item.isActive ? "bi-eye-slash" : "bi-eye"}`}></i>
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => setDeleting(item)} title="Delete"><i aria-hidden="true" className="bi bi-trash"></i></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <p className="small text-muted mt-2">Inactive {kind} are hidden from report forms but kept for existing reports.</p>

      <ConfirmModal
        show={Boolean(editing)}
        title={editing === "new" ? `Add ${cfg.singular}` : `Edit ${cfg.singular}`}
        confirmText="Save"
        loading={busy}
        disabled={form.name.trim().length < 2}
        onConfirm={save}
        onCancel={() => setEditing(null)}
      >
        {formError && <div className="alert alert-danger small py-2">{formError}</div>}
        <label className="form-label small">Name</label>
        <input className="form-control mb-2" maxLength={80} placeholder={cfg.placeholder} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <label className="form-label small">Description (optional)</label>
        <input className="form-control" maxLength={300} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </ConfirmModal>

      <ConfirmModal
        show={Boolean(deleting)}
        title={`Delete "${deleting?.name}"?`}
        message={`${cfg.singular} that are used by reports can't be deleted. Deactivate them instead.`}
        variant="danger"
        confirmText="Delete"
        loading={busy}
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

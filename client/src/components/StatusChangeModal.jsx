import { useEffect, useState } from "react";
import api, { getErrorMessage } from "../services/api";
import ConfirmModal from "./ConfirmModal";
import { STATUS } from "../utils/constants";

// Staff choose a new status for a lost/found item.
// "claimed" and "released" are not in the list: they happen only through claims and QR release.
const OPTIONS = { lost: ["open", "resolved", "closed"], found: ["pending", "available", "disposed"] };

export default function StatusChangeModal({ item, type, onClose, onSaved }) {
  const [status, setStatus] = useState("");
  const [storageLocation, setStorageLocation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (item) {
      setStatus(type === "found" && item.status === "pending" ? "available" : item.status);
      setStorageLocation(item.storageLocation || "");
      setError("");
    }
  }, [item, type]);

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const body = { status };
      if (type === "found") body.storageLocation = storageLocation;
      await api.patch(`/${type}-items/${item._id}/status`, body);
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ConfirmModal show={Boolean(item)} title={`Update "${item?.itemName}"`} confirmText="Save" loading={saving} onConfirm={save} onCancel={onClose}>
      {error && <div className="alert alert-danger small py-2">{error}</div>}
      <label className="form-label">Status</label>
      <select className="form-select mb-3" value={status} onChange={(e) => setStatus(e.target.value)}>
        {OPTIONS[type].map((s) => (
          <option key={s} value={s}>
            {STATUS[type][s].label}
          </option>
        ))}
      </select>
      {type === "found" && (
        <>
          <label className="form-label">Storage location <span className="text-muted small">(staff only)</span></label>
          <input className="form-control" maxLength={200} placeholder="e.g. Cabinet B, Shelf 2" value={storageLocation} onChange={(e) => setStorageLocation(e.target.value)} />
          {item?.status === "pending" && status === "available" && (
            <div className="form-text">Marking as Available confirms the item was received in the office. The reporter will be notified.</div>
          )}
        </>
      )}
    </ConfirmModal>
  );
}

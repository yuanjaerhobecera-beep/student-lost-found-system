import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import api, { getErrorMessage } from "../../services/api";
import useToast from "../../hooks/useToast";
import ImagePicker from "../../components/ImagePicker";
import { Loading, ErrorAlert, PageHeader, SubmitButton, ItemImage, InfoRow } from "../../components/common";
import { formatDate } from "../../utils/format";

export default function NewClaimPage() {
  const { foundItemId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [item, setItem] = useState(null);
  const [myLost, setMyLost] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState({ lostItemId: searchParams.get("lost") || "", ownershipExplanation: "", identifyingDetails: "" });
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([api.get(`/found-items/${foundItemId}`), api.get("/lost-items/mine", { params: { status: "open", limit: 50 } })])
      .then(([f, l]) => {
        setItem(f.data);
        setMyLost(l.data.items);
      })
      .catch((err) => setLoadError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [foundItemId]);

  if (loading) return <Loading />;
  if (loadError) return <ErrorAlert message={loadError} />;

  const found = item.item;
  if (item.myActiveClaim) {
    return (
      <div className="alert alert-info">
        You already have an active claim for this item. <Link to={`/student/claims/${item.myActiveClaim._id}`}>View it</Link>.
      </div>
    );
  }
  if (found.status !== "available" || item.isReporter) {
    return <div className="alert alert-warning">This item can't be claimed right now.</div>;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.ownershipExplanation.trim().length < 20) return setError("Please explain in at least 20 characters why this item is yours.");
    setSaving(true);
    const fd = new FormData();
    fd.append("foundItemId", foundItemId);
    if (form.lostItemId) fd.append("lostItemId", form.lostItemId);
    fd.append("ownershipExplanation", form.ownershipExplanation.trim());
    fd.append("identifyingDetails", form.identifyingDetails.trim());
    files.forEach((f) => fd.append("proofImages", f));
    try {
      const { data } = await api.post("/claims", fd);
      showToast("Claim submitted! Staff will review it.");
      navigate(`/student/claims/${data.claim._id}`, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 900 }}>
      <PageHeader title="Submit a Claim" subtitle="Prove that this item is yours. Staff will compare your answers with details only the real owner would know." />

      <div className="row g-4">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm overflow-hidden">
            <ItemImage src={found.images?.[0]?.url} height={160} />
            <div className="card-body">
              <h6 className="fw-semibold">{found.itemName}</h6>
              <InfoRow label="Category">{found.category?.name}</InfoRow>
              <InfoRow label="Found at">{found.location?.name}</InfoRow>
              <InfoRow label="Date">{formatDate(found.dateFound)}</InfoRow>
            </div>
          </div>
        </div>

        <div className="col-md-8">
          <form onSubmit={handleSubmit} noValidate className="card border-0 shadow-sm">
            <div className="card-body">
              <ErrorAlert message={error} />

              {myLost.length > 0 && (
                <div className="mb-3">
                  <label htmlFor="lostItemId" className="form-label">Link your lost item report <span className="text-muted small">(recommended)</span></label>
                  <select id="lostItemId" className="form-select" value={form.lostItemId} onChange={(e) => setForm({ ...form, lostItemId: e.target.value })}>
                    <option value="">None</option>
                    {myLost.map((l) => (
                      <option key={l._id} value={l._id}>
                        {l.itemName} (lost {formatDate(l.dateLost)})
                      </option>
                    ))}
                  </select>
                  <div className="form-text">Staff will compare this claim with the private details in your lost report.</div>
                </div>
              )}

              <div className="mb-3">
                <label htmlFor="explanation" className="form-label">Why is this item yours? *</label>
                <textarea
                  id="explanation"
                  className="form-control"
                  rows={4}
                  maxLength={1500}
                  placeholder="When and where did you lose it? Describe it in your own words."
                  value={form.ownershipExplanation}
                  onChange={(e) => setForm({ ...form, ownershipExplanation: e.target.value })}
                />
                <div className="form-text">{form.ownershipExplanation.length}/1500 (minimum 20)</div>
              </div>

              <div className="mb-3">
                <label htmlFor="identifying" className="form-label">
                  <i aria-hidden="true" className="bi bi-lock me-1"></i>Details only the owner would know
                </label>
                <textarea
                  id="identifying"
                  className="form-control"
                  rows={3}
                  maxLength={1000}
                  placeholder="e.g. phone wallpaper, contents of the bag, marks or scratches, name written inside"
                  value={form.identifyingDetails}
                  onChange={(e) => setForm({ ...form, identifyingDetails: e.target.value })}
                />
                <div className="form-text">Only staff can see this.</div>
              </div>

              <ImagePicker files={files} setFiles={setFiles} max={5} label="Proof of ownership (photos of you with the item, receipts, box...)" onError={(m) => showToast(m, "warning")} />

              <div className="alert alert-light border small mt-3 mb-0">
                <i aria-hidden="true" className="bi bi-exclamation-triangle me-1"></i>
                Submitting a false claim is a violation of school policy. All claims are logged.
              </div>
            </div>
            <div className="card-footer bg-white d-flex justify-content-end gap-2 py-3">
              <button type="button" className="btn btn-light" onClick={() => navigate(-1)}>Cancel</button>
              <SubmitButton loading={saving}>Submit Claim</SubmitButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

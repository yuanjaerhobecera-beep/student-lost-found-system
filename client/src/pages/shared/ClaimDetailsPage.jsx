import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api, { getErrorMessage } from "../../services/api";
import useAuth from "../../hooks/useAuth";
import useBasePath from "../../hooks/useBasePath";
import useToast from "../../hooks/useToast";
import ConfirmModal from "../../components/ConfirmModal";
import ClaimTimeline from "../../components/ClaimTimeline";
import ImagePicker from "../../components/ImagePicker";
import { Loading, ErrorAlert, StatusBadge, InfoRow, ItemImage, SubmitButton } from "../../components/common";
import { formatDate, formatDateTime, fullName } from "../../utils/format";

const ACTIVE = ["pending", "under_review", "info_required"];

export default function ClaimDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const base = useBasePath();
  const navigate = useNavigate();
  const isStaff = user.role !== "student";

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/claims/${id}`);
      setData(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Loading />;
  if (error) return <ErrorAlert message={error} onRetry={load} />;

  const { claim, otherClaims, office } = data;
  const item = claim.foundItem;

  return (
    <>
      <button className="btn btn-link px-0 mb-2" onClick={() => navigate(-1)}>
        <i aria-hidden="true" className="bi bi-arrow-left me-1"></i>Back
      </button>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-4">
        <h1 className="h4 fw-bold mb-0">Claim for "{item?.itemName}"</h1>
        <StatusBadge type="claim" status={claim.status} />
      </div>

      <div className="row g-4">
        <div className="col-lg-7">
          {isStaff ? <StaffActions claim={claim} onDone={load} base={base} /> : <StudentPanel claim={claim} office={office} onDone={load} />}

          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body">
              <h6 className="fw-semibold">Claimant's explanation</h6>
              <p style={{ whiteSpace: "pre-wrap" }}>{claim.ownershipExplanation}</p>
              {claim.identifyingDetails && (
                <>
                  <h6 className="fw-semibold">Identifying details given by claimant</h6>
                  <p style={{ whiteSpace: "pre-wrap" }}>{claim.identifyingDetails}</p>
                </>
              )}
              {claim.infoRequestMessage && (
                <div className="alert alert-light border small">
                  <b>Staff asked:</b> {claim.infoRequestMessage}
                  {claim.studentResponse && (
                    <div className="mt-2">
                      <b>Student answered:</b> {claim.studentResponse}
                    </div>
                  )}
                </div>
              )}
              {claim.proofImages?.length > 0 && (
                <>
                  <h6 className="fw-semibold">Proof of ownership</h6>
                  <div className="d-flex flex-wrap gap-2">
                    {claim.proofImages.map((img) => (
                      <a key={img.publicId} href={img.url} target="_blank" rel="noreferrer" className="image-thumb">
                        <img src={img.url} alt="Proof" />
                      </a>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h6 className="fw-semibold mb-3">History</h6>
              <ClaimTimeline history={claim.history} />
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card border-0 shadow-sm mb-3 overflow-hidden">
            <ItemImage src={item?.images?.[0]?.url} height={180} />
            <div className="card-body">
              <h6 className="fw-semibold">
                <Link to={`${base}/items/found/${item?._id}`}>{item?.itemName}</Link>
              </h6>
              <InfoRow label="Category">{item?.category?.name}</InfoRow>
              <InfoRow label="Found at">{item?.location?.name}</InfoRow>
              <InfoRow label="Date found">{formatDate(item?.dateFound)}</InfoRow>
              {isStaff && (
                <>
                  <InfoRow label="Item status"><StatusBadge type="found" status={item?.status} /></InfoRow>
                  <InfoRow label={<span><i aria-hidden="true" className="bi bi-lock me-1"></i>Finder's private details</span>}>{item?.identifyingDetails}</InfoRow>
                  <InfoRow label={<span><i aria-hidden="true" className="bi bi-lock me-1"></i>Storage</span>}>{item?.storageLocation}</InfoRow>
                </>
              )}
            </div>
          </div>

          {isStaff && (
            <div className="card border-0 shadow-sm mb-3">
              <div className="card-body">
                <h6 className="fw-semibold">Claimant</h6>
                <InfoRow label="Name">{fullName(claim.claimant)}</InfoRow>
                <InfoRow label="Student ID">{claim.claimant?.studentId}</InfoRow>
                <InfoRow label="Email">{claim.claimant?.email}</InfoRow>
                <InfoRow label="Contact">{claim.claimant?.contactNumber}</InfoRow>
                <InfoRow label="Department">{claim.claimant?.department}</InfoRow>
                <InfoRow label="Submitted">{formatDateTime(claim.createdAt)}</InfoRow>
              </div>
            </div>
          )}

          {claim.lostItem && (
            <div className="card border-0 shadow-sm mb-3">
              <div className="card-body">
                <h6 className="fw-semibold">Linked lost item report</h6>
                <InfoRow label="Item">
                  <Link to={`${base}/items/lost/${claim.lostItem._id}`}>{claim.lostItem.itemName}</Link>
                </InfoRow>
                <InfoRow label="Date lost">{formatDate(claim.lostItem.dateLost)}</InfoRow>
                {isStaff && (
                  <>
                    <InfoRow label="Location">{claim.lostItem.location?.name}</InfoRow>
                    <InfoRow label={<span><i aria-hidden="true" className="bi bi-lock me-1"></i>Owner's private details</span>}>{claim.lostItem.identifyingDetails}</InfoRow>
                  </>
                )}
              </div>
            </div>
          )}

          {isStaff && (
            <div className="card border-0 shadow-sm mb-3">
              <div className="card-body">
                <h6 className="fw-semibold">Review info</h6>
                <InfoRow label="Reviewed by">{claim.reviewedBy ? `${fullName(claim.reviewedBy)} · ${formatDateTime(claim.reviewedAt)}` : null}</InfoRow>
                <InfoRow label="Internal notes">{claim.verificationNotes}</InfoRow>
                {claim.releasedAt && (
                  <InfoRow label="Released">
                    {formatDateTime(claim.releasedAt)} by {fullName(claim.releasedBy)}
                    {claim.releaseNotes && <div className="text-muted">{claim.releaseNotes}</div>}
                  </InfoRow>
                )}
              </div>
            </div>
          )}

          {isStaff && otherClaims?.length > 0 && (
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <h6 className="fw-semibold">Other claims for this item</h6>
                <ul className="list-unstyled mb-0 small">
                  {otherClaims.map((o) => (
                    <li key={o._id} className="d-flex justify-content-between align-items-center py-1 border-bottom">
                      <Link to={`${base}/claims/${o._id}`}>{fullName(o.claimant)}</Link>
                      <StatusBadge type="claim" status={o.status} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ---------- Student panel ----------
function StudentPanel({ claim, office, onDone }) {
  return (
    <>
      {claim.status === "info_required" && <RespondForm claim={claim} onDone={onDone} />}
      {claim.status === "approved" && <QrPanel claim={claim} office={office} />}
      {claim.status === "rejected" && (
        <div className="alert alert-secondary">
          <b>Claim rejected.</b> {claim.rejectionReason}
        </div>
      )}
      {claim.status === "completed" && (
        <div className="alert alert-success">
          <i aria-hidden="true" className="bi bi-check-circle-fill me-2"></i>
          Item released to you on {formatDateTime(claim.releasedAt)}. Thank you!
        </div>
      )}
      {["pending", "under_review"].includes(claim.status) && (
        <div className="alert alert-info">
          <i aria-hidden="true" className="bi bi-hourglass-split me-2"></i>
          Staff are reviewing your claim. You'll get a notification when it's updated.
        </div>
      )}
      {[...ACTIVE, "approved"].includes(claim.status) && <CancelButton claimId={claim._id} onDone={onDone} />}
    </>
  );
}

function CancelButton({ claimId, onDone }) {
  const { showToast } = useToast();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const cancel = async () => {
    setBusy(true);
    try {
      await api.patch(`/claims/${claimId}/cancel`);
      showToast("Claim cancelled.");
      setShow(false);
      onDone();
    } catch (err) {
      showToast(getErrorMessage(err), "danger");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mb-4">
      <button className="btn btn-sm btn-outline-danger" onClick={() => setShow(true)}>
        Cancel my claim
      </button>
      <ConfirmModal show={show} title="Cancel this claim?" message="You can submit a new claim later if the item is still available." variant="danger" confirmText="Cancel Claim" loading={busy} onConfirm={cancel} onCancel={() => setShow(false)} />
    </div>
  );
}

function RespondForm({ claim, onDone }) {
  const { showToast } = useToast();
  const [response, setResponse] = useState("");
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (response.trim().length < 5) return showToast("Please write a response (at least 5 characters).", "warning");
    setBusy(true);
    const fd = new FormData();
    fd.append("response", response.trim());
    files.forEach((f) => fd.append("proofImages", f));
    try {
      await api.patch(`/claims/${claim._id}/respond`, fd);
      showToast("Information sent to staff.");
      onDone();
    } catch (err) {
      showToast(getErrorMessage(err), "danger");
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="card border-danger mb-4">
      <div className="card-body">
        <h6 className="fw-semibold text-danger">
          <i aria-hidden="true" className="bi bi-exclamation-circle me-2"></i>Staff need more information
        </h6>
        <p className="mb-3">{claim.infoRequestMessage}</p>
        <textarea className="form-control mb-3" rows={3} maxLength={1500} placeholder="Your answer" value={response} onChange={(e) => setResponse(e.target.value)} />
        <ImagePicker files={files} setFiles={setFiles} max={Math.max(0, 5 - (claim.proofImages?.length || 0))} label="Extra proof photos" onError={(m) => showToast(m, "warning")} />
        <SubmitButton loading={busy} className="btn btn-danger mt-3">Send Response</SubmitButton>
      </div>
    </form>
  );
}

function QrPanel({ claim, office }) {
  const { showToast } = useToast();
  const [qr, setQr] = useState(null);
  const [busy, setBusy] = useState(false);
  const getQr = async () => {
    setBusy(true);
    try {
      const res = await api.get(`/claims/${claim._id}/qr`);
      setQr(res.data);
    } catch (err) {
      showToast(getErrorMessage(err), "danger");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="card border-success mb-4">
      <div className="card-body text-center">
        <h6 className="fw-semibold text-success">
          <i aria-hidden="true" className="bi bi-patch-check-fill me-2"></i>Your claim was approved!
        </h6>
        <p className="small mb-3">
          Bring your QR code and a valid school ID to the <b>{office?.officeLocation}</b> ({office?.officeHours}).
        </p>
        {qr ? (
          <div className="qr-box">
            <img src={qr.qrCode} alt="Claim QR code" className="img-fluid border rounded" />
            <div className="small text-muted mt-2">Valid until {formatDateTime(qr.expiresAt)}</div>
            <details className="small mt-2">
              <summary>Can't scan? Show this code</summary>
              <code className="d-block text-break mt-1">{qr.code}</code>
            </details>
            <a href={qr.qrCode} download="claim-qr-code.png" className="btn btn-sm btn-outline-success mt-3">
              <i aria-hidden="true" className="bi bi-download me-1"></i>Download QR
            </a>
          </div>
        ) : (
          <button className="btn btn-success" onClick={getQr} disabled={busy}>
            {busy && <span className="spinner-border spinner-border-sm me-2"></span>}
            <i aria-hidden="true" className="bi bi-qr-code me-1"></i>Show my QR code
          </button>
        )}
        <p className="small text-muted mt-3 mb-0">
          <i aria-hidden="true" className="bi bi-shield-lock me-1"></i>Each QR code works once. Opening a new one replaces the old one. Don't share it.
        </p>
      </div>
    </div>
  );
}

// ---------- Staff actions ----------
function StaffActions({ claim, onDone, base }) {
  const { showToast } = useToast();
  const [action, setAction] = useState(null); // "under_review" | "info_required" | "approved" | "rejected"
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const canReview = ACTIVE.includes(claim.status);

  const open = (a) => {
    setText("");
    setAction(a);
  };

  const submit = async () => {
    setBusy(true);
    const body = { status: action };
    if (action === "info_required") body.message = text.trim();
    if (action === "rejected") body.reason = text.trim();
    if (action === "approved" && text.trim()) body.note = text.trim();
    try {
      await api.patch(`/claims/${claim._id}/status`, body);
      showToast("Claim updated.");
      setAction(null);
      onDone();
    } catch (err) {
      showToast(getErrorMessage(err), "danger");
    } finally {
      setBusy(false);
    }
  };

  const config = {
    under_review: { title: "Start reviewing this claim?", confirm: "Start Review", variant: "info", label: null },
    info_required: { title: "Request more information", confirm: "Send Request", variant: "warning", label: "What should the student provide?", required: true },
    approved: { title: "Approve this claim?", confirm: "Approve", variant: "success", label: "Verification notes (internal, optional)" },
    rejected: { title: "Reject this claim?", confirm: "Reject", variant: "danger", label: "Reason (the student will see this)", required: true },
  }[action];

  return (
    <div className="card border-0 shadow-sm mb-4">
      <div className="card-body">
        <h6 className="fw-semibold">Verification</h6>
        {canReview ? (
          <>
            <p className="small text-muted">
              Compare the claimant's details with the finder's private details and the owner's lost report. Approve only if you're confident.
            </p>
            <div className="d-flex flex-wrap gap-2">
              {claim.status === "pending" && (
                <button className="btn btn-outline-info" onClick={() => open("under_review")}>
                  <i aria-hidden="true" className="bi bi-search me-1"></i>Start Review
                </button>
              )}
              <button className="btn btn-outline-warning" onClick={() => open("info_required")}>
                <i aria-hidden="true" className="bi bi-question-circle me-1"></i>Request Info
              </button>
              <button className="btn btn-success" onClick={() => open("approved")}>
                <i aria-hidden="true" className="bi bi-check-lg me-1"></i>Approve
              </button>
              <button className="btn btn-outline-danger" onClick={() => open("rejected")}>
                <i aria-hidden="true" className="bi bi-x-lg me-1"></i>Reject
              </button>
            </div>
          </>
        ) : claim.status === "approved" ? (
          <>
            <p className="small mb-2">Approved. Waiting for the student to present their QR code at the office.</p>
            <div className="d-flex flex-wrap gap-2">
              <Link to={`${base}/verify-qr`} className="btn btn-primary">
                <i aria-hidden="true" className="bi bi-qr-code-scan me-1"></i>Go to QR Verification
              </Link>
              <button className="btn btn-outline-danger" onClick={() => open("rejected")}>Revoke Approval</button>
            </div>
          </>
        ) : (
          <p className="small text-muted mb-0">This claim is closed. No more actions needed.</p>
        )}
      </div>

      <ConfirmModal
        show={Boolean(action)}
        title={config?.title}
        confirmText={config?.confirm}
        variant={config?.variant}
        loading={busy}
        disabled={config?.required && text.trim().length < 3}
        onConfirm={submit}
        onCancel={() => setAction(null)}
      >
        {action === "approved" && <p className="small">The item will be reserved for this student and other open claims for it will be rejected automatically.</p>}
        {config?.label && (
          <>
            <label className="form-label small">{config.label}</label>
            <textarea className="form-control" rows={3} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} />
          </>
        )}
      </ConfirmModal>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import api, { getErrorMessage } from "../../services/api";
import useBasePath from "../../hooks/useBasePath";
import useToast from "../../hooks/useToast";
import { PageHeader, InfoRow, ItemImage, SubmitButton } from "../../components/common";
import { formatDate, formatDateTime, fullName } from "../../utils/format";

// Staff scan the student's QR code. The BACKEND checks the code; the QR alone proves nothing.
// Step 1: verify (preview only)  ->  Step 2: confirm release (the code becomes invalid)
export default function VerifyQrPage() {
  const base = useBasePath();
  const { showToast } = useToast();
  const scannerRef = useRef(null);
  const handledRef = useRef(false);

  const [scanning, setScanning] = useState(false);
  const [manual, setManual] = useState("");
  const [token, setToken] = useState("");
  const [claim, setClaim] = useState(null);
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [idChecked, setIdChecked] = useState(false);
  const [notes, setNotes] = useState("");
  const [releasing, setReleasing] = useState(false);
  const [released, setReleased] = useState(null);

  const stopScan = async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    setScanning(false);
    if (scanner) {
      try {
        await scanner.stop();
        scanner.clear();
      } catch {
        /* already stopped */
      }
    }
  };

  // Stop the camera when leaving the page
  useEffect(() => () => {
    const scanner = scannerRef.current;
    if (scanner) scanner.stop().catch(() => {});
  }, []);

  const verify = async (value) => {
    const code = String(value || "").trim();
    if (!code) return;
    setError("");
    setClaim(null);
    setReleased(null);
    setIdChecked(false);
    setNotes("");
    setVerifying(true);
    try {
      const { data } = await api.post("/claims/qr/verify", { token: code });
      setToken(code);
      setClaim(data.claim);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setVerifying(false);
    }
  };

  const startScan = async () => {
    setError("");
    setClaim(null);
    setReleased(null);
    handledRef.current = false;
    setScanning(true);
    try {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded) => {
          if (handledRef.current) return;
          handledRef.current = true;
          stopScan();
          verify(decoded);
        },
        () => {}
      );
    } catch {
      scannerRef.current = null;
      setScanning(false);
      setError("Couldn't start the camera. Allow camera access in your browser, or type the code below.");
    }
  };

  const release = async () => {
    setReleasing(true);
    try {
      const { data } = await api.post("/claims/qr/release", { token, releaseNotes: notes.trim() });
      showToast(data.message);
      setReleased({ name: fullName(claim.claimant), item: claim.foundItem?.itemName, id: claim._id });
      setClaim(null);
      setToken("");
      setManual("");
    } catch (err) {
      setError(getErrorMessage(err));
      setClaim(null);
    } finally {
      setReleasing(false);
    }
  };

  return (
    <div style={{ maxWidth: 960 }}>
      <PageHeader title="Verify QR Code" subtitle="Scan the student's QR code, check their school ID, then release the item." />

      <div className="row g-4">
        <div className="col-lg-5">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div id="qr-reader" className={scanning ? "mb-3" : "d-none"}></div>
              {scanning ? (
                <button className="btn btn-outline-secondary w-100" onClick={stopScan}>
                  <i aria-hidden="true" className="bi bi-stop-circle me-1"></i>Stop camera
                </button>
              ) : (
                <button className="btn btn-primary w-100 py-3" onClick={startScan}>
                  <i aria-hidden="true" className="bi bi-camera me-2"></i>Scan with camera
                </button>
              )}

              <hr />
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  verify(manual);
                }}
              >
                <label htmlFor="manual" className="form-label small">Or enter the code manually</label>
                <div className="input-group">
                  <input id="manual" className="form-control font-monospace" placeholder="Paste code" value={manual} maxLength={120} onChange={(e) => setManual(e.target.value)} />
                  <SubmitButton loading={verifying} disabled={verifying || !manual.trim()}>Verify</SubmitButton>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="col-lg-7">
          {verifying && (
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center py-5">
                <div className="spinner-border text-primary"></div>
                <div className="mt-2 text-muted">Checking code with the server...</div>
              </div>
            </div>
          )}

          {error && (
            <div className="alert alert-danger d-flex gap-2">
              <i aria-hidden="true" className="bi bi-x-octagon-fill fs-4"></i>
              <div>
                <div className="fw-semibold">Can't release this item</div>
                {error}
              </div>
            </div>
          )}

          {released && (
            <div className="card border-success shadow-sm">
              <div className="card-body text-center py-4">
                <i aria-hidden="true" className="bi bi-check-circle-fill text-success display-4"></i>
                <h5 className="fw-bold mt-2">Item released</h5>
                <p className="mb-3">
                  "{released.item}" was released to {released.name}. The QR code can no longer be used.
                </p>
                <div className="d-flex justify-content-center gap-2">
                  <button className="btn btn-primary" onClick={() => setReleased(null)}>Verify another</button>
                  <Link to={`${base}/claims/${released.id}`} className="btn btn-outline-secondary">View claim</Link>
                </div>
              </div>
            </div>
          )}

          {claim && (
            <div className="card border-success border-2 shadow-sm">
              <div className="card-header bg-success-subtle fw-semibold text-success">
                <i aria-hidden="true" className="bi bi-patch-check-fill me-2"></i>Valid QR code · Approved claim
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-sm-5">
                    <ItemImage src={claim.foundItem?.images?.[0]?.url} height={150} className="rounded" />
                  </div>
                  <div className="col-sm-7">
                    <h6 className="fw-bold mb-1">{claim.foundItem?.itemName}</h6>
                    <div className="small text-muted mb-2">
                      {claim.foundItem?.category?.name} · found {formatDate(claim.foundItem?.dateFound)}
                    </div>
                    <div className="alert alert-warning py-2 small mb-0">
                      <i aria-hidden="true" className="bi bi-archive me-1"></i>
                      <b>Storage:</b> {claim.foundItem?.storageLocation || "Not recorded"}
                    </div>
                  </div>
                </div>

                <h6 className="fw-semibold mt-3">Release to</h6>
                <InfoRow label="Name">{fullName(claim.claimant)}</InfoRow>
                <InfoRow label="Student ID">{claim.claimant?.studentId}</InfoRow>
                <InfoRow label="Email">{claim.claimant?.email}</InfoRow>
                <InfoRow label="Approved">{formatDateTime(claim.reviewedAt)} by {fullName(claim.reviewedBy)}</InfoRow>
                <InfoRow label="QR valid until">{formatDateTime(claim.qrTokenExpiresAt)}</InfoRow>

                <div className="form-check mt-3">
                  <input id="idChecked" type="checkbox" className="form-check-input" checked={idChecked} onChange={(e) => setIdChecked(e.target.checked)} />
                  <label htmlFor="idChecked" className="form-check-label">
                    I checked the student's school ID and it matches the name above.
                  </label>
                </div>
                <textarea className="form-control mt-2" rows={2} maxLength={1000} placeholder="Release notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

                <div className="d-flex gap-2 mt-3">
                  <button className="btn btn-success flex-grow-1" disabled={!idChecked || releasing} onClick={release}>
                    {releasing && <span className="spinner-border spinner-border-sm me-2"></span>}
                    <i aria-hidden="true" className="bi bi-box-arrow-up-right me-1"></i>Confirm Release
                  </button>
                  <button className="btn btn-light" onClick={() => setClaim(null)}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          {!claim && !released && !error && !verifying && (
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center text-muted py-5">
                <i aria-hidden="true" className="bi bi-qr-code-scan display-4 opacity-50"></i>
                <p className="mt-2 mb-0">Scan a QR code to see the claim details.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

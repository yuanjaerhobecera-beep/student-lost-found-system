import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api, { getErrorMessage } from "../../services/api";
import useAuth from "../../hooks/useAuth";
import useBasePath from "../../hooks/useBasePath";
import useToast from "../../hooks/useToast";
import ConfirmModal from "../../components/ConfirmModal";
import StatusChangeModal from "../../components/StatusChangeModal";
import ItemCard from "../../components/ItemCard";
import { Loading, ErrorAlert, StatusBadge, InfoRow, ItemImage } from "../../components/common";
import { formatDate, formatDateTime, fullName } from "../../utils/format";
import NotFoundPage from "../public/NotFoundPage";

export default function ItemDetailsPage() {
  const { type, id } = useParams();
  const { user } = useAuth();
  const base = useBasePath();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const isStaff = user.role !== "student";

  const [data, setData] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeImage, setActiveImage] = useState(0);
  const [confirm, setConfirm] = useState(null); // "delete" | "close" | "reopen"
  const [busy, setBusy] = useState(false);
  const [showStatus, setShowStatus] = useState(false);

  const valid = type === "lost" || type === "found";

  const load = useCallback(async () => {
    if (!valid) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/${type}-items/${id}`);
      setData(res.data);
      if (type === "lost" && (res.data.isOwner || isStaff)) {
        const m = await api.get(`/lost-items/${id}/matches`);
        setMatches(m.data.matches);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [type, id, isStaff, valid]);

  useEffect(() => {
    load();
  }, [load]);

  if (!valid) return <NotFoundPage inDashboard />;
  if (loading) return <Loading />;
  if (error) return <ErrorAlert message={error} onRetry={load} />;

  const { item, isOwner, isReporter, myActiveClaim } = data;
  const mine = isOwner || isReporter;
  const images = item.images || [];

  const runAction = async () => {
    setBusy(true);
    try {
      if (confirm === "delete") {
        await api.delete(`/${type}-items/${id}`);
        showToast("Report deleted.");
        navigate(isStaff ? `${base}/${type}-items` : `${base}/my-reports`);
        return;
      }
      await api.patch(`/lost-items/${id}/status`, { status: confirm === "close" ? "closed" : "open" });
      showToast(confirm === "close" ? "Report closed." : "Report reopened.");
      setConfirm(null);
      load();
    } catch (err) {
      showToast(getErrorMessage(err), "danger");
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  };

  const dismissMatch = async (matchId) => {
    try {
      await api.patch(`/lost-items/${id}/matches/${matchId}/dismiss`);
      setMatches((list) => list.filter((m) => m._id !== matchId));
      showToast("Match dismissed.", "info");
    } catch (err) {
      showToast(getErrorMessage(err), "danger");
    }
  };

  const canEdit = isStaff || (type === "lost" && isOwner && item.status === "open") || (type === "found" && isReporter && item.status === "pending");
  const canDelete =
    (type === "lost" && (isStaff || (isOwner && item.status !== "resolved"))) ||
    (type === "found" && (user.role === "admin" || (isReporter && item.status === "pending")));

  return (
    <>
      <button className="btn btn-link px-0 mb-2" onClick={() => navigate(-1)}>
        <i aria-hidden="true" className="bi bi-arrow-left me-1"></i>Back
      </button>

      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <h1 className="h4 fw-bold mb-0">{item.itemName}</h1>
        <StatusBadge type={type} status={item.status} />
        <span className="badge text-bg-light border">{type === "lost" ? "Lost item" : "Found item"}</span>
      </div>

      {type === "found" && isReporter && item.status === "pending" && (
        <div className="alert alert-warning">
          <i aria-hidden="true" className="bi bi-info-circle me-2"></i>Please bring this item to the Lost and Found office. Staff will mark it as received.
        </div>
      )}

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body">
              {images.length ? (
                <>
                  <img src={images[activeImage]?.url} alt={item.itemName} className="gallery-main mb-2" />
                  {images.length > 1 && (
                    <div className="d-flex gap-2">
                      {images.map((img, i) => (
                        <button key={img.publicId} className={`btn p-0 border ${i === activeImage ? "border-primary border-2" : ""}`} onClick={() => setActiveImage(i)}>
                          <img src={img.url} alt="" className="table-thumb" style={{ width: 64, height: 64 }} />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <ItemImage height={220} />
              )}
              <h6 className="fw-semibold mt-3">Description</h6>
              <p className="mb-0" style={{ whiteSpace: "pre-wrap" }}>{item.description}</p>
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-body">
              <h6 className="fw-semibold">Details</h6>
              <InfoRow label="Category">{item.category?.name}</InfoRow>
              <InfoRow label={type === "lost" ? "Last seen at" : "Found at"}>
                {item.location?.name}
                {item.locationDetails && <div className="text-muted">{item.locationDetails}</div>}
              </InfoRow>
              <InfoRow label={type === "lost" ? "Date lost" : "Date found"}>
                {formatDate(type === "lost" ? item.dateLost : item.dateFound)}
                {(item.timeLost || item.timeFound) && ` · around ${item.timeLost || item.timeFound}`}
              </InfoRow>
              <InfoRow label="Reported">{formatDateTime(item.createdAt)}</InfoRow>
            </div>
          </div>

          {(item.identifyingDetails || item.storageLocation || (isStaff && item.reportedBy?.email)) && (
            <div className="card border-0 shadow-sm mb-3 border-start border-warning border-4">
              <div className="card-body">
                <h6 className="fw-semibold">
                  <i aria-hidden="true" className="bi bi-lock me-1"></i>Private information
                  <span className="text-muted small fw-normal"> · {isStaff ? "staff only" : "only you and staff can see this"}</span>
                </h6>
                {item.identifyingDetails !== undefined && <InfoRow label="Identifying details">{item.identifyingDetails}</InfoRow>}
                {isStaff && type === "found" && <InfoRow label="Storage location">{item.storageLocation}</InfoRow>}
                {isStaff && item.reportedBy?.email && (
                  <InfoRow label="Reported by">
                    {fullName(item.reportedBy)} ({item.reportedBy.role})
                    <div className="text-muted">{item.reportedBy.email}</div>
                    {item.reportedBy.studentId && <div className="text-muted">ID: {item.reportedBy.studentId}</div>}
                    {item.reportedBy.contactNumber && <div className="text-muted">{item.reportedBy.contactNumber}</div>}
                  </InfoRow>
                )}
                {isStaff && item.receivedBy && (
                  <InfoRow label="Received by">
                    {fullName(item.receivedBy)} on {formatDateTime(item.receivedAt)}
                  </InfoRow>
                )}
              </div>
            </div>
          )}

          <div className="card border-0 shadow-sm">
            <div className="card-body d-grid gap-2">
              {/* Student wants to claim a found item */}
              {!isStaff && type === "found" && !isReporter && item.status === "available" &&
                (myActiveClaim ? (
                  <Link to={`${base}/claims/${myActiveClaim._id}`} className="btn btn-outline-primary">
                    <i aria-hidden="true" className="bi bi-clipboard-check me-1"></i>View my claim
                  </Link>
                ) : (
                  <Link to={`${base}/claim/${item._id}`} className="btn btn-primary">
                    <i aria-hidden="true" className="bi bi-hand-index-thumb me-1"></i>This is mine - Submit a claim
                  </Link>
                ))}
              {!isStaff && type === "found" && item.status === "claimed" && !myActiveClaim && (
                <div className="alert alert-info small mb-0">This item already has an approved claim.</div>
              )}

              {isStaff && !["released", "claimed"].includes(item.status) && (
                <button className="btn btn-primary" onClick={() => setShowStatus(true)}>
                  <i aria-hidden="true" className="bi bi-arrow-repeat me-1"></i>Change status
                </button>
              )}
              {isStaff && type === "found" && (
                <Link to={`${base}/claims?q=${encodeURIComponent(item.itemName)}`} className="btn btn-outline-primary">
                  <i aria-hidden="true" className="bi bi-clipboard-check me-1"></i>View claims for this item
                </Link>
              )}

              {canEdit && (
                <Link to={`${base}/items/${type}/${id}/edit`} className="btn btn-outline-secondary">
                  <i aria-hidden="true" className="bi bi-pencil me-1"></i>Edit
                </Link>
              )}
              {!isStaff && type === "lost" && isOwner && item.status === "open" && (
                <button className="btn btn-outline-secondary" onClick={() => setConfirm("close")}>
                  <i aria-hidden="true" className="bi bi-check2-circle me-1"></i>I found it myself - close report
                </button>
              )}
              {!isStaff && type === "lost" && isOwner && item.status === "closed" && (
                <button className="btn btn-outline-secondary" onClick={() => setConfirm("reopen")}>
                  <i aria-hidden="true" className="bi bi-arrow-counterclockwise me-1"></i>Reopen report
                </button>
              )}
              {canDelete && (
                <button className="btn btn-outline-danger" onClick={() => setConfirm("delete")}>
                  <i aria-hidden="true" className="bi bi-trash me-1"></i>Delete
                </button>
              )}
              {!mine && !isStaff && type === "lost" && (
                <Link to={`${base}/report-found`} className="btn btn-outline-primary">
                  <i aria-hidden="true" className="bi bi-hand-thumbs-up me-1"></i>I found this - report found item
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {type === "lost" && (isOwner || isStaff) && (
        <section className="mt-4">
          <h2 className="h5 fw-bold mb-1">
            <i aria-hidden="true" className="bi bi-shuffle me-2"></i>Possible matches
          </h2>
          <p className="text-muted small">
            Found items that look similar to this report. A match is only a suggestion. You still need to submit a claim and staff will verify ownership.
          </p>
          {matches.length === 0 ? (
            <div className="card border-0 shadow-sm">
              <div className="card-body text-muted small">No possible matches yet. We'll notify you when one is found.</div>
            </div>
          ) : (
            <div className="row g-3">
              {matches.map((m) => (
                <div key={m._id} className="col-sm-6 col-lg-4">
                  <ItemCard
                    item={m.foundItem}
                    type="found"
                    to={`${base}/items/found/${m.foundItem._id}`}
                    footer={
                      <>
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <span className="badge text-bg-warning">{m.score}% match</span>
                          <small className="text-muted text-truncate">{m.reasons.join(" · ")}</small>
                        </div>
                        {isOwner && (
                          <div className="d-flex gap-2">
                            {m.foundItem.status === "available" ? (
                              <Link to={`${base}/claim/${m.foundItem._id}?lost=${id}`} className="btn btn-sm btn-primary flex-grow-1">
                                Claim
                              </Link>
                            ) : (
                              <span className="small text-muted flex-grow-1">Waiting for staff to receive it</span>
                            )}
                            <button className="btn btn-sm btn-light" onClick={() => dismissMatch(m._id)} title="Not mine">
                              Not mine
                            </button>
                          </div>
                        )}
                      </>
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <ConfirmModal
        show={Boolean(confirm)}
        title={confirm === "delete" ? "Delete this report?" : confirm === "close" ? "Close this report?" : "Reopen this report?"}
        message={
          confirm === "delete"
            ? "This permanently removes the report and its photos."
            : confirm === "close"
              ? "Closing means you no longer need help finding this item. You can reopen it later."
              : "The report will be visible again and matching will resume."
        }
        variant={confirm === "delete" ? "danger" : "primary"}
        confirmText={confirm === "delete" ? "Delete" : "Confirm"}
        loading={busy}
        onConfirm={runAction}
        onCancel={() => setConfirm(null)}
      />
      <StatusChangeModal
        item={showStatus ? item : null}
        type={type}
        onClose={() => setShowStatus(false)}
        onSaved={() => {
          setShowStatus(false);
          showToast("Status updated.");
          load();
        }}
      />
    </>
  );
}

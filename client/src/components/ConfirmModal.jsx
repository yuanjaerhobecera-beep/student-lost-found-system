// A confirmation dialog for important actions (delete, approve, reject...).
// `children` can add extra fields, like a "reason" textarea.
export default function ConfirmModal({
  show,
  title = "Are you sure?",
  message,
  confirmText = "Confirm",
  variant = "primary",
  loading = false,
  disabled = false,
  onConfirm,
  onCancel,
  children,
}) {
  if (!show) return null;

  return (
    <>
      <div className="modal d-block" tabIndex="-1" role="dialog" aria-modal="true" onClick={onCancel}>
        <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{title}</h5>
              <button type="button" className="btn-close" aria-label="Close" onClick={onCancel} disabled={loading}></button>
            </div>
            <div className="modal-body">
              {message && <p className="mb-2">{message}</p>}
              {children}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-light" onClick={onCancel} disabled={loading}>
                Cancel
              </button>
              <button type="button" className={`btn btn-${variant}`} onClick={onConfirm} disabled={loading || disabled}>
                {loading && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>}
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop show"></div>
    </>
  );
}

import { useCallback, useMemo, useState } from "react";
import { ToastContext } from "./contexts";

const ICONS = {
  success: "bi-check-circle-fill",
  danger: "bi-x-circle-fill",
  warning: "bi-exclamation-triangle-fill",
  info: "bi-bell-fill",
};

// Small pop-up messages in the top-right corner
export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const showToast = useCallback(
    (message, type = "success", title) => {
      const id = Date.now() + Math.random();
      setToasts((list) => [...list.slice(-3), { id, message, type, title }]);
      setTimeout(() => removeToast(id), 5000);
    },
    [removeToast]
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-container position-fixed top-0 end-0 p-3" style={{ zIndex: 2000 }}>
        {toasts.map((t) => (
          <div key={t.id} className="toast show align-items-center border-0 shadow" role="alert" aria-live="assertive">
            <div className="d-flex">
              <div className="toast-body d-flex gap-2">
                <i aria-hidden="true" className={`bi ${ICONS[t.type] || ICONS.info} text-${t.type === "info" ? "primary" : t.type} fs-5`}></i>
                <div>
                  {t.title && <div className="fw-semibold">{t.title}</div>}
                  <div>{t.message}</div>
                </div>
              </div>
              <button type="button" className="btn-close me-2 m-auto" aria-label="Close" onClick={() => removeToast(t.id)}></button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

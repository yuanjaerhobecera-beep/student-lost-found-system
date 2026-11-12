import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { getErrorMessage } from "../../services/api";
import useNotifications from "../../hooks/useNotifications";
import useToast from "../../hooks/useToast";
import { Loading, EmptyState, ErrorAlert, PageHeader, Pagination } from "../../components/common";
import { timeAgo, formatDateTime } from "../../utils/format";

const ICONS = {
  account: "bi-person-check",
  lost_item: "bi-question-circle",
  found_item: "bi-box-seam",
  match: "bi-shuffle",
  claim: "bi-clipboard-check",
  release: "bi-box-arrow-up-right",
  announcement: "bi-megaphone",
  system: "bi-info-circle",
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { setUnreadCount, latest } = useNotifications();
  const [filters, setFilters] = useState({ page: 1, unread: false });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/notifications", { params: { page: filters.page, ...(filters.unread && { unread: "true" }) } });
      setData(res.data);
      setUnreadCount(res.data.unreadCount);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [filters, setUnreadCount]);

  // Reload when a new real-time notification arrives
  useEffect(() => {
    load();
  }, [load, latest]);

  const open = async (n) => {
    if (!n.isRead) {
      try {
        await api.patch(`/notifications/${n._id}/read`);
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        /* ignore */
      }
    }
    if (n.link) navigate(n.link);
    else load();
  };

  const markAll = async () => {
    try {
      await api.patch("/notifications/read-all");
      showToast("All notifications marked as read.");
      load();
    } catch (err) {
      showToast(getErrorMessage(err), "danger");
    }
  };

  const remove = async (e, id) => {
    e.stopPropagation();
    try {
      await api.delete(`/notifications/${id}`);
      load();
    } catch (err) {
      showToast(getErrorMessage(err), "danger");
    }
  };

  return (
    <div style={{ maxWidth: 860 }}>
      <PageHeader title="Notifications" subtitle={data ? `${data.unreadCount} unread` : ""}>
        <div className="btn-group">
          <button className={`btn btn-sm ${!filters.unread ? "btn-primary" : "btn-outline-primary"}`} onClick={() => setFilters({ page: 1, unread: false })}>All</button>
          <button className={`btn btn-sm ${filters.unread ? "btn-primary" : "btn-outline-primary"}`} onClick={() => setFilters({ page: 1, unread: true })}>Unread</button>
        </div>
        <button className="btn btn-sm btn-light" onClick={markAll} disabled={!data?.unreadCount}>
          <i aria-hidden="true" className="bi bi-check2-all me-1"></i>Mark all read
        </button>
      </PageHeader>

      <ErrorAlert message={error} onRetry={load} />
      {loading && !data ? (
        <Loading />
      ) : !data?.items.length ? (
        <div className="card border-0 shadow-sm">
          <EmptyState icon="bi-bell-slash" title="No notifications" message="You're all caught up." />
        </div>
      ) : (
        <div className="list-group shadow-sm">
          {data.items.map((n) => (
            <div
              key={n._id}
              role="button"
              tabIndex={0}
              onClick={() => open(n)}
              onKeyDown={(e) => e.key === "Enter" && open(n)}
              className={`list-group-item list-group-item-action d-flex gap-3 py-3 notification-item ${n.isRead ? "" : "unread"}`}
            >
              <i aria-hidden="true" className={`bi ${ICONS[n.type] || ICONS.system} fs-4 text-brand`}></i>
              <div className="flex-grow-1">
                <div className="d-flex justify-content-between gap-2">
                  <span className={n.isRead ? "" : "fw-semibold"}>{n.title}</span>
                  <small className="text-muted text-nowrap" title={formatDateTime(n.createdAt)}>{timeAgo(n.createdAt)}</small>
                </div>
                <div className="small text-body-secondary">{n.message}</div>
              </div>
              <button className="btn btn-sm btn-link text-muted align-self-start" onClick={(e) => remove(e, n._id)} aria-label="Delete notification">
                <i aria-hidden="true" className="bi bi-x-lg"></i>
              </button>
            </div>
          ))}
        </div>
      )}
      <Pagination pagination={data?.pagination} onChange={(page) => setFilters({ ...filters, page })} />
    </div>
  );
}

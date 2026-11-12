import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { getErrorMessage } from "../../services/api";
import useAuth from "../../hooks/useAuth";
import useBasePath from "../../hooks/useBasePath";
import useToast from "../../hooks/useToast";
import ItemFilters from "../../components/ItemFilters";
import ItemCard from "../../components/ItemCard";
import StatusChangeModal from "../../components/StatusChangeModal";
import { Loading, EmptyState, ErrorAlert, PageHeader, Pagination, StatusBadge, ItemImage } from "../../components/common";
import { formatDate, fullName, cleanParams } from "../../utils/format";

const STUDENT_STATUSES = { lost: ["open", "resolved"], found: ["available", "claimed"] };
const STAFF_STATUSES = { lost: ["open", "resolved", "closed"], found: ["pending", "available", "claimed", "released", "disposed"] };

// Students: browse items as cards.  Staff/Admin: manage items in a table.
export default function BrowseItemsPage({ type }) {
  const { user } = useAuth();
  const base = useBasePath();
  const { showToast } = useToast();
  const isStaff = user.role !== "student";

  const [filters, setFilters] = useState({ page: 1 });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusItem, setStatusItem] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/${type}-items`, { params: cleanParams({ ...filters, limit: isStaff ? 15 : 12 }) });
      setData(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [type, filters, isStaff]);

  useEffect(() => {
    load();
  }, [load]);

  const title = isStaff ? `Manage ${type === "lost" ? "Lost" : "Found"} Items` : `Browse ${type === "lost" ? "Lost" : "Found"} Items`;
  const subtitle = isStaff
    ? type === "found"
      ? "Receive turned-in items, update storage and status."
      : "All lost item reports submitted by students."
    : type === "found"
      ? "Items turned in to the Lost and Found office. See something that's yours? Open it and submit a claim."
      : "Items other students are looking for. Found one of them? Report it as a found item.";

  return (
    <>
      <PageHeader title={title} subtitle={subtitle}>
        {type === "found" && (
          <Link to={`${base}/report-found`} className="btn btn-primary">
            <i aria-hidden="true" className="bi bi-plus-lg me-1"></i>
            {isStaff ? "Record Found Item" : "Report Found Item"}
          </Link>
        )}
        {type === "lost" && !isStaff && (
          <Link to={`${base}/report-lost`} className="btn btn-primary">
            <i aria-hidden="true" className="bi bi-plus-lg me-1"></i>Report Lost Item
          </Link>
        )}
      </PageHeader>

      <ItemFilters type={type} filters={filters} onChange={setFilters} statuses={(isStaff ? STAFF_STATUSES : STUDENT_STATUSES)[type]} />
      <ErrorAlert message={error} onRetry={load} />

      {loading ? (
        <Loading />
      ) : !data?.items.length ? (
        <div className="card border-0 shadow-sm">
          <EmptyState icon="bi-search" title="No items found" message="Try changing your search or filters." />
        </div>
      ) : isStaff ? (
        <div className="card border-0 shadow-sm">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>Item</th>
                  <th className="d-none d-md-table-cell">Category</th>
                  <th className="d-none d-lg-table-cell">Location</th>
                  <th>{type === "lost" ? "Date Lost" : "Date Found"}</th>
                  <th className="d-none d-lg-table-cell">Reported By</th>
                  {type === "found" && <th className="d-none d-xl-table-cell">Storage</th>}
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item._id}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div className="table-thumb overflow-hidden flex-shrink-0">
                          <ItemImage src={item.images?.[0]?.url} height={44} />
                        </div>
                        <Link to={`${base}/items/${type}/${item._id}`} className="fw-semibold text-decoration-none">
                          {item.itemName}
                        </Link>
                      </div>
                    </td>
                    <td className="d-none d-md-table-cell small">{item.category?.name}</td>
                    <td className="d-none d-lg-table-cell small">{item.location?.name}</td>
                    <td className="small">{formatDate(type === "lost" ? item.dateLost : item.dateFound)}</td>
                    <td className="d-none d-lg-table-cell small">
                      {fullName(item.reportedBy)}
                      {item.reportedBy?.role && item.reportedBy.role !== "student" && <span className="text-muted"> ({item.reportedBy.role})</span>}
                    </td>
                    {type === "found" && <td className="d-none d-xl-table-cell small">{item.storageLocation || <span className="text-muted">-</span>}</td>}
                    <td>
                      <StatusBadge type={type} status={item.status} />
                    </td>
                    <td className="text-end text-nowrap">
                      <Link to={`${base}/items/${type}/${item._id}`} className="btn btn-sm btn-light me-1" title="View">
                        <i aria-hidden="true" className="bi bi-eye"></i>
                      </Link>
                      {!["released", "claimed"].includes(item.status) && (
                        <button className="btn btn-sm btn-outline-primary" onClick={() => setStatusItem(item)} title="Change status">
                          <i aria-hidden="true" className="bi bi-arrow-repeat"></i>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="row g-3">
          {data.items.map((item) => (
            <div key={item._id} className="col-sm-6 col-lg-4 col-xxl-3">
              <ItemCard item={item} type={type} to={`${base}/items/${type}/${item._id}`} />
            </div>
          ))}
        </div>
      )}

      <Pagination pagination={data?.pagination} onChange={(page) => setFilters({ ...filters, page })} />

      <StatusChangeModal
        item={statusItem}
        type={type}
        onClose={() => setStatusItem(null)}
        onSaved={() => {
          setStatusItem(null);
          showToast("Status updated.");
          load();
        }}
      />
    </>
  );
}

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api, { getErrorMessage } from "../../services/api";
import useAuth from "../../hooks/useAuth";
import useBasePath from "../../hooks/useBasePath";
import useLookups from "../../hooks/useLookups";
import useToast from "../../hooks/useToast";
import ImagePicker from "../../components/ImagePicker";
import { Loading, PageHeader, SubmitButton, ErrorAlert } from "../../components/common";
import { todayInput, toDateInput } from "../../utils/format";

const EMPTY = { itemName: "", category: "", description: "", date: "", time: "", location: "", locationDetails: "", identifyingDetails: "", storageLocation: "" };

// Create a lost/found report, or edit one (when the URL has an :id)
export default function ReportItemPage({ type: typeProp }) {
  const params = useParams();
  const type = typeProp || params.type;
  const editId = params.id;
  const { user } = useAuth();
  const base = useBasePath();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { categories, locations, loading: lookupsLoading } = useLookups();
  const isStaff = user.role !== "student";

  const [form, setForm] = useState(EMPTY);
  const [files, setFiles] = useState([]);
  const [existing, setExisting] = useState([]);
  const [removeImages, setRemoveImages] = useState([]);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(Boolean(editId));
  const [saving, setSaving] = useState(false);

  const dateField = type === "lost" ? "dateLost" : "dateFound";
  const timeField = type === "lost" ? "timeLost" : "timeFound";

  useEffect(() => {
    if (!editId) return;
    api
      .get(`/${type}-items/${editId}`)
      .then(({ data }) => {
        const it = data.item;
        setForm({
          itemName: it.itemName,
          category: it.category?._id || "",
          description: it.description,
          date: toDateInput(it[dateField]),
          time: it[timeField] || "",
          location: it.location?._id || "",
          locationDetails: it.locationDetails || "",
          identifyingDetails: it.identifyingDetails || "",
          storageLocation: it.storageLocation || "",
        });
        setExisting(it.images || []);
      })
      .catch((err) => setServerError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [editId, type, dateField, timeField]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
  };

  const validate = () => {
    const e = {};
    if (!form.itemName.trim()) e.itemName = "Item name is required.";
    if (!form.category) e.category = "Choose a category.";
    if (form.description.trim().length < 10) e.description = "Please describe the item (at least 10 characters).";
    if (!form.date) e.date = "Date is required.";
    else if (form.date > todayInput()) e.date = "Date can't be in the future.";
    if (!form.location) e.location = "Choose a location.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    if (!validate()) return;
    setSaving(true);

    const fd = new FormData();
    fd.append("itemName", form.itemName.trim());
    fd.append("category", form.category);
    fd.append("description", form.description.trim());
    fd.append(dateField, form.date);
    fd.append("location", form.location);
    if (form.time) fd.append(timeField, form.time);
    fd.append("locationDetails", form.locationDetails.trim());
    fd.append("identifyingDetails", form.identifyingDetails.trim());
    if (isStaff && type === "found") fd.append("storageLocation", form.storageLocation.trim());
    if (removeImages.length) fd.append("removeImages", JSON.stringify(removeImages));
    files.forEach((f) => fd.append("images", f));

    try {
      const { data } = editId ? await api.put(`/${type}-items/${editId}`, fd) : await api.post(`/${type}-items`, fd);
      showToast(editId ? "Report updated." : data.message);
      navigate(`${base}/items/${type}/${editId || data.item._id}`, { replace: true });
    } catch (err) {
      setServerError(getErrorMessage(err));
      const fieldErrors = err.response?.data?.errors;
      if (fieldErrors) setErrors(Object.fromEntries(fieldErrors.map((f) => [f.field === dateField ? "date" : f.field, f.message])));
    } finally {
      setSaving(false);
    }
  };

  if (loading || lookupsLoading) return <Loading />;

  const isLost = type === "lost";
  const title = editId ? "Edit Report" : isLost ? "Report a Lost Item" : isStaff ? "Record a Found Item" : "Report a Found Item";
  const subtitle = isLost
    ? "Tell us what you lost. We'll compare it with found items and notify you about possible matches."
    : isStaff
      ? "Record an item that was turned in to the office. It will be available for claims right away."
      : "Thank you for helping! After submitting, please bring the item to the Lost and Found office.";

  const invalid = (name) => (errors[name] ? "is-invalid" : "");

  return (
    <div style={{ maxWidth: 820 }}>
      <PageHeader title={title} subtitle={subtitle} />
      <ErrorAlert message={serverError} />

      <form onSubmit={handleSubmit} noValidate className="card border-0 shadow-sm">
        <div className="card-body row g-3">
          <div className="col-md-7">
            <label htmlFor="itemName" className="form-label">Item name *</label>
            <input id="itemName" name="itemName" className={`form-control ${invalid("itemName")}`} maxLength={100} placeholder="e.g. Black Samsung phone" value={form.itemName} onChange={handleChange} />
            <div className="invalid-feedback">{errors.itemName}</div>
          </div>
          <div className="col-md-5">
            <label htmlFor="category" className="form-label">Category *</label>
            <select id="category" name="category" className={`form-select ${invalid("category")}`} value={form.category} onChange={handleChange}>
              <option value="">Choose...</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
            <div className="invalid-feedback">{errors.category}</div>
          </div>

          <div className="col-12">
            <label htmlFor="description" className="form-label">Description *</label>
            <textarea
              id="description"
              name="description"
              rows={3}
              maxLength={1000}
              className={`form-control ${invalid("description")}`}
              placeholder="Color, brand, size, and other general details"
              value={form.description}
              onChange={handleChange}
            />
            <div className="invalid-feedback">{errors.description}</div>
            <div className="form-text">This is visible to other students. Keep secret details for the private field below.</div>
          </div>

          <div className="col-md-4">
            <label htmlFor="date" className="form-label">{isLost ? "Date lost" : "Date found"} *</label>
            <input id="date" name="date" type="date" max={todayInput()} className={`form-control ${invalid("date")}`} value={form.date} onChange={handleChange} />
            <div className="invalid-feedback">{errors.date}</div>
          </div>
          <div className="col-md-3">
            <label htmlFor="time" className="form-label">Approx. time</label>
            <input id="time" name="time" type="time" className="form-control" value={form.time} onChange={handleChange} />
          </div>
          <div className="col-md-5">
            <label htmlFor="location" className="form-label">{isLost ? "Where you lost it" : "Where you found it"} *</label>
            <select id="location" name="location" className={`form-select ${invalid("location")}`} value={form.location} onChange={handleChange}>
              <option value="">Choose...</option>
              {locations.map((l) => (
                <option key={l._id} value={l._id}>{l.name}</option>
              ))}
            </select>
            <div className="invalid-feedback">{errors.location}</div>
          </div>
          <div className="col-12">
            <label htmlFor="locationDetails" className="form-label">Location details</label>
            <input id="locationDetails" name="locationDetails" className="form-control" maxLength={200} placeholder="e.g. 2nd floor, near the water fountain" value={form.locationDetails} onChange={handleChange} />
          </div>

          <div className="col-12">
            <label htmlFor="identifyingDetails" className="form-label">
              <i aria-hidden="true" className="bi bi-lock me-1"></i>Private identifying details
            </label>
            <textarea
              id="identifyingDetails"
              name="identifyingDetails"
              rows={2}
              maxLength={1000}
              className="form-control"
              placeholder={isLost ? "e.g. scratch on the back, lock screen photo, name written inside" : "e.g. contents of the wallet, name on the ID, phone wallpaper"}
              value={form.identifyingDetails}
              onChange={handleChange}
            />
            <div className="form-text">
              Only {isStaff ? "staff" : "you and staff"} can see this. Staff use it to check that a claimant is the real owner.
            </div>
          </div>

          {isStaff && !isLost && (
            <div className="col-12">
              <label htmlFor="storageLocation" className="form-label">Storage location (staff only)</label>
              <input id="storageLocation" name="storageLocation" className="form-control" maxLength={200} placeholder="e.g. Cabinet B, Shelf 2" value={form.storageLocation} onChange={handleChange} />
            </div>
          )}

          <div className="col-12">
            <ImagePicker
              files={files}
              setFiles={setFiles}
              max={3}
              existing={existing.filter((img) => !removeImages.includes(img.publicId))}
              onRemoveExisting={(img) => setRemoveImages([...removeImages, img.publicId])}
              onError={(msg) => showToast(msg, "warning")}
            />
          </div>
        </div>
        <div className="card-footer bg-white d-flex justify-content-end gap-2 py-3">
          <button type="button" className="btn btn-light" onClick={() => navigate(-1)}>Cancel</button>
          <SubmitButton loading={saving}>{editId ? "Save Changes" : "Submit Report"}</SubmitButton>
        </div>
      </form>
    </div>
  );
}

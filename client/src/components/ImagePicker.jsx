import { useEffect, useMemo } from "react";

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_MB = 5;

// Lets users choose up to `max` images and shows previews.
// `existing` = images already saved (when editing), removable with onRemoveExisting.
export default function ImagePicker({ files, setFiles, max = 3, existing = [], onRemoveExisting, onError, label = "Photos" }) {
  const previews = useMemo(() => files.map((f) => ({ file: f, url: URL.createObjectURL(f) })), [files]);
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews]);

  const remaining = max - existing.length - files.length;

  const handleChange = (e) => {
    const chosen = Array.from(e.target.files || []);
    e.target.value = "";
    const valid = [];
    for (const f of chosen) {
      if (!ALLOWED.includes(f.type)) {
        onError?.(`"${f.name}" is not a JPG, PNG or WEBP image.`);
        continue;
      }
      if (f.size > MAX_MB * 1024 * 1024) {
        onError?.(`"${f.name}" is larger than ${MAX_MB}MB.`);
        continue;
      }
      valid.push(f);
    }
    if (valid.length > remaining) onError?.(`You can add ${remaining} more image(s).`);
    setFiles([...files, ...valid.slice(0, Math.max(0, remaining))]);
  };

  return (
    <div>
      <label className="form-label">
        {label} <span className="text-muted small">(optional, up to {max}, max {MAX_MB}MB each)</span>
      </label>
      <div className="d-flex flex-wrap gap-2">
        {existing.map((img) => (
          <div key={img.publicId} className="image-thumb">
            <img src={img.url} alt="" />
            {onRemoveExisting && (
              <button type="button" className="btn btn-sm btn-danger image-thumb-remove" onClick={() => onRemoveExisting(img)} aria-label="Remove image">
                <i aria-hidden="true" className="bi bi-x"></i>
              </button>
            )}
          </div>
        ))}
        {previews.map((p, i) => (
          <div key={p.url} className="image-thumb">
            <img src={p.url} alt="" />
            <button
              type="button"
              className="btn btn-sm btn-danger image-thumb-remove"
              onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
              aria-label="Remove image"
            >
              <i aria-hidden="true" className="bi bi-x"></i>
            </button>
          </div>
        ))}
        {remaining > 0 && (
          <label className="image-thumb image-thumb-add" role="button">
            <i aria-hidden="true" className="bi bi-camera fs-3"></i>
            <small>Add</small>
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={handleChange} />
          </label>
        )}
      </div>
    </div>
  );
}

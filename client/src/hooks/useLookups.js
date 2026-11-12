import { useEffect, useState } from "react";
import api from "../services/api";

// Loads categories and campus locations once and shares them between pages.
let cache = null;

export default function useLookups() {
  const [data, setData] = useState(cache || { categories: [], locations: [] });
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    if (cache) return;
    let active = true;
    Promise.all([api.get("/categories"), api.get("/locations")])
      .then(([c, l]) => {
        cache = { categories: c.data.items, locations: l.data.items };
        if (active) setData(cache);
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return { ...data, loading };
}

// Call after an admin changes categories/locations so other pages reload them
export const clearLookupCache = () => {
  cache = null;
};

import axios from "axios";

// One Axios instance for the whole app.
// baseURL "/api" goes through the Vite proxy to http://localhost:5000/api
const api = axios.create({ baseURL: "/api", withCredentials: true });

// ---------- CSRF token ----------
let csrfToken = null;
let csrfRequest = null;

export const fetchCsrfToken = async (force = false) => {
  if (csrfToken && !force) return csrfToken;
  if (!csrfRequest) {
    csrfRequest = axios
      .get("/api/csrf-token", { withCredentials: true })
      .then((res) => (csrfToken = res.data.csrfToken))
      .finally(() => (csrfRequest = null));
  }
  return csrfRequest;
};

// Add the CSRF token to every request that changes data
api.interceptors.request.use(async (config) => {
  const method = (config.method || "get").toUpperCase();
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    config.headers["X-CSRF-Token"] = await fetchCsrfToken();
  }
  return config;
});

// ---------- Automatic session refresh ----------
let refreshRequest = null;
let onSessionExpired = () => {};
export const setSessionExpiredHandler = (fn) => {
  onSessionExpired = fn;
};

const AUTH_URLS = ["/auth/login", "/auth/refresh", "/auth/logout", "/auth/register"];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    if (!response || !config) return Promise.reject(error);
    const code = response.data?.code;

    // CSRF token expired -> get a new one and try once more
    if (response.status === 403 && code === "CSRF_INVALID" && !config._csrfRetry) {
      config._csrfRetry = true;
      await fetchCsrfToken(true);
      return api(config);
    }

    // Access token expired -> use the refresh token, then repeat the original request
    const isAuthUrl = AUTH_URLS.some((u) => config.url?.includes(u));
    if (response.status === 401 && ["TOKEN_EXPIRED", "NOT_AUTHENTICATED"].includes(code) && !config._retry && !isAuthUrl) {
      config._retry = true;
      try {
        if (!refreshRequest) refreshRequest = api.post("/auth/refresh").finally(() => (refreshRequest = null));
        await refreshRequest;
        return api(config);
      } catch {
        onSessionExpired();
      }
    }
    return Promise.reject(error);
  }
);

// Turns any error into a message we can show the user
export const getErrorMessage = (err, fallback = "Something went wrong. Please try again.") => {
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.request && !err?.response) return "Can't reach the server. Make sure the backend is running.";
  return fallback;
};

export default api;

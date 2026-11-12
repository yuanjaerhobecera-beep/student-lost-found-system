import { Navigate, Outlet, useLocation } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { Loading } from "./common";

// Hides pages from users who aren't logged in or don't have the right role.
// NOTE: this only improves the experience. The REAL security check is on the backend,
// which rejects any request from a user without permission.
export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loading text="Checking your session..." />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;

  if (roles && !roles.includes(user.role)) {
    // e.g. an admin opening a /staff/... link from a notification goes to /admin/...
    const rest = location.pathname.split("/").slice(2).join("/");
    return <Navigate to={`/${user.role}${rest ? `/${rest}` : ""}`} replace />;
  }
  return <Outlet />;
}

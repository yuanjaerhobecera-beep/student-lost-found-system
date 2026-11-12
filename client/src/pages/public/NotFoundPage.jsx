import { Link } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

export default function NotFoundPage({ inDashboard = false }) {
  const { user } = useAuth();
  return (
    <div className={`text-center ${inDashboard ? "py-5" : "container py-5 my-5"}`}>
      <i aria-hidden="true" className="bi bi-signpost-split display-1 text-muted"></i>
      <h1 className="h3 fw-bold mt-3">Page not found</h1>
      <p className="text-muted">The page you're looking for doesn't exist or you don't have access to it.</p>
      <Link to={user ? `/${user.role}` : "/"} className="btn btn-primary">
        {user ? "Back to Dashboard" : "Go Home"}
      </Link>
    </div>
  );
}

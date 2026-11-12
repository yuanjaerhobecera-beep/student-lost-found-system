import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import useAuth from "../hooks/useAuth";

export default function PublicLayout() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="d-flex flex-column min-vh-100">
      <nav className="navbar navbar-expand-md navbar-dark bg-brand sticky-top shadow-sm">
        <div className="container">
          <Link className="navbar-brand fw-bold d-flex align-items-center gap-2" to="/" onClick={close}>
            <i aria-hidden="true" className="bi bi-search-heart"></i> Lost &amp; Found
          </Link>
          <button className="navbar-toggler" type="button" aria-label="Toggle navigation" aria-expanded={open} onClick={() => setOpen(!open)}>
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className={`collapse navbar-collapse ${open ? "show" : ""}`}>
            <ul className="navbar-nav ms-auto align-items-md-center gap-md-2">
              <li className="nav-item">
                <NavLink className="nav-link" to="/" end onClick={close}>
                  Home
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link" to="/about" onClick={close}>
                  About
                </NavLink>
              </li>
              {user ? (
                <li className="nav-item">
                  <Link className="btn btn-light btn-sm ms-md-2 my-2 my-md-0" to={`/${user.role}`} onClick={close}>
                    <i aria-hidden="true" className="bi bi-speedometer2 me-1"></i>My Dashboard
                  </Link>
                </li>
              ) : (
                <>
                  <li className="nav-item">
                    <NavLink className="nav-link" to="/login" onClick={close}>
                      Log in
                    </NavLink>
                  </li>
                  <li className="nav-item">
                    <Link className="btn btn-light btn-sm ms-md-2 my-2 my-md-0" to="/register" onClick={close}>
                      Register
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
      </nav>

      <main className="flex-grow-1">
        <Outlet />
      </main>

      <footer className="bg-white border-top py-4 mt-auto">
        <div className="container d-flex flex-wrap justify-content-between gap-2 small text-muted">
          <span>© {new Date().getFullYear()} Web-Based Secured Student Lost and Found System</span>
          <span>
            <i aria-hidden="true" className="bi bi-shield-lock me-1"></i>Your data is protected
          </span>
        </div>
      </footer>
    </div>
  );
}

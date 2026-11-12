import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import useNotifications from "../hooks/useNotifications";
import { ROLE_COLORS } from "../utils/constants";

// Sidebar menus for each role
const MENUS = {
  student: [
    { to: "/student", icon: "bi-speedometer2", label: "Dashboard", end: true },
    { to: "/student/report-lost", icon: "bi-question-circle", label: "Report Lost Item" },
    { to: "/student/report-found", icon: "bi-hand-thumbs-up", label: "Report Found Item" },
    { to: "/student/found-items", icon: "bi-box-seam", label: "Browse Found Items" },
    { to: "/student/lost-items", icon: "bi-search", label: "Browse Lost Items" },
    { to: "/student/my-reports", icon: "bi-journal-text", label: "My Reports" },
    { to: "/student/claims", icon: "bi-clipboard-check", label: "My Claims" },
  ],
  staff: [
    { to: "/staff", icon: "bi-speedometer2", label: "Dashboard", end: true },
    { to: "/staff/found-items", icon: "bi-box-seam", label: "Manage Found Items" },
    { to: "/staff/lost-items", icon: "bi-search", label: "Manage Lost Items" },
    { to: "/staff/report-found", icon: "bi-plus-square", label: "Record Found Item" },
    { to: "/staff/claims", icon: "bi-clipboard-check", label: "Review Claims" },
    { to: "/staff/verify-qr", icon: "bi-qr-code-scan", label: "Verify QR Code" },
    { to: "/staff/releases", icon: "bi-box-arrow-up-right", label: "Release Records" },
    { to: "/staff/activity-logs", icon: "bi-clock-history", label: "Activity Logs" },
  ],
  admin: [
    { to: "/admin", icon: "bi-speedometer2", label: "Dashboard", end: true },
    { section: "People" },
    { to: "/admin/users", icon: "bi-people", label: "Manage Students" },
    { to: "/admin/staff", icon: "bi-person-badge", label: "Manage Staff" },
    { section: "Items & Claims" },
    { to: "/admin/found-items", icon: "bi-box-seam", label: "Found Items" },
    { to: "/admin/lost-items", icon: "bi-search", label: "Lost Items" },
    { to: "/admin/claims", icon: "bi-clipboard-check", label: "Manage Claims" },
    { to: "/admin/verify-qr", icon: "bi-qr-code-scan", label: "Verify QR Code" },
    { to: "/admin/releases", icon: "bi-box-arrow-up-right", label: "Release Records" },
    { section: "System" },
    { to: "/admin/categories", icon: "bi-tags", label: "Categories" },
    { to: "/admin/locations", icon: "bi-geo-alt", label: "Campus Locations" },
    { to: "/admin/reports", icon: "bi-bar-chart-line", label: "Reports & Analytics" },
    { to: "/admin/activity-logs", icon: "bi-clock-history", label: "Activity Logs" },
    { to: "/admin/settings", icon: "bi-gear", label: "System Settings" },
  ],
};

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const base = `/${user.role}`;

  // Close menus when the page changes
  useEffect(() => {
    setSidebarOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onClick = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenuOpen(false);
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="dashboard">
      <aside className={`sidebar bg-brand text-white ${sidebarOpen ? "open" : ""}`} aria-label="Main menu">
        <div className="sidebar-brand d-flex align-items-center justify-content-between px-3">
          <Link to="/" className="text-white text-decoration-none fw-bold">
            <i aria-hidden="true" className="bi bi-search-heart me-2"></i>Lost &amp; Found
          </Link>
          <button className="btn btn-sm btn-link text-white d-lg-none" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
            <i aria-hidden="true" className="bi bi-x-lg"></i>
          </button>
        </div>
        <nav className="nav flex-column p-2">
          {MENUS[user.role].map((item, i) =>
            item.section ? (
              <div key={i} className="sidebar-section">
                {item.section}
              </div>
            ) : (
              <NavLink key={item.to} to={item.to} end={item.end} className="nav-link sidebar-link">
                <i aria-hidden="true" className={`bi ${item.icon}`}></i>
                <span>{item.label}</span>
              </NavLink>
            )
          )}
        </nav>
      </aside>
      {sidebarOpen && <div className="sidebar-backdrop d-lg-none" onClick={() => setSidebarOpen(false)}></div>}

      <div className="dashboard-main">
        <header className="topbar bg-white border-bottom d-flex align-items-center px-3 gap-2">
          <button className="btn btn-light d-lg-none" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <i aria-hidden="true" className="bi bi-list"></i>
          </button>
          <span className={`badge text-bg-${ROLE_COLORS[user.role]} text-uppercase d-none d-sm-inline`}>{user.role}</span>

          <div className="ms-auto d-flex align-items-center gap-2">
            <Link to={`${base}/notifications`} className="btn btn-light position-relative" aria-label={`Notifications (${unreadCount} unread)`}>
              <i aria-hidden="true" className="bi bi-bell"></i>
              {unreadCount > 0 && (
                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>

            <div className="dropdown" ref={menuRef}>
              <button className="btn btn-light d-flex align-items-center gap-2" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen}>
                <span className="avatar">{user.firstName?.[0]}{user.lastName?.[0]}</span>
                <span className="d-none d-md-inline small fw-semibold">{user.firstName}</span>
                <i aria-hidden="true" className="bi bi-chevron-down small"></i>
              </button>
              <ul className={`dropdown-menu dropdown-menu-end shadow ${menuOpen ? "show" : ""}`} style={{ right: 0 }}>
                <li className="px-3 py-2 small">
                  <div className="fw-semibold">
                    {user.firstName} {user.lastName}
                  </div>
                  <div className="text-muted text-truncate" style={{ maxWidth: 220 }}>
                    {user.email}
                  </div>
                </li>
                <li><hr className="dropdown-divider" /></li>
                <li>
                  <Link className="dropdown-item" to={`${base}/profile`}>
                    <i aria-hidden="true" className="bi bi-person me-2"></i>My Profile
                  </Link>
                </li>
                <li>
                  <Link className="dropdown-item" to={`${base}/notifications`}>
                    <i aria-hidden="true" className="bi bi-bell me-2"></i>Notifications
                  </Link>
                </li>
                <li><hr className="dropdown-divider" /></li>
                <li>
                  <button className="dropdown-item text-danger" onClick={handleLogout}>
                    <i aria-hidden="true" className="bi bi-box-arrow-right me-2"></i>Log out
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </header>

        <main className="p-3 p-md-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

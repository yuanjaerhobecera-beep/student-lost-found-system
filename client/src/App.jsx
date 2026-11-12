import { Routes, Route } from "react-router-dom";
import PublicLayout from "./layouts/PublicLayout";
import DashboardLayout from "./layouts/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";

// Public
import HomePage from "./pages/public/HomePage";
import AboutPage from "./pages/public/AboutPage";
import NotFoundPage from "./pages/public/NotFoundPage";

// Auth
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import VerifyEmailPage from "./pages/auth/VerifyEmailPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";

// Shared (used by more than one role)
import ProfilePage from "./pages/shared/ProfilePage";
import NotificationsPage from "./pages/shared/NotificationsPage";
import BrowseItemsPage from "./pages/shared/BrowseItemsPage";
import ItemDetailsPage from "./pages/shared/ItemDetailsPage";
import ReportItemPage from "./pages/shared/ReportItemPage";
import ClaimsListPage from "./pages/shared/ClaimsListPage";
import ClaimDetailsPage from "./pages/shared/ClaimDetailsPage";
import ActivityLogsPage from "./pages/shared/ActivityLogsPage";
import VerifyQrPage from "./pages/shared/VerifyQrPage";

// Student
import StudentDashboard from "./pages/student/StudentDashboard";
import MyReportsPage from "./pages/student/MyReportsPage";
import NewClaimPage from "./pages/student/NewClaimPage";

// Staff
import StaffDashboard from "./pages/staff/StaffDashboard";

// Admin
import AdminDashboard from "./pages/admin/AdminDashboard";
import ManageUsersPage from "./pages/admin/ManageUsersPage";
import ManageLookupPage from "./pages/admin/ManageLookupPage";
import ReportsPage from "./pages/admin/ReportsPage";
import SettingsPage from "./pages/admin/SettingsPage";

// Pages that every logged-in role has under its own path
const sharedRoutes = (
  <>
    <Route path="profile" element={<ProfilePage />} />
    <Route path="notifications" element={<NotificationsPage />} />
    <Route path="items/:type/:id" element={<ItemDetailsPage />} />
    <Route path="claims/:id" element={<ClaimDetailsPage />} />
    <Route path="*" element={<NotFoundPage inDashboard />} />
  </>
);

export default function App() {
  return (
    <Routes>
      {/* Public pages */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      {/* Student pages */}
      <Route element={<ProtectedRoute roles={["student"]} />}>
        <Route path="/student" element={<DashboardLayout />}>
          <Route index element={<StudentDashboard />} />
          <Route path="report-lost" element={<ReportItemPage key="lost" type="lost" />} />
          <Route path="report-found" element={<ReportItemPage key="found" type="found" />} />
          <Route path="items/:type/:id/edit" element={<ReportItemPage />} />
          <Route path="found-items" element={<BrowseItemsPage key="found" type="found" />} />
          <Route path="lost-items" element={<BrowseItemsPage key="lost" type="lost" />} />
          <Route path="my-reports" element={<MyReportsPage />} />
          <Route path="claims" element={<ClaimsListPage mode="mine" />} />
          <Route path="claim/:foundItemId" element={<NewClaimPage />} />
          {sharedRoutes}
        </Route>
      </Route>

      {/* Staff pages */}
      <Route element={<ProtectedRoute roles={["staff"]} />}>
        <Route path="/staff" element={<DashboardLayout />}>
          <Route index element={<StaffDashboard />} />
          <Route path="found-items" element={<BrowseItemsPage key="found" type="found" />} />
          <Route path="lost-items" element={<BrowseItemsPage key="lost" type="lost" />} />
          <Route path="report-found" element={<ReportItemPage key="found" type="found" />} />
          <Route path="items/:type/:id/edit" element={<ReportItemPage />} />
          <Route path="claims" element={<ClaimsListPage key="manage" mode="manage" />} />
          <Route path="releases" element={<ClaimsListPage key="releases" mode="releases" />} />
          <Route path="verify-qr" element={<VerifyQrPage />} />
          <Route path="activity-logs" element={<ActivityLogsPage />} />
          {sharedRoutes}
        </Route>
      </Route>

      {/* Admin pages */}
      <Route element={<ProtectedRoute roles={["admin"]} />}>
        <Route path="/admin" element={<DashboardLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<ManageUsersPage key="students" mode="students" />} />
          <Route path="staff" element={<ManageUsersPage key="staff" mode="staff" />} />
          <Route path="found-items" element={<BrowseItemsPage key="found" type="found" />} />
          <Route path="lost-items" element={<BrowseItemsPage key="lost" type="lost" />} />
          <Route path="report-found" element={<ReportItemPage key="found" type="found" />} />
          <Route path="items/:type/:id/edit" element={<ReportItemPage />} />
          <Route path="claims" element={<ClaimsListPage key="manage" mode="manage" />} />
          <Route path="releases" element={<ClaimsListPage key="releases" mode="releases" />} />
          <Route path="verify-qr" element={<VerifyQrPage />} />
          <Route path="categories" element={<ManageLookupPage key="categories" kind="categories" />} />
          <Route path="locations" element={<ManageLookupPage key="locations" kind="locations" />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="activity-logs" element={<ActivityLogsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          {sharedRoutes}
        </Route>
      </Route>

      <Route element={<PublicLayout />}>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

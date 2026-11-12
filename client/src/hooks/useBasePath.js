import useAuth from "./useAuth";

// Returns "/student", "/staff" or "/admin" depending on who is logged in.
// Shared pages use it to build links, e.g. `${base}/claims/123`
export default function useBasePath() {
  const { user } = useAuth();
  return `/${user?.role || "student"}`;
}

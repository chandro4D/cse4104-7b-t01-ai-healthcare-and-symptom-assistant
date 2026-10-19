import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import { clearSession, getRoleHome, getUser, isLoggedIn } from "../utils/auth";

/**
 * Wrap any route (or group of routes) that needs login.
 *
 *   <Route element={<ProtectedRoute />}>                           // any logged-in user
 *   <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>  // admin only
 */
function ProtectedRoute({ allowedRoles }) {
  const location = useLocation();

  const loggedIn = isLoggedIn();
  const user = getUser();
  const roleAllowed =
    !allowedRoles || (user?.role && allowedRoles.includes(user.role));

  // Show the "access denied" popup once (not during render)
  useEffect(() => {
    if (loggedIn && !roleAllowed) {
      Swal.fire({
        icon: "error",
        title: "Access denied",
        text: "You do not have permission to view this page.",
        confirmButtonColor: "#0F6E56",
      });
    }
  }, [loggedIn, roleAllowed]);

  // 1) Not logged in (or token expired) -> go to login
  if (!loggedIn) {
    clearSession(); // remove stale / expired data

    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location, message: "Please login to continue." }}
      />
    );
  }

  // 2) Logged in but wrong role -> send to their own dashboard
  if (!roleAllowed) {
    return <Navigate to={getRoleHome(user?.role)} replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;

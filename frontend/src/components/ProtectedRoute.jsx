import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import { clearSession, getRoleHome, getUser, isLoggedIn } from "../utils/auth";

function ProtectedRoute({ allowedRoles }) {
  const location = useLocation();

  const loggedIn = isLoggedIn();
  const user = getUser();

  // Normalize role names, e.g. Admin -> admin.
  const role = user?.role?.toLowerCase();

  const normalizedAllowedRoles = allowedRoles?.map((item) =>
    item.toLowerCase(),
  );

  const roleAllowed =
    !normalizedAllowedRoles || (role && normalizedAllowedRoles.includes(role));

  
  useEffect(() => {
    if (loggedIn && !roleAllowed) {
      // Swal.fire({
      //   icon: "error",
      //   title: "Access denied",
      //   text: "You do not have permission to view this page.",
      //   confirmButtonColor: "#0F6E56",
      // });
    }
  }, [loggedIn, roleAllowed]);

  // Redirect unauthenticated users to login.
  if (!loggedIn) {
    clearSession();

    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location,
          message: "Please login to continue.",
        }}
      />
    );
  }

  // Redirect users to their own dashboard if their role is not permitted.
  if (!roleAllowed) {
    return <Navigate to={getRoleHome(role)} replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;

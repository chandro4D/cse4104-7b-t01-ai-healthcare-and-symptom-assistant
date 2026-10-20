import { Navigate, Outlet } from "react-router-dom";
import { getRoleHome, getUser, isLoggedIn } from "../utils/auth";

/**
 * Use for /login and /signup so logged-in users
 * don't see them again.
 */
function PublicOnlyRoute() {
  if (isLoggedIn()) {
    return <Navigate to={getRoleHome(getUser()?.role)} replace />;
  }

  return <Outlet />;
}

export default PublicOnlyRoute;

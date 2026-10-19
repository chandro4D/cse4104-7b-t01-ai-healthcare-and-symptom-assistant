import { Navigate } from "react-router-dom";
import { getRoleHome, getUser } from "../utils/auth";

// Visiting /dashboard sends the user to the home page of their own role.
function DashboardIndex() {
  return <Navigate to={getRoleHome(getUser()?.role)} replace />;
}

export default DashboardIndex;

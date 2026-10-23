import { Navigate } from "react-router-dom";
import { getUser, getRoleHome, isLoggedIn } from "../utils/auth";

function DashboardIndex() {
  // If the user is not logged in, redirect to login.
  if (!isLoggedIn()) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          message: "Please log in to access your dashboard.",
        }}
      />
    );
  }

  // Read the logged-in user's information.
  const user = getUser();

  // Determine the dashboard URL based on the user's role.
  const dashboardPath = getRoleHome(user?.role);

  // Redirect to the appropriate dashboard.
  return <Navigate to={dashboardPath} replace />;
}

export default DashboardIndex;

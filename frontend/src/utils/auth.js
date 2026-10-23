// Central place for reading and managing the login session.

// Get the stored authentication token.
export const getToken = () => localStorage.getItem("token");

// Get the stored user.
export const getUser = () => {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// Check whether a JWT has expired.
export const isTokenExpired = (token) => {
  if (!token) return true;

  try {
    const payloadPart = token.split(".")[1];

    if (!payloadPart) return true;

    const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");

    const payload = JSON.parse(atob(base64));

    // A token without an exp field is treated as non-expiring.
    if (payload.exp == null) return false;

    return payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
};

// Check whether a valid local login session exists.
export const isLoggedIn = () => {
  const token = getToken();

  return Boolean(token) && !isTokenExpired(token) && Boolean(getUser());
};

// Clear the login session.
export const clearSession = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");

  // Notify components that the session has changed.
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("userUpdated"));
  }
};

// Normalize role names.
export const normalizeRole = (role) => {
  return typeof role === "string" ? role.trim().toLowerCase() : "";
};

// Return the dashboard URL for the specified role.
export const getRoleHome = (role) => {
  switch (normalizeRole(role)) {
    case "patient":
      return "/dashboard/patientHome";

    case "doctor":
      return "/dashboard/doctorHome";

    case "admin":
      return "/dashboard/adminHome";

    default:
      return "/login";
  }
};

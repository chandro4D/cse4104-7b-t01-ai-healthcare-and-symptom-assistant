// src/utils/auth.js
// Central place for reading / clearing the login session.

export const getToken = () => localStorage.getItem("token");

export const getUser = () => {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    // Corrupted localStorage value
    return null;
  }
};

// Reads the "exp" field of a JWT. Returns true if expired or unreadable.
export const isTokenExpired = (token) => {
  if (!token) return true;

  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));

    if (!payload.exp) return false; // token without expiry
    return payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
};

export const isLoggedIn = () => {
  const token = getToken();
  return Boolean(token) && !isTokenExpired(token) && Boolean(getUser());
};

export const clearSession = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

// Default landing page for each role
export const getRoleHome = (role) => {
  switch (role) {
    case "admin":
      return "/dashboard/adminHome";
    case "doctor":
      return "/dashboard/seller";
    default:
      return "/dashboard/patientHome";
  }
};

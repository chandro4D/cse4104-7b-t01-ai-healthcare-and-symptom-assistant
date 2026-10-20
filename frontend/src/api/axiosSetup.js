import axios from "axios";
import Swal from "sweetalert2";
import { clearSession, getToken } from "../utils/auth";

// Attach the token automatically to every request
axios.interceptors.request.use((config) => {
  const token = getToken();

  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

let redirecting = false;

// If the server says the token is invalid/expired -> logout + go to login
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const isAuthRequest = error.config?.url?.includes("/auth/");

    if (status === 401 && !isAuthRequest && !redirecting) {
      redirecting = true;
      clearSession();

      await Swal.fire({
        icon: "warning",
        title: "Session expired",
        text: "Please login again to continue.",
        confirmButtonColor: "#0F6E56",
      });

      redirecting = false;
      window.location.replace("/login");
    }

    return Promise.reject(error);
  },
);

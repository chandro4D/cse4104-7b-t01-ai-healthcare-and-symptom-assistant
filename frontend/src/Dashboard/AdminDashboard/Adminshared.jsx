import { useEffect, useState } from "react";
import { FaTimes } from "react-icons/fa";

// Set VITE_API_URL in your .env for production, e.g. https://api.yoursite.com
export const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");
export const API = `${API_URL}/api/v1`;
// All admin pages talk to this router (see routes/adminPanel.routes.js).
export const ADMIN_API = `${API}/admin`;

// Page paths - change here if your router uses different URLs.
export const ROUTES = {
  home: "/dashboard/adminHome",
  users: "/dashboard/userManagement",
  doctors: "/dashboard/doctorVerification",
  appointments: "/dashboard/appointmentOverview",
  audit: "/dashboard/auditAndSecurity",
};

export const authConfig = () => ({
  withCredentials: true,
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

export function errorText(err, fallback) {
  if (err?.response?.status === 401) {
    return "Your session has expired. Please log in again.";
  }
  if (err?.response?.status === 403) {
    return (
      err?.response?.data?.message || "You do not have permission to do this."
    );
  }
  return err?.response?.data?.message || fallback;
}

export function storedUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}

export const initials = (name) =>
  String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "A";

// "YYYY-MM-DD" -> local Date (no time-zone shift)
export const keyToDate = (key) => {
  const [y, m, d] = String(key).split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const formatDay = (key, opts = { day: "numeric", month: "short" }) =>
  key ? keyToDate(key).toLocaleDateString(undefined, opts) : "—";

// "14:30" -> "2:30 PM"
export const formatTime = (time) => {
  const m = String(time || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return time || "";
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h >= 12 ? "PM" : "AM"}`;
};

export const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";

export const timeAgo = (value) => {
  if (!value) return "";
  const s = Math.max(
    0,
    Math.round((Date.now() - new Date(value).getTime()) / 1000),
  );
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} day${d > 1 ? "s" : ""} ago`;
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

// "USER_SUSPENDED" -> "User suspended"
export const humanizeAction = (action) => {
  const text = String(action || "")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "Activity";
};

export function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ---------------------------------------------------------------------------
// Small UI pieces
// ---------------------------------------------------------------------------
export const TONES = {
  teal: "bg-teal-50 text-teal-700",
  amber: "bg-amber-50 text-amber-700",
  rose: "bg-rose-50 text-rose-700",
  slate: "bg-slate-100 text-slate-600",
  blue: "bg-sky-50 text-sky-700",
};

export function Pill({ tone = "slate", children }) {
  return (
    <span
      className={`inline-block text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full uppercase ${
        TONES[tone] || TONES.slate
      }`}
    >
      {children}
    </span>
  );
}

export function Banner({ kind = "error", children, actionLabel, onAction }) {
  const styles =
    kind === "success"
      ? "border-teal-100 bg-teal-50 text-teal-800"
      : "border-rose-100 bg-rose-50 text-rose-700";
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-3 text-sm ${styles}`}
    >
      <span>{children}</span>
      {onAction && (
        <button
          onClick={onAction}
          className="font-semibold underline hover:no-underline shrink-0"
        >
          {actionLabel || "Retry"}
        </button>
      )}
    </div>
  );
}

function useEscape(onClose) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
}

export function Modal({ title, subtitle, onClose, children, footer }) {
  useEscape(onClose);
  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="bg-white rounded-xl w-full max-w-md p-6 space-y-4"
      >
        <div>
          <h2 className="font-bold text-slate-900">{title}</h2>
          {subtitle && (
            <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
          )}
        </div>
        {children}
        {footer && <div className="flex justify-end gap-2 pt-1">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({ title, onClose, children, footer }) {
  useEscape(onClose);
  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex justify-end"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="bg-white w-full max-w-md h-full flex flex-col shadow-xl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-lg text-slate-500 hover:bg-slate-50 flex items-center justify-center"
          >
            <FaTimes />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-slate-100 flex flex-wrap gap-2">
            {footer}
          </div>
        )}
      </aside>
    </div>
  );
}

export function Pagination({ page, pages, total, onChange }) {
  if (!total) return null;
  return (
    <div className="flex items-center justify-between pt-4 text-sm text-slate-500">
      <span>
        Page {page} of {Math.max(1, pages)} · {total.toLocaleString()} result
        {total === 1 ? "" : "s"}
      </span>
      <div className="flex gap-2">
        <button
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <button
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}

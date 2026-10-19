import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FaSearch,
  FaBell,
  FaCalendarCheck,
  FaClipboardList,
  FaUserInjured,
  FaUserMd,
  FaCheck,
  FaTimes,
} from "react-icons/fa";

// Set VITE_API_URL in your .env for production, e.g. https://api.yoursite.com
const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");
const API = `${API_URL}/api/v1`;

// ----------------------------------------------------------------------------
// CONFIG — adjust these to match your router and your appointment routes.
// ----------------------------------------------------------------------------

// Page that lists / manages appointments. Cards link here with ?status=...
// Matches the doctor routes in AppRoutes.jsx.
const ROUTES = {
  appointments: "/dashboard/appointmentManagement",
  patients: "/dashboard/patientDirectory", // UPDATED: patient directory page
  visitRequests: "/dashboard/patientDirectory?tab=requests", // NEW
  profile: "/dashboard/doctorProfileAndAvailability",
};

// Doctor-only endpoint (requires the doctor role).
const APPOINTMENT_ENDPOINTS = [`${API}/appointments/doctor`];

// Called when the doctor accepts / declines a request.
// Your API expects capitalised statuses: PATCH /appointments/:id/status
const statusUrl = (id) => `${API}/appointments/${id}/status`;
const ACCEPT_STATUS = "Confirmed";
const DECLINE_STATUS = "Cancelled";

const statusStyles = {
  CONFIRMED: "bg-teal-50 text-teal-700",
  PENDING: "bg-amber-50 text-amber-700",
  COMPLETED: "bg-slate-100 text-slate-600",
  SCHEDULED: "bg-slate-100 text-slate-600",
  CANCELLED: "bg-rose-50 text-rose-700",
};
const DEFAULT_STATUS_STYLE = "bg-slate-100 text-slate-600";

// ----------------------------------------------------------------------------
// Date / appointment helpers (same logic as the patient pages)
// ----------------------------------------------------------------------------

// Convert dates into YYYY-MM-DD without shifting date-only values.
const getDateKey = (date) => {
  if (!date) return "";

  if (typeof date === "string") {
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (match) {
      const [, year, month, day] = match;
      const parsed = new Date(Number(year), Number(month) - 1, Number(day));

      if (
        parsed.getFullYear() !== Number(year) ||
        parsed.getMonth() !== Number(month) - 1 ||
        parsed.getDate() !== Number(day)
      ) {
        return "";
      }

      return `${year}-${month}-${day}`;
    }
  }

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const keyToDate = (key) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const startOfDay = (d) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

const dayLabelFromKey = (key) => {
  const d = keyToDate(key);
  const diff = Math.round((startOfDay(d) - startOfDay(new Date())) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

const getDateParts = (date) => {
  const key = getDateKey(date);
  if (!key) return null;

  const d = keyToDate(key);
  return {
    month: d.toLocaleDateString("en-US", { month: "short" }),
    day: String(d.getDate()),
  };
};

const normalizeStatus = (status) =>
  String(status || "pending")
    .trim()
    .toLowerCase();

const isCancelled = (status) => ["cancelled", "canceled"].includes(status);

// Stored as 24-hour "HH:mm" -> shown as "10:30 AM"
const formatTime = (time) => {
  const m = String(time || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return time || "";
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h >= 12 ? "PM" : "AM"}`;
};

const getPatientName = (appointment) => {
  const patient = appointment.patient;

  return (
    appointment.patientName ||
    (typeof patient === "object" && patient !== null
      ? patient.name ||
        patient.fullName ||
        patient.user?.name ||
        patient.user?.fullName
      : "") ||
    "Patient"
  );
};

// Handle the common API response formats.
const extractList = (payload) =>
  Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.data?.appointments)
        ? payload.data.appointments
        : Array.isArray(payload?.appointments)
          ? payload.appointments
          : null;

// ----------------------------------------------------------------------------
// Other helpers
// ----------------------------------------------------------------------------
const authConfig = () => ({
  withCredentials: true,
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

function errorText(err, fallback) {
  if (err?.response?.status === 401) {
    return "Your session has expired. Please log in again.";
  }
  return err?.response?.data?.message || fallback;
}

function storedUserName() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user.name || user.fullName || user.username || "";
  } catch {
    return "";
  }
}

function getInitials(name) {
  const letters = String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  return letters || "D";
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// Clickable summary card in the dark stat strip.
function StatBlock({
  label,
  value,
  unit,
  note,
  valueClass = "text-white",
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-6 py-5 flex-1 min-w-[160px] text-left hover:bg-white/5 transition-colors first:rounded-l-2xl last:rounded-r-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
    >
      <p className="text-[11px] tracking-widest text-slate-400 uppercase">
        {label}
      </p>
      <p className="mt-1">
        <span className={`text-2xl font-semibold ${valueClass}`}>{value}</span>{" "}
        {unit && <span className="text-sm text-slate-300">{unit}</span>}
      </p>
      <p className="text-xs text-slate-400 mt-0.5">{note}</p>
    </button>
  );
}

function StatusBadge({ status }) {
  const label = String(status || "pending").toUpperCase();
  return (
    <span
      className={`inline-block mt-1 text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full ${
        statusStyles[label] || DEFAULT_STATUS_STYLE
      }`}
    >
      {label}
    </span>
  );
}

function DateBox({ date }) {
  const parts = getDateParts(date);
  return (
    <div className="w-14 h-14 rounded-lg bg-slate-50 flex flex-col items-center justify-center shrink-0">
      <span className="text-lg font-bold text-slate-900 leading-none">
        {parts ? parts.day : "--"}
      </span>
      <span className="text-[10px] tracking-widest text-slate-400 uppercase mt-0.5">
        {parts ? parts.month : ""}
      </span>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Page
// ----------------------------------------------------------------------------
export default function DoctorHome() {
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const loadDashboard = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError("");

    const config = authConfig();
    let lastError = null;

    for (const url of APPOINTMENT_ENDPOINTS) {
      try {
        const res = await axios.get(url, config);
        const list = extractList(res.data);

        if (list) {
          setAppointments(list);
          setLoaded(true);
          setLoading(false);
          return;
        }

        console.error("Unexpected appointments response:", res.data);
        lastError = new Error("format");
      } catch (err) {
        lastError = err;
        // Only fall through to the next endpoint when this one doesn't exist.
        if (err?.response?.status !== 404) break;
      }
    }

    console.error("Failed to load appointments:", lastError);
    setError(
      lastError?.message === "format"
        ? "Appointments data format is unexpected."
        : errorText(lastError, "Could not load your appointments."),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDashboard();

    // Refresh quietly when the browser tab regains focus.
    const handleFocus = () => loadDashboard(false);
    window.addEventListener("focus", handleFocus);

    return () => window.removeEventListener("focus", handleFocus);
  }, [loadDashboard]);

  const updateStatus = async (appointment, nextStatus) => {
    const id = appointment._id || appointment.id;
    if (!id) return;

    setBusyId(id);
    setActionError("");

    try {
      await axios.patch(
        statusUrl(id),
        nextStatus === DECLINE_STATUS
          ? { status: nextStatus, reason: "Declined by doctor" }
          : { status: nextStatus },
        authConfig(),
      );
      setAppointments((prev) =>
        prev.map((a) =>
          (a._id || a.id) === id ? { ...a, status: nextStatus } : a,
        ),
      );
    } catch (err) {
      console.error("Failed to update appointment:", err);
      setActionError(errorText(err, "Could not update the appointment."));
    } finally {
      setBusyId(null);
    }
  };

  const today = new Date().toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
  });

  const name = storedUserName();
  const todayKey = getDateKey(new Date());

  // Counts + lists, all derived from the one appointments array.
  const {
    todayAppointments,
    pendingRequests,
    confirmedCount,
    completedCount,
    nextToday,
  } = useMemo(() => {
    const withKey = appointments
      .map((a) => ({
        a,
        key: getDateKey(a.date),
        status: normalizeStatus(a.status),
      }))
      .filter((x) => x.key !== "");

    const byDateTime = (x, y) =>
      x.key.localeCompare(y.key) ||
      String(x.a.time || "").localeCompare(String(y.a.time || ""));

    const todays = withKey
      .filter((x) => x.key === todayKey && !isCancelled(x.status))
      .sort(byDateTime)
      .map((x) => x.a);

    // Pending requests: awaiting the doctor's decision, today or later.
    const pending = withKey
      .filter((x) => x.status === "pending" && x.key >= todayKey)
      .sort(byDateTime)
      .map((x) => x.a);

    const confirmed = withKey.filter(
      (x) => x.status === "confirmed" && x.key >= todayKey,
    ).length;

    const completed = withKey.filter((x) => x.status === "completed").length;

    const next =
      todays.find((a) => {
        const s = normalizeStatus(a.status);
        return s !== "completed";
      }) || null;

    return {
      todayAppointments: todays,
      pendingRequests: pending,
      confirmedCount: confirmed,
      completedCount: completed,
      nextToday: next,
    };
  }, [appointments, todayKey]);

  const goTo = (status) =>
    navigate(
      status ? `${ROUTES.appointments}?status=${status}` : ROUTES.appointments,
    );

  const quickActions = [
    {
      icon: <FaClipboardList className="text-teal-700" />,
      title: "Review requests",
      subtitle: `${pendingRequests.length} waiting for you`,
      onClick: () => goTo("pending"),
    },
    {
      icon: <FaCalendarCheck className="text-teal-700" />,
      title: "Manage appointments",
      subtitle: "Confirm, reschedule or cancel",
      onClick: () => goTo(),
    },
    {
      icon: <FaUserInjured className="text-teal-700" />,
      title: "Patient records",
      subtitle: "View records and history",
      onClick: () => navigate(ROUTES.patients),
    },
    {
      icon: <FaUserMd className="text-teal-700" />,
      title: "Profile & availability",
      subtitle: "Update your schedule",
      onClick: () => navigate(ROUTES.profile),
    },
  ];

  const shownToday = todayAppointments.slice(0, 5);
  const shownRequests = pendingRequests.slice(0, 4);

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="flex items-center gap-4 px-8 py-4 bg-white border-b border-slate-100">
        <div className="flex-1 flex items-center gap-2 bg-slate-50 rounded-lg px-4 py-2.5 max-w-md">
          <FaSearch className="text-slate-400 text-sm" />
          <input
            type="text"
            placeholder="Search patients, appointments..."
            className="bg-transparent outline-none text-sm w-full placeholder:text-slate-400"
          />
        </div>
        <button
          aria-label="Notifications"
          className="w-10 h-10 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50"
        >
          <FaBell />
        </button>
        <div className="w-10 h-10 rounded-full bg-teal-700 text-white flex items-center justify-center text-sm font-semibold">
          {getInitials(name)}
        </div>
      </header>

      <main className="px-8 py-7 space-y-6">
        {error && (
          <div className="flex items-center justify-between gap-4 rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <span>{error}</span>
            <button
              onClick={() => loadDashboard()}
              className="font-semibold underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}

        {actionError && (
          <div className="flex items-center justify-between gap-4 rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <span>{actionError}</span>
            <button
              onClick={() => setActionError("")}
              className="font-semibold underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Greeting */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-widest text-teal-700 uppercase">
              {greeting()}
            </p>
            <h1 className="text-3xl font-bold text-slate-900 mt-1">
              {name
                ? `Welcome back, Dr. ${name.replace(/^dr\.?\s+/i, "")}`
                : "Welcome back, Doctor"}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Here's an overview of your practice today, {today}.
            </p>
          </div>
          <button
            onClick={() => goTo()}
            className="bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors shrink-0"
          >
            Manage Appointments
          </button>
        </div>

        {/* Summary cards — each opens the matching section of the
            appointment management page */}
        <div
          className={`bg-[#0f211d] rounded-2xl flex flex-wrap divide-x divide-white/10 ${
            loading ? "animate-pulse" : ""
          }`}
        >
          <StatBlock
            label="Today's appointments"
            value={loaded ? todayAppointments.length : "—"}
            unit={
              loaded
                ? todayAppointments.length === 1
                  ? "appt."
                  : "appts."
                : ""
            }
            note={
              nextToday
                ? `Next: ${getPatientName(nextToday)}${
                    nextToday.time ? `, ${formatTime(nextToday.time)}` : ""
                  }`
                : loading
                  ? "Loading…"
                  : loaded
                    ? "Nothing scheduled today"
                    : "Unavailable right now"
            }
            onClick={() => goTo("today")}
          />
          <StatBlock
            label="Pending requests"
            value={loaded ? pendingRequests.length : "—"}
            valueClass={
              loaded && pendingRequests.length > 0
                ? "text-amber-300"
                : "text-white"
            }
            note={
              loading
                ? "Loading…"
                : loaded
                  ? pendingRequests.length > 0
                    ? "Waiting for your response"
                    : "You're all caught up"
                  : "Unavailable right now"
            }
            onClick={() => goTo("pending")}
          />
          <StatBlock
            label="Confirmed"
            value={loaded ? confirmedCount : "—"}
            valueClass={loaded ? "text-emerald-300" : "text-white"}
            note={
              loading
                ? "Loading…"
                : loaded
                  ? "Upcoming, accepted"
                  : "Unavailable right now"
            }
            onClick={() => goTo("confirmed")}
          />
          <StatBlock
            label="Completed"
            value={loaded ? completedCount : "—"}
            note={
              loading
                ? "Loading…"
                : loaded
                  ? "Visits finished"
                  : "Unavailable right now"
            }
            onClick={() => goTo("completed")}
          />
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <button
              key={action.title}
              onClick={action.onClick}
              className="bg-white rounded-xl border border-slate-100 p-5 text-left hover:shadow-sm transition-shadow"
            >
              <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center mb-3">
                {action.icon}
              </div>
              <p className="font-semibold text-slate-900 text-sm">
                {action.title}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{action.subtitle}</p>
            </button>
          ))}
        </div>

        {/* Today's appointments + recent requests */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today's appointments */}
          <div className="bg-white rounded-xl border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900">Today's Appointments</h2>
              <button
                onClick={() => goTo("today")}
                className="text-sm font-medium text-teal-700 hover:underline"
              >
                View all
              </button>
            </div>

            {loading ? (
              <p className="text-sm text-slate-400">Loading…</p>
            ) : !loaded ? (
              <p className="text-sm text-slate-400">
                Your appointments could not be loaded.
              </p>
            ) : shownToday.length === 0 ? (
              <p className="text-sm text-slate-400">
                You have no appointments today.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {shownToday.map((appt, i) => (
                  <div
                    key={appt._id || appt.id || i}
                    className="flex items-center gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    <DateBox date={appt.date} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">
                        {getPatientName(appt)}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {appt.reason || "General consultation"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm text-slate-700">
                        {formatTime(appt.time)}
                      </p>
                      <StatusBadge status={appt.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent patient visit requests */}
          <div className="bg-white rounded-xl border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900">
                Recent Visit Requests
              </h2>
              <button
                onClick={() => goTo("pending")}
                className="text-sm font-medium text-teal-700 hover:underline"
              >
                View all
              </button>
            </div>

            {loading ? (
              <p className="text-sm text-slate-400">Loading…</p>
            ) : !loaded ? (
              <p className="text-sm text-slate-400">
                Visit requests could not be loaded.
              </p>
            ) : shownRequests.length === 0 ? (
              <p className="text-sm text-slate-400">
                No pending requests. New patient requests will appear here.
              </p>
            ) : (
              <div className="space-y-3">
                {shownRequests.map((appt, i) => {
                  const id = appt._id || appt.id;
                  const busy = busyId === id;
                  const when = [
                    dayLabelFromKey(getDateKey(appt.date)),
                    formatTime(appt.time),
                  ]
                    .filter(Boolean)
                    .join(", ");

                  return (
                    <div
                      key={id || i}
                      className="flex items-center gap-3 bg-teal-50/60 rounded-lg p-4"
                    >
                      <div className="w-9 h-9 rounded-full bg-teal-700 text-white flex items-center justify-center shrink-0 text-xs font-semibold">
                        {getInitials(getPatientName(appt))}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate">
                          {getPatientName(appt)}
                        </p>
                        <p className="text-xs text-slate-600 mt-0.5 truncate">
                          {[when, appt.reason].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          disabled={busy}
                          onClick={() => updateStatus(appt, ACCEPT_STATUS)}
                          aria-label={`Accept request from ${getPatientName(appt)}`}
                          className="w-8 h-8 rounded-lg bg-teal-700 hover:bg-teal-800 text-white flex items-center justify-center text-xs disabled:opacity-50 transition-colors"
                        >
                          <FaCheck />
                        </button>
                        <button
                          disabled={busy}
                          onClick={() => updateStatus(appt, DECLINE_STATUS)}
                          aria-label={`Decline request from ${getPatientName(appt)}`}
                          className="w-8 h-8 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 flex items-center justify-center text-xs disabled:opacity-50 transition-colors"
                        >
                          <FaTimes />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

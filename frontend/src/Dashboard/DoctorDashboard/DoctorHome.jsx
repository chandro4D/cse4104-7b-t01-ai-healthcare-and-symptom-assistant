import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
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
const ROUTES = {
  appointments: "/dashboard/appointmentManagement",
  patients: "/dashboard/patientDirectory",
  visitRequests: "/dashboard/patientDirectory?tab=requests",
  profile: "/dashboard/doctorProfileAndAvailability",
};

// Doctor-only endpoint (requires the doctor role).
const APPOINTMENT_ENDPOINTS = [`${API}/appointments/doctor`];

// PATCH /appointments/:id/status (capitalised statuses)
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

// Chart colours (kept in one place so the legend and the charts always match).
const CHART_COLORS = {
  confirmed: "#0f766e",
  pending: "#f59e0b",
  completed: "#94a3b8",
  cancelled: "#fb7185",
};

// ----------------------------------------------------------------------------
// Date / appointment helpers
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

// ----------------------------------------------------------------------------
// Small components
// ----------------------------------------------------------------------------

// Clickable summary tile in the dark stat strip (2 columns on phones,
// 4 columns on large screens). The 1px gap on the dark wrapper draws the dividers.
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
      className="bg-[#0f211d] px-4 py-4 sm:px-6 sm:py-5 min-w-0 text-left hover:bg-[#162c27] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-400"
    >
      <p className="text-[10px] sm:text-[11px] tracking-widest text-slate-400 uppercase truncate">
        {label}
      </p>
      <p className="mt-1">
        <span className={`text-xl sm:text-2xl font-semibold ${valueClass}`}>
          {value}
        </span>{" "}
        {unit && <span className="text-sm text-slate-300">{unit}</span>}
      </p>
      <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{note}</p>
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
    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-slate-50 flex flex-col items-center justify-center shrink-0">
      <span className="text-base sm:text-lg font-bold text-slate-900 leading-none">
        {parts ? parts.day : "--"}
      </span>
      <span className="text-[10px] tracking-widest text-slate-400 uppercase mt-0.5">
        {parts ? parts.month : ""}
      </span>
    </div>
  );
}

function Card({ title, action, children, className = "" }) {
  return (
    <section
      className={`bg-white rounded-xl border border-slate-100 p-4 sm:p-6 min-w-0 ${className}`}
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="font-bold text-slate-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmptyNote({ children }) {
  return <p className="text-sm text-slate-400">{children}</p>;
}

// ----------------------------------------------------------------------------
// Charts (pure SVG — no extra dependency, scales with its container)
// ----------------------------------------------------------------------------

// Stacked bar chart: appointments per day for the next 7 days.
function WeekChart({ data }) {
  const W = 420;
  const H = 200;
  const padL = 26;
  const padR = 4;
  const padT = 10;
  const padB = 28;
  const plotH = H - padT - padB;
  const slot = (W - padL - padR) / data.length;
  const barW = Math.min(30, slot * 0.55);

  const peak = Math.max(...data.map((d) => d.total), 0);
  const max = Math.max(4, Math.ceil(peak / 2) * 2);
  const ticks = [0, max / 2, max];
  const yOf = (v) => padT + plotH - (v / max) * plotH;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto"
      role="img"
      aria-label="Appointments for the next 7 days"
    >
      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={padL}
            x2={W - padR}
            y1={yOf(t)}
            y2={yOf(t)}
            stroke="#e2e8f0"
            strokeDasharray={t === 0 ? "0" : "3 4"}
          />
          <text
            x={padL - 6}
            y={yOf(t) + 4}
            textAnchor="end"
            fontSize="11"
            fill="#94a3b8"
          >
            {t}
          </text>
        </g>
      ))}

      {data.map((d, i) => {
        const x = padL + i * slot + (slot - barW) / 2;
        const confirmedPart = d.total - d.pending;
        const hConfirmed = (confirmedPart / max) * plotH;
        const hPending = (d.pending / max) * plotH;
        const isToday = i === 0;

        return (
          <g key={d.key}>
            <title>{`${d.label}: ${d.total} appointment${
              d.total === 1 ? "" : "s"
            }${d.pending ? ` (${d.pending} pending)` : ""}`}</title>
            {/* hover / tap target */}
            <rect
              x={padL + i * slot}
              y={padT}
              width={slot}
              height={plotH}
              fill="transparent"
            />
            {hConfirmed > 0 && (
              <rect
                x={x}
                y={yOf(confirmedPart)}
                width={barW}
                height={hConfirmed}
                rx="4"
                fill={CHART_COLORS.confirmed}
              />
            )}
            {hPending > 0 && (
              <rect
                x={x}
                y={yOf(d.total)}
                width={barW}
                height={hPending}
                rx="4"
                fill={CHART_COLORS.pending}
              />
            )}
            {d.total === 0 && (
              <rect
                x={x}
                y={yOf(0) - 3}
                width={barW}
                height="3"
                rx="1.5"
                fill="#e2e8f0"
              />
            )}
            {d.total > 0 && (
              <text
                x={x + barW / 2}
                y={yOf(d.total) - 5}
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill="#334155"
              >
                {d.total}
              </text>
            )}
            <text
              x={x + barW / 2}
              y={H - 9}
              textAnchor="middle"
              fontSize="11"
              fontWeight={isToday ? "700" : "400"}
              fill={isToday ? "#0f766e" : "#64748b"}
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// Donut chart: share of appointments by status.
function StatusDonut({ segments, total }) {
  const R = 42;
  const C = 2 * Math.PI * R;
  let offset = 0;

  return (
    <svg
      viewBox="0 0 120 120"
      className="w-36 h-36 sm:w-40 sm:h-40 shrink-0"
      role="img"
      aria-label="Appointments by status"
    >
      <circle
        cx="60"
        cy="60"
        r={R}
        fill="none"
        stroke="#f1f5f9"
        strokeWidth="14"
      />
      {total > 0 &&
        segments
          .filter((s) => s.value > 0)
          .map((s) => {
            const len = (s.value / total) * C;
            const circle = (
              <circle
                key={s.key}
                cx="60"
                cy="60"
                r={R}
                fill="none"
                stroke={s.color}
                strokeWidth="14"
                strokeDasharray={`${Math.max(len - 1.5, 0)} ${C - len + 1.5}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 60 60)"
              >
                <title>{`${s.label}: ${s.value}`}</title>
              </circle>
            );
            offset += len;
            return circle;
          })}
      <text
        x="60"
        y="58"
        textAnchor="middle"
        fontSize="22"
        fontWeight="700"
        fill="#0f172a"
      >
        {total}
      </text>
      <text x="60" y="74" textAnchor="middle" fontSize="9" fill="#94a3b8">
        total
      </text>
    </svg>
  );
}

// Thin progress bar for today's schedule.
function ProgressBar({ done, total }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
        <span>
          {done} of {total} finished
        </span>
        <span className="font-semibold text-slate-700">{pct}%</span>
      </div>
      <div
        className="h-2 rounded-full bg-slate-100 overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Today's progress"
      >
        <div
          className="h-full rounded-full bg-teal-600 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function LegendDot({ color }) {
  return (
    <span
      className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
      style={{ backgroundColor: color }}
    />
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

  // Counts, lists and chart data, all derived from the one appointments array.
  const {
    todayAppointments,
    pendingRequests,
    confirmedCount,
    completedCount,
    nextToday,
    todayDone,
    week,
    statusSegments,
    statusTotal,
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
      .sort(byDateTime);

    // Pending requests: awaiting the doctor's decision, today or later.
    const pending = withKey
      .filter((x) => x.status === "pending" && x.key >= todayKey)
      .sort(byDateTime)
      .map((x) => x.a);

    const confirmed = withKey.filter(
      (x) => x.status === "confirmed" && x.key >= todayKey,
    ).length;

    const completed = withKey.filter((x) => x.status === "completed").length;

    const next = todays.find((x) => x.status !== "completed")?.a || null;

    const done = todays.filter((x) => x.status === "completed").length;

    // Next 7 days (today + 6), cancelled ones excluded.
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = keyToDate(todayKey);
      d.setDate(d.getDate() + i);
      return {
        key: getDateKey(d),
        label:
          i === 0
            ? "Today"
            : d.toLocaleDateString(undefined, { weekday: "short" }),
        total: 0,
        pending: 0,
      };
    });
    const dayIndex = Object.fromEntries(days.map((d, i) => [d.key, i]));
    withKey.forEach((x) => {
      const i = dayIndex[x.key];
      if (i === undefined || isCancelled(x.status)) return;
      days[i].total += 1;
      if (x.status === "pending") days[i].pending += 1;
    });

    // All-time split by status.
    const counts = { confirmed: 0, pending: 0, completed: 0, cancelled: 0 };
    withKey.forEach((x) => {
      if (isCancelled(x.status)) counts.cancelled += 1;
      else if (x.status === "completed") counts.completed += 1;
      else if (x.status === "pending") counts.pending += 1;
      else counts.confirmed += 1; // confirmed / scheduled
    });

    const segments = [
      { key: "confirmed", label: "Confirmed", value: counts.confirmed },
      { key: "pending", label: "Pending", value: counts.pending },
      { key: "completed", label: "Completed", value: counts.completed },
      { key: "cancelled", label: "Cancelled", value: counts.cancelled },
    ].map((s) => ({ ...s, color: CHART_COLORS[s.key] }));

    return {
      todayAppointments: todays.map((x) => x.a),
      pendingRequests: pending,
      confirmedCount: confirmed,
      completedCount: completed,
      nextToday: next,
      todayDone: done,
      week: days,
      statusSegments: segments,
      statusTotal: segments.reduce((sum, s) => sum + s.value, 0),
    };
  }, [appointments, todayKey]);

  const weekTotal = week.reduce((sum, d) => sum + d.total, 0);

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

  const viewAllButton = (status) => (
    <button
      onClick={() => goTo(status)}
      className="text-sm font-medium text-teal-700 hover:underline shrink-0"
    >
      View all
    </button>
  );

  return (
    <div className="min-h-screen">
      <main className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7 space-y-5 sm:space-y-6">
        {error && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4 rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <span>{error}</span>
            <button
              onClick={() => loadDashboard()}
              className="font-semibold underline hover:no-underline self-start sm:self-auto"
            >
              Retry
            </button>
          </div>
        )}

        {actionError && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4 rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <span>{actionError}</span>
            <button
              onClick={() => setActionError("")}
              className="font-semibold underline hover:no-underline self-start sm:self-auto"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Greeting */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-widest text-teal-700 uppercase">
              {greeting()}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1 break-words">
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
            className="w-full sm:w-auto bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors shrink-0"
          >
            Manage Appointments
          </button>
        </div>

        {/* Summary strip — each tile opens the matching section of the
            appointment management page */}
        <div
          className={`bg-white/10 rounded-2xl overflow-hidden grid grid-cols-2 lg:grid-cols-4 gap-px ${
            loading ? "animate-pulse" : ""
          }`}
          style={{ backgroundColor: "#1d3631" }}
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {quickActions.map((action) => (
            <button
              key={action.title}
              onClick={action.onClick}
              className="bg-white rounded-xl border border-slate-100 p-4 sm:p-5 text-left hover:shadow-sm transition-shadow min-w-0"
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

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 sm:gap-6">
          <Card
            title="Next 7 days"
            className="lg:col-span-3"
            action={
              loaded && (
                <span className="text-xs text-slate-500">
                  {weekTotal} appointment{weekTotal === 1 ? "" : "s"}
                </span>
              )
            }
          >
            {loading ? (
              <EmptyNote>Loading…</EmptyNote>
            ) : !loaded ? (
              <EmptyNote>The chart could not be loaded.</EmptyNote>
            ) : (
              <>
                <WeekChart data={week} />
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <LegendDot color={CHART_COLORS.confirmed} /> Confirmed /
                    scheduled
                  </span>
                  <span className="flex items-center gap-1.5">
                    <LegendDot color={CHART_COLORS.pending} /> Pending
                  </span>
                </div>
              </>
            )}
          </Card>

          <Card title="Appointments by status" className="lg:col-span-2">
            {loading ? (
              <EmptyNote>Loading…</EmptyNote>
            ) : !loaded ? (
              <EmptyNote>The chart could not be loaded.</EmptyNote>
            ) : statusTotal === 0 ? (
              <EmptyNote>
                No appointments yet. Your status breakdown will appear here.
              </EmptyNote>
            ) : (
              <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center gap-5">
                <StatusDonut segments={statusSegments} total={statusTotal} />
                <ul className="w-full space-y-2.5 text-sm">
                  {statusSegments.map((s) => {
                    const pct = Math.round((s.value / statusTotal) * 100);
                    return (
                      <li
                        key={s.key}
                        className="flex items-center justify-between gap-3"
                      >
                        <span className="flex items-center gap-2 text-slate-600">
                          <LegendDot color={s.color} />
                          {s.label}
                        </span>
                        <span className="text-slate-900 font-semibold">
                          {s.value}{" "}
                          <span className="text-xs font-normal text-slate-400">
                            ({pct}%)
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </Card>
        </div>

        {/* Today's appointments + recent requests */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
          <Card title="Today's Appointments" action={viewAllButton("today")}>
            {loading ? (
              <EmptyNote>Loading…</EmptyNote>
            ) : !loaded ? (
              <EmptyNote>Your appointments could not be loaded.</EmptyNote>
            ) : shownToday.length === 0 ? (
              <EmptyNote>You have no appointments today.</EmptyNote>
            ) : (
              <>
                <ProgressBar
                  done={todayDone}
                  total={todayAppointments.length}
                />
                <div className="divide-y divide-slate-100">
                  {shownToday.map((appt, i) => (
                    <div
                      key={appt._id || appt.id || i}
                      className="flex items-center gap-3 sm:gap-4 py-4 first:pt-0 last:pb-0"
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
              </>
            )}
          </Card>

          <Card title="Recent Visit Requests" action={viewAllButton("pending")}>
            {loading ? (
              <EmptyNote>Loading…</EmptyNote>
            ) : !loaded ? (
              <EmptyNote>Visit requests could not be loaded.</EmptyNote>
            ) : shownRequests.length === 0 ? (
              <EmptyNote>
                No pending requests. New patient requests will appear here.
              </EmptyNote>
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
                      className="flex items-center gap-3 bg-teal-50/60 rounded-lg p-3 sm:p-4"
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
                          className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg bg-teal-700 hover:bg-teal-800 text-white flex items-center justify-center text-xs disabled:opacity-50 transition-colors"
                        >
                          <FaCheck />
                        </button>
                        <button
                          disabled={busy}
                          onClick={() => updateStatus(appt, DECLINE_STATUS)}
                          aria-label={`Decline request from ${getPatientName(appt)}`}
                          className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 flex items-center justify-center text-xs disabled:opacity-50 transition-colors"
                        >
                          <FaTimes />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}

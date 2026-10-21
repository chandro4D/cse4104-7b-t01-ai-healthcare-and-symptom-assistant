import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FaSearch,
  // FaBell,
  FaHeart,
  FaFileAlt,
  FaVideo,
  FaRobot,
} from "react-icons/fa";

// Set VITE_API_URL in your .env for production, e.g. https://api.yoursite.com
const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");
const API = `${API_URL}/api/v1`;

// Change these paths to match your React Router routes.
// (Your My Appointments page links to "/doctors", so that one is used here.)
const ROUTES = {
  symptomChecker: "/patient/symptom-checker",
  doctors: "/doctors",
  prescriptions: "/patient/prescriptions",
  videoConsult: "/patient/video-consult",
  appointments: "/patient/appointments",
  bookAppointment: "/doctors",
};

const quickActions = [
  {
    icon: <FaHeart className="text-teal-700" />,
    title: "Check symptoms",
    subtitle: "Get instant AI guidance",
    to: ROUTES.symptomChecker,
  },
  {
    icon: <FaSearch className="text-teal-700" />,
    title: "Find a doctor",
    subtitle: "Browse by department",
    to: ROUTES.doctors,
  },
  {
    icon: <FaFileAlt className="text-teal-700" />,
    title: "Scan prescription",
    subtitle: "Upload via OCR",
    to: ROUTES.prescriptions,
  },
  {
    icon: <FaVideo className="text-teal-700" />,
    title: "Video consult",
    subtitle: "Connect with a doctor",
    to: ROUTES.videoConsult,
  },
];

const statusStyles = {
  CONFIRMED: "bg-teal-50 text-teal-700",
  PENDING: "bg-amber-50 text-amber-700",
  SCHEDULED: "bg-slate-100 text-slate-600",
};
const DEFAULT_STATUS_STYLE = "bg-slate-100 text-slate-600";

const severityValueClass = {
  Low: "text-emerald-300",
  Moderate: "text-amber-300",
  High: "text-orange-300",
  Urgent: "text-rose-300",
};

const TREND_NOTE = {
  improved: "↓ Improved since previous check",
  worsened: "↑ Higher than previous check",
  same: "→ Same as previous check",
};

const BOOKING_TITLE = "Consider booking an appointment";

// ----------------------------------------------------------------------------
// Date / appointment helpers (same logic as the My Appointments page, so both
// pages always agree on what is "upcoming")
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

// Whole calendar days from the date to today (0 = today, 1 = yesterday...)
const daysAgoFromKey = (key) =>
  Math.max(
    0,
    Math.round(
      (startOfDay(new Date()) - startOfDay(keyToDate(key))) / 86400000,
    ),
  );

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

const getDoctorName = (appointment) => {
  const doctor = appointment.doctor;

  return (
    appointment.doctorName ||
    (typeof doctor === "object" && doctor !== null
      ? doctor.name ||
        doctor.fullName ||
        doctor.user?.name ||
        doctor.user?.fullName
      : "") ||
    "Doctor"
  );
};

const getSpecialty = (appointment) => {
  const doctor = appointment.doctor;

  return (
    appointment.specialty ||
    (typeof doctor === "object" && doctor !== null
      ? doctor.specialty || doctor.user?.specialty
      : "") ||
    "Healthcare Specialist"
  );
};

// Handle the common API response formats.
const extractList = (payload) =>
  Array.isArray(payload?.data)
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

// function getInitials(name) {
//   const letters = String(name || "")
//     .trim()
//     .split(/\s+/)
//     .slice(0, 2)
//     .map((word) => word[0])
//     .join("")
//     .toUpperCase();
//   return letters || "U";
// }

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function StatBlock({ label, value, unit, note, valueClass = "text-white" }) {
  return (
    <div className="px-6 py-5 flex-1">
      <p className="text-[11px] tracking-widest text-slate-400 uppercase">
        {label}
      </p>
      <p className="mt-1">
        <span className={`text-2xl font-semibold ${valueClass}`}>{value}</span>{" "}
        {unit && <span className="text-sm text-slate-300">{unit}</span>}
      </p>
      <p className="text-xs text-slate-400 mt-0.5">{note}</p>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Page
// ----------------------------------------------------------------------------
export default function PatientHome() {
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState([]);
  const [appointmentsLoaded, setAppointmentsLoaded] = useState(false);
  const [insights, setInsights] = useState(null); // from /dashboard/patient
  const [insightsFailed, setInsightsFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError("");

    const config = authConfig();

    // Appointments and AI insights load separately, so a problem with one
    // never hides the other.
    const [apptResult, insightResult] = await Promise.allSettled([
      axios.get(`${API}/appointments/my`, config),
      axios.get(`${API}/dashboard/patient`, config),
    ]);

    if (apptResult.status === "fulfilled") {
      const list = extractList(apptResult.value.data);

      if (list) {
        setAppointments(list);
        setAppointmentsLoaded(true);
      } else {
        console.error(
          "Unexpected appointments response:",
          apptResult.value.data,
        );
        setError("Appointments data format is unexpected.");
      }
    } else {
      console.error("Failed to load appointments:", apptResult.reason);
      setError(
        errorText(apptResult.reason, "Could not load your appointments."),
      );
    }

    if (insightResult.status === "fulfilled") {
      setInsights(insightResult.value.data);
      setInsightsFailed(false);
    } else {
      console.error("Failed to load AI insights:", insightResult.reason);
      setInsights(null);
      setInsightsFailed(true);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadDashboard();

    // Refresh quietly when the browser tab regains focus (e.g. after booking).
    const handleFocus = () => loadDashboard(false);
    window.addEventListener("focus", handleFocus);

    return () => window.removeEventListener("focus", handleFocus);
  }, [loadDashboard]);

  const today = new Date().toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
  });

  const name = insights?.user?.name || storedUserName();

  // Today's date in local calendar format.
  const todayKey = getDateKey(new Date());

  // Upcoming: today or later, excluding cancelled and completed.
  const upcomingAppointments = useMemo(
    () =>
      appointments
        .filter((appointment) => {
          const key = getDateKey(appointment.date);
          const status = normalizeStatus(appointment.status);

          return (
            key !== "" &&
            key >= todayKey &&
            !["cancelled", "canceled", "completed"].includes(status)
          );
        })
        .sort((a, b) => getDateKey(a.date).localeCompare(getDateKey(b.date))),
    [appointments, todayKey],
  );

  // Last checkup: the most recent completed appointment.
  const lastCompleted = useMemo(
    () =>
      appointments
        .filter(
          (appointment) =>
            normalizeStatus(appointment.status) === "completed" &&
            getDateKey(appointment.date) !== "" &&
            getDateKey(appointment.date) <= todayKey,
        )
        .sort((a, b) =>
          getDateKey(b.date).localeCompare(getDateKey(a.date)),
        )[0] || null,
    [appointments, todayKey],
  );

  const nextAppointment = upcomingAppointments[0] || null;
  const shownAppointments = upcomingAppointments.slice(0, 3);

  const lastDays = lastCompleted
    ? daysAgoFromKey(getDateKey(lastCompleted.date))
    : null;

  const aiRisk = insights?.stats?.aiRisk;
  const prescriptions = insights?.stats?.activePrescriptions;

  // Recommendations from the server, plus a "book an appointment" suggestion
  // that is only shown when we really know there is nothing booked.
  const recommendations = useMemo(() => {
    const items = (insights?.recommendations || []).filter(
      (rec) => rec.title !== BOOKING_TITLE,
    );

    const severity = aiRisk?.severity;
    if (
      appointmentsLoaded &&
      (severity === "High" || severity === "Urgent") &&
      upcomingAppointments.length === 0
    ) {
      items.splice(1, 0, {
        title: BOOKING_TITLE,
        body: `Your latest assessment was ${severity} and you have no upcoming appointment.${
          aiRisk?.department
            ? ` ${aiRisk.department} is the suggested department.`
            : ""
        }`,
      });
    }

    return items.slice(0, 3);
  }, [insights, aiRisk, appointmentsLoaded, upcomingAppointments.length]);

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      {/* <header className="flex items-center gap-4 px-8 py-4 bg-white border-b border-slate-100">
        <div className="flex-1 flex items-center gap-2 bg-slate-50 rounded-lg px-4 py-2.5 max-w-md">
          <FaSearch className="text-slate-400 text-sm" />
          <input
            type="text"
            placeholder="Search doctors, records, prescriptions..."
            className="bg-transparent outline-none text-sm w-full placeholder:text-slate-400"
          />
        </div>
        <button className="w-10 h-10 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50">
          <FaBell />
        </button>
        <div className="w-10 h-10 rounded-full bg-teal-700 text-white flex items-center justify-center text-sm font-semibold">
          {getInitials(name)}
        </div>
      </header> */}

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

        {/* Greeting */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold tracking-widest text-teal-700 uppercase">
              {greeting()}
            </p>
            <h1 className="text-3xl font-bold text-slate-900 mt-1">
              {name ? `Welcome back, ${name}` : "Welcome back"}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Here's what's happening with your health today, {today}.
            </p>
          </div>
          <button
            onClick={() => navigate(ROUTES.bookAppointment)}
            className="bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            + Book Appointment
          </button>
        </div>

        {/* Stat strip */}
        <div
          className={`bg-[#0f211d] rounded-2xl flex flex-wrap divide-x divide-white/10 ${
            loading ? "animate-pulse" : ""
          }`}
        >
          <StatBlock
            label="Last checkup"
            value={lastCompleted ? (lastDays === 0 ? "Today" : lastDays) : "—"}
            unit={
              lastCompleted && lastDays > 0
                ? lastDays === 1
                  ? "day ago"
                  : "days ago"
                : ""
            }
            note={
              lastCompleted
                ? [getDoctorName(lastCompleted), getSpecialty(lastCompleted)]
                    .filter(Boolean)
                    .join(" · ")
                : loading
                  ? "Loading…"
                  : "No completed visits yet"
            }
          />
          <StatBlock
            label="AI risk level"
            value={aiRisk ? aiRisk.severity : "—"}
            valueClass={
              aiRisk
                ? severityValueClass[aiRisk.severity] || "text-white"
                : "text-white"
            }
            note={
              aiRisk
                ? TREND_NOTE[aiRisk.trend] ||
                  "Based on your latest symptom check"
                : loading
                  ? "Loading…"
                  : insightsFailed
                    ? "Unavailable right now"
                    : "Run a symptom check to see this"
            }
          />
          <StatBlock
            label="Active prescriptions"
            value={typeof prescriptions === "number" ? prescriptions : "—"}
            unit={typeof prescriptions === "number" ? "meds" : ""}
            note={
              typeof prescriptions === "number"
                ? "Currently active"
                : loading
                  ? "Loading…"
                  : "Not available yet"
            }
          />
          <StatBlock
            label="Upcoming"
            value={appointmentsLoaded ? upcomingAppointments.length : "—"}
            unit={
              appointmentsLoaded
                ? upcomingAppointments.length === 1
                  ? "appt."
                  : "appts."
                : ""
            }
            note={
              nextAppointment
                ? [
                    dayLabelFromKey(getDateKey(nextAppointment.date)),
                    nextAppointment.time,
                  ]
                    .filter(Boolean)
                    .join(", ")
                : loading
                  ? "Loading…"
                  : appointmentsLoaded
                    ? "No upcoming appointments"
                    : "Unavailable right now"
            }
          />
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <button
              key={action.title}
              onClick={() => navigate(action.to)}
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

        {/* Appointments + AI recommendations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900">
                Upcoming Appointments
              </h2>
              <button
                onClick={() => navigate(ROUTES.appointments)}
                className="text-sm font-medium text-teal-700 hover:underline"
              >
                View all
              </button>
            </div>

            {loading ? (
              <p className="text-sm text-slate-400">Loading…</p>
            ) : !appointmentsLoaded ? (
              <p className="text-sm text-slate-400">
                Your appointments could not be loaded.
              </p>
            ) : shownAppointments.length === 0 ? (
              <p className="text-sm text-slate-400">
                You have no upcoming appointments.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {shownAppointments.map((appt, i) => {
                  const parts = getDateParts(appt.date);
                  const status = String(appt.status || "pending").toUpperCase();

                  return (
                    <div
                      key={appt._id || i}
                      className="flex items-center gap-4 py-4 first:pt-0 last:pb-0"
                    >
                      <div className="w-14 h-14 rounded-lg bg-slate-50 flex flex-col items-center justify-center shrink-0">
                        <span className="text-lg font-bold text-slate-900 leading-none">
                          {parts ? parts.day : "--"}
                        </span>
                        <span className="text-[10px] tracking-widest text-slate-400 uppercase mt-0.5">
                          {parts ? parts.month : ""}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate">
                          {getDoctorName(appt)}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          {[getSpecialty(appt), appt.reason]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm text-slate-700">
                          {appt.time || ""}
                        </p>
                        <span
                          className={`inline-block mt-1 text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full ${
                            statusStyles[status] || DEFAULT_STATUS_STYLE
                          }`}
                        >
                          {status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900">AI Recommendations</h2>
              <span className="text-[10px] font-semibold tracking-widest text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full">
                LIVE
              </span>
            </div>

            {loading ? (
              <p className="text-sm text-slate-400">Loading…</p>
            ) : insightsFailed ? (
              <p className="text-sm text-slate-400">
                AI insights are unavailable right now.
              </p>
            ) : recommendations.length === 0 ? (
              <p className="text-sm text-slate-400">
                Run your first symptom check to get recommendations based on
                your own history.
              </p>
            ) : (
              <div className="space-y-3">
                {recommendations.map((rec, i) => (
                  <div
                    key={i}
                    className="flex gap-3 bg-teal-50/60 rounded-lg p-4"
                  >
                    <div className="w-7 h-7 rounded-full bg-teal-700 text-white flex items-center justify-center shrink-0 text-xs">
                      <FaRobot />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">
                        {rec.title}
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                        {rec.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

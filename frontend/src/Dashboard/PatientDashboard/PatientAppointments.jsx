import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import {
  CalendarDays,
  Clock3,
  Stethoscope,
  ClipboardList,
  CheckCircle2,
  CircleAlert,
  XCircle,
  Search,
  ArrowRight,
  CalendarCheck2,
  UserRound,
  FileText,
  RefreshCw,
  Ban,
  CalendarX2,
  BadgeCheck,
} from "lucide-react";
import { Link } from "react-router-dom";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

// Must match the backend rule
const MIN_CANCEL_HOURS = 2;

/* ------------------------------------------------------------------ */
/* Date / time helpers                                                 */
/* ------------------------------------------------------------------ */

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

// Parse "HH:mm" or "hh:mm AM/PM" into { hours, minutes }
const parseTime = (time) => {
  if (!time || typeof time !== "string") return null;

  const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();

  if (meridiem === "PM" && hours < 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;

  if (hours > 23 || minutes > 59) return null;

  return { hours, minutes };
};

// Combine date + time into a real Date object (null if invalid)
const getAppointmentDateTime = (appointment) => {
  const dateKey = getDateKey(appointment.date);
  if (!dateKey) return null;

  const [year, month, day] = dateKey.split("-").map(Number);
  const t = parseTime(appointment.time) || { hours: 23, minutes: 59 };

  return new Date(year, month - 1, day, t.hours, t.minutes, 0, 0);
};

const formatDate = (date) => {
  const dateKey = getDateKey(date);

  if (!dateKey) return "Date unavailable";

  const [year, month, day] = dateKey.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);

  return parsed.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatTime = (time) => {
  const t = parseTime(time);
  if (!t) return "Time unavailable";

  const d = new Date();
  d.setHours(t.hours, t.minutes, 0, 0);

  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

// Month / day pieces used by the calendar tile on each card (display only).
const getDateParts = (date) => {
  const dateKey = getDateKey(date);

  if (!dateKey) return null;

  const [year, month, day] = dateKey.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);

  return {
    month: parsed.toLocaleDateString("en-US", { month: "short" }),
    day: String(day),
  };
};

// "in 3 days", "in 5 hours", "in 20 minutes"
const getTimeLeftLabel = (when, now) => {
  if (!when) return "";

  const diffMs = when - now;
  if (diffMs <= 0) return "";

  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days >= 1) return `In ${days} day${days !== 1 ? "s" : ""}`;
  if (hours >= 1) return `In ${hours} hour${hours !== 1 ? "s" : ""}`;
  return `In ${Math.max(minutes, 1)} minute${minutes !== 1 ? "s" : ""}`;
};

/* ------------------------------------------------------------------ */
/* Appointment helpers                                                 */
/* ------------------------------------------------------------------ */

const normalizeStatus = (status) =>
  String(status || "pending")
    .trim()
    .toLowerCase();

const isCancelledStatus = (status) =>
  ["cancelled", "canceled"].includes(normalizeStatus(status));

/**
 * Decide which section an appointment belongs to.
 *  completed : doctor marked it completed
 *  cancelled : cancelled by user/admin, OR the date+time passed and the
 *              patient never met the doctor (missed)
 *  upcoming  : still in the future
 */
const getCategory = (appointment, now) => {
  const status = normalizeStatus(appointment.status);

  if (status === "completed") return "completed";
  if (isCancelledStatus(status)) return "cancelled";

  const when = getAppointmentDateTime(appointment);
  if (when && when < now) return "cancelled"; // missed

  return "upcoming";
};

const isMissed = (appointment, now) =>
  getCategory(appointment, now) === "cancelled" &&
  !isCancelledStatus(appointment.status);

const canCancel = (appointment, now) => {
  const when = getAppointmentDateTime(appointment);
  if (!when) return false;

  return when - now >= MIN_CANCEL_HOURS * 60 * 60 * 1000;
};

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

const getStatusStyle = (label) => {
  switch (label) {
    case "confirmed":
      return {
        container: "bg-emerald-50 border-emerald-200/70",
        text: "text-emerald-700",
        accent: "bg-emerald-500",
        icon: <CheckCircle2 size={14} />,
      };

    case "pending":
      return {
        container: "bg-amber-50 border-amber-200/70",
        text: "text-amber-700",
        accent: "bg-amber-400",
        icon: <CircleAlert size={14} />,
      };

    case "cancelled":
      return {
        container: "bg-red-50 border-red-200/70",
        text: "text-red-700",
        accent: "bg-red-400",
        icon: <XCircle size={14} />,
      };

    case "missed":
      return {
        container: "bg-orange-50 border-orange-200/70",
        text: "text-orange-700",
        accent: "bg-orange-400",
        icon: <CalendarX2 size={14} />,
      };

    case "completed":
      return {
        container: "bg-sky-50 border-sky-200/70",
        text: "text-sky-700",
        accent: "bg-sky-500",
        icon: <BadgeCheck size={14} />,
      };

    default:
      return {
        container: "bg-slate-50 border-slate-200",
        text: "text-slate-600",
        accent: "bg-slate-300",
        icon: <CircleAlert size={14} />,
      };
  }
};

/* ------------------------------------------------------------------ */
/* SweetAlert toast                                                    */
/* ------------------------------------------------------------------ */

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

/* ------------------------------------------------------------------ */
/* Appointment card                                                    */
/* ------------------------------------------------------------------ */

function AppointmentCard({
  appointment,
  category,
  now,
  onCancel,
  cancelling = false,
}) {
  const past = category !== "upcoming";
  const missed = isMissed(appointment, now);

  // Badge label: confirmed / pending / cancelled / missed / completed
  const badgeLabel =
    category === "completed"
      ? "completed"
      : category === "cancelled"
        ? missed
          ? "missed"
          : "cancelled"
        : normalizeStatus(appointment.status);

  const statusStyle = getStatusStyle(badgeLabel);
  const dateParts = getDateParts(appointment.date);
  const when = getAppointmentDateTime(appointment);
  const timeLeft = category === "upcoming" ? getTimeLeftLabel(when, now) : "";

  return (
    <article
      className={`group relative overflow-hidden bg-white border border-slate-200/80 rounded-2xl transition-all duration-300 ${
        past
          ? "hover:border-slate-300 hover:shadow-md hover:shadow-slate-900/5"
          : "hover:border-teal-300/70 hover:shadow-xl hover:shadow-teal-900/10 hover:-translate-y-0.5"
      }`}
    >
      {/* Status accent bar */}
      <span
        aria-hidden="true"
        className={`absolute left-0 top-0 h-full w-1.5 ${statusStyle.accent} ${
          past ? "opacity-60" : ""
        }`}
      />

      <div className="p-5 sm:p-6 pl-6 sm:pl-7">
        {/* Doctor information and status */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {/* Calendar tile */}
            <div
              className={`w-16 h-16 rounded-2xl border flex flex-col items-center justify-center shrink-0 ${
                past
                  ? "bg-slate-50 border-slate-200 text-slate-500"
                  : "bg-gradient-to-b from-teal-50 to-white border-teal-100 text-teal-700"
              }`}
            >
              {dateParts ? (
                <>
                  <span className="text-[10px] font-bold uppercase tracking-widest leading-none">
                    {dateParts.month}
                  </span>
                  <span className="text-2xl font-extrabold leading-none mt-1">
                    {dateParts.day}
                  </span>
                </>
              ) : (
                <CalendarDays size={24} strokeWidth={1.8} />
              )}
            </div>

            <div className="min-w-0">
              <h3 className="text-lg font-bold text-slate-900 break-words leading-snug">
                {getDoctorName(appointment)}
              </h3>

              <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-slate-500">
                <Stethoscope size={15} className="text-teal-600 shrink-0" />
                {getSpecialty(appointment)}
              </p>

              {timeLeft && (
                <p className="mt-1 text-xs font-semibold text-teal-700">
                  {timeLeft}
                </p>
              )}
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 self-start px-3 py-1.5 rounded-full border text-xs font-semibold capitalize ${statusStyle.container} ${statusStyle.text}`}
          >
            {statusStyle.icon}
            {badgeLabel}
          </span>
        </div>

        {/* Date and time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
          <div className="flex items-center gap-3 bg-slate-50/80 border border-slate-100 rounded-xl p-3">
            <div className="w-9 h-9 rounded-lg bg-white border border-slate-100 shadow-sm flex items-center justify-center text-teal-600 shrink-0">
              <CalendarDays size={17} />
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                Date
              </p>

              <p className="text-sm font-semibold text-slate-800">
                {formatDate(appointment.date)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-50/80 border border-slate-100 rounded-xl p-3">
            <div className="w-9 h-9 rounded-lg bg-white border border-slate-100 shadow-sm flex items-center justify-center text-teal-600 shrink-0">
              <Clock3 size={17} />
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                Time
              </p>

              <p className="text-sm font-semibold text-slate-800">
                {formatTime(appointment.time)}
              </p>
            </div>
          </div>
        </div>

        {appointment.patientName && (
          <p className="mt-4 inline-flex items-center gap-2 text-sm text-slate-600">
            <UserRound size={15} className="text-slate-400 shrink-0" />
            <span>
              <strong className="font-semibold text-slate-700">Patient:</strong>{" "}
              {appointment.patientName}
            </span>
          </p>
        )}

        {/* Appointment reason */}
        {appointment.reason && (
          <div className="mt-4 flex gap-3 p-3.5 bg-teal-50/60 border border-teal-100/70 rounded-xl">
            <FileText size={17} className="text-teal-600 mt-0.5 shrink-0" />

            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                Reason for visit
              </p>

              <p className="text-sm text-slate-600 mt-1 leading-relaxed whitespace-pre-wrap break-words">
                {appointment.reason}
              </p>
            </div>
          </div>
        )}

        {/* Cancellation reason */}
        {category === "cancelled" && !missed && appointment.cancelReason && (
          <div className="mt-4 flex gap-3 p-3.5 bg-red-50/70 border border-red-100 rounded-xl">
            <Ban size={17} className="text-red-500 mt-0.5 shrink-0" />

            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-red-400 font-semibold">
                Cancellation reason
              </p>

              <p className="text-sm text-red-700 mt-1 leading-relaxed break-words">
                {appointment.cancelReason}
              </p>
            </div>
          </div>
        )}

        {/* Missed notice */}
        {missed && (
          <div className="mt-4 flex gap-3 p-3.5 bg-orange-50/70 border border-orange-100 rounded-xl">
            <CalendarX2 size={17} className="text-orange-500 mt-0.5 shrink-0" />

            <p className="text-sm text-orange-700 leading-relaxed">
              The appointment date has passed and the visit was not completed.
              You can book a new appointment with the doctor.
            </p>
          </div>
        )}

        {/* Actions */}
        {category === "upcoming" && (
          <div className="mt-5 pt-4 border-t border-slate-100">
            {canCancel(appointment, now) ? (
              <button
                type="button"
                onClick={() => onCancel(appointment)}
                disabled={cancelling}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-red-600 bg-white text-sm font-semibold hover:bg-red-50 hover:border-red-300 disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                <XCircle size={16} />
                {cancelling ? "Cancelling..." : "Cancel Appointment"}
              </button>
            ) : (
              <p className="text-xs text-slate-500">
                Appointments cannot be cancelled within {MIN_CANCEL_HOURS} hours
                of the start time.
              </p>
            )}
          </div>
        )}

        {(category === "cancelled" || category === "completed") && (
          <div className="mt-5 pt-4 border-t border-slate-100">
            <Link
              to="/doctors"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#0F6E56] hover:text-[#0c5945] transition"
            >
              Book a new appointment
              <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Statistic card                                                      */
/* ------------------------------------------------------------------ */

function StatCard({ icon, iconClass, label, tag, tagClass, value }) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-lg hover:shadow-slate-900/5 hover:-translate-y-0.5 transition-all duration-300">
      <div className="flex items-center justify-between">
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconClass}`}
        >
          {icon}
        </div>

        <span
          className={`text-[11px] font-semibold uppercase tracking-wider ${tagClass}`}
        >
          {tag}
        </span>
      </div>

      <p className="text-sm font-medium text-slate-500 mt-5">{label}</p>
      <p className="text-3xl font-extrabold text-slate-900 mt-1 tabular-nums">
        {value}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const TABS = [
  {
    key: "upcoming",
    label: "Upcoming",
    icon: CalendarCheck2,
    activeClass: "bg-[#0F6E56] text-white shadow-md shadow-teal-900/15",
    title: "No upcoming appointments",
    text: "Your booked appointments scheduled for a future date and time will appear here.",
  },
  {
    key: "cancelled",
    label: "Cancelled / Missed",
    icon: CalendarX2,
    activeClass: "bg-red-600 text-white shadow-md shadow-red-900/15",
    title: "No cancelled or missed appointments",
    text: "Appointments you cancel, or whose date passed without a visit, will appear here.",
  },
  {
    key: "completed",
    label: "Completed",
    icon: BadgeCheck,
    activeClass: "bg-sky-600 text-white shadow-md shadow-sky-900/15",
    title: "No completed appointments yet",
    text: "Visits that were completed with your doctor will appear here.",
  },
];

function PatientAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("upcoming");
  const [cancellingId, setCancellingId] = useState(null);
  const [now, setNow] = useState(new Date());

  const token = localStorage.getItem("token");

  // Keep the clock fresh so appointments move between sections automatically.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch appointments belonging to the logged-in patient.
  const fetchAppointments = useCallback(
    async (showLoader = true) => {
      if (!token) {
        setAppointments([]);
        setError("Please login to view your appointments.");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (showLoader) setLoading(true);

      setError("");

      try {
        const res = await axios.get(`${API_URL}/api/v1/appointments/my`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const payload = res.data;

        // Handle common API response formats.
        const list = Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.data?.appointments)
            ? payload.data.appointments
            : Array.isArray(payload?.appointments)
              ? payload.appointments
              : null;

        if (!list) {
          console.error("Unexpected appointments response:", payload);

          throw new Error(
            "Appointments data format is unexpected. Check the backend response.",
          );
        }

        setAppointments(list);
        setNow(new Date());
      } catch (err) {
        console.error(
          "Failed to load appointments:",
          err.response?.data || err,
        );

        setError(
          err.response?.data?.message ||
            err.message ||
            "Unable to load your appointments. Please try again.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token],
  );

  useEffect(() => {
    fetchAppointments();

    // Refresh when the browser tab regains focus.
    const handleFocus = () => {
      fetchAppointments(false);
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchAppointments]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAppointments(false);
    Toast.fire({ icon: "success", title: "Appointments updated" });
  };

  // Cancel an upcoming appointment.
  const handleCancel = async (appointment) => {
    // Re-check with the latest time before opening the popup
    if (!canCancel(appointment, new Date())) {
      Swal.fire({
        icon: "info",
        title: "Cannot cancel now",
        text: `Appointments cannot be cancelled within ${MIN_CANCEL_HOURS} hours of the start time.`,
        confirmButtonColor: "#0F6E56",
      });
      setNow(new Date());
      return;
    }

    const result = await Swal.fire({
      icon: "warning",
      title: "Cancel this appointment?",
      html: `
        <div style="text-align:left;line-height:1.8;margin-bottom:8px">
          <b>Doctor:</b> ${getDoctorName(appointment)}<br/>
          <b>Date:</b> ${formatDate(appointment.date)}<br/>
          <b>Time:</b> ${formatTime(appointment.time)}
        </div>`,
      input: "textarea",
      inputLabel: "Reason for cancellation (optional)",
      inputPlaceholder: "Tell us why you are cancelling...",
      inputAttributes: { maxlength: 200 },
      showCancelButton: true,
      confirmButtonText: "Yes, cancel it",
      cancelButtonText: "Keep appointment",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      setCancellingId(appointment._id);

      const res = await axios.patch(
        `${API_URL}/api/v1/appointments/${appointment._id}/cancel`,
        { reason: (result.value || "").trim() },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const updated = res.data?.data || {};

      setAppointments((prev) =>
        prev.map((item) =>
          item._id === appointment._id
            ? { ...item, ...updated, status: "Cancelled" }
            : item,
        ),
      );

      setActiveTab("cancelled");

      Swal.fire({
        icon: "success",
        title: "Appointment Cancelled",
        text: "Your appointment has been cancelled successfully.",
        confirmButtonColor: "#0F6E56",
        timer: 2500,
      });
    } catch (err) {
      console.error("Cancel appointment error:", err.response?.data || err);

      Swal.fire({
        icon: "error",
        title: "Could not cancel",
        text:
          err.response?.data?.message ||
          "Failed to cancel the appointment. Please try again.",
        confirmButtonColor: "#0F6E56",
      });
    } finally {
      setCancellingId(null);
    }
  };

  // Split appointments into the 3 sections.
  const grouped = useMemo(() => {
    const result = { upcoming: [], cancelled: [], completed: [] };

    appointments.forEach((appointment) => {
      result[getCategory(appointment, now)].push(appointment);
    });

    const byTime = (a, b) =>
      (getAppointmentDateTime(a)?.getTime() || 0) -
      (getAppointmentDateTime(b)?.getTime() || 0);

    result.upcoming.sort(byTime); // soonest first
    result.cancelled.sort((a, b) => byTime(b, a)); // newest first
    result.completed.sort((a, b) => byTime(b, a)); // newest first

    return result;
  }, [appointments, now]);

  const activeTabConfig = TABS.find((tab) => tab.key === activeTab);
  const activeList = grouped[activeTab];

  // Loading screen.
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse">
          <div className="h-4 w-36 bg-slate-200 rounded" />
          <div className="h-10 w-72 max-w-full bg-slate-200 rounded-lg mt-4" />
          <div className="h-4 w-96 max-w-full bg-slate-200 rounded mt-4" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-10">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-36 bg-white rounded-2xl border border-slate-200/80"
              />
            ))}
          </div>

          <div className="h-8 w-56 bg-slate-200 rounded mt-12" />

          <div className="space-y-5 mt-6">
            {[1, 2].map((item) => (
              <div
                key={item}
                className="h-56 bg-white rounded-2xl border border-slate-200/80"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50/60 via-slate-50 to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-100/70 text-teal-800 text-xs font-semibold tracking-wide uppercase mb-4">
              <CalendarCheck2 size={15} />
              Patient Dashboard
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              My Appointments
            </h1>

            <p className="text-slate-500 mt-3 max-w-2xl leading-relaxed">
              Keep track of your upcoming consultations, cancelled or missed
              visits, and completed appointments in one place.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold shadow-sm hover:bg-slate-50 hover:border-slate-300 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              <RefreshCw
                size={16}
                className={refreshing ? "animate-spin" : ""}
              />
              Refresh
            </button>

            <Link
              to="/doctors"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#0F6E56] hover:bg-[#0c5945] text-white text-sm font-semibold shadow-md shadow-teal-900/15 hover:shadow-lg transition-all"
            >
              <Search size={17} />
              Find a Doctor
            </Link>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="mt-8 bg-red-50 border border-red-200/80 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <CircleAlert size={20} />
              </div>

              <div>
                <h3 className="font-semibold text-red-800">
                  Unable to load appointments
                </h3>

                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => fetchAppointments()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-red-200 text-red-700 rounded-xl text-sm font-semibold hover:bg-red-50 transition"
            >
              <RefreshCw size={16} />
              Try Again
            </button>
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-10">
          <StatCard
            icon={<ClipboardList size={21} />}
            iconClass="bg-teal-50 text-teal-700"
            label="Total Appointments"
            tag="All time"
            tagClass="text-slate-400"
            value={appointments.length}
          />

          <StatCard
            icon={<CalendarCheck2 size={21} />}
            iconClass="bg-emerald-50 text-emerald-600"
            label="Upcoming Visits"
            tag="Upcoming"
            tagClass="text-emerald-600"
            value={grouped.upcoming.length}
          />

          <StatCard
            icon={<BadgeCheck size={21} />}
            iconClass="bg-sky-50 text-sky-600"
            label="Completed Visits"
            tag="Completed"
            tagClass="text-sky-600"
            value={grouped.completed.length}
          />

          <StatCard
            icon={<XCircle size={21} />}
            iconClass="bg-red-50 text-red-500"
            label="Cancelled / Missed"
            tag="Cancelled"
            tagClass="text-red-500"
            value={grouped.cancelled.length}
          />
        </div>

        {/* Appointments (3 sections) */}
        <section className="mt-14">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 pb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
                  <CalendarCheck2 size={19} />
                </div>

                <h2 className="text-2xl font-bold text-slate-900">
                  Appointment Overview
                </h2>
              </div>

              <p className="text-sm text-slate-500 mt-2">
                Switch between your upcoming, cancelled, and completed
                appointments
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div
            role="tablist"
            aria-label="Appointment sections"
            className="flex flex-wrap gap-2 mb-8"
          >
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.key)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? tab.activeClass
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                  <span
                    className={`inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full text-xs font-bold ${
                      isActive
                        ? "bg-white/25 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {grouped[tab.key].length}
                  </span>
                </button>
              );
            })}
          </div>

          {/* List */}
          {activeList.length > 0 ? (
            <div className="space-y-5">
              {activeList.map((appointment) => (
                <AppointmentCard
                  key={appointment._id}
                  appointment={appointment}
                  category={activeTab}
                  now={now}
                  onCancel={handleCancel}
                  cancelling={cancellingId === appointment._id}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-8 sm:p-14 text-center">
              <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-teal-50 to-emerald-100 flex items-center justify-center text-teal-600 ring-8 ring-teal-50/60">
                <CalendarDays size={34} strokeWidth={1.6} />
              </div>

              <h3 className="text-2xl font-bold text-slate-900 mt-7">
                {activeTabConfig.title}
              </h3>

              <p className="text-slate-500 max-w-md mx-auto mt-3 leading-7">
                {activeTabConfig.text}
              </p>

              {activeTab === "upcoming" && (
                <Link
                  to="/doctors"
                  className="inline-flex items-center gap-2 mt-7 px-6 py-3 rounded-xl bg-[#0F6E56] hover:bg-[#0c5945] text-white text-sm font-semibold shadow-md shadow-teal-900/15 transition"
                >
                  Browse Doctors
                  <ArrowRight size={18} />
                </Link>
              )}
            </div>
          )}
        </section>

        {/* Bottom CTA */}
        <div className="mt-14 mb-6 rounded-3xl bg-gradient-to-br from-[#0F6E56] via-[#0D5C49] to-[#0C4A3C] text-white p-7 sm:p-10 relative overflow-hidden shadow-xl shadow-teal-900/15">
          <div className="absolute -right-10 -top-20 w-56 h-56 rounded-full bg-white/5" />
          <div className="absolute -right-20 -bottom-24 w-72 h-72 rounded-full bg-white/5" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10">
                <UserRound size={16} className="text-emerald-200" />

                <span className="text-xs font-semibold text-emerald-100 tracking-wide">
                  Your health matters
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold mt-4">
                Need to see a doctor?
              </h2>

              <p className="text-emerald-50/80 mt-2 max-w-xl leading-relaxed">
                Find a qualified healthcare professional and schedule your next
                appointment easily.
              </p>
            </div>

            <Link
              to="/doctors"
              className="shrink-0 inline-flex items-center justify-center gap-2 bg-white text-[#0F6E56] px-6 py-3.5 rounded-xl text-sm font-semibold shadow-md hover:bg-emerald-50 transition"
            >
              Find a Doctor
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PatientAppointments;

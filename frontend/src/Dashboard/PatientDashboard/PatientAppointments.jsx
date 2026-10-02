import { useEffect, useMemo, useState } from "react";
import axios from "axios";
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
  History,
  UserRound,
  FileText,
  RefreshCw,
} from "lucide-react";
import { Link } from "react-router-dom";

function PatientAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");

  // --------------------------------------------------
  // Fetch patient appointments
  // --------------------------------------------------

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/v1/appointments/my`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setAppointments(res.data.data || []);
    } catch (error) {
      console.error("Failed to load appointments:", error);

      setError(
        error.response?.data?.message ||
          "Unable to load your appointments. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAppointments();
    } else {
      setLoading(false);
      setError("Please login to view your appointments.");
    }
  }, [token]);

  // --------------------------------------------------
  // Appointment statistics
  // --------------------------------------------------

  const totalAppointments = appointments.length;

  const confirmedAppointments = appointments.filter(
    (appointment) => appointment.status?.toLowerCase() === "confirmed",
  ).length;

  const pendingAppointments = appointments.filter(
    (appointment) => appointment.status?.toLowerCase() === "pending",
  ).length;

  const cancelledAppointments = appointments.filter(
    (appointment) => appointment.status?.toLowerCase() === "cancelled",
  ).length;

  // --------------------------------------------------
  // Separate upcoming and past appointments
  // --------------------------------------------------

  const upcomingAppointments = useMemo(() => {
    return appointments.filter((appointment) => {
      if (!appointment.date) return false;

      const appointmentDate = new Date(appointment.date);
      const today = new Date();

      today.setHours(0, 0, 0, 0);
      appointmentDate.setHours(0, 0, 0, 0);

      return appointmentDate >= today;
    });
  }, [appointments]);

  const pastAppointments = useMemo(() => {
    return appointments.filter((appointment) => {
      if (!appointment.date) return false;

      const appointmentDate = new Date(appointment.date);
      const today = new Date();

      today.setHours(0, 0, 0, 0);
      appointmentDate.setHours(0, 0, 0, 0);

      return appointmentDate < today;
    });
  }, [appointments]);

  // --------------------------------------------------
  // Format date
  // --------------------------------------------------

  const formatDate = (date) => {
    if (!date) return "Date unavailable";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // --------------------------------------------------
  // Status configuration
  // --------------------------------------------------

  const getStatusStyle = (status) => {
    const normalizedStatus = status?.toLowerCase();

    switch (normalizedStatus) {
      case "confirmed":
        return {
          container: "bg-emerald-50 border-emerald-100",
          text: "text-emerald-700",
          icon: <CheckCircle2 size={15} />,
        };

      case "pending":
        return {
          container: "bg-amber-50 border-amber-100",
          text: "text-amber-700",
          icon: <CircleAlert size={15} />,
        };

      case "cancelled":
      case "canceled":
        return {
          container: "bg-red-50 border-red-100",
          text: "text-red-700",
          icon: <XCircle size={15} />,
        };

      case "completed":
        return {
          container: "bg-blue-50 border-blue-100",
          text: "text-blue-700",
          icon: <CheckCircle2 size={15} />,
        };

      default:
        return {
          container: "bg-gray-50 border-gray-100",
          text: "text-gray-600",
          icon: <CircleAlert size={15} />,
        };
    }
  };

  // --------------------------------------------------
  // Appointment Card
  // --------------------------------------------------

  const AppointmentCard = ({ appointment, past = false }) => {
    const statusStyle = getStatusStyle(appointment.status);

    return (
      <div
        className={`group bg-white border border-gray-100 rounded-2xl p-5 transition-all duration-300 ${
          past
            ? "hover:border-gray-200"
            : "hover:border-teal-200 hover:shadow-lg hover:shadow-teal-900/5"
        }`}
      >
        {/* Top */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Doctor Avatar */}
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-100 flex items-center justify-center text-teal-700 shrink-0">
              <Stethoscope size={25} strokeWidth={1.8} />
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {appointment.doctorName || "Doctor"}
              </h3>

              <p className="text-sm text-gray-500 mt-1">
                {appointment.specialty || "Healthcare Specialist"}
              </p>
            </div>
          </div>

          {/* Status */}
          <span
            className={`inline-flex items-center gap-1.5 self-start px-3 py-1.5 rounded-full border text-xs font-semibold capitalize ${statusStyle.container} ${statusStyle.text}`}
          >
            {statusStyle.icon}
            {appointment.status || "Pending"}
          </span>
        </div>

        {/* Appointment details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
            <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-teal-600">
              <CalendarDays size={18} />
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-400 font-medium">
                Date
              </p>

              <p className="text-sm font-semibold text-gray-700">
                {formatDate(appointment.date)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
            <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-teal-600">
              <Clock3 size={18} />
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-400 font-medium">
                Time
              </p>

              <p className="text-sm font-semibold text-gray-700">
                {appointment.time || "Time unavailable"}
              </p>
            </div>
          </div>
        </div>

        {/* Reason */}
        {appointment.reason && (
          <div className="mt-4 flex gap-3 p-3 bg-teal-50/60 rounded-xl">
            <FileText size={17} className="text-teal-600 mt-0.5 shrink-0" />

            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-400 font-medium">
                Reason for visit
              </p>

              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                {appointment.reason}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  // --------------------------------------------------
  // Loading State
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7FAF9]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header Skeleton */}
          <div className="animate-pulse">
            <div className="h-8 w-64 bg-gray-200 rounded-lg" />
            <div className="h-4 w-96 bg-gray-200 rounded mt-3" />

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-8">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-32 bg-white rounded-2xl border border-gray-100"
                />
              ))}
            </div>

            <div className="h-8 w-52 bg-gray-200 rounded mt-10" />

            <div className="space-y-5 mt-5">
              {[1, 2].map((item) => (
                <div
                  key={item}
                  className="h-52 bg-white rounded-2xl border border-gray-100"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // Main UI
  // --------------------------------------------------

  return (
    <div className="min-h-screen bg-[#F7FAF9]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* =========================================
            HEADER
        ========================================= */}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-teal-700 text-sm font-semibold mb-2">
              <CalendarCheck2 size={18} />
              Patient Dashboard
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
              My Appointments
            </h1>

            <p className="text-gray-500 mt-2 max-w-2xl">
              Keep track of your upcoming consultations, appointment history,
              and healthcare visits in one place.
            </p>
          </div>

          <Link
            to="/doctors"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#0F6E56] hover:bg-[#0c5945] text-white font-semibold shadow-sm hover:shadow-md transition-all"
          >
            <Search size={18} />
            Find a Doctor
          </Link>
        </div>

        {/* =========================================
            ERROR
        ========================================= */}

        {error && (
          <div className="mt-6 bg-red-50 border border-red-100 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <CircleAlert className="text-red-500 shrink-0 mt-0.5" size={20} />

              <div>
                <h3 className="font-semibold text-red-800">
                  Unable to load appointments
                </h3>

                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>

            <button
              onClick={fetchAppointments}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-red-200 text-red-700 rounded-xl text-sm font-semibold hover:bg-red-50 transition"
            >
              <RefreshCw size={16} />
              Try Again
            </button>
          </div>
        )}

        {/* =========================================
            STATISTICS
        ========================================= */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-8">
          {/* Total */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                <ClipboardList size={21} />
              </div>

              <span className="text-xs font-medium text-gray-400">
                All time
              </span>
            </div>

            <p className="text-sm text-gray-500 mt-5">Total Appointments</p>

            <p className="text-3xl font-bold text-gray-900 mt-1">
              {totalAppointments}
            </p>
          </div>

          {/* Confirmed */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 size={21} />
              </div>

              <span className="text-xs font-medium text-emerald-600">
                Confirmed
              </span>
            </div>

            <p className="text-sm text-gray-500 mt-5">Confirmed Visits</p>

            <p className="text-3xl font-bold text-gray-900 mt-1">
              {confirmedAppointments}
            </p>
          </div>

          {/* Pending */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock3 size={21} />
              </div>

              <span className="text-xs font-medium text-amber-600">
                Pending
              </span>
            </div>

            <p className="text-sm text-gray-500 mt-5">Awaiting Confirmation</p>

            <p className="text-3xl font-bold text-gray-900 mt-1">
              {pendingAppointments}
            </p>
          </div>

          {/* Cancelled */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-xl bg-red-50 text-red-500 flex items-center justify-center">
                <XCircle size={21} />
              </div>

              <span className="text-xs font-medium text-red-500">
                Cancelled
              </span>
            </div>

            <p className="text-sm text-gray-500 mt-5">Cancelled Visits</p>

            <p className="text-3xl font-bold text-gray-900 mt-1">
              {cancelledAppointments}
            </p>
          </div>
        </div>

        {/* =========================================
            UPCOMING APPOINTMENTS
        ========================================= */}

        <section className="mt-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <div>
              <div className="flex items-center gap-2">
                <CalendarCheck2 size={21} className="text-teal-600" />

                <h2 className="text-2xl font-bold text-gray-900">
                  Upcoming Appointments
                </h2>
              </div>

              <p className="text-sm text-gray-500 mt-1">
                Your scheduled healthcare consultations
              </p>
            </div>

            {upcomingAppointments.length > 0 && (
              <span className="text-sm text-gray-500">
                {upcomingAppointments.length} appointment
                {upcomingAppointments.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {upcomingAppointments.length > 0 ? (
            <div className="space-y-5">
              {upcomingAppointments.map((appointment) => (
                <AppointmentCard
                  key={appointment._id}
                  appointment={appointment}
                />
              ))}
            </div>
          ) : (
            /* =========================================
               EMPTY STATE
            ========================================= */

            <div className="bg-white border border-gray-100 rounded-3xl p-8 sm:p-12 text-center shadow-sm">
              <div className="mx-auto w-20 h-20 rounded-full bg-teal-50 flex items-center justify-center text-teal-600">
                <CalendarDays size={34} strokeWidth={1.6} />
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mt-6">
                No upcoming appointments
              </h3>

              <p className="text-gray-500 max-w-md mx-auto mt-3 leading-7">
                You don't have any appointments scheduled right now. Find a
                healthcare professional and book a consultation whenever you
                need one.
              </p>

              <Link
                to="/doctors"
                className="inline-flex items-center gap-2 mt-6 px-5 py-3 rounded-xl bg-[#0F6E56] hover:bg-[#0c5945] text-white font-semibold transition"
              >
                Browse Doctors
                <ArrowRight size={18} />
              </Link>
            </div>
          )}
        </section>

        {/* =========================================
            APPOINTMENT HISTORY
        ========================================= */}

        {pastAppointments.length > 0 && (
          <section className="mt-12 pb-10">
            <div className="flex items-center gap-2 mb-5">
              <History size={21} className="text-gray-600" />

              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Appointment History
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  Your previous healthcare visits
                </p>
              </div>
            </div>

            <div className="space-y-5">
              {pastAppointments.map((appointment) => (
                <AppointmentCard
                  key={appointment._id}
                  appointment={appointment}
                  past
                />
              ))}
            </div>
          </section>
        )}

        {/* =========================================
            BOTTOM CTA
        ========================================= */}

        <div className="mt-8 mb-10 rounded-3xl bg-gradient-to-r from-[#0F6E56] to-[#0C4A3C] text-white p-7 sm:p-9 relative overflow-hidden">
          <div className="absolute -right-10 -top-20 w-56 h-56 rounded-full bg-white/5" />
          <div className="absolute -right-20 -bottom-24 w-72 h-72 rounded-full bg-white/5" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2">
                <UserRound size={20} className="text-emerald-200" />

                <span className="text-sm font-semibold text-emerald-200">
                  Your health matters
                </span>
              </div>

              <h2 className="text-2xl font-bold mt-2">Need to see a doctor?</h2>

              <p className="text-emerald-50/80 mt-2 max-w-xl">
                Find a qualified healthcare professional and schedule your next
                appointment easily.
              </p>
            </div>

            <Link
              to="/doctors"
              className="shrink-0 inline-flex items-center justify-center gap-2 bg-white text-[#0F6E56] px-5 py-3 rounded-xl font-semibold hover:bg-emerald-50 transition"
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

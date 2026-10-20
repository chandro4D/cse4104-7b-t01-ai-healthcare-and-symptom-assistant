import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";

const API_URL = "http://localhost:5000/api/v1/appointments";

// Clinic rules (change as needed)
const OPEN_TIME = "09:00";
const CLOSE_TIME = "21:00";
const MAX_DAYS_AHEAD = 90;
const MIN_CANCEL_HOURS = 2; // must match backend rule

/* ------------------------------- SweetAlert ------------------------------ */

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3500,
  timerProgressBar: true,
});

const showToast = (icon, title) => Toast.fire({ icon, title });

/* ---------------------------- Helper functions --------------------------- */

// Local date as YYYY-MM-DD (avoids timezone bugs of toISOString)
const toDateInputValue = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// Local time as HH:mm
const toTimeInputValue = (d) => {
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${min}`;
};

// Combine "YYYY-MM-DD" (or ISO string) + "HH:mm" into a Date
const getAppointmentDateTime = (appointment) => {
  const datePart = String(appointment.date || "").slice(0, 10);
  const timePart = appointment.time || "00:00";
  return new Date(`${datePart}T${timePart}`);
};

const formatDate = (dateStr) => {
  const d = new Date(`${String(dateStr).slice(0, 10)}T00:00`);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (timeStr) => {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

/**
 * Decide which section an appointment belongs to.
 *  - completed : status is Completed
 *  - cancelled : status is Cancelled, OR the date/time has passed
 *                and the appointment was never completed (missed)
 *  - upcoming  : still in the future and Pending/Confirmed
 */
const getCategory = (appointment, now) => {
  const status = (appointment.status || "").toLowerCase();

  if (status === "completed") return "completed";
  if (status === "cancelled" || status === "canceled") return "cancelled";

  const when = getAppointmentDateTime(appointment);
  if (!isNaN(when) && when < now) return "cancelled"; // missed
  return "upcoming";
};

/* -------------------------------- Component ------------------------------- */

function Appointments() {
  const location = useLocation();

  const selectedDoctor = location.state?.doctor;
  const doctorId = location.state?.doctorId || selectedDoctor?._id;
  const token = localStorage.getItem("token");

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [now, setNow] = useState(new Date());

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const [formData, setFormData] = useState({
    patientName: "",
    doctor: "",
    specialty: "",
    date: "",
    time: "",
    reason: "",
  });

  // Keep "now" fresh so appointments move to the right section automatically
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch logged-in user's appointments
  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const res = await axios.get(`${API_URL}/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAppointments(res.data.data || []);
      } catch (error) {
        console.error("Failed to load appointments:", error);
        showToast("error", "Failed to load your appointments.");
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchAppointments();
    } else {
      setLoading(false);
    }
  }, [token]);

  // Auto-fill doctor information when coming from Doctors page
  useEffect(() => {
    if (selectedDoctor) {
      setFormData((prev) => ({
        ...prev,
        doctor: selectedDoctor.name,
        specialty: selectedDoctor.specialty,
      }));
    }
  }, [selectedDoctor]);

  /* ------------------------------ Validation ------------------------------ */

  const todayStr = toDateInputValue(now);
  const maxDateStr = toDateInputValue(
    new Date(now.getTime() + MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000),
  );

  const validate = (data) => {
    const e = {};

    // Doctor
    if (!doctorId || !data.doctor || !data.specialty) {
      e.doctor = "Please select a doctor from the Doctors page first.";
    }

    // Patient name
    const name = data.patientName.trim();
    if (!name) {
      e.patientName = "Patient name is required.";
    } else if (name.length < 3) {
      e.patientName = "Name must be at least 3 characters.";
    } else if (name.length > 60) {
      e.patientName = "Name must be under 60 characters.";
    } else if (!/^[A-Za-z\u0980-\u09FF\s.'-]+$/.test(name)) {
      e.patientName = "Name can only contain letters, spaces, . ' and -";
    }

    // Date
    if (!data.date) {
      e.date = "Please choose a date.";
    } else if (data.date < todayStr) {
      e.date = "You cannot book an appointment in the past.";
    } else if (data.date > maxDateStr) {
      e.date = `You can only book up to ${MAX_DAYS_AHEAD} days in advance.`;
    }

    // Time
    if (!data.time) {
      e.time = "Please choose a time.";
    } else if (data.time < OPEN_TIME || data.time > CLOSE_TIME) {
      e.time = `Time must be between ${formatTime(OPEN_TIME)} and ${formatTime(CLOSE_TIME)}.`;
    } else if (data.date === todayStr) {
      // Same-day booking must be at least 30 minutes from now
      const minTime = new Date(now.getTime() + 30 * 60 * 1000);
      const selected = new Date(`${data.date}T${data.time}`);
      if (selected < minTime) {
        e.time = "Please choose a time at least 30 minutes from now.";
      }
    }

    // Reason
    const reason = data.reason.trim();
    if (!reason) {
      e.reason = "Please describe your reason for the appointment.";
    } else if (reason.length < 10) {
      e.reason = "Please provide at least 10 characters.";
    } else if (reason.length > 500) {
      e.reason = "Reason must be under 500 characters.";
    }

    // Duplicate / conflicting booking (same doctor, same slot, still active)
    if (!e.date && !e.time && !e.doctor) {
      const duplicate = appointments.some(
        (a) =>
          getCategory(a, now) === "upcoming" &&
          String(a.date).slice(0, 10) === data.date &&
          a.time === data.time &&
          (a.doctorName === data.doctor || a.doctor?._id === doctorId),
      );
      if (duplicate) {
        e.time =
          "You already have an appointment with this doctor at that time.";
      }
    }

    return e;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...formData, [name]: value };
    setFormData(updated);
    if (touched[name]) {
      setErrors(validate(updated));
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors(validate(formData));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validate(formData);
    setErrors(validationErrors);
    setTouched({
      patientName: true,
      date: true,
      time: true,
      reason: true,
      doctor: true,
    });

    if (Object.keys(validationErrors).length > 0) {
      Swal.fire({
        icon: "warning",
        title: "Check your details",
        text: "Please fix the highlighted errors and try again.",
        confirmButtonColor: "#0891b2",
      });
      return;
    }

    // Confirm before booking
    const confirm = await Swal.fire({
      icon: "question",
      title: "Confirm appointment?",
      html: `
        <div style="text-align:left;line-height:1.8">
          <b>Doctor:</b> ${formData.doctor}<br/>
          <b>Date:</b> ${formatDate(formData.date)}<br/>
          <b>Time:</b> ${formatTime(formData.time)}
        </div>`,
      showCancelButton: true,
      confirmButtonText: "Yes, book it",
      cancelButtonText: "Review again",
      confirmButtonColor: "#0891b2",
    });
    if (!confirm.isConfirmed) return;

    try {
      setSubmitting(true);

      const res = await axios.post(
        API_URL,
        {
          doctorId,
          patientName: formData.patientName.trim(),
          date: formData.date,
          time: formData.time,
          reason: formData.reason.trim(),
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const savedAppointment = res.data.data;

      // Show instantly in Upcoming Appointments
      setAppointments((prev) => [savedAppointment, ...prev]);
      setActiveTab("upcoming");
      Swal.fire({
        icon: "success",
        title: "Appointment Booked!",
        text: "Your appointment has been scheduled successfully.",
        confirmButtonColor: "#0891b2",
        timer: 2500,
      });

      // Reset form but keep selected doctor
      setFormData({
        patientName: "",
        doctor: selectedDoctor?.name || "",
        specialty: selectedDoctor?.specialty || "",
        date: "",
        time: "",
        reason: "",
      });
      setTouched({});
      setErrors({});
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Booking failed",
        text: error.response?.data?.message || "Failed to book appointment.",
        confirmButtonColor: "#0891b2",
      });
    } finally {
      setSubmitting(false);
    }
  };

  /* ------------------------------ Cancel action ---------------------------- */

  // Backend route: PATCH /api/v1/appointments/:id/cancel
  const handleCancel = async (appointment) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Cancel this appointment?",
      html: `
        <div style="text-align:left;line-height:1.8;margin-bottom:8px">
          <b>Doctor:</b> ${appointment.doctorName}<br/>
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
        `${API_URL}/${appointment._id}/cancel`,
        { reason: (result.value || "").trim() },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const updated = res.data.data;

      setAppointments((prev) =>
        prev.map((a) => (a._id === appointment._id ? { ...a, ...updated } : a)),
      );

      setActiveTab("cancelled");

      Swal.fire({
        icon: "success",
        title: "Appointment Cancelled",
        text: "Your appointment has been cancelled.",
        confirmButtonColor: "#0891b2",
        timer: 2500,
      });
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Could not cancel",
        text: error.response?.data?.message || "Failed to cancel appointment.",
        confirmButtonColor: "#0891b2",
      });
    } finally {
      setCancellingId(null);
    }
  };

  /* ------------------------- Group appointments in 3 ----------------------- */

  const grouped = useMemo(() => {
    const result = { upcoming: [], cancelled: [], completed: [] };

    appointments.forEach((a) => {
      result[getCategory(a, now)].push(a);
    });

    // Upcoming: soonest first. Others: most recent first.
    result.upcoming.sort(
      (a, b) => getAppointmentDateTime(a) - getAppointmentDateTime(b),
    );
    result.cancelled.sort(
      (a, b) => getAppointmentDateTime(b) - getAppointmentDateTime(a),
    );
    result.completed.sort(
      (a, b) => getAppointmentDateTime(b) - getAppointmentDateTime(a),
    );

    return result;
  }, [appointments, now]);

  const tabs = [
    {
      key: "upcoming",
      label: "Upcoming",
      count: grouped.upcoming.length,
      active: "bg-cyan-600 text-white",
    },
    {
      key: "cancelled",
      label: "Cancelled / Missed",
      count: grouped.cancelled.length,
      active: "bg-red-600 text-white",
    },
    {
      key: "completed",
      label: "Completed",
      count: grouped.completed.length,
      active: "bg-green-600 text-white",
    },
  ];

  const emptyMessages = {
    upcoming: "You have no upcoming appointments.",
    cancelled: "No cancelled or missed appointments.",
    completed: "No completed appointments yet.",
  };

  const getBadge = (appointment, category) => {
    if (category === "completed") {
      return { text: "Completed", cls: "bg-green-100 text-green-700" };
    }
    if (category === "cancelled") {
      const isCancelled = ["cancelled", "canceled"].includes(
        (appointment.status || "").toLowerCase(),
      );
      return isCancelled
        ? { text: "Cancelled", cls: "bg-red-100 text-red-700" }
        : { text: "Missed", cls: "bg-orange-100 text-orange-700" };
    }
    return appointment.status === "Confirmed"
      ? { text: "Confirmed", cls: "bg-green-100 text-green-700" }
      : { text: "Pending", cls: "bg-yellow-100 text-yellow-700" };
  };

  const inputClass = (field, extra = "") =>
    `w-full border rounded-xl p-3 outline-none focus:ring-2 ${
      touched[field] && errors[field]
        ? "border-red-500 focus:ring-red-400"
        : "focus:ring-cyan-500"
    } ${extra}`;

  const ErrorText = ({ field }) =>
    touched[field] && errors[field] ? (
      <p className="text-red-600 text-sm mt-1">{errors[field]}</p>
    ) : null;

  /* --------------------------------- Render -------------------------------- */

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-600 to-blue-700 text-white p-10">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold">Book Medical Appointment</h1>
          <p className="mt-3 text-blue-100 max-w-3xl">
            Easily schedule appointments with experienced healthcare
            professionals.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {!token && (
          <div className="mb-6 bg-red-100 text-red-800 p-4 rounded-xl">
            You must be logged in to book or view appointments.
          </div>
        )}

        {/* Statistics */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-gray-500 font-semibold">Total Appointments</h2>
            <p className="text-4xl font-bold text-cyan-600 mt-3">
              {appointments.length}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-gray-500 font-semibold">Upcoming</h2>
            <p className="text-4xl font-bold text-blue-600 mt-3">
              {grouped.upcoming.length}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-gray-500 font-semibold">Completed</h2>
            <p className="text-4xl font-bold text-green-600 mt-3">
              {grouped.completed.length}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-gray-500 font-semibold">Cancelled / Missed</h2>
            <p className="text-4xl font-bold text-red-600 mt-3">
              {grouped.cancelled.length}
            </p>
          </div>
        </div>

        {/* Main */}
        <div className="grid lg:grid-cols-2 gap-8 mt-10">
          {/* Booking Form */}
          <div className="bg-white rounded-3xl shadow-xl p-8 h-fit">
            <h2 className="text-2xl font-bold mb-6">Schedule Appointment</h2>

            {!selectedDoctor && (
              <div className="bg-yellow-100 text-yellow-800 p-4 rounded-xl mb-4">
                Please select a doctor from the Doctors page first.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">
                  Patient Name
                </label>
                <input
                  type="text"
                  name="patientName"
                  placeholder="Patient Name"
                  value={formData.patientName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  maxLength={60}
                  className={inputClass("patientName")}
                />
                <ErrorText field="patientName" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">
                  Doctor
                </label>
                <input
                  type="text"
                  name="doctor"
                  placeholder="Doctor"
                  value={formData.doctor}
                  readOnly
                  className="w-full border rounded-xl p-3 bg-gray-100"
                />
                <ErrorText field="doctor" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">
                  Specialty
                </label>
                <input
                  type="text"
                  name="specialty"
                  placeholder="Specialty"
                  value={formData.specialty}
                  readOnly
                  className="w-full border rounded-xl p-3 bg-gray-100"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    name="date"
                    min={todayStr}
                    max={maxDateStr}
                    value={formData.date}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={inputClass("date")}
                  />
                  <ErrorText field="date" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    name="time"
                    min={OPEN_TIME}
                    max={CLOSE_TIME}
                    value={formData.time}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={inputClass("time")}
                  />
                  <ErrorText field="time" />
                </div>
              </div>

              <p className="text-xs text-gray-500 -mt-2">
                Clinic hours: {formatTime(OPEN_TIME)} – {formatTime(CLOSE_TIME)}
                . You can book up to {MAX_DAYS_AHEAD} days ahead.
              </p>

              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">
                  Reason for Appointment
                </label>
                <textarea
                  rows="5"
                  name="reason"
                  maxLength={500}
                  placeholder="Describe your symptoms or reason for appointment..."
                  value={formData.reason}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={inputClass("reason")}
                />
                <div className="flex justify-between">
                  <ErrorText field="reason" />
                  <p className="text-xs text-gray-400 ml-auto mt-1">
                    {formData.reason.length}/500
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !token}
                className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold transition"
              >
                {submitting ? "Booking..." : "Book Appointment"}
              </button>
            </form>
          </div>

          {/* Appointments (3 sections) */}
          <div className="bg-white rounded-3xl shadow-xl p-8">
            <h2 className="text-2xl font-bold mb-6">My Appointments</h2>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                    activeTab === tab.key
                      ? tab.active
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>

            {/* List */}
            <div className="space-y-5">
              {loading && (
                <p className="text-gray-500 text-center py-10">
                  Loading appointments...
                </p>
              )}

              {!loading && grouped[activeTab].length === 0 && (
                <div className="text-center text-gray-500 py-10 border border-dashed rounded-2xl">
                  {emptyMessages[activeTab]}
                </div>
              )}

              {!loading &&
                grouped[activeTab].map((appointment) => {
                  const badge = getBadge(appointment, activeTab);

                  return (
                    <div
                      key={appointment._id}
                      className="border rounded-2xl p-5 hover:shadow-lg transition"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-bold text-lg">
                            {appointment.doctorName}
                          </h3>
                          <p className="text-gray-500">
                            {appointment.specialty}
                          </p>
                        </div>

                        <span
                          className={`px-4 py-2 rounded-full text-sm font-semibold ${badge.cls}`}
                        >
                          {badge.text}
                        </span>
                      </div>

                      <div className="mt-4 text-gray-600 space-y-1">
                        <p>
                          <strong>Patient:</strong> {appointment.patientName}
                        </p>
                        <p>
                          📅 <strong>{formatDate(appointment.date)}</strong>
                        </p>
                        <p>
                          🕒 <strong>{formatTime(appointment.time)}</strong>
                        </p>
                        {appointment.reason && (
                          <p className="text-sm text-gray-500">
                            <strong>Reason:</strong> {appointment.reason}
                          </p>
                        )}
                      </div>

                      {appointment.cancelReason && (
                        <p className="mt-2 text-sm text-red-600">
                          <strong>Cancel reason:</strong>{" "}
                          {appointment.cancelReason}
                        </p>
                      )}

                      {activeTab === "cancelled" && badge.text === "Missed" && (
                        <p className="mt-3 text-sm text-orange-600">
                          The appointment date passed and you did not meet the
                          doctor.
                        </p>
                      )}

                      {activeTab === "upcoming" &&
                        (getAppointmentDateTime(appointment) - now >=
                        MIN_CANCEL_HOURS * 60 * 60 * 1000 ? (
                          <button
                            type="button"
                            onClick={() => handleCancel(appointment)}
                            disabled={cancellingId === appointment._id}
                            className="mt-4 px-4 py-2 rounded-xl border border-red-500 text-red-600 hover:bg-red-50 text-sm font-semibold transition disabled:opacity-50"
                          >
                            {cancellingId === appointment._id
                              ? "Cancelling..."
                              : "Cancel Appointment"}
                          </button>
                        ) : (
                          <p className="mt-4 text-sm text-gray-500">
                            Appointments cannot be cancelled within{" "}
                            {MIN_CANCEL_HOURS} hours of the start time.
                          </p>
                        ))}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Appointments;

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Activity,
  AlertCircle,
  ArrowDownUp,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  FileText,
  Filter,
  History,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldAlert,
  Stethoscope,
  UserRound,
  X,
  XCircle,
} from "lucide-react";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

const ADMIN_API = `${API_URL}/api/v1/admin`;
const PAGE_SIZE = 10;

const STATUSES = ["All", "Pending", "Confirmed", "Completed", "Cancelled"];

const getToken = () =>
  localStorage.getItem("token") || localStorage.getItem("accessToken") || "";

const authConfig = () => ({
  headers: {
    Authorization: `Bearer ${getToken()}`,
    "Content-Type": "application/json",
  },
});

const getId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value._id || value.id || "";
};

const getName = (value, fallback = "Not available") => {
  if (!value) return fallback;
  if (typeof value === "string") return value;
  return (
    value.name ||
    value.fullName ||
    value.user?.name ||
    value.userId?.name ||
    fallback
  );
};

const getAppointmentDate = (appointment) =>
  appointment?.date ||
  appointment?.appointmentDate ||
  appointment?.scheduledAt ||
  "";

const getAppointmentTime = (appointment) =>
  appointment?.time || appointment?.appointmentTime || "";

const getStatus = (appointment) =>
  String(appointment?.status || "Pending").toLowerCase();

const capitalize = (value = "") =>
  value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();

const formatDate = (value) => {
  if (!value) return "Not scheduled";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (value) => {
  if (!value) return "Date not recorded";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statusStyles = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  confirmed: "bg-blue-50 text-blue-700 ring-blue-200",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
  default: "bg-slate-100 text-slate-600 ring-slate-200",
};

function StatusBadge({ status }) {
  const normalized = String(status || "pending").toLowerCase();

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
        statusStyles[normalized] || statusStyles.default
      }`}
    >
      {capitalize(normalized)}
    </span>
  );
}

function StatCard({ label, value, icon: Icon, color, loading }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          {loading ? (
            <div className="mt-3 h-8 w-16 animate-pulse rounded bg-slate-100" />
          ) : (
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              {value}
            </p>
          )}
        </div>

        <div className={`rounded-xl p-3 ${color}`}>
          <Icon size={21} />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="px-5 py-16 text-center">
      <CalendarDays className="mx-auto text-slate-300" size={42} />
      <h3 className="mt-4 font-semibold text-slate-800">
        No appointments found
      </h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{message}</p>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="border-b border-slate-100 py-3 last:border-0">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium text-slate-800">
        {value || "Not available"}
      </p>
    </div>
  );
}

function AppointmentOverview() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [doctorFilter, setDoctorFilter] = useState("All");
  const [patientFilter, setPatientFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortNewest, setSortNewest] = useState(true);
  const [page, setPage] = useState(1);

  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const [actionType, setActionType] = useState("");
  const [actionReason, setActionReason] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const fetchAppointments = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      // Expected response: { success: true, data: [...] }
      const response = await axios.get(
        `${ADMIN_API}/appointments`,
        authConfig(),
      );

      const payload = response.data;
      const rows = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.appointments)
            ? payload.appointments
            : Array.isArray(payload?.data?.appointments)
              ? payload.data.appointments
              : [];

      setAppointments(rows);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load appointments. Please check your connection and admin API.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const doctorOptions = useMemo(() => {
    const map = new Map();

    appointments.forEach((appointment) => {
      const doctor = appointment.doctor || appointment.doctorId;
      const id = getId(doctor);
      if (id) map.set(id, getName(doctor, "Unknown doctor"));
    });

    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [appointments]);

  const patientOptions = useMemo(() => {
    const map = new Map();

    appointments.forEach((appointment) => {
      const patient = appointment.patient || appointment.patientId;
      const id = getId(patient);
      if (id) map.set(id, getName(patient, "Unknown patient"));
    });

    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [appointments]);

  const stats = useMemo(() => {
    const counts = {
      total: appointments.length,
      pending: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
    };

    appointments.forEach((appointment) => {
      const status = getStatus(appointment);
      if (Object.prototype.hasOwnProperty.call(counts, status)) {
        counts[status] += 1;
      }
    });

    return counts;
  }, [appointments]);

  const filteredAppointments = useMemo(() => {
    const query = search.trim().toLowerCase();

    const result = appointments.filter((appointment) => {
      const doctor = appointment.doctor || appointment.doctorId;
      const patient = appointment.patient || appointment.patientId;
      const doctorId = getId(doctor);
      const patientId = getId(patient);
      const date = getAppointmentDate(appointment);
      const status = getStatus(appointment);

      const searchText = [
        getId(appointment),
        appointment.bookingId,
        appointment.reason,
        appointment.notes,
        getName(doctor, ""),
        getName(patient, ""),
        doctor?.email,
        patient?.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !query || searchText.includes(query);
      const matchesStatus =
        statusFilter === "All" || status === statusFilter.toLowerCase();
      const matchesDoctor = doctorFilter === "All" || doctorId === doctorFilter;
      const matchesPatient =
        patientFilter === "All" || patientId === patientFilter;

      const dateKey = date ? String(date).slice(0, 10) : "";

      const matchesFrom = !dateFrom || (dateKey && dateKey >= dateFrom);
      const matchesTo = !dateTo || (dateKey && dateKey <= dateTo);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesDoctor &&
        matchesPatient &&
        matchesFrom &&
        matchesTo
      );
    });

    result.sort((a, b) => {
      const dateA = new Date(getAppointmentDate(a) || 0).getTime();
      const dateB = new Date(getAppointmentDate(b) || 0).getTime();
      return sortNewest ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [
    appointments,
    search,
    statusFilter,
    doctorFilter,
    patientFilter,
    dateFrom,
    dateTo,
    sortNewest,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAppointments.length / PAGE_SIZE),
  );

  const visibleAppointments = filteredAppointments.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, doctorFilter, patientFilter, dateFrom, dateTo]);

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("All");
    setDoctorFilter("All");
    setPatientFilter("All");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const openDetails = async (appointment) => {
    setSelectedAppointment(appointment);
    setDetailError("");
    setDetailLoading(true);
    setSuccessMessage("");

    try {
      // Expected response: { success: true, data: appointment }
      const response = await axios.get(
        `${ADMIN_API}/appointments/${getId(appointment)}`,
        authConfig(),
      );

      const payload = response.data;
      const detail =
        payload?.data?.appointment ||
        payload?.data ||
        payload?.appointment ||
        payload;

      if (detail && typeof detail === "object") {
        setSelectedAppointment(detail);
      }
    } catch (err) {
      // Keep the row data visible if the detail endpoint is not available.
      setDetailError(
        err.response?.data?.message ||
          "Could not load full appointment history. Showing available details.",
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetails = () => {
    if (actionLoading) return;
    setSelectedAppointment(null);
    setActionType("");
    setActionReason("");
    setActionError("");
    setDetailError("");
  };

  const startAction = (type) => {
    setActionType(type);
    setActionReason("");
    setActionError("");
    setSuccessMessage("");
  };

  const submitAdminAction = async (event) => {
    event.preventDefault();

    if (!selectedAppointment) return;

    const reason = actionReason.trim();

    if (reason.length < 10) {
      setActionError(
        "Please provide a clear reason of at least 10 characters.",
      );
      return;
    }

    if (reason.length > 500) {
      setActionError("The reason must not exceed 500 characters.");
      return;
    }

    const appointmentId = getId(selectedAppointment);
    setActionLoading(true);
    setActionError("");

    try {
      // The backend must validate the action, write audit history,
      // and notify both the patient and doctor.
      const response = await axios.patch(
        `${ADMIN_API}/appointments/${appointmentId}/oversight`,
        {
          action: actionType,
          reason,
        },
        authConfig(),
      );

      const payload = response.data;
      const updated =
        payload?.data?.appointment || payload?.data || payload?.appointment;

      if (updated && typeof updated === "object") {
        setSelectedAppointment(updated);
        setAppointments((current) =>
          current.map((item) =>
            getId(item) === appointmentId ? updated : item,
          ),
        );
      } else {
        await fetchAppointments(true);
      }

      setSuccessMessage(
        actionType === "cancel"
          ? "Appointment cancelled. Notifications and audit logging were requested from the server."
          : "Conflict resolution recorded. Please review the updated appointment.",
      );

      setActionType("");
      setActionReason("");

      // Refresh the detail so its history reflects server-persisted changes.
      try {
        const detailResponse = await axios.get(
          `${ADMIN_API}/appointments/${appointmentId}`,
          authConfig(),
        );
        const detailPayload = detailResponse.data;
        const detail =
          detailPayload?.data?.appointment ||
          detailPayload?.data ||
          detailPayload?.appointment ||
          detailPayload;

        if (detail && typeof detail === "object") {
          setSelectedAppointment(detail);
          setAppointments((current) =>
            current.map((item) =>
              getId(item) === appointmentId ? detail : item,
            ),
          );
        }
      } catch {
        // The action response remains available if detail refresh fails.
      }
    } catch (err) {
      setActionError(
        err.response?.data?.message ||
          "The action could not be completed. No success has been assumed.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const canAdminCancel = (appointment) =>
    !["cancelled", "completed"].includes(getStatus(appointment));

  const canResolveConflict = (appointment) =>
    !["cancelled", "completed"].includes(getStatus(appointment));

  const currentHistory =
    selectedAppointment?.statusHistory ||
    selectedAppointment?.history ||
    selectedAppointment?.auditHistory ||
    [];

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        {/* Page header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-teal-700">
              <ShieldAlert size={17} />
              Admin control center
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Appointment Oversight
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Monitor bookings, investigate scheduling issues, and record
              justified administrative interventions.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchAppointments(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Server messages */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
          >
            <AlertCircle className="mt-0.5 shrink-0" size={19} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Could not load appointments</p>
              <p className="mt-1">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => fetchAppointments(true)}
              className="shrink-0 font-semibold underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Total appointments"
            value={stats.total}
            icon={CalendarDays}
            color="bg-slate-100 text-slate-700"
            loading={loading}
          />
          <StatCard
            label="Pending"
            value={stats.pending}
            icon={Clock3}
            color="bg-amber-50 text-amber-700"
            loading={loading}
          />
          <StatCard
            label="Confirmed"
            value={stats.confirmed}
            icon={CheckCircle2}
            color="bg-blue-50 text-blue-700"
            loading={loading}
          />
          <StatCard
            label="Completed"
            value={stats.completed}
            icon={Activity}
            color="bg-emerald-50 text-emerald-700"
            loading={loading}
          />
          <StatCard
            label="Cancelled"
            value={stats.cancelled}
            icon={XCircle}
            color="bg-rose-50 text-rose-700"
            loading={loading}
          />
        </div>

        {/* Filters */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-teal-700" />
              <h2 className="font-semibold text-slate-900">
                Search and filters
              </h2>
            </div>

            <button
              type="button"
              onClick={resetFilters}
              className="text-sm font-semibold text-teal-700 hover:text-teal-800"
            >
              Clear all
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="relative sm:col-span-2 xl:col-span-1">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search patient, doctor, ID..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              aria-label="Filter by status"
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status === "All" ? "All statuses" : status}
                </option>
              ))}
            </select>

            <select
              value={doctorFilter}
              onChange={(event) => setDoctorFilter(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              aria-label="Filter by doctor"
            >
              <option value="All">All doctors</option>
              {doctorOptions.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>

            <select
              value={patientFilter}
              onChange={(event) => setPatientFilter(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              aria-label="Filter by patient"
            >
              <option value="All">All patients</option>
              {patientOptions.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">
                From date
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">
                To date
              </label>
              <input
                type="date"
                min={dateFrom || undefined}
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
            </div>
          </div>
        </section>

        {/* Appointment table */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">All appointments</h2>
              <p className="mt-1 text-xs text-slate-500">
                {filteredAppointments.length} result
                {filteredAppointments.length !== 1 ? "s" : ""} found
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSortNewest((value) => !value)}
              className="inline-flex items-center gap-2 self-start rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 sm:self-auto"
            >
              <ArrowDownUp size={14} />
              {sortNewest ? "Newest date first" : "Oldest date first"}
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 px-5 py-20 text-sm text-slate-500">
              <LoaderCircle size={20} className="animate-spin text-teal-600" />
              Loading appointments...
            </div>
          ) : visibleAppointments.length === 0 ? (
            <EmptyState message="Try changing your search terms or filters. New bookings will appear here when available." />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] text-left">
                  <thead className="bg-slate-50">
                    <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-4">Appointment</th>
                      <th className="px-5 py-4">Patient</th>
                      <th className="px-5 py-4">Doctor</th>
                      <th className="px-5 py-4">Schedule</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4 text-right">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {visibleAppointments.map((appointment) => {
                      const id = getId(appointment);
                      const doctor = appointment.doctor || appointment.doctorId;
                      const patient =
                        appointment.patient || appointment.patientId;

                      return (
                        <tr
                          key={id}
                          className="transition hover:bg-slate-50/80"
                        >
                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-800">
                              #{id ? id.slice(-8).toUpperCase() : "N/A"}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              {appointment.bookingId || "Booking record"}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-700">
                                <UserRound size={17} />
                              </div>
                              <div>
                                <p className="font-medium text-slate-800">
                                  {getName(patient)}
                                </p>
                                <p className="mt-1 max-w-48 truncate text-xs text-slate-400">
                                  {patient?.email || ""}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700">
                                <Stethoscope size={17} />
                              </div>
                              <div>
                                <p className="font-medium text-slate-800">
                                  {getName(doctor)}
                                </p>
                                <p className="mt-1 text-xs text-slate-400">
                                  {doctor?.specialty ||
                                    doctor?.specialization ||
                                    ""}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-sm font-medium text-slate-800">
                              {formatDate(getAppointmentDate(appointment))}
                            </p>
                            <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                              <Clock3 size={13} />
                              {getAppointmentTime(appointment) ||
                                "Time not set"}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <StatusBadge status={getStatus(appointment)} />
                          </td>

                          <td className="px-5 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => openDetails(appointment)}
                              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800"
                            >
                              <Eye size={15} />
                              Details
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">
                  Showing{" "}
                  {filteredAppointments.length === 0
                    ? 0
                    : (page - 1) * PAGE_SIZE + 1}
                  {"–"}
                  {Math.min(
                    page * PAGE_SIZE,
                    filteredAppointments.length,
                  )} of {filteredAppointments.length}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((value) => value - 1)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft size={15} />
                    Previous
                  </button>

                  <span className="min-w-20 text-center text-xs font-medium text-slate-600">
                    Page {page} of {totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((value) => value + 1)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        <p className="flex items-start gap-2 text-xs leading-5 text-slate-500">
          <ShieldAlert size={15} className="mt-0.5 shrink-0" />
          Administrative actions are restricted to cancellation and documented
          conflict resolution. Doctors remain responsible for confirming and
          completing visits.
        </p>
      </div>

      {/* Appointment detail drawer */}
      {selectedAppointment && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            aria-label="Close appointment details"
            onClick={closeDetails}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"
          />

          <aside className="relative flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">
                  Appointment record
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  Appointment details
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  ID: {getId(selectedAppointment) || "Not available"}
                </p>
              </div>

              <button
                type="button"
                onClick={closeDetails}
                disabled={actionLoading}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                aria-label="Close details"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-7">
              {detailLoading && (
                <p className="flex items-center gap-2 text-sm text-slate-500">
                  <LoaderCircle size={16} className="animate-spin" />
                  Loading full details...
                </p>
              )}

              {detailError && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  {detailError}
                </div>
              )}

              {successMessage && (
                <div
                  role="status"
                  className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
                >
                  {successMessage}
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500">Current status</p>
                    <div className="mt-2">
                      <StatusBadge status={getStatus(selectedAppointment)} />
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-slate-500">Scheduled date</p>
                    <p className="mt-1 font-semibold text-slate-800">
                      {formatDate(getAppointmentDate(selectedAppointment))}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {getAppointmentTime(selectedAppointment) ||
                        "Time not set"}
                    </p>
                  </div>
                </div>
              </div>

              <section>
                <h3 className="mb-2 flex items-center gap-2 font-semibold text-slate-900">
                  <UserRound size={17} className="text-teal-700" />
                  Patient information
                </h3>
                <div className="rounded-xl border border-slate-200 px-4">
                  <DetailRow
                    label="Patient name"
                    value={getName(
                      selectedAppointment.patient ||
                        selectedAppointment.patientId,
                    )}
                  />
                  <DetailRow
                    label="Patient email"
                    value={
                      (
                        selectedAppointment.patient ||
                        selectedAppointment.patientId
                      )?.email
                    }
                  />
                  <DetailRow
                    label="Patient phone"
                    value={
                      (
                        selectedAppointment.patient ||
                        selectedAppointment.patientId
                      )?.phone
                    }
                  />
                </div>
              </section>

              <section>
                <h3 className="mb-2 flex items-center gap-2 font-semibold text-slate-900">
                  <Stethoscope size={17} className="text-teal-700" />
                  Doctor information
                </h3>
                <div className="rounded-xl border border-slate-200 px-4">
                  <DetailRow
                    label="Doctor name"
                    value={getName(
                      selectedAppointment.doctor ||
                        selectedAppointment.doctorId,
                    )}
                  />
                  <DetailRow
                    label="Specialty"
                    value={
                      (
                        selectedAppointment.doctor ||
                        selectedAppointment.doctorId
                      )?.specialty ||
                      (
                        selectedAppointment.doctor ||
                        selectedAppointment.doctorId
                      )?.specialization
                    }
                  />
                  <DetailRow
                    label="Doctor email"
                    value={
                      (
                        selectedAppointment.doctor ||
                        selectedAppointment.doctorId
                      )?.email
                    }
                  />
                </div>
              </section>

              <section>
                <h3 className="mb-2 flex items-center gap-2 font-semibold text-slate-900">
                  <FileText size={17} className="text-teal-700" />
                  Booking information
                </h3>
                <div className="rounded-xl border border-slate-200 px-4">
                  <DetailRow
                    label="Reason for appointment"
                    value={
                      selectedAppointment.reason || selectedAppointment.notes
                    }
                  />
                  <DetailRow
                    label="Created at"
                    value={formatDateTime(selectedAppointment.createdAt)}
                  />
                  <DetailRow
                    label="Last updated"
                    value={formatDateTime(selectedAppointment.updatedAt)}
                  />
                </div>
              </section>

              {/* Status history / audit timeline */}
              <section>
                <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
                  <History size={17} className="text-teal-700" />
                  Status history & audit trail
                </h3>

                {currentHistory.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center">
                    <History size={24} className="mx-auto text-slate-300" />
                    <p className="mt-2 text-sm font-medium text-slate-700">
                      No recorded history
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      The backend should save each status change, the actor,
                      timestamp, action, and reason.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-0">
                    {currentHistory.map((entry, index) => (
                      <div
                        key={entry._id || `${entry.createdAt}-${index}`}
                        className="relative flex gap-3 pb-5 last:pb-0"
                      >
                        {index !== currentHistory.length - 1 && (
                          <div className="absolute bottom-0 left-[9px] top-5 w-px bg-slate-200" />
                        )}

                        <div className="relative z-10 mt-1 h-[19px] w-[19px] shrink-0 rounded-full border-4 border-teal-100 bg-teal-600" />

                        <div className="min-w-0 flex-1 rounded-xl border border-slate-200 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-800">
                              {entry.action || entry.event || "Status updated"}
                            </p>
                            <span className="text-xs text-slate-400">
                              {formatDateTime(
                                entry.createdAt ||
                                  entry.timestamp ||
                                  entry.changedAt,
                              )}
                            </span>
                          </div>

                          {(entry.fromStatus || entry.toStatus) && (
                            <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                              {entry.fromStatus && (
                                <StatusBadge status={entry.fromStatus} />
                              )}
                              {entry.fromStatus && entry.toStatus && (
                                <span>to</span>
                              )}
                              {entry.toStatus && (
                                <StatusBadge status={entry.toStatus} />
                              )}
                            </p>
                          )}

                          {entry.reason && (
                            <p className="mt-2 text-sm leading-5 text-slate-600">
                              <span className="font-medium text-slate-700">
                                Reason:{" "}
                              </span>
                              {entry.reason}
                            </p>
                          )}

                          <p className="mt-2 text-xs text-slate-400">
                            Performed by:{" "}
                            {getName(
                              entry.performedBy || entry.actor,
                              entry.performedByRole ||
                                entry.actorRole ||
                                "System",
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Admin action panel */}
              <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                <h3 className="flex items-center gap-2 font-semibold text-slate-900">
                  <ShieldAlert size={18} className="text-amber-700" />
                  Administrative intervention
                </h3>

                <p className="mt-1 text-sm leading-5 text-slate-600">
                  A reason is required for every intervention. The server should
                  record the action and notify both parties.
                </p>

                {["cancelled", "completed"].includes(
                  getStatus(selectedAppointment),
                ) ? (
                  <p className="mt-4 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-600">
                    This appointment is {getStatus(selectedAppointment)}.
                    Administrative cancellation and conflict actions are
                    unavailable.
                  </p>
                ) : (
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => startAction("cancel")}
                      disabled={actionLoading}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
                    >
                      <XCircle size={17} />
                      Cancel appointment
                    </button>

                    <button
                      type="button"
                      onClick={() => startAction("resolve_conflict")}
                      disabled={actionLoading}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-50"
                    >
                      <CheckCircle2 size={17} />
                      Resolve conflict
                    </button>
                  </div>
                )}

                {actionType && (
                  <form
                    onSubmit={submitAdminAction}
                    className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {actionType === "cancel"
                            ? "Confirm appointment cancellation"
                            : "Record conflict resolution"}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {actionType === "cancel"
                            ? "This will cancel the appointment if the server validates the request."
                            : "Describe the scheduling conflict and how it was resolved. The backend must enforce any allowed schedule changes."}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setActionType("");
                          setActionReason("");
                          setActionError("");
                        }}
                        disabled={actionLoading}
                        className="rounded-md p-1 text-slate-400 hover:bg-slate-100"
                        aria-label="Close action form"
                      >
                        <X size={17} />
                      </button>
                    </div>

                    <label
                      htmlFor="admin-action-reason"
                      className="block text-sm font-medium text-slate-700"
                    >
                      Required reason
                    </label>

                    <textarea
                      id="admin-action-reason"
                      value={actionReason}
                      onChange={(event) => setActionReason(event.target.value)}
                      rows={4}
                      maxLength={500}
                      minLength={10}
                      required
                      placeholder={
                        actionType === "cancel"
                          ? "Explain why this appointment must be cancelled..."
                          : "Describe the scheduling conflict and the resolution..."
                      }
                      className="w-full resize-y rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                    />

                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-slate-400">
                        {actionReason.trim().length}/500 characters
                      </p>
                      <p className="text-xs text-slate-500">
                        Minimum 10 characters
                      </p>
                    </div>

                    {actionError && (
                      <p role="alert" className="text-sm text-rose-600">
                        {actionError}
                      </p>
                    )}

                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setActionType("");
                          setActionReason("");
                          setActionError("");
                        }}
                        disabled={actionLoading}
                        className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Go back
                      </button>

                      <button
                        type="submit"
                        disabled={
                          actionLoading || actionReason.trim().length < 10
                        }
                        className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${
                          actionType === "cancel"
                            ? "bg-rose-600 hover:bg-rose-700"
                            : "bg-teal-700 hover:bg-teal-800"
                        }`}
                      >
                        {actionLoading && (
                          <LoaderCircle size={16} className="animate-spin" />
                        )}
                        {actionLoading
                          ? "Processing..."
                          : actionType === "cancel"
                            ? "Confirm cancellation"
                            : "Submit resolution"}
                      </button>
                    </div>
                  </form>
                )}
              </section>

              <p className="flex items-start gap-2 text-xs leading-5 text-slate-500">
                <ShieldAlert size={15} className="mt-0.5 shrink-0" />
                Admins cannot confirm appointments or mark visits completed.
                Those status changes remain under doctor permissions.
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

export default AppointmentOverview;

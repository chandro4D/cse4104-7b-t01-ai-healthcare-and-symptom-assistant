import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  AlertCircle,
  ArrowDownUp,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronRight as Chevron,
  Clock3,
  FileText,
  History,
  Mail,
  Phone,
  RefreshCw,
  Search,
  SearchX,
  ShieldAlert,
  Stethoscope,
  UserRound,
  X,
  XCircle,
  Hash,
  Info,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");
const ADMIN_API = `${API_URL}/api/v1/admin`;
const PAGE_SIZE = 10;
const STATUSES = ["All", "Pending", "Confirmed", "Completed", "Cancelled"];

const STATUS_STYLES = {
  pending: {
    pill: "bg-amber-50 text-amber-700 ring-amber-600/20",
    dot: "bg-amber-500",
    bar: "bg-amber-400",
  },
  confirmed: {
    pill: "bg-sky-50 text-sky-700 ring-sky-600/20",
    dot: "bg-sky-500",
    bar: "bg-sky-500",
  },
  completed: {
    pill: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
  },
  cancelled: {
    pill: "bg-rose-50 text-rose-700 ring-rose-600/20",
    dot: "bg-rose-500",
    bar: "bg-rose-400",
  },
  default: {
    pill: "bg-slate-100 text-slate-600 ring-slate-500/20",
    dot: "bg-slate-400",
    bar: "bg-slate-300",
  },
};

const field =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

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

const getDoctor = (a) => a?.doctor || a?.doctorId;
const getPatient = (a) => a?.patient || a?.patientId;
const getAppointmentDate = (a) =>
  a?.date || a?.appointmentDate || a?.scheduledAt || "";
const getAppointmentTime = (a) => a?.time || a?.appointmentTime || "";
const getStatus = (a) => String(a?.status || "Pending").toLowerCase();
const capitalize = (v = "") =>
  v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();

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
  if (!value) return "Not recorded";
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

const initialsOf = (name) =>
  String(name || "")
    .replace(/^dr\.?\s+/i, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase();

const extractList = (payload) =>
  Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.appointments)
        ? payload.appointments
        : Array.isArray(payload?.data?.appointments)
          ? payload.data.appointments
          : [];

const extractOne = (payload) =>
  payload?.data?.appointment ||
  payload?.data ||
  payload?.appointment ||
  payload;

function pageWindow(current, total) {
  const span = 5;
  let start = Math.max(1, current - Math.floor(span / 2));
  const end = Math.min(total, start + span - 1);
  start = Math.max(1, end - span + 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/* ------------------------------------------------------------------ */
/*  Building blocks                                                    */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }) {
  const key = String(status || "pending").toLowerCase();
  const s = STATUS_STYLES[key] || STATUS_STYLES.default;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${s.pill}`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${s.dot}`}
      />
      {capitalize(key)}
    </span>
  );
}

function PersonAvatar({ name, kind }) {
  const tone =
    kind === "doctor"
      ? "bg-violet-100 text-violet-800"
      : "bg-sky-100 text-sky-800";
  const Icon = kind === "doctor" ? Stethoscope : UserRound;
  const text = initialsOf(name === "Not available" ? "" : name);
  return (
    <div
      aria-hidden="true"
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${tone}`}
    >
      {text || <Icon size={16} />}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, mono = false }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <Icon
        size={16}
        className="mt-0.5 shrink-0 text-slate-400"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500">{label}</p>
        <p
          className={`mt-0.5 break-words text-sm text-slate-900 ${mono ? "font-mono text-[13px]" : "font-medium"}`}
        >
          {value || (
            <span className="font-normal text-slate-400">Not available</span>
          )}
        </p>
      </div>
    </div>
  );
}

function SummaryStrip({ stats, loading }) {
  const items = [
    {
      key: "total",
      label: "Total appointments",
      value: stats.total,
      icon: CalendarDays,
    },
    { key: "pending", label: "Pending", value: stats.pending, icon: Clock3 },
    {
      key: "confirmed",
      label: "Confirmed",
      value: stats.confirmed,
      icon: CheckCircle2,
    },
    {
      key: "completed",
      label: "Completed",
      value: stats.completed,
      icon: CheckCircle2,
    },
    {
      key: "cancelled",
      label: "Cancelled",
      value: stats.cancelled,
      icon: XCircle,
    },
  ];
  const order = ["pending", "confirmed", "completed", "cancelled"];

  return (
    <section
      aria-label="Appointment summary"
      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
    >
      <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 lg:divide-x lg:divide-slate-200 [&>*]:border-slate-200 max-lg:[&>*]:border-b">
        {items.map(({ key, label, value, icon: Icon }) => (
          <div key={key} className="flex items-center gap-3 px-5 py-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <Icon size={18} aria-hidden="true" />
            </span>
            <div>
              <dt className="text-xs text-slate-500">{label}</dt>
              <dd className="text-xl font-semibold tabular-nums text-slate-900">
                {loading ? (
                  <span className="inline-block h-6 w-8 animate-pulse rounded bg-slate-100" />
                ) : (
                  value
                )}
              </dd>
            </div>
          </div>
        ))}
      </dl>

      <div className="border-t border-slate-200 bg-slate-50/60 px-5 py-3">
        <div
          className="flex h-2 w-full overflow-hidden rounded-full bg-slate-200"
          role="img"
          aria-label={`Status breakdown: ${stats.pending} pending, ${stats.confirmed} confirmed, ${stats.completed} completed, ${stats.cancelled} cancelled`}
        >
          {stats.total > 0 &&
            order.map((k) => (
              <div
                key={k}
                className={`${STATUS_STYLES[k].bar} transition-all`}
                style={{ width: `${(stats[k] / stats.total) * 100}%` }}
              />
            ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
          {order.map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${STATUS_STYLES[k].bar}`}
                aria-hidden="true"
              />
              {capitalize(k)}
              <span className="font-medium tabular-nums text-slate-700">
                {stats.total ? Math.round((stats[k] / stats.total) * 100) : 0}%
              </span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

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

  const detailRequest = useRef(0); // ignores late responses after the drawer closes

  /* ---------- data ---------- */

  const fetchAppointments = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const response = await axios.get(
        `${ADMIN_API}/appointments`,
        authConfig(),
      );
      setAppointments(extractList(response.data));
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

  /* ---------- derived ---------- */

  const doctorOptions = useMemo(() => {
    const map = new Map();
    appointments.forEach((a) => {
      const d = getDoctor(a);
      const id = getId(d);
      if (id) map.set(id, getName(d, "Unknown doctor"));
    });
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [appointments]);

  const patientOptions = useMemo(() => {
    const map = new Map();
    appointments.forEach((a) => {
      const p = getPatient(a);
      const id = getId(p);
      if (id) map.set(id, getName(p, "Unknown patient"));
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
    appointments.forEach((a) => {
      const s = getStatus(a);
      if (Object.prototype.hasOwnProperty.call(counts, s)) counts[s] += 1;
    });
    return counts;
  }, [appointments]);

  const filteredAppointments = useMemo(() => {
    const query = search.trim().toLowerCase();

    const result = appointments.filter((a) => {
      const doctor = getDoctor(a);
      const patient = getPatient(a);
      const dateKey = getAppointmentDate(a)
        ? String(getAppointmentDate(a)).slice(0, 10)
        : "";

      const text = [
        getId(a),
        a.bookingId,
        a.reason,
        a.notes,
        getName(doctor, ""),
        getName(patient, ""),
        doctor?.email,
        patient?.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (!query || text.includes(query)) &&
        (statusFilter === "All" ||
          getStatus(a) === statusFilter.toLowerCase()) &&
        (doctorFilter === "All" || getId(doctor) === doctorFilter) &&
        (patientFilter === "All" || getId(patient) === patientFilter) &&
        (!dateFrom || (dateKey && dateKey >= dateFrom)) &&
        (!dateTo || (dateKey && dateKey <= dateTo))
      );
    });

    result.sort((a, b) => {
      const da = new Date(getAppointmentDate(a) || 0).getTime();
      const db = new Date(getAppointmentDate(b) || 0).getTime();
      return sortNewest ? db - da : da - db;
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

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, doctorFilter, patientFilter, dateFrom, dateTo]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAppointments.length / PAGE_SIZE),
  );
  const currentPage = Math.min(page, totalPages);
  const visibleAppointments = filteredAppointments.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const rangeStart = filteredAppointments.length
    ? (currentPage - 1) * PAGE_SIZE + 1
    : 0;
  const rangeEnd = Math.min(
    currentPage * PAGE_SIZE,
    filteredAppointments.length,
  );

  const hasFilters =
    search ||
    statusFilter !== "All" ||
    doctorFilter !== "All" ||
    patientFilter !== "All" ||
    dateFrom ||
    dateTo;

  const statusTabs = STATUSES.map((s) => ({
    key: s,
    count: s === "All" ? stats.total : stats[s.toLowerCase()],
  }));

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("All");
    setDoctorFilter("All");
    setPatientFilter("All");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  /* ---------- drawer + actions ---------- */

  const resetActionForm = () => {
    setActionType("");
    setActionReason("");
    setActionError("");
  };

  const openDetails = async (appointment) => {
    const requestId = ++detailRequest.current;
    setSelectedAppointment(appointment);
    setDetailError("");
    setDetailLoading(true);
    setSuccessMessage("");
    resetActionForm();

    try {
      const response = await axios.get(
        `${ADMIN_API}/appointments/${getId(appointment)}`,
        authConfig(),
      );
      if (requestId !== detailRequest.current) return;
      const detail = extractOne(response.data);
      if (detail && typeof detail === "object") setSelectedAppointment(detail);
    } catch (err) {
      if (requestId !== detailRequest.current) return;
      setDetailError(
        err.response?.data?.message ||
          "Could not load the full appointment history. Showing the details we have.",
      );
    } finally {
      if (requestId === detailRequest.current) setDetailLoading(false);
    }
  };

  const closeDetails = useCallback(() => {
    if (actionLoading) return;
    detailRequest.current += 1;
    setSelectedAppointment(null);
    setDetailLoading(false);
    setDetailError("");
    setSuccessMessage("");
    resetActionForm();
  }, [actionLoading]);

  useEffect(() => {
    if (!selectedAppointment) return undefined;
    const onKey = (e) => e.key === "Escape" && closeDetails();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedAppointment, closeDetails]);

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
    if (reason.length < 10)
      return setActionError(
        "Please provide a clear reason of at least 10 characters.",
      );
    if (reason.length > 500)
      return setActionError("The reason must not exceed 500 characters.");

    const appointmentId = getId(selectedAppointment);
    setActionLoading(true);
    setActionError("");

    try {
      // The backend must validate the action, write audit history and notify both parties.
      const response = await axios.patch(
        `${ADMIN_API}/appointments/${appointmentId}/oversight`,
        { action: actionType, reason },
        authConfig(),
      );

      const payload = response.data;
      const updated =
        payload?.data?.appointment || payload?.data || payload?.appointment;

      if (updated && typeof updated === "object") {
        setSelectedAppointment(updated);
        setAppointments((cur) =>
          cur.map((item) => (getId(item) === appointmentId ? updated : item)),
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

      try {
        const detailResponse = await axios.get(
          `${ADMIN_API}/appointments/${appointmentId}`,
          authConfig(),
        );
        const detail = extractOne(detailResponse.data);
        if (detail && typeof detail === "object") {
          setSelectedAppointment(detail);
          setAppointments((cur) =>
            cur.map((item) => (getId(item) === appointmentId ? detail : item)),
          );
        }
      } catch {
        /* The action response stays visible if the detail refresh fails. */
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

  const selStatus = getStatus(selectedAppointment);
  const isClosed = ["cancelled", "completed"].includes(selStatus);
  const selDoctor = getDoctor(selectedAppointment);
  const selPatient = getPatient(selectedAppointment);
  const history =
    selectedAppointment?.statusHistory ||
    selectedAppointment?.history ||
    selectedAppointment?.auditHistory ||
    [];

  /* ---------- render ---------- */

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased">
      <style>{`
        @keyframes ui-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes ui-slide { from { transform: translateX(24px); opacity: 0 } to { transform: none; opacity: 1 } }
        .ui-fade { animation: ui-fade .15s ease-out }
        .ui-slide { animation: ui-slide .2s ease-out }
        @media (prefers-reduced-motion: reduce) { .ui-fade, .ui-slide { animation: none } }
      `}</style>

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-8">
          <div>
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-1 text-xs text-slate-500"
            >
              <span>Admin</span>
              <Chevron size={12} aria-hidden="true" />
              <span className="font-medium text-slate-700">Appointments</span>
            </nav>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
              Appointment oversight
            </h1>
            <p className="mt-0.5 max-w-2xl text-sm text-slate-500">
              Monitor bookings, investigate scheduling issues and record
              justified interventions.
            </p>
          </div>
          <button
            type="button"
            onClick={() => fetchAppointments(true)}
            disabled={loading || refreshing}
            className={`inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60 ${focusRing}`}
          >
            <RefreshCw
              size={15}
              className={refreshing ? "animate-spin" : ""}
              aria-hidden="true"
            />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] space-y-5 px-4 py-6 sm:px-8">
        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          >
            <AlertCircle
              size={18}
              className="mt-0.5 shrink-0"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="font-medium">Could not load appointments</p>
              <p className="mt-0.5 text-rose-700">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => fetchAppointments(true)}
              className={`rounded-md px-2 py-1 font-semibold hover:underline ${focusRing}`}
            >
              Try again
            </button>
          </div>
        )}

        <SummaryStrip stats={stats} loading={loading} />

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Toolbar */}
          <div className="space-y-4 border-b border-slate-200 p-4 sm:px-5">
            <div
              role="tablist"
              aria-label="Filter by status"
              className="inline-flex w-full overflow-x-auto rounded-lg bg-slate-100 p-1 sm:w-auto"
            >
              {statusTabs.map((t) => {
                const selected = statusFilter === t.key;
                return (
                  <button
                    key={t.key}
                    role="tab"
                    type="button"
                    aria-selected={selected}
                    onClick={() => setStatusFilter(t.key)}
                    className={`flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition ${focusRing} ${
                      selected
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {t.key}
                    <span
                      className={`rounded-full px-1.5 text-xs tabular-nums ${selected ? "bg-slate-100 text-slate-700" : "bg-slate-200/70 text-slate-500"}`}
                    >
                      {t.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(240px,1.4fr)_1fr_1fr_150px_150px]">
              <div className="relative sm:col-span-2 xl:col-span-1">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search patient, doctor or booking ID"
                  aria-label="Search appointments"
                  className={`${field} pl-9`}
                />
              </div>
              <select
                value={doctorFilter}
                onChange={(e) => setDoctorFilter(e.target.value)}
                aria-label="Filter by doctor"
                className={field}
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
                onChange={(e) => setPatientFilter(e.target.value)}
                aria-label="Filter by patient"
                className={field}
              >
                <option value="All">All patients</option>
                {patientOptions.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                aria-label="From date"
                title="From date"
                className={field}
              />
              <input
                type="date"
                min={dateFrom || undefined}
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                aria-label="To date"
                title="To date"
                className={field}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
              <p aria-live="polite">
                <span className="font-medium tabular-nums text-slate-900">
                  {filteredAppointments.length}
                </span>{" "}
                {filteredAppointments.length === 1
                  ? "appointment"
                  : "appointments"}
                {hasFilters && " match your filters"}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSortNewest((v) => !v)}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-medium text-slate-600 hover:bg-slate-100 ${focusRing}`}
                >
                  <ArrowDownUp size={14} aria-hidden="true" />
                  {sortNewest ? "Newest first" : "Oldest first"}
                </button>
                {hasFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className={`rounded-md px-2 py-1 font-medium text-teal-700 hover:bg-teal-50 ${focusRing}`}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Body */}
          {loading ? (
            <div
              className="divide-y divide-slate-100"
              aria-busy="true"
              aria-label="Loading appointments"
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
                  <div className="h-9 w-9 animate-pulse rounded-full bg-slate-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-40 animate-pulse rounded bg-slate-100" />
                    <div className="h-3 w-28 animate-pulse rounded bg-slate-100" />
                  </div>
                  <div className="hidden h-6 w-24 animate-pulse rounded bg-slate-100 sm:block" />
                </div>
              ))}
            </div>
          ) : visibleAppointments.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                {hasFilters ? (
                  <SearchX size={22} />
                ) : (
                  <CalendarDays size={22} />
                )}
              </span>
              <p className="mt-4 text-sm font-semibold text-slate-900">
                {hasFilters
                  ? "No appointments match your filters"
                  : "No appointments yet"}
              </p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                {hasFilters
                  ? "Try different search terms, or clear the filters to see every booking."
                  : "New bookings will appear here as soon as patients make them."}
              </p>
              {hasFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className={`mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 ${focusRing}`}
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left">
                  <thead className="bg-slate-50 text-xs font-medium text-slate-500">
                    <tr className="border-b border-slate-200">
                      <th scope="col" className="px-5 py-3 font-medium">
                        Appointment
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Patient
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Doctor
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Schedule
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Status
                      </th>
                      <th
                        scope="col"
                        className="px-5 py-3 text-right font-medium"
                      >
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleAppointments.map((a) => {
                      const id = getId(a);
                      const doctor = getDoctor(a);
                      const patient = getPatient(a);
                      return (
                        <tr
                          key={id}
                          onClick={() => openDetails(a)}
                          className="cursor-pointer transition-colors hover:bg-slate-50/80"
                        >
                          <td className="px-5 py-3.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDetails(a);
                              }}
                              className={`rounded font-mono text-[13px] font-semibold text-slate-900 hover:text-teal-700 ${focusRing}`}
                            >
                              #{id ? id.slice(-8).toUpperCase() : "N/A"}
                            </button>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {a.bookingId || "Booking record"}
                            </p>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <PersonAvatar
                                name={getName(patient)}
                                kind="patient"
                              />
                              <div className="min-w-0">
                                <p className="max-w-[200px] truncate text-sm font-medium text-slate-900">
                                  {getName(patient)}
                                </p>
                                <p className="max-w-[200px] truncate text-xs text-slate-500">
                                  {patient?.email || ""}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <PersonAvatar
                                name={getName(doctor)}
                                kind="doctor"
                              />
                              <div className="min-w-0">
                                <p className="max-w-[200px] truncate text-sm font-medium text-slate-900">
                                  {getName(doctor)}
                                </p>
                                <p className="max-w-[200px] truncate text-xs text-slate-500">
                                  {doctor?.specialty ||
                                    doctor?.specialization ||
                                    ""}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="text-sm font-medium text-slate-900">
                              {formatDate(getAppointmentDate(a))}
                            </p>
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                              <Clock3 size={12} aria-hidden="true" />
                              {getAppointmentTime(a) || "Time not set"}
                            </p>
                          </td>
                          <td className="px-4 py-3.5">
                            <StatusBadge status={getStatus(a)} />
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDetails(a);
                              }}
                              className={`rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 ${focusRing}`}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <nav
                aria-label="Pagination"
                className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-3.5"
              >
                <p className="text-sm text-slate-500">
                  Showing{" "}
                  <span className="font-medium tabular-nums text-slate-900">
                    {rangeStart}–{rangeEnd}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium tabular-nums text-slate-900">
                    {filteredAppointments.length}
                  </span>
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setPage(currentPage - 1)}
                    aria-label="Previous page"
                    className={`rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {pageWindow(currentPage, totalPages).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPage(n)}
                      aria-current={n === currentPage ? "page" : undefined}
                      className={`h-9 min-w-9 rounded-lg px-2 text-sm font-medium tabular-nums transition ${focusRing} ${
                        n === currentPage
                          ? "bg-teal-700 text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage(currentPage + 1)}
                    aria-label="Next page"
                    className={`rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </nav>
            </>
          )}
        </section>

        <aside className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5">
          <ShieldAlert
            size={18}
            className="mt-0.5 shrink-0 text-slate-500"
            aria-hidden="true"
          />
          <p className="text-sm leading-relaxed text-slate-600">
            <span className="font-medium text-slate-800">
              Admin permissions.
            </span>{" "}
            Administrators can cancel appointments and record conflict
            resolutions. Doctors remain responsible for confirming and
            completing visits.
          </p>
        </aside>
      </main>

      {/* Detail drawer */}
      {selectedAppointment && (
        <div className="ui-fade fixed inset-0 z-50 flex justify-end bg-slate-900/40">
          <button
            type="button"
            aria-label="Close appointment details"
            onClick={closeDetails}
            className="absolute inset-0 cursor-default"
          />

          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="appt-title"
            className="ui-slide relative z-10 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
              <div className="min-w-0">
                <h2
                  id="appt-title"
                  className="text-base font-semibold text-slate-900"
                >
                  Appointment details
                </h2>
                <p className="mt-0.5 truncate font-mono text-xs text-slate-500">
                  {getId(selectedAppointment) || "ID not available"}
                </p>
              </div>
              <button
                type="button"
                onClick={closeDetails}
                disabled={actionLoading}
                aria-label="Close details"
                className={`rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40 ${focusRing}`}
              >
                <X size={18} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto">
              <div className="space-y-3 px-6 pt-5">
                {detailLoading && (
                  <p className="flex items-center gap-2 text-sm text-slate-500">
                    <RefreshCw
                      size={14}
                      className="animate-spin"
                      aria-hidden="true"
                    />{" "}
                    Loading full details…
                  </p>
                )}
                {detailError && (
                  <p className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    <Info
                      size={16}
                      className="mt-0.5 shrink-0"
                      aria-hidden="true"
                    />{" "}
                    {detailError}
                  </p>
                )}
                {successMessage && (
                  <p
                    role="status"
                    className="flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
                  >
                    <CheckCircle2
                      size={16}
                      className="mt-0.5 shrink-0"
                      aria-hidden="true"
                    />{" "}
                    {successMessage}
                  </p>
                )}
              </div>

              {/* Overview */}
              <div className="mx-6 mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <p className="text-xs text-slate-500">Status</p>
                  <div className="mt-1.5">
                    <StatusBadge status={selStatus} />
                  </div>
                </div>
                <div className="sm:text-right">
                  <p className="text-xs text-slate-500">Scheduled for</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formatDate(getAppointmentDate(selectedAppointment))}
                  </p>
                  <p className="text-xs text-slate-500">
                    {getAppointmentTime(selectedAppointment) || "Time not set"}
                  </p>
                </div>
              </div>

              <div className="px-6 pb-6">
                <h3 className="pt-5 text-sm font-semibold text-slate-900">
                  Patient
                </h3>
                <div className="divide-y divide-slate-100">
                  <InfoRow
                    icon={UserRound}
                    label="Name"
                    value={getName(selPatient)}
                  />
                  <InfoRow
                    icon={Mail}
                    label="Email"
                    value={selPatient?.email}
                  />
                  <InfoRow
                    icon={Phone}
                    label="Phone"
                    value={selPatient?.phone}
                  />
                </div>

                <h3 className="pt-5 text-sm font-semibold text-slate-900">
                  Doctor
                </h3>
                <div className="divide-y divide-slate-100">
                  <InfoRow
                    icon={Stethoscope}
                    label="Name"
                    value={getName(selDoctor)}
                  />
                  <InfoRow
                    icon={Stethoscope}
                    label="Specialty"
                    value={selDoctor?.specialty || selDoctor?.specialization}
                  />
                  <InfoRow icon={Mail} label="Email" value={selDoctor?.email} />
                </div>

                <h3 className="pt-5 text-sm font-semibold text-slate-900">
                  Booking
                </h3>
                <div className="divide-y divide-slate-100">
                  <InfoRow
                    icon={FileText}
                    label="Reason for appointment"
                    value={
                      selectedAppointment.reason || selectedAppointment.notes
                    }
                  />
                  <InfoRow
                    icon={CalendarDays}
                    label="Created"
                    value={formatDateTime(selectedAppointment.createdAt)}
                  />
                  <InfoRow
                    icon={Clock3}
                    label="Last updated"
                    value={formatDateTime(selectedAppointment.updatedAt)}
                  />
                  <InfoRow
                    icon={Hash}
                    label="Booking ID"
                    value={selectedAppointment.bookingId}
                    mono
                  />
                </div>

                {/* History */}
                <h3 className="flex items-center gap-2 pb-3 pt-6 text-sm font-semibold text-slate-900">
                  <History
                    size={16}
                    className="text-slate-500"
                    aria-hidden="true"
                  />
                  Status history
                </h3>
                {history.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center">
                    <History
                      size={22}
                      className="mx-auto text-slate-300"
                      aria-hidden="true"
                    />
                    <p className="mt-2 text-sm font-medium text-slate-700">
                      No recorded history
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                      The backend should save each status change with the actor,
                      timestamp, action and reason.
                    </p>
                  </div>
                ) : (
                  <ol className="relative space-y-4 border-l border-slate-200 pl-5">
                    {history.map((entry, index) => (
                      <li
                        key={entry._id || `${entry.createdAt}-${index}`}
                        className="relative"
                      >
                        <span
                          aria-hidden="true"
                          className="absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-teal-600 ring-1 ring-teal-600/30"
                        />
                        <div className="rounded-lg border border-slate-200 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-medium text-slate-900">
                              {entry.action || entry.event || "Status updated"}
                            </p>
                            <time className="text-xs text-slate-500">
                              {formatDateTime(
                                entry.createdAt ||
                                  entry.timestamp ||
                                  entry.changedAt,
                              )}
                            </time>
                          </div>
                          {(entry.fromStatus || entry.toStatus) && (
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              {entry.fromStatus && (
                                <StatusBadge status={entry.fromStatus} />
                              )}
                              {entry.fromStatus && entry.toStatus && (
                                <ChevronRight
                                  size={13}
                                  aria-label="changed to"
                                />
                              )}
                              {entry.toStatus && (
                                <StatusBadge status={entry.toStatus} />
                              )}
                            </div>
                          )}
                          {entry.reason && (
                            <p className="mt-2 text-sm leading-relaxed text-slate-600">
                              <span className="font-medium text-slate-800">
                                Reason:{" "}
                              </span>
                              {entry.reason}
                            </p>
                          )}
                          <p className="mt-2 text-xs text-slate-500">
                            By{" "}
                            {getName(
                              entry.performedBy || entry.actor,
                              entry.performedByRole ||
                                entry.actorRole ||
                                "System",
                            )}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}

                {/* Admin intervention */}
                <h3 className="flex items-center gap-2 pb-3 pt-6 text-sm font-semibold text-slate-900">
                  <ShieldAlert
                    size={16}
                    className="text-slate-500"
                    aria-hidden="true"
                  />
                  Administrative actions
                </h3>

                {isClosed ? (
                  <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                    This appointment is {selStatus}, so cancellation and
                    conflict resolution are unavailable.
                  </p>
                ) : !actionType ? (
                  <div className="space-y-2">
                    <p className="text-sm text-slate-500">
                      Every action needs a written reason. The server records it
                      and notifies both parties.
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => startAction("resolve_conflict")}
                        className={`inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-teal-800 ${focusRing}`}
                      >
                        <CheckCircle2 size={16} aria-hidden="true" /> Resolve
                        conflict
                      </button>
                      <button
                        type="button"
                        onClick={() => startAction("cancel")}
                        className={`inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-4 py-2.5 text-sm font-medium text-rose-700 hover:bg-rose-50 ${focusRing}`}
                      >
                        <XCircle size={16} aria-hidden="true" /> Cancel
                        appointment
                      </button>
                    </div>
                  </div>
                ) : (
                  <form
                    onSubmit={submitAdminAction}
                    className="space-y-3 rounded-xl border border-slate-200 p-4"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {actionType === "cancel"
                          ? "Cancel this appointment"
                          : "Record conflict resolution"}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">
                        {actionType === "cancel"
                          ? "The appointment is cancelled if the server validates the request."
                          : "Describe the scheduling conflict and how it was resolved. The backend enforces any allowed schedule changes."}
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor="admin-action-reason"
                        className="mb-1.5 block text-sm font-medium text-slate-800"
                      >
                        Reason
                      </label>
                      <textarea
                        id="admin-action-reason"
                        value={actionReason}
                        onChange={(e) => setActionReason(e.target.value)}
                        rows={4}
                        maxLength={500}
                        autoFocus
                        placeholder={
                          actionType === "cancel"
                            ? "Explain why this appointment must be cancelled."
                            : "Describe the conflict and the resolution."
                        }
                        className={`${field} resize-none`}
                      />
                      <div className="mt-1 flex justify-between text-xs text-slate-500">
                        <span>At least 10 characters</span>
                        <span className="tabular-nums">
                          {actionReason.trim().length}/500
                        </span>
                      </div>
                    </div>

                    {actionError && (
                      <p
                        role="alert"
                        className="flex gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-700"
                      >
                        <AlertCircle
                          size={16}
                          className="mt-0.5 shrink-0"
                          aria-hidden="true"
                        />{" "}
                        {actionError}
                      </p>
                    )}

                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={resetActionForm}
                        disabled={actionLoading}
                        className={`rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 ${focusRing}`}
                      >
                        Go back
                      </button>
                      <button
                        type="submit"
                        disabled={
                          actionLoading || actionReason.trim().length < 10
                        }
                        className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50 ${
                          actionType === "cancel"
                            ? "bg-rose-600 hover:bg-rose-700"
                            : "bg-teal-700 hover:bg-teal-800"
                        } ${focusRing}`}
                      >
                        {actionLoading && (
                          <RefreshCw
                            size={14}
                            className="animate-spin"
                            aria-hidden="true"
                          />
                        )}
                        {actionLoading
                          ? "Saving…"
                          : actionType === "cancel"
                            ? "Cancel appointment"
                            : "Save resolution"}
                      </button>
                    </div>
                  </form>
                )}

                <p className="mt-4 flex gap-2 text-xs leading-relaxed text-slate-500">
                  <Info
                    size={14}
                    className="mt-0.5 shrink-0"
                    aria-hidden="true"
                  />
                  Admins can’t confirm appointments or mark visits completed.
                  Those changes stay with the doctor.
                </p>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

export default AppointmentOverview;

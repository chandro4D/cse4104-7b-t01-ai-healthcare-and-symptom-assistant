import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import {
  FaSearch,
  FaCalendarPlus,
  FaFolderOpen,
  FaTimes,
  FaUserInjured,
  FaRegCalendarAlt,
  FaRegClock,
} from "react-icons/fa";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");
const API = `${API_URL}/api/v1/doctor-panel`;

// Route of the patient details page. The patient id is added at the end.
const ROUTES = {
  patientDetails: "/dashboard/patientRecordsDetails",
};

const TABS = [
  { key: "patients", label: "My patients" },
  { key: "requests", label: "Visit requests" },
];

const REQUEST_FILTERS = [
  "All",
  "Pending",
  "Accepted",
  "Declined",
  "Expired",
  "Cancelled",
];

const VISIT_TYPES = ["In-person", "Video", "Follow-up", "Check-up"];

const requestStyles = {
  Pending: "bg-amber-50 text-amber-700",
  Accepted: "bg-teal-50 text-teal-700",
  Declined: "bg-rose-50 text-rose-700",
  Expired: "bg-slate-100 text-slate-600",
  Cancelled: "bg-slate-100 text-slate-600",
};

const requestAccent = {
  Pending: "border-l-amber-400",
  Accepted: "border-l-teal-600",
  Declined: "border-l-rose-300",
  Expired: "border-l-slate-300",
  Cancelled: "border-l-slate-300",
};

const requestColors = {
  Pending: "#f59e0b",
  Accepted: "#0f766e",
  Declined: "#fb7185",
  Expired: "#cbd5e1",
  Cancelled: "#94a3b8",
};

// ---------------------------------------------------------------- helpers
const authConfig = () => ({
  withCredentials: true,
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

const errorText = (err, fallback) =>
  err?.response?.status === 401
    ? "Your session has expired. Please log in again."
    : err?.response?.data?.message || fallback;

const dateKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

const keyToDate = (key) => {
  const [y, m, d] = String(key).split("-").map(Number);
  return new Date(y, m - 1, d);
};

const formatDate = (key) =>
  key
    ? keyToDate(key).toLocaleDateString(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

// Shorter version for tight spaces (patient stats).
const formatShort = (key) =>
  key
    ? keyToDate(key).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

const formatTime = (time) => {
  const m = String(time || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return time || "";
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h >= 12 ? "PM" : "AM"}`;
};

const initials = (name) =>
  String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "P";

const expiresIn = (iso) => {
  const ms = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(ms) || ms <= 0) return "Expired";
  const h = Math.floor(ms / 3600000);
  if (h >= 24) return `Expires in ${Math.floor(h / 24)}d ${h % 24}h`;
  if (h >= 1) return `Expires in ${h}h`;
  return `Expires in ${Math.max(1, Math.floor(ms / 60000))}m`;
};

const emptyForm = { visitType: "In-person", date: "", time: "", reason: "" };

// ---------------------------------------------------------------- small UI
function Banner({ tone, children, onAction, actionLabel }) {
  const tones = {
    error: "border-rose-100 bg-rose-50 text-rose-700",
    success: "border-teal-100 bg-teal-50 text-teal-800",
  };
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4 rounded-lg border px-4 py-3 text-sm ${tones[tone]}`}
    >
      <span>{children}</span>
      <button
        onClick={onAction}
        className="font-semibold underline hover:no-underline self-start sm:self-auto"
      >
        {actionLabel}
      </button>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  note,
  onClick,
  accent = "text-slate-900",
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      {...(onClick ? { type: "button", onClick } : {})}
      className={`bg-white rounded-xl border border-slate-100 p-4 sm:p-5 text-left min-w-0 ${
        onClick
          ? "hover:shadow-sm transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-slate-500 truncate">{label}</p>
          <p className={`text-2xl font-semibold leading-tight ${accent}`}>
            {value}
          </p>
        </div>
      </div>
      {note && <p className="text-xs text-slate-400 mt-2 truncate">{note}</p>}
    </Tag>
  );
}

function RequestsBar({ counts, total, onPick }) {
  return (
    <div>
      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100"
        role="img"
        aria-label="Visit requests by status"
      >
        {total > 0 &&
          Object.keys(requestColors).map((k) =>
            counts[k] > 0 ? (
              <div
                key={k}
                title={`${k}: ${counts[k]}`}
                className="h-full"
                style={{
                  width: `${(counts[k] / total) * 100}%`,
                  backgroundColor: requestColors[k],
                }}
              />
            ) : null,
          )}
      </div>
      <ul className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-2">
        {Object.keys(requestColors).map((k) => (
          <li key={k}>
            <button
              type="button"
              onClick={() => onPick(k)}
              className="flex items-center gap-2 w-full text-left rounded-md px-1 py-0.5 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: requestColors[k] }}
              />
              <span className="text-xs text-slate-500">{k}</span>
              <span className="ml-auto text-sm font-semibold text-slate-900">
                {counts[k]}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-4 sm:p-5 flex items-center gap-4 animate-pulse">
      <div className="w-11 h-11 rounded-full bg-slate-100 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-1/3 rounded bg-slate-100" />
        <div className="h-3 w-1/2 rounded bg-slate-100" />
      </div>
    </div>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="bg-white rounded-xl border border-dashed border-slate-200 px-6 py-12 text-center">
      <div className="mx-auto w-12 h-12 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center">
        <FaRegCalendarAlt />
      </div>
      <p className="mt-4 font-semibold text-slate-900">{title}</p>
      <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">{text}</p>
    </div>
  );
}

const chipClass = (active) =>
  `px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
    active
      ? "bg-teal-700 text-white border-teal-700"
      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
  }`;

// ---------------------------------------------------------------- page
export default function DoctorPatients() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.key === params.get("tab"))
    ? params.get("tab")
    : "patients";

  const [patients, setPatients] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [busyId, setBusyId] = useState(null);

  // request-visit dialog
  const [target, setTarget] = useState(null); // patient object
  const [form, setForm] = useState(emptyForm);
  const [slots, setSlots] = useState({ configured: true, slots: [] });
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const todayKey = dateKey(new Date());

  const load = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError("");
    try {
      const [p, r] = await Promise.all([
        axios.get(`${API}/patients`, authConfig()),
        axios.get(`${API}/visit-requests`, authConfig()),
      ]);
      setPatients(Array.isArray(p.data?.data) ? p.data.data : []);
      setRequests(Array.isArray(r.data?.data) ? r.data.data : []);
    } catch (err) {
      console.error(err);
      setError(errorText(err, "Could not load your patients."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Load free slots whenever the date changes inside the dialog.
  useEffect(() => {
    if (!target || !form.date) return undefined;
    let cancelled = false;
    setSlotsLoading(true);
    axios
      .get(`${API}/my-slots`, { ...authConfig(), params: { date: form.date } })
      .then((res) => {
        if (!cancelled)
          setSlots(res.data?.data || { configured: false, slots: [] });
      })
      .catch(() => {
        if (!cancelled) setSlots({ configured: false, slots: [] });
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [target, form.date]);

  // Dialog: Esc closes (unless sending) and page scroll is locked.
  useEffect(() => {
    if (!target) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape" && !submitting) setTarget(null);
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [target, submitting]);

  const openDialog = (patient) => {
    setTarget(patient);
    setForm(emptyForm);
    setSlots({ configured: true, slots: [] });
    setFormError("");
  };

  const closeDialog = () => {
    if (!submitting) setTarget(null);
  };

  const submitRequest = async () => {
    if (!form.date) return setFormError("Choose a date.");
    if (!form.time) return setFormError("Choose a time.");
    if (!form.reason.trim())
      return setFormError("Enter a reason for the visit.");

    setSubmitting(true);
    setFormError("");
    try {
      await axios.post(
        `${API}/visit-requests`,
        {
          patient: target._id,
          proposedDate: form.date,
          time: form.time,
          visitType: form.visitType,
          reason: form.reason.trim(),
        },
        authConfig(),
      );
      const name = target.name;
      setTarget(null);
      setSuccess(`Visit request sent to ${name}.`);
      setParams({ tab: "requests" });
      load(false);
    } catch (err) {
      setFormError(errorText(err, "Could not send the request."));
    } finally {
      setSubmitting(false);
    }
  };

  const cancelRequest = async (req) => {
    setBusyId(req._id);
    setError("");
    setSuccess("");
    try {
      await axios.patch(
        `${API}/visit-requests/${req._id}/cancel`,
        {},
        authConfig(),
      );
      setRequests((prev) =>
        prev.map((r) =>
          r._id === req._id ? { ...r, status: "Cancelled" } : r,
        ),
      );
      setSuccess("Visit request cancelled.");
    } catch (err) {
      setError(errorText(err, "Could not cancel the request."));
    } finally {
      setBusyId(null);
    }
  };

  const filteredPatients = useMemo(() => {
    const q = search.trim().toLowerCase();
    return patients.filter(
      (p) =>
        !q ||
        String(p.name || "")
          .toLowerCase()
          .includes(q) ||
        String(p.email || "")
          .toLowerCase()
          .includes(q) ||
        String(p.phone || "")
          .toLowerCase()
          .includes(q),
    );
  }, [patients, search]);

  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests
      .filter((r) => filter === "All" || r.status === filter)
      .filter(
        (r) =>
          !q ||
          String(r.patient?.name || "")
            .toLowerCase()
            .includes(q) ||
          String(r.reason || "")
            .toLowerCase()
            .includes(q),
      );
  }, [requests, filter, search]);

  const pendingCount = requests.filter((r) => r.status === "Pending").length;
  const upcomingCount = patients.filter((p) => p.nextVisit).length;

  const requestCounts = useMemo(() => {
    const c = Object.fromEntries(Object.keys(requestColors).map((k) => [k, 0]));
    requests.forEach((r) => {
      if (c[r.status] !== undefined) c[r.status] += 1;
    });
    return c;
  }, [requests]);

  const goTab = (key) => setParams(key === "patients" ? {} : { tab: key });

  const pickRequestFilter = (status) => {
    setFilter(status);
  };

  return (
    <div className="min-h-screen">
      <main className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7 space-y-5 sm:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Patients
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Find your patients, open their records and invite them back for a
            visit.
          </p>
        </div>

        {error && (
          <Banner tone="error" onAction={() => load()} actionLabel="Retry">
            {error}
          </Banner>
        )}

        {success && (
          <Banner
            tone="success"
            onAction={() => setSuccess("")}
            actionLabel="Dismiss"
          >
            {success}
          </Banner>
        )}

        {/* Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <StatTile
            icon={<FaUserInjured />}
            label="Patients"
            value={loading ? "—" : patients.length}
            note="Everyone who has booked with you"
            onClick={() => goTab("patients")}
          />
          <StatTile
            icon={<FaRegClock />}
            label="With an upcoming visit"
            value={loading ? "—" : upcomingCount}
            note="Patients with a next visit booked"
          />
          <div className="col-span-2 lg:col-span-1">
            <StatTile
              icon={<FaCalendarPlus />}
              label="Pending visit requests"
              value={loading ? "—" : pendingCount}
              accent={pendingCount > 0 ? "text-amber-600" : "text-slate-900"}
              note={
                pendingCount > 0
                  ? "Waiting for patient replies"
                  : "No requests waiting"
              }
              onClick={() => {
                goTab("requests");
                setFilter("Pending");
              }}
            />
          </div>
        </div>

        {/* Tabs + search */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div
            role="tablist"
            aria-label="Patients sections"
            className="flex gap-2 md:flex-1"
          >
            {TABS.map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => goTab(t.key)}
                className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-medium border whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                  tab === t.key
                    ? "bg-teal-700 text-white border-teal-700"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {t.label}{" "}
                <span
                  className={tab === t.key ? "text-teal-100" : "text-slate-400"}
                >
                  {t.key === "patients"
                    ? patients.length
                    : pendingCount > 0
                      ? `${pendingCount} pending`
                      : requests.length}
                </span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-4 py-2.5 w-full md:w-72 focus-within:border-teal-600">
            <FaSearch className="text-slate-400 text-sm shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                tab === "patients"
                  ? "Search name, email or phone..."
                  : "Search patient or reason..."
              }
              className="bg-transparent outline-none text-sm w-full placeholder:text-slate-400"
              aria-label="Search"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="text-slate-400 hover:text-slate-600"
              >
                <FaTimes className="text-xs" />
              </button>
            )}
          </div>
        </div>

        {/* ------------------------------------------------ MY PATIENTS */}
        {tab === "patients" &&
          (loading ? (
            <div className="space-y-3">
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </div>
          ) : filteredPatients.length === 0 ? (
            <EmptyState
              title={search ? "No matches found" : "No patients yet"}
              text={
                search
                  ? "Try a different name, email or phone number."
                  : "Patients appear here after they book with you."
              }
            />
          ) : (
            <div className="space-y-3">
              {filteredPatients.map((p) => (
                <article
                  key={p._id}
                  className="bg-white rounded-xl border border-slate-100 p-4 sm:p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6"
                >
                  <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                    <div className="w-11 h-11 rounded-full bg-teal-700 text-white flex items-center justify-center text-xs font-semibold shrink-0">
                      {initials(p.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">
                        {p.name || "Patient"}
                      </p>
                      {p.email && (
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          {p.email}
                        </p>
                      )}
                      {p.phone && (
                        <p className="text-xs text-slate-500 truncate">
                          {p.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 sm:gap-6 rounded-lg bg-slate-50 lg:bg-transparent px-3 py-3 lg:p-0 text-xs shrink-0">
                    <div>
                      <p className="text-slate-400">Visits</p>
                      <p className="text-sm font-semibold text-slate-800 mt-0.5">
                        {p.totalVisits ?? 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">Last visit</p>
                      <p className="text-sm text-slate-800 mt-0.5">
                        {p.lastVisit ? formatShort(p.lastVisit) : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">Next visit</p>
                      <p className="text-sm text-slate-800 mt-0.5">
                        {p.nextVisit ? formatShort(p.nextVisit) : "—"}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() =>
                        navigate(`${ROUTES.patientDetails}/${p._id}`)
                      }
                      className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium px-3.5 py-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                    >
                      <FaFolderOpen /> Open record
                    </button>
                    <button
                      onClick={() => openDialog(p)}
                      className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-medium px-3.5 py-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                    >
                      <FaCalendarPlus /> Request visit
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ))}

        {/* ------------------------------------------------ VISIT REQUESTS */}
        {tab === "requests" && (
          <div className="space-y-4">
            <section className="bg-white rounded-xl border border-slate-100 p-4 sm:p-6">
              <div className="flex items-end justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-bold text-slate-900">Request outcomes</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select a status to filter the list.
                  </p>
                </div>
                <p className="text-sm text-slate-500">
                  <span className="text-2xl font-semibold text-slate-900">
                    {loading ? "—" : requests.length}
                  </span>{" "}
                  sent
                </p>
              </div>
              <RequestsBar
                counts={requestCounts}
                total={requests.length}
                onPick={pickRequestFilter}
              />
            </section>

            <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto">
              <div className="inline-flex gap-2 min-w-max sm:min-w-0 sm:flex sm:flex-wrap">
                {REQUEST_FILTERS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                      filter === f
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                <SkeletonRow />
                <SkeletonRow />
              </div>
            ) : filteredRequests.length === 0 ? (
              <EmptyState
                title={
                  search || filter !== "All"
                    ? "No requests match"
                    : "No visit requests yet"
                }
                text={
                  search || filter !== "All"
                    ? "Try clearing the search or choosing another status."
                    : "Open My patients and choose Request visit to invite a patient back."
                }
              />
            ) : (
              <div className="space-y-3">
                {filteredRequests.map((r) => {
                  const busy = busyId === r._id;
                  return (
                    <article
                      key={r._id}
                      className={`bg-white rounded-xl border border-slate-100 border-l-4 ${
                        requestAccent[r.status] || "border-l-slate-300"
                      } p-4 sm:p-5 flex flex-col gap-4 md:flex-row md:items-center md:gap-5`}
                    >
                      <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                        <div className="w-11 h-11 rounded-full bg-teal-700 text-white flex items-center justify-center text-xs font-semibold shrink-0">
                          {initials(r.patient?.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 text-sm truncate">
                            {r.patient?.name || "Patient"}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {r.visitType}
                          </p>
                          <p className="text-xs text-slate-600 mt-1.5 break-words">
                            {r.reason}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 md:block md:text-right md:w-44 shrink-0">
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {formatDate(r.proposedDate)}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {formatTime(r.time)}
                          </p>
                        </div>
                        <div className="text-right md:mt-2">
                          <span
                            className={`inline-block text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full ${
                              requestStyles[r.status] ||
                              "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {String(r.status).toUpperCase()}
                          </span>
                          {r.status === "Pending" && (
                            <p className="text-[11px] text-slate-400 mt-1">
                              {expiresIn(r.expiresAt)}
                            </p>
                          )}
                        </div>
                      </div>

                      {r.status === "Pending" && (
                        <div className="flex md:justify-end shrink-0 border-t border-slate-100 pt-3 md:border-0 md:pt-0 md:w-24">
                          <button
                            disabled={busy}
                            onClick={() => cancelRequest(r)}
                            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium px-3.5 py-2 rounded-lg disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                          >
                            <FaTimes /> Cancel
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ------------------------------------------------ REQUEST DIALOG */}
      {target && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 sm:p-4"
          onMouseDown={(e) => e.target === e.currentTarget && closeDialog()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="rv-title"
            className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-xl p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto"
          >
            <div>
              <h2 id="rv-title" className="font-bold text-slate-900">
                Request a visit
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {target.name} will get a notification and can accept or decline.
                The request closes after 48 hours.
              </p>
            </div>

            {formError && (
              <div
                role="alert"
                className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700"
              >
                {formError}
              </div>
            )}

            <div>
              <p className="text-xs font-medium text-slate-600">Visit type</p>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {VISIT_TYPES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={form.visitType === v}
                    onClick={() => setForm((f) => ({ ...f, visitType: v }))}
                    className={chipClass(form.visitType === v)}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="rv-date"
                className="text-xs font-medium text-slate-600"
              >
                Date
              </label>
              <input
                id="rv-date"
                type="date"
                min={todayKey}
                value={form.date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, date: e.target.value, time: "" }))
                }
                className="mt-1.5 w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15"
              />
            </div>

            {form.date && (
              <div>
                <p className="text-xs font-medium text-slate-600">Time</p>
                {slotsLoading ? (
                  <p className="text-sm text-slate-400 mt-1.5">
                    Checking free slots…
                  </p>
                ) : slots.configured ? (
                  slots.slots.length === 0 ? (
                    <p className="text-sm text-slate-500 mt-1.5">
                      No free slots on this day. Pick another date or update
                      your availability.
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-1.5">
                      {slots.slots.map((t) => (
                        <button
                          key={t}
                          type="button"
                          aria-pressed={form.time === t}
                          onClick={() => setForm((f) => ({ ...f, time: t }))}
                          className={chipClass(form.time === t)}
                        >
                          {formatTime(t)}
                        </button>
                      ))}
                    </div>
                  )
                ) : (
                  <>
                    <input
                      type="time"
                      aria-label="Time"
                      value={form.time}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, time: e.target.value }))
                      }
                      className="mt-1.5 w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      Set your weekly schedule in Profile &amp; availability to
                      pick from free slots.
                    </p>
                  </>
                )}
              </div>
            )}

            <div>
              <label
                htmlFor="rv-reason"
                className="text-xs font-medium text-slate-600"
              >
                Reason
              </label>
              <textarea
                id="rv-reason"
                rows={3}
                maxLength={500}
                value={form.reason}
                onChange={(e) =>
                  setForm((f) => ({ ...f, reason: e.target.value }))
                }
                placeholder="e.g. Follow-up on blood pressure medication"
                className="mt-1.5 w-full border border-slate-200 rounded-lg p-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15 resize-y"
              />
              <p className="text-right text-[11px] text-slate-400 mt-1">
                {form.reason.length}/500
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                onClick={closeDialog}
                className="px-4 py-2.5 sm:py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                onClick={submitRequest}
                disabled={submitting}
                className="px-4 py-2.5 sm:py-2 text-sm font-medium rounded-lg text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50"
              >
                {submitting ? "Sending…" : "Send request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

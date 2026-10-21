import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import {
  FaSearch,
  FaCheck,
  FaTimes,
  FaFlagCheckered,
  FaPen,
  FaRegCalendarAlt,
  FaRegClock,
} from "react-icons/fa";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");
const API = `${API_URL}/api/v1`;

const TABS = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const statusStyles = {
  CONFIRMED: "bg-teal-50 text-teal-700",
  PENDING: "bg-amber-50 text-amber-700",
  COMPLETED: "bg-slate-100 text-slate-600",
  CANCELLED: "bg-rose-50 text-rose-700",
};

// Left accent on each card + colours for the overview bar.
const STATUS_ACCENT = {
  pending: "border-l-amber-400",
  confirmed: "border-l-teal-600",
  completed: "border-l-slate-300",
  cancelled: "border-l-rose-300",
};
const STATUS_COLORS = {
  confirmed: "#0f766e",
  pending: "#f59e0b",
  completed: "#94a3b8",
  cancelled: "#fb7185",
};

// ---- helpers (same logic as the other pages) ----
const getDateKey = (date) => {
  if (!date) return "";
  if (typeof date === "string") {
    const m = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return date;
  }
  const p = new Date(date);
  if (Number.isNaN(p.getTime())) return "";
  return `${p.getFullYear()}-${String(p.getMonth() + 1).padStart(2, "0")}-${String(
    p.getDate(),
  ).padStart(2, "0")}`;
};

const keyToDate = (key) => {
  const [y, m, d] = key.split("-").map(Number);
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

// "Today" / "Tomorrow" / "Yesterday" / full date, for the group headings.
const relativeDay = (key) => {
  if (!key) return "";
  const startOf = (d) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round(
    (startOf(keyToDate(key)) - startOf(new Date())) / 86400000,
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return "";
};

// Stored as 24-hour "HH:mm" -> shown as "10:30 AM"
const formatTime = (time) => {
  const m = String(time || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return time || "";
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h >= 12 ? "PM" : "AM"}`;
};

const normalizeStatus = (s) =>
  String(s || "pending")
    .trim()
    .toLowerCase();
const isCancelled = (s) => ["cancelled", "canceled"].includes(s);

const patientOf = (a) =>
  typeof a.patient === "object" && a.patient !== null ? a.patient : {};
const patientName = (a) =>
  a.patientName || patientOf(a).name || patientOf(a).fullName || "Patient";

// True once the appointment's start time has passed.
const hasStarted = (a) => {
  const d = new Date(`${getDateKey(a.date)}T${a.time || "00:00"}`);
  return !Number.isNaN(d.getTime()) && d <= new Date();
};

const authConfig = () => ({
  withCredentials: true,
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

const errorText = (err, fallback) =>
  err?.response?.status === 401
    ? "Your session has expired. Please log in again."
    : err?.response?.data?.message || fallback;

const initials = (name) =>
  String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "P";

// ----------------------------------------------------------------------------
// Small components
// ----------------------------------------------------------------------------

// Stacked horizontal bar: how all appointments split by status.
function StatusBar({ counts, total, onPick }) {
  const items = [
    { key: "confirmed", label: "Confirmed" },
    { key: "pending", label: "Pending" },
    { key: "completed", label: "Completed" },
    { key: "cancelled", label: "Cancelled" },
  ];

  return (
    <div>
      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100"
        role="img"
        aria-label="Appointments by status"
      >
        {total > 0 &&
          items.map((it) =>
            counts[it.key] > 0 ? (
              <div
                key={it.key}
                title={`${it.label}: ${counts[it.key]}`}
                className="h-full"
                style={{
                  width: `${(counts[it.key] / total) * 100}%`,
                  backgroundColor: STATUS_COLORS[it.key],
                }}
              />
            ) : null,
          )}
      </div>

      <ul className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
        {items.map((it) => (
          <li key={it.key}>
            <button
              type="button"
              onClick={() => onPick(it.key)}
              className="flex items-center gap-2 text-left w-full rounded-md px-1 py-0.5 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: STATUS_COLORS[it.key] }}
              />
              <span className="text-xs text-slate-500">{it.label}</span>
              <span className="ml-auto text-sm font-semibold text-slate-900">
                {counts[it.key]}
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
    <div className="bg-white rounded-xl border border-slate-100 border-l-4 border-l-slate-200 p-4 sm:p-5 flex items-center gap-4 animate-pulse">
      <div className="w-11 h-11 rounded-full bg-slate-100 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-1/3 rounded bg-slate-100" />
        <div className="h-3 w-1/2 rounded bg-slate-100" />
      </div>
      <div className="h-8 w-20 rounded bg-slate-100 hidden sm:block" />
    </div>
  );
}

function ActionButton({ variant = "primary", className = "", ...props }) {
  const styles = {
    primary: "bg-teal-700 hover:bg-teal-800 text-white border-transparent",
    danger: "bg-white text-rose-600 border-rose-200 hover:bg-rose-50",
  };
  return (
    <button
      {...props}
      className={`flex items-center justify-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${styles[variant]} ${className}`}
    />
  );
}

// ----------------------------------------------------------------------------
// Page
// ----------------------------------------------------------------------------
export default function DoctorAppointments() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.key === params.get("status"))
    ? params.get("status")
    : "all";

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [dialog, setDialog] = useState(null); // { type, appt }
  const [dialogText, setDialogText] = useState("");
  const textareaRef = useRef(null);

  const load = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${API}/appointments/doctor`, authConfig());
      setAppointments(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      console.error(err);
      setError(errorText(err, "Could not load appointments."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Dialog: Esc closes, focus goes to the text box, page scroll is locked.
  useEffect(() => {
    if (!dialog) return undefined;
    const onKey = (e) => e.key === "Escape" && setDialog(null);
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    textareaRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [dialog]);

  const todayKey = getDateKey(new Date());

  const matchesTab = useCallback(
    (a, key) => {
      const s = normalizeStatus(a.status);
      if (key === "all") return true;
      if (key === "today")
        return getDateKey(a.date) === todayKey && !isCancelled(s);
      if (key === "cancelled") return isCancelled(s);
      return s === key;
    },
    [todayKey],
  );

  const counts = useMemo(
    () =>
      Object.fromEntries(
        TABS.map((t) => [
          t.key,
          appointments.filter((a) => matchesTab(a, t.key)).length,
        ]),
      ),
    [appointments, matchesTab],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return appointments
      .filter((a) => matchesTab(a, tab))
      .filter(
        (a) =>
          !q ||
          patientName(a).toLowerCase().includes(q) ||
          String(a.reason || "")
            .toLowerCase()
            .includes(q) ||
          String(patientOf(a).email || "")
            .toLowerCase()
            .includes(q),
      )
      .sort(
        (a, b) =>
          getDateKey(a.date).localeCompare(getDateKey(b.date)) ||
          String(a.time || "").localeCompare(String(b.time || "")),
      );
  }, [appointments, tab, search, matchesTab]);

  // Group the visible (already sorted) list by day.
  const groups = useMemo(() => {
    const map = new Map();
    visible.forEach((a) => {
      const key = getDateKey(a.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(a);
    });
    return Array.from(map, ([key, items]) => ({ key, items }));
  }, [visible]);

  // Overall split by status (cancelled spelled either way counts once).
  const statusCounts = useMemo(() => {
    const c = { confirmed: 0, pending: 0, completed: 0, cancelled: 0 };
    appointments.forEach((a) => {
      const s = normalizeStatus(a.status);
      if (isCancelled(s)) c.cancelled += 1;
      else if (s === "completed") c.completed += 1;
      else if (s === "pending") c.pending += 1;
      else c.confirmed += 1;
    });
    return c;
  }, [appointments]);

  const selectTab = (key) => setParams(key === "all" ? {} : { status: key });

  const replace = (updated) =>
    setAppointments((prev) =>
      // keep the populated patient (email) - the API returns only its id here
      prev.map((a) =>
        a._id === updated._id ? { ...a, ...updated, patient: a.patient } : a,
      ),
    );

  const changeStatus = async (appt, status, extra = {}) => {
    setBusyId(appt._id);
    setError("");
    try {
      const res = await axios.patch(
        `${API}/appointments/${appt._id}/status`,
        { status, ...extra },
        authConfig(),
      );
      replace(res.data.data);
      return true;
    } catch (err) {
      setError(errorText(err, "Could not update the appointment."));
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const saveNotes = async (appt, doctorNotes) => {
    setBusyId(appt._id);
    try {
      const res = await axios.patch(
        `${API}/appointments/${appt._id}/notes`,
        { doctorNotes },
        authConfig(),
      );
      replace(res.data.data);
      return true;
    } catch (err) {
      setError(errorText(err, "Could not save the notes."));
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const openDialog = (type, appt) => {
    setDialog({ type, appt });
    setDialogText(type === "notes" ? appt.doctorNotes || "" : "");
  };

  const submitDialog = async () => {
    const { type, appt } = dialog;
    const ok =
      type === "notes"
        ? await saveNotes(appt, dialogText)
        : await changeStatus(appt, "Cancelled", { reason: dialogText });
    if (ok) setDialog(null);
  };

  const maxLen = dialog?.type === "notes" ? 2000 : 500;

  return (
    <div className="min-h-screen">
      <main className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7 space-y-5 sm:space-y-6">
        {/* Heading */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Appointments
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review requests, confirm visits and keep notes for each patient.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4 rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          >
            <span>{error}</span>
            <button
              onClick={() => load()}
              className="font-semibold underline hover:no-underline self-start sm:self-auto"
            >
              Retry
            </button>
          </div>
        )}

        {/* Overview */}
        <section className="bg-white rounded-xl border border-slate-100 p-4 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 mb-4">
            <div>
              <h2 className="font-bold text-slate-900">Overview</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Select a status to filter the list.
              </p>
            </div>
            <div className="flex items-center gap-5 text-sm">
              <div>
                <span className="text-2xl font-semibold text-slate-900">
                  {loading ? "—" : appointments.length}
                </span>{" "}
                <span className="text-slate-500">total</span>
              </div>
              <div>
                <span className="text-2xl font-semibold text-teal-700">
                  {loading ? "—" : counts.today}
                </span>{" "}
                <span className="text-slate-500">today</span>
              </div>
            </div>
          </div>
          <StatusBar
            counts={statusCounts}
            total={appointments.length}
            onPick={selectTab}
          />
        </section>

        {/* Tabs + search */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto lg:flex-1">
            <div
              role="tablist"
              aria-label="Filter appointments"
              className="inline-flex gap-2 min-w-max sm:min-w-0 sm:flex sm:flex-wrap"
            >
              {TABS.map((t) => (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={tab === t.key}
                  onClick={() => selectTab(t.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                    tab === t.key
                      ? "bg-teal-700 text-white border-teal-700"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {t.label}{" "}
                  <span
                    className={
                      tab === t.key ? "text-teal-100" : "text-slate-400"
                    }
                  >
                    {counts[t.key]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-4 py-2.5 w-full lg:w-72 focus-within:border-teal-600">
            <FaSearch className="text-slate-400 text-sm shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patient or reason..."
              aria-label="Search appointments"
              className="bg-transparent outline-none text-sm w-full placeholder:text-slate-400"
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

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : visible.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-200 px-6 py-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center">
              <FaRegCalendarAlt />
            </div>
            <p className="mt-4 font-semibold text-slate-900">
              {search ? "No matches found" : "Nothing here yet"}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              {search
                ? "Try a different name or reason."
                : "No appointments in this section."}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map((group) => {
              const rel = relativeDay(group.key);
              return (
                <section key={group.key || "none"}>
                  <div className="flex items-center gap-3 mb-3">
                    <h2 className="text-sm font-semibold text-slate-700">
                      {rel || formatDate(group.key)}
                      {rel && (
                        <span className="ml-2 font-normal text-slate-400">
                          {formatDate(group.key)}
                        </span>
                      )}
                    </h2>
                    <span className="text-xs text-slate-400">
                      {group.items.length}
                    </span>
                    <div className="flex-1 h-px bg-slate-200/70" />
                  </div>

                  <div className="space-y-3">
                    {group.items.map((a) => {
                      const status = normalizeStatus(a.status);
                      const key = isCancelled(status) ? "cancelled" : status;
                      const label = key.toUpperCase();
                      const busy = busyId === a._id;

                      return (
                        <article
                          key={a._id}
                          className={`bg-white rounded-xl border border-slate-100 border-l-4 ${
                            STATUS_ACCENT[key] || "border-l-slate-300"
                          } p-4 sm:p-5 flex flex-col gap-4 md:flex-row md:items-center md:gap-5`}
                        >
                          {/* Patient */}
                          <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                            <div className="w-11 h-11 rounded-full bg-teal-700 text-white flex items-center justify-center text-xs font-semibold shrink-0">
                              {initials(patientName(a))}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 text-sm truncate">
                                {patientName(a)}
                              </p>
                              {patientOf(a).email && (
                                <p className="text-xs text-slate-500 mt-0.5 truncate">
                                  {patientOf(a).email}
                                </p>
                              )}
                              <p className="text-xs text-slate-600 mt-1.5">
                                {a.reason || "General consultation"}
                              </p>
                              {a.doctorNotes && (
                                <p className="text-xs text-slate-500 mt-1.5 rounded-md bg-slate-50 px-2.5 py-1.5 break-words">
                                  <span className="font-medium text-slate-600">
                                    Notes:
                                  </span>{" "}
                                  {a.doctorNotes}
                                </p>
                              )}
                              {a.cancelReason && (
                                <p className="text-xs text-rose-600 mt-1.5 break-words">
                                  Reason: {a.cancelReason}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* When + status */}
                          <div className="flex items-center justify-between gap-3 md:block md:text-right md:w-40 shrink-0">
                            <div>
                              <p className="flex items-center gap-1.5 md:justify-end text-sm font-medium text-slate-800">
                                <FaRegClock className="text-slate-400 text-xs" />
                                {formatTime(a.time) || "—"}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {formatDate(getDateKey(a.date))}
                              </p>
                            </div>
                            <span
                              className={`inline-block md:mt-2 text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full ${
                                statusStyles[label] ||
                                "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {label}
                            </span>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-wrap gap-2 md:justify-end shrink-0 border-t border-slate-100 pt-3 md:border-0 md:pt-0">
                            {status === "pending" && (
                              <>
                                <ActionButton
                                  disabled={busy}
                                  onClick={() => changeStatus(a, "Confirmed")}
                                  className="grow sm:grow-0"
                                >
                                  <FaCheck /> Confirm
                                </ActionButton>
                                <ActionButton
                                  variant="danger"
                                  disabled={busy}
                                  onClick={() => openDialog("cancel", a)}
                                  className="grow sm:grow-0"
                                >
                                  <FaTimes /> Decline
                                </ActionButton>
                              </>
                            )}
                            {status === "confirmed" && (
                              <>
                                <ActionButton
                                  disabled={busy || !hasStarted(a)}
                                  title={
                                    hasStarted(a)
                                      ? "Mark this visit as completed"
                                      : "Available once the appointment time has passed"
                                  }
                                  onClick={() => changeStatus(a, "Completed")}
                                  className="grow sm:grow-0"
                                >
                                  <FaFlagCheckered /> Complete
                                </ActionButton>
                                <ActionButton
                                  variant="danger"
                                  disabled={busy}
                                  onClick={() => openDialog("cancel", a)}
                                  className="grow sm:grow-0"
                                >
                                  <FaTimes /> Cancel
                                </ActionButton>
                              </>
                            )}
                            <button
                              disabled={busy}
                              onClick={() => openDialog("notes", a)}
                              aria-label={`Edit notes for ${patientName(a)}`}
                              title="Edit notes"
                              className="w-9 h-9 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center justify-center text-xs disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                            >
                              <FaPen />
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>

      {/* Notes / cancel dialog: bottom sheet on phones, centred card above */}
      {dialog && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 sm:p-4"
          onMouseDown={(e) => e.target === e.currentTarget && setDialog(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div>
              <h2 id="dialog-title" className="font-bold text-slate-900">
                {dialog.type === "notes" ? "Visit notes" : "Cancel appointment"}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {dialog.type === "notes"
                  ? `Private notes for ${patientName(dialog.appt)}.`
                  : `Tell ${patientName(dialog.appt)} why this appointment is being cancelled (optional).`}
              </p>
            </div>

            <div>
              <textarea
                ref={textareaRef}
                value={dialogText}
                onChange={(e) => setDialogText(e.target.value)}
                rows={4}
                maxLength={maxLen}
                aria-label={
                  dialog.type === "notes"
                    ? "Visit notes"
                    : "Cancellation reason"
                }
                className="w-full border border-slate-200 rounded-lg p-3 text-sm outline-none focus:border-teal-600 resize-y"
              />
              <p className="text-right text-[11px] text-slate-400 mt-1">
                {dialogText.length}/{maxLen}
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                onClick={() => setDialog(null)}
                className="px-4 py-2.5 sm:py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                onClick={submitDialog}
                disabled={busyId === dialog.appt._id}
                className={`px-4 py-2.5 sm:py-2 text-sm font-medium rounded-lg text-white disabled:opacity-50 ${
                  dialog.type === "notes"
                    ? "bg-teal-700 hover:bg-teal-800"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {dialog.type === "notes" ? "Save notes" : "Cancel appointment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

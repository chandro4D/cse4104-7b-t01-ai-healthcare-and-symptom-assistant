import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import {
  FaSearch,
  FaCheck,
  FaTimes,
  FaFlagCheckered,
  FaPen,
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

  return (
    <div className="min-h-screen">
      <main className="px-8 py-7 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Appointments</h1>
          <p className="text-sm text-slate-500 mt-1">
            Review requests, confirm visits and keep notes for each patient.
          </p>
        </div>

        {error && (
          <div className="flex items-center justify-between gap-4 rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <span>{error}</span>
            <button
              onClick={() => load()}
              className="font-semibold underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Tabs + search */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2 flex-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() =>
                  setParams(t.key === "all" ? {} : { status: t.key })
                }
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  tab === t.key
                    ? "bg-teal-700 text-white border-teal-700"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {t.label}{" "}
                <span
                  className={tab === t.key ? "text-teal-100" : "text-slate-400"}
                >
                  {counts[t.key]}
                </span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-4 py-2.5 w-full md:w-72">
            <FaSearch className="text-slate-400 text-sm" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patient or reason..."
              className="bg-transparent outline-none text-sm w-full placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* List */}
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          {loading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : visible.length === 0 ? (
            <p className="text-sm text-slate-400">
              {search
                ? "No appointments match your search."
                : "No appointments in this section."}
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {visible.map((a) => {
                const status = normalizeStatus(a.status);
                const label = (
                  isCancelled(status) ? "cancelled" : status
                ).toUpperCase();
                const busy = busyId === a._id;

                return (
                  <div
                    key={a._id}
                    className="py-4 first:pt-0 last:pb-0 flex flex-wrap items-center gap-4"
                  >
                    <div className="w-10 h-10 rounded-full bg-teal-700 text-white flex items-center justify-center text-xs font-semibold shrink-0">
                      {initials(patientName(a))}
                    </div>

                    <div className="flex-1 min-w-[200px]">
                      <p className="font-semibold text-slate-900 text-sm">
                        {patientName(a)}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {patientOf(a).email || ""}
                      </p>
                      <p className="text-xs text-slate-600 mt-1">
                        {a.reason || "General consultation"}
                      </p>
                      {a.doctorNotes && (
                        <p className="text-xs text-slate-500 mt-1 italic">
                          Notes: {a.doctorNotes}
                        </p>
                      )}
                      {a.cancelReason && (
                        <p className="text-xs text-rose-600 mt-1">
                          Reason: {a.cancelReason}
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-sm text-slate-700">
                        {formatDate(getDateKey(a.date))}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatTime(a.time)}
                      </p>
                      <span
                        className={`inline-block mt-1 text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full ${
                          statusStyles[label] || "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {label}
                      </span>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      {status === "pending" && (
                        <>
                          <button
                            disabled={busy}
                            onClick={() => changeStatus(a, "Confirmed")}
                            className="flex items-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-medium px-3 py-2 rounded-lg disabled:opacity-50"
                          >
                            <FaCheck /> Confirm
                          </button>
                          <button
                            disabled={busy}
                            onClick={() => openDialog("cancel", a)}
                            className="flex items-center gap-1.5 border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium px-3 py-2 rounded-lg disabled:opacity-50"
                          >
                            <FaTimes /> Decline
                          </button>
                        </>
                      )}
                      {status === "confirmed" && (
                        <>
                          <button
                            disabled={busy || !hasStarted(a)}
                            title={
                              hasStarted(a)
                                ? "Mark this visit as completed"
                                : "Available once the appointment time has passed"
                            }
                            onClick={() => changeStatus(a, "Completed")}
                            className="flex items-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-medium px-3 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <FaFlagCheckered /> Complete
                          </button>
                          <button
                            disabled={busy}
                            onClick={() => openDialog("cancel", a)}
                            className="flex items-center gap-1.5 border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium px-3 py-2 rounded-lg disabled:opacity-50"
                          >
                            <FaTimes /> Cancel
                          </button>
                        </>
                      )}
                      <button
                        disabled={busy}
                        onClick={() => openDialog("notes", a)}
                        aria-label="Edit notes"
                        className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center justify-center text-xs"
                      >
                        <FaPen />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Notes / cancel dialog */}
      {dialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
            <h2 className="font-bold text-slate-900">
              {dialog.type === "notes" ? "Visit notes" : "Cancel appointment"}
            </h2>
            <p className="text-sm text-slate-500">
              {dialog.type === "notes"
                ? `Private notes for ${patientName(dialog.appt)}.`
                : `Tell ${patientName(dialog.appt)} why this appointment is being cancelled (optional).`}
            </p>
            <textarea
              value={dialogText}
              onChange={(e) => setDialogText(e.target.value)}
              rows={4}
              maxLength={dialog.type === "notes" ? 2000 : 500}
              className="w-full border border-slate-200 rounded-lg p-3 text-sm outline-none focus:border-teal-600"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDialog(null)}
                className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                onClick={submitDialog}
                disabled={busyId === dialog.appt._id}
                className={`px-4 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-50 ${
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

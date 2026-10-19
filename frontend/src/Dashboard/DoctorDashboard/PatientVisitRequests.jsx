import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import {
  FaSearch,
  FaCalendarPlus,
  FaFolderOpen,
  FaTimes,
} from "react-icons/fa";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");
const API = `${API_URL}/api/v1/doctor-panel`;

// Route of the patient details page (page 4). The patient id is added at the end.
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

  return (
    <div className="min-h-screen">
      <main className="px-8 py-7 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Patients</h1>
          <p className="text-sm text-slate-500 mt-1">
            Find your patients, open their records and invite them back for a
            visit.
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

        {success && (
          <div className="flex items-center justify-between gap-4 rounded-lg border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-800">
            <span>{success}</span>
            <button
              onClick={() => setSuccess("")}
              className="font-semibold underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Tabs + search */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2 flex-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() =>
                  setParams(t.key === "patients" ? {} : { tab: t.key })
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
                  {t.key === "patients"
                    ? patients.length
                    : pendingCount > 0
                      ? `${pendingCount} pending`
                      : requests.length}
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
              placeholder={
                tab === "patients"
                  ? "Search name, email or phone..."
                  : "Search patient or reason..."
              }
              className="bg-transparent outline-none text-sm w-full placeholder:text-slate-400"
              aria-label="Search"
            />
          </div>
        </div>

        {/* ------------------------------------------------ MY PATIENTS */}
        {tab === "patients" && (
          <div className="bg-white rounded-xl border border-slate-100 p-6">
            {loading ? (
              <p className="text-sm text-slate-400">Loading…</p>
            ) : filteredPatients.length === 0 ? (
              <p className="text-sm text-slate-400">
                {search
                  ? "No patients match your search."
                  : "No patients yet. Patients appear here after they book with you."}
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredPatients.map((p) => (
                  <div
                    key={p._id}
                    className="py-4 first:pt-0 last:pb-0 flex flex-wrap items-center gap-4"
                  >
                    <div className="w-10 h-10 rounded-full bg-teal-700 text-white flex items-center justify-center text-xs font-semibold shrink-0">
                      {initials(p.name)}
                    </div>

                    <div className="flex-1 min-w-[200px]">
                      <p className="font-semibold text-slate-900 text-sm">
                        {p.name || "Patient"}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {p.email || ""}
                      </p>
                      {p.phone && (
                        <p className="text-xs text-slate-500">{p.phone}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-6 text-xs text-slate-500 shrink-0">
                      <div>
                        <p className="text-slate-400">Visits</p>
                        <p className="text-sm font-semibold text-slate-800 mt-0.5">
                          {p.totalVisits ?? 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400">Last visit</p>
                        <p className="text-sm text-slate-800 mt-0.5">
                          {p.lastVisit ? formatDate(p.lastVisit) : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400">Next visit</p>
                        <p className="text-sm text-slate-800 mt-0.5">
                          {p.nextVisit ? formatDate(p.nextVisit) : "—"}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() =>
                          navigate(`${ROUTES.patientDetails}/${p._id}`)
                        }
                        className="flex items-center gap-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium px-3 py-2 rounded-lg"
                      >
                        <FaFolderOpen /> Open record
                      </button>
                      <button
                        onClick={() => openDialog(p)}
                        className="flex items-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-medium px-3 py-2 rounded-lg"
                      >
                        <FaCalendarPlus /> Request visit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------ VISIT REQUESTS */}
        {tab === "requests" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {REQUEST_FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    filter === f
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-xl border border-slate-100 p-6">
              {loading ? (
                <p className="text-sm text-slate-400">Loading…</p>
              ) : filteredRequests.length === 0 ? (
                <p className="text-sm text-slate-400">
                  {search || filter !== "All"
                    ? "No requests match your filters."
                    : "You haven't sent any visit requests. Open My patients and choose Request visit."}
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredRequests.map((r) => {
                    const busy = busyId === r._id;
                    return (
                      <div
                        key={r._id}
                        className="py-4 first:pt-0 last:pb-0 flex flex-wrap items-center gap-4"
                      >
                        <div className="w-10 h-10 rounded-full bg-teal-700 text-white flex items-center justify-center text-xs font-semibold shrink-0">
                          {initials(r.patient?.name)}
                        </div>

                        <div className="flex-1 min-w-[200px]">
                          <p className="font-semibold text-slate-900 text-sm">
                            {r.patient?.name || "Patient"}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {r.visitType}
                          </p>
                          <p className="text-xs text-slate-600 mt-1">
                            {r.reason}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-sm text-slate-700">
                            {formatDate(r.proposedDate)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatTime(r.time)}
                          </p>
                          <span
                            className={`inline-block mt-1 text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full ${
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

                        <div className="flex gap-2 shrink-0 w-24 justify-end">
                          {r.status === "Pending" && (
                            <button
                              disabled={busy}
                              onClick={() => cancelRequest(r)}
                              className="flex items-center gap-1.5 border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium px-3 py-2 rounded-lg disabled:opacity-50"
                            >
                              <FaTimes /> Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ------------------------------------------------ REQUEST DIALOG */}
      {target && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-modal="true"
          aria-label="Request visit"
        >
          <div className="bg-white rounded-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div>
              <h2 className="font-bold text-slate-900">Request a visit</h2>
              <p className="text-sm text-slate-500 mt-1">
                {target.name} will get a notification and can accept or decline.
                The request closes after 48 hours.
              </p>
            </div>

            {formError && (
              <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {formError}
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-slate-600">
                Visit type
              </label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {VISIT_TYPES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, visitType: v }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                      form.visitType === v
                        ? "bg-teal-700 text-white border-teal-700"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
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
                className="mt-1.5 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600"
              />
            </div>

            {form.date && (
              <div>
                <label className="text-xs font-medium text-slate-600">
                  Time
                </label>
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
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {slots.slots.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, time: t }))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                            form.time === t
                              ? "bg-teal-700 text-white border-teal-700"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                          }`}
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
                      value={form.time}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, time: e.target.value }))
                      }
                      className="mt-1.5 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600"
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
                className="mt-1.5 w-full border border-slate-200 rounded-lg p-3 text-sm outline-none focus:border-teal-600"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={closeDialog}
                className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                onClick={submitRequest}
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50"
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

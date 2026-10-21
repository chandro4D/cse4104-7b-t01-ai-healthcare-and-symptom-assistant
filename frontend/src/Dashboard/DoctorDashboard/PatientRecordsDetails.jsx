import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import {
  FaArrowLeft,
  FaNotesMedical,
  FaPrescriptionBottleAlt,
  FaPrint,
  FaPlus,
  FaTrash,
  FaRegCalendarAlt,
  FaExclamationTriangle,
} from "react-icons/fa";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");
const API = `${API_URL}/api/v1/doctor-panel`;

// Where the "Back" button goes (the patient directory page).
const ROUTES = { directory: "/dashboard/patientDirectory" };

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "appointments", label: "Appointments" },
  { key: "notes", label: "Visit notes" },
  { key: "prescriptions", label: "Prescriptions" },
];

const statusStyles = {
  CONFIRMED: "bg-teal-50 text-teal-700",
  PENDING: "bg-amber-50 text-amber-700",
  COMPLETED: "bg-slate-100 text-slate-600",
  CANCELLED: "bg-rose-50 text-rose-700",
};

const statusAccent = {
  CONFIRMED: "border-l-teal-600",
  PENDING: "border-l-amber-400",
  COMPLETED: "border-l-slate-300",
  CANCELLED: "border-l-rose-300",
};

const statusColors = {
  confirmed: "#0f766e",
  pending: "#f59e0b",
  completed: "#94a3b8",
  cancelled: "#fb7185",
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

const getDateKey = (date) => {
  if (!date) return "";
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const p = new Date(date);
  if (Number.isNaN(p.getTime())) return "";
  return `${p.getFullYear()}-${String(p.getMonth() + 1).padStart(2, "0")}-${String(
    p.getDate(),
  ).padStart(2, "0")}`;
};

const formatDate = (value) => {
  const key = getDateKey(value);
  if (!key) return "—";
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

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

const initials = (name) =>
  String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "P";

const ageFrom = (dob) => {
  const key = getDateKey(dob);
  if (!key) return null;
  const [y, m, d] = key.split("-").map(Number);
  const now = new Date();
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d))
    age -= 1;
  return age >= 0 ? age : null;
};

// Accepts an array, a comma / line separated string, or nothing.
const toList = (v) =>
  Array.isArray(v)
    ? v
        .map((x) => (typeof x === "string" ? x : x?.name || x?.title || ""))
        .filter(Boolean)
    : String(v || "")
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean);

const escapeHtml = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

function printPrescription(rx, patient, doctorName) {
  const w = window.open("", "_blank", "width=800,height=900");
  if (!w) return;
  const rows = (rx.medicines || [])
    .map(
      (m, i) =>
        `<tr><td>${i + 1}</td><td>${escapeHtml(m.name)}</td><td>${escapeHtml(m.dosage)}</td><td>${escapeHtml(m.frequency)}</td><td>${escapeHtml(m.duration)}</td></tr>`,
    )
    .join("");
  w.document.write(`<!doctype html><html><head><title>Prescription</title>
  <style>body{font-family:Arial,sans-serif;padding:40px;color:#0f172a}h1{font-size:20px;margin:0}
  .muted{color:#64748b;font-size:13px}table{width:100%;border-collapse:collapse;margin-top:20px;font-size:14px}
  th,td{border-bottom:1px solid #e2e8f0;padding:8px;text-align:left}hr{border:0;border-top:2px solid #0f766e;margin:16px 0}</style></head>
  <body><h1>Prescription</h1><p class="muted">Dr. ${escapeHtml(doctorName || "")} · ${escapeHtml(formatDate(rx.createdAt))}</p><hr/>
  <p><strong>Patient:</strong> ${escapeHtml(patient?.name)}${patient?.dateOfBirth ? ` · Age ${ageFrom(patient.dateOfBirth) ?? ""}` : ""}</p>
  ${rx.diagnosis ? `<p><strong>Diagnosis:</strong> ${escapeHtml(rx.diagnosis)}</p>` : ""}
  <table><thead><tr><th>#</th><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration</th></tr></thead><tbody>${rows}</tbody></table>
  ${rx.instructions ? `<p style="margin-top:20px"><strong>Instructions:</strong><br/>${escapeHtml(rx.instructions)}</p>` : ""}
  <script>window.onload=function(){window.print()}</script></body></html>`);
  w.document.close();
}

const emptyNote = {
  appointment: "",
  complaint: "",
  diagnosis: "",
  notes: "",
  followUpDate: "",
};
const emptyMed = { name: "", dosage: "", frequency: "", duration: "" };
const emptyRx = {
  appointment: "",
  diagnosis: "",
  instructions: "",
  medicines: [{ ...emptyMed }],
};

const inputClass =
  "mt-1.5 w-full border border-slate-200 rounded-lg px-3 py-2.5 sm:py-2 text-sm outline-none bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15";
const medInputClass =
  "w-full min-w-0 border border-slate-200 rounded-lg px-3 py-2.5 sm:py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15";

// ---------------------------------------------------------------- small UI
function Field({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="text-sm text-slate-800 mt-0.5 break-words">
        {children || "—"}
      </dd>
    </div>
  );
}

function Card({ title, children, className = "" }) {
  return (
    <section
      className={`bg-white rounded-xl border border-slate-100 p-4 sm:p-6 min-w-0 ${className}`}
    >
      {title && <h2 className="font-bold text-slate-900 mb-4">{title}</h2>}
      {children}
    </section>
  );
}

function StatTile({ label, value, note }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-4 sm:p-5 min-w-0">
      <p className="text-xs text-slate-500 truncate">{label}</p>
      <p className="text-2xl font-semibold text-slate-900 mt-1">{value}</p>
      {note && <p className="text-xs text-slate-400 mt-1 truncate">{note}</p>}
    </div>
  );
}

function VisitsBar({ counts, total }) {
  const items = Object.keys(statusColors);
  return (
    <div>
      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100"
        role="img"
        aria-label="Appointments by status"
      >
        {total > 0 &&
          items.map((k) =>
            counts[k] > 0 ? (
              <div
                key={k}
                title={`${k}: ${counts[k]}`}
                className="h-full"
                style={{
                  width: `${(counts[k] / total) * 100}%`,
                  backgroundColor: statusColors[k],
                }}
              />
            ) : null,
          )}
      </div>
      <ul className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
        {items.map((k) => (
          <li
            key={k}
            className="flex items-center gap-2 text-xs text-slate-500"
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: statusColors[k] }}
            />
            <span className="capitalize">{k}</span>
            <span className="ml-auto text-sm font-semibold text-slate-900">
              {counts[k]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyState({ title, text, icon }) {
  return (
    <div className="bg-white rounded-xl border border-dashed border-slate-200 px-6 py-12 text-center">
      <div className="mx-auto w-12 h-12 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center">
        {icon || <FaRegCalendarAlt />}
      </div>
      <p className="mt-4 font-semibold text-slate-900">{title}</p>
      {text && (
        <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">{text}</p>
      )}
    </div>
  );
}

function Sheet({ labelledBy, maxWidth = "sm:max-w-lg", onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`bg-white w-full ${maxWidth} rounded-t-2xl sm:rounded-xl p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto`}
      >
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- page
export default function DoctorPatientDetails() {
  const { patientId } = useParams();
  const navigate = useNavigate();

  const [tab, setTab] = useState("overview");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [dialog, setDialog] = useState(null); // "note" | "rx"
  const [noteForm, setNoteForm] = useState(emptyNote);
  const [rxForm, setRxForm] = useState(emptyRx);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const doctorName = (() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      return u.name || u.fullName || "";
    } catch {
      return "";
    }
  })();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${API}/patients/${patientId}`, authConfig());
      setData(res.data?.data || null);
    } catch (err) {
      console.error(err);
      setError(errorText(err, "Could not load this patient's record."));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    load();
  }, [load]);

  // Dialogs: Esc closes (unless saving) and page scroll is locked.
  useEffect(() => {
    if (!dialog) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape" && !saving) setDialog(null);
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [dialog, saving]);

  const profile = data?.profile;
  const appointments = useMemo(() => data?.appointments || [], [data]);
  const notes = data?.notes || [];
  const prescriptions = data?.prescriptions || [];

  // Notes / prescriptions can only be written for these appointments.
  const eligible = useMemo(
    () =>
      appointments.filter((a) =>
        ["confirmed", "completed"].includes(normalizeStatus(a.status)),
      ),
    [appointments],
  );

  const statusCounts = useMemo(() => {
    const c = { confirmed: 0, pending: 0, completed: 0, cancelled: 0 };
    appointments.forEach((a) => {
      const s = normalizeStatus(a.status);
      if (s === "cancelled" || s === "canceled") c.cancelled += 1;
      else if (s === "completed") c.completed += 1;
      else if (s === "pending") c.pending += 1;
      else c.confirmed += 1;
    });
    return c;
  }, [appointments]);

  const apptLabel = (a) =>
    `${formatDate(a.date)} · ${formatTime(a.time)} (${normalizeStatus(a.status)})`;
  const apptById = (id) => appointments.find((a) => a._id === id);

  const openDialog = (type) => {
    setFormError("");
    const first = eligible[0]?._id || "";
    if (type === "note") setNoteForm({ ...emptyNote, appointment: first });
    else
      setRxForm({
        ...emptyRx,
        medicines: [{ ...emptyMed }],
        appointment: first,
      });
    setDialog(type);
  };

  const closeDialog = () => {
    if (!saving) setDialog(null);
  };

  const submitNote = async () => {
    if (!noteForm.appointment) return setFormError("Choose an appointment.");
    if (!noteForm.notes.trim()) return setFormError("Write the visit note.");
    setSaving(true);
    setFormError("");
    try {
      await axios.post(
        `${API}/patients/${patientId}/notes`,
        { ...noteForm, followUpDate: noteForm.followUpDate || undefined },
        authConfig(),
      );
      setDialog(null);
      setSuccess("Visit note saved.");
      setTab("notes");
      load();
    } catch (err) {
      setFormError(errorText(err, "Could not save the note."));
    } finally {
      setSaving(false);
    }
  };

  const submitRx = async () => {
    if (!rxForm.appointment) return setFormError("Choose an appointment.");
    const meds = rxForm.medicines.filter((m) => m.name.trim());
    if (meds.length === 0) return setFormError("Add at least one medicine.");
    setSaving(true);
    setFormError("");
    try {
      await axios.post(
        `${API}/patients/${patientId}/prescriptions`,
        { ...rxForm, medicines: meds },
        authConfig(),
      );
      setDialog(null);
      setSuccess(
        "Prescription created. The patient can see it in their panel.",
      );
      setTab("prescriptions");
      load();
    } catch (err) {
      setFormError(errorText(err, "Could not create the prescription."));
    } finally {
      setSaving(false);
    }
  };

  const setMed = (i, key, value) =>
    setRxForm((f) => ({
      ...f,
      medicines: f.medicines.map((m, idx) =>
        idx === i ? { ...m, [key]: value } : m,
      ),
    }));

  const allergies = toList(profile?.allergies);
  const history = toList(profile?.medicalHistory);
  const age = ageFrom(profile?.dateOfBirth);

  if (loading) {
    return (
      <div className="min-h-screen px-4 py-5 sm:px-6 lg:px-8 lg:py-7 space-y-5 animate-pulse">
        <div className="h-4 w-32 rounded bg-slate-200" />
        <div className="h-28 rounded-xl bg-slate-100" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="h-20 rounded-xl bg-slate-100" />
          <div className="h-20 rounded-xl bg-slate-100" />
          <div className="h-20 rounded-xl bg-slate-100" />
          <div className="h-20 rounded-xl bg-slate-100" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen px-4 py-5 sm:px-6 lg:px-8 lg:py-7 space-y-4">
        <button
          onClick={() => navigate(ROUTES.directory)}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-teal-700"
        >
          <FaArrowLeft /> Back to patients
        </button>
        <div
          role="alert"
          className="rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
        >
          <span>{error || "Patient not found."}</span>
          <button
            onClick={load}
            className="font-semibold underline hover:no-underline self-start sm:self-auto"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const nextFollowUp = notes
    .map((n) => getDateKey(n.followUpDate))
    .filter(Boolean)
    .sort()
    .find((k) => k >= getDateKey(new Date()));

  const noWrite = eligible.length === 0;

  return (
    <div className="min-h-screen">
      <main className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7 space-y-5 sm:space-y-6">
        <button
          onClick={() => navigate(ROUTES.directory)}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-teal-700"
        >
          <FaArrowLeft /> Back to patients
        </button>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          >
            {error}
          </div>
        )}
        {success && (
          <div
            role="status"
            className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4 rounded-lg border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-800"
          >
            <span>{success}</span>
            <button
              onClick={() => setSuccess("")}
              className="font-semibold underline hover:no-underline self-start sm:self-auto"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Header */}
        <section className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-teal-700 to-teal-500" />
          <div className="p-4 sm:p-6 flex flex-col gap-5 lg:flex-row lg:items-center">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-teal-700 text-white flex items-center justify-center text-lg sm:text-xl font-semibold shrink-0">
                {initials(profile.name)}
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 break-words">
                  {profile.name}
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  {[
                    profile.gender,
                    age != null ? `${age} years` : null,
                    profile.bloodGroup
                      ? `Blood group ${profile.bloodGroup}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "No demographic details on file"}
                </p>
                <p className="text-sm text-slate-500 break-words">
                  {[profile.email, profile.phone].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <button
                onClick={() => openDialog("note")}
                disabled={noWrite}
                title={
                  noWrite ? "Needs a confirmed or completed appointment" : ""
                }
                className="flex items-center justify-center gap-2 border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium px-4 py-2.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              >
                <FaNotesMedical /> Write note
              </button>
              <button
                onClick={() => openDialog("rx")}
                disabled={noWrite}
                title={
                  noWrite ? "Needs a confirmed or completed appointment" : ""
                }
                className="flex items-center justify-center gap-2 bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              >
                <FaPrescriptionBottleAlt /> New prescription
              </button>
            </div>
          </div>
          {noWrite && (
            <p className="px-4 sm:px-6 pb-4 -mt-1 text-xs text-slate-400">
              Notes and prescriptions unlock once this patient has a confirmed
              or completed appointment.
            </p>
          )}
        </section>

        {/* Allergy alert */}
        {allergies.length > 0 && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          >
            <FaExclamationTriangle className="mt-0.5 shrink-0" />
            <span>
              <span className="font-semibold">Allergies:</span>{" "}
              {allergies.join(", ")}
            </span>
          </div>
        )}

        {/* Tabs */}
        <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto">
          <div
            role="tablist"
            aria-label="Patient record sections"
            className="inline-flex gap-2 min-w-max sm:min-w-0 sm:flex sm:flex-wrap"
          >
            {TABS.map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                  tab === t.key
                    ? "bg-teal-700 text-white border-teal-700"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {t.label}{" "}
                <span
                  className={tab === t.key ? "text-teal-100" : "text-slate-400"}
                >
                  {t.key === "appointments"
                    ? appointments.length
                    : t.key === "notes"
                      ? notes.length
                      : t.key === "prescriptions"
                        ? prescriptions.length
                        : ""}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* OVERVIEW */}
        {tab === "overview" && (
          <div className="space-y-5 sm:space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <StatTile
                label="Appointments"
                value={appointments.length}
                note={`${statusCounts.completed} completed`}
              />
              <StatTile
                label="Visit notes"
                value={notes.length}
                note={
                  notes[0]
                    ? `Last ${formatDate(notes[0].createdAt)}`
                    : "None yet"
                }
              />
              <StatTile
                label="Prescriptions"
                value={prescriptions.length}
                note={
                  prescriptions[0]
                    ? `Last ${formatDate(prescriptions[0].createdAt)}`
                    : "None yet"
                }
              />
              <StatTile
                label="Next follow-up"
                value={
                  nextFollowUp ? formatDate(nextFollowUp).split(",")[0] : "—"
                }
                note={nextFollowUp ? formatDate(nextFollowUp) : "None planned"}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
              <Card title="Visit history">
                {appointments.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    No appointments with this patient yet.
                  </p>
                ) : (
                  <VisitsBar
                    counts={statusCounts}
                    total={appointments.length}
                  />
                )}
              </Card>

              <Card title="Latest activity">
                {appointments.length === 0 && notes.length === 0 ? (
                  <p className="text-sm text-slate-400">Nothing yet.</p>
                ) : (
                  <ul className="space-y-4 text-sm">
                    {[
                      [
                        "Last appointment",
                        appointments[0]
                          ? `${formatDate(appointments[0].date)}, ${formatTime(appointments[0].time)}`
                          : "—",
                      ],
                      [
                        "Last note",
                        notes[0]?.diagnosis || notes[0]?.notes || "—",
                      ],
                      [
                        "Last prescription",
                        prescriptions[0]
                          ? formatDate(prescriptions[0].createdAt)
                          : "—",
                      ],
                    ].map(([label, value]) => (
                      <li key={label} className="flex gap-3">
                        <span className="mt-1.5 w-2 h-2 rounded-full bg-teal-600 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-slate-400">{label}</p>
                          <p className="text-slate-800 mt-0.5 break-words">
                            {value}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card title="Contact details">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Email">{profile.email}</Field>
                  <Field label="Phone">{profile.phone}</Field>
                  <Field label="Date of birth">
                    {profile.dateOfBirth ? formatDate(profile.dateOfBirth) : ""}
                  </Field>
                  <Field label="Gender">{profile.gender}</Field>
                  <Field label="Blood group">{profile.bloodGroup}</Field>
                  <Field label="Address">
                    {typeof profile.address === "object"
                      ? Object.values(profile.address || {})
                          .filter(Boolean)
                          .join(", ")
                      : profile.address}
                  </Field>
                </dl>
              </Card>

              <Card>
                <div className="space-y-5">
                  <div>
                    <h2 className="font-bold text-slate-900 mb-3">Allergies</h2>
                    {allergies.length === 0 ? (
                      <p className="text-sm text-slate-400">
                        No allergies recorded.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {allergies.map((a) => (
                          <span
                            key={a}
                            className="text-xs font-medium px-2.5 py-1 rounded-full bg-rose-50 text-rose-700"
                          >
                            {a}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900 mb-3">
                      Medical history
                    </h2>
                    {history.length === 0 ? (
                      <p className="text-sm text-slate-400">
                        No history recorded.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {history.map((h) => (
                          <span
                            key={h}
                            className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-700"
                          >
                            {h}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* APPOINTMENTS */}
        {tab === "appointments" &&
          (appointments.length === 0 ? (
            <EmptyState
              title="No appointments yet"
              text="Appointments with this patient will appear here."
            />
          ) : (
            <div className="space-y-3">
              {appointments.map((a) => {
                const s = normalizeStatus(a.status);
                const label = (
                  s === "canceled" ? "cancelled" : s
                ).toUpperCase();
                return (
                  <article
                    key={a._id}
                    className={`bg-white rounded-xl border border-slate-100 border-l-4 ${
                      statusAccent[label] || "border-l-slate-300"
                    } p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm">
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
                    <div className="flex items-center justify-between gap-3 sm:block sm:text-right shrink-0">
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {formatDate(a.date)}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {formatTime(a.time)}
                        </p>
                      </div>
                      <span
                        className={`inline-block sm:mt-2 text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full ${
                          statusStyles[label] || "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {label}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          ))}

        {/* NOTES */}
        {tab === "notes" &&
          (notes.length === 0 ? (
            <EmptyState
              icon={<FaNotesMedical />}
              title="No visit notes yet"
              text="Use Write note after a consultation."
            />
          ) : (
            <div className="space-y-3">
              {notes.map((n) => {
                const a = apptById(n.appointment);
                return (
                  <article
                    key={n._id}
                    className="bg-white rounded-xl border border-slate-100 p-4 sm:p-5 space-y-2"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                      <p className="font-semibold text-slate-900 text-sm">
                        {n.diagnosis || "Visit note"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {a ? `Visit on ${formatDate(a.date)} · ` : ""}written{" "}
                        {formatDate(n.createdAt)}
                      </p>
                    </div>
                    {n.complaint && (
                      <p className="text-xs text-slate-500">
                        Complaint: {n.complaint}
                      </p>
                    )}
                    <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">
                      {n.notes}
                    </p>
                    {n.followUpDate && (
                      <p className="inline-block text-xs font-medium text-teal-700 bg-teal-50 rounded-full px-2.5 py-1">
                        Follow-up: {formatDate(n.followUpDate)}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          ))}

        {/* PRESCRIPTIONS */}
        {tab === "prescriptions" &&
          (prescriptions.length === 0 ? (
            <EmptyState
              icon={<FaPrescriptionBottleAlt />}
              title="No prescriptions yet"
              text="Use New prescription after a consultation."
            />
          ) : (
            <div className="space-y-4">
              {prescriptions.map((rx) => (
                <article
                  key={rx._id}
                  className="bg-white rounded-xl border border-slate-100 p-4 sm:p-6"
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 text-sm">
                        {rx.diagnosis || "Prescription"}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Issued {formatDate(rx.createdAt)}
                      </p>
                    </div>
                    <button
                      onClick={() => printPrescription(rx, profile, doctorName)}
                      className="flex items-center gap-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium px-3 py-2 rounded-lg shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                    >
                      <FaPrint /> Print
                    </button>
                  </div>

                  {/* Phones: stacked list */}
                  <ul className="sm:hidden space-y-2">
                    {rx.medicines.map((m, i) => (
                      <li
                        key={i}
                        className="rounded-lg bg-slate-50 px-3 py-2.5"
                      >
                        <p className="text-sm font-medium text-slate-900">
                          {m.name}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {[m.dosage, m.frequency, m.duration]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </p>
                      </li>
                    ))}
                  </ul>

                  {/* Tablet and up: table */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-slate-400">
                          <th className="py-2 pr-4 font-medium">Medicine</th>
                          <th className="py-2 pr-4 font-medium">Dosage</th>
                          <th className="py-2 pr-4 font-medium">Frequency</th>
                          <th className="py-2 font-medium">Duration</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rx.medicines.map((m, i) => (
                          <tr key={i}>
                            <td className="py-2 pr-4 text-slate-900 font-medium">
                              {m.name}
                            </td>
                            <td className="py-2 pr-4 text-slate-600">
                              {m.dosage || "—"}
                            </td>
                            <td className="py-2 pr-4 text-slate-600">
                              {m.frequency || "—"}
                            </td>
                            <td className="py-2 text-slate-600">
                              {m.duration || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {rx.instructions && (
                    <p className="text-sm text-slate-600 mt-4 whitespace-pre-wrap break-words">
                      <span className="font-medium text-slate-800">
                        Instructions:{" "}
                      </span>
                      {rx.instructions}
                    </p>
                  )}
                </article>
              ))}
            </div>
          ))}
      </main>

      {/* ------------------------------------------------ NOTE DIALOG */}
      {dialog === "note" && (
        <Sheet labelledBy="note-title" onClose={closeDialog}>
          <div>
            <h2 id="note-title" className="font-bold text-slate-900">
              Visit note
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Saved to this appointment for {profile.name}.
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
            <label
              htmlFor="n-appt"
              className="text-xs font-medium text-slate-600"
            >
              Appointment
            </label>
            <select
              id="n-appt"
              value={noteForm.appointment}
              onChange={(e) =>
                setNoteForm((f) => ({ ...f, appointment: e.target.value }))
              }
              className={inputClass}
            >
              {eligible.map((a) => (
                <option key={a._id} value={a._id}>
                  {apptLabel(a)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="n-complaint"
                className="text-xs font-medium text-slate-600"
              >
                Chief complaint
              </label>
              <input
                id="n-complaint"
                maxLength={500}
                value={noteForm.complaint}
                onChange={(e) =>
                  setNoteForm((f) => ({ ...f, complaint: e.target.value }))
                }
                className={inputClass}
              />
            </div>
            <div>
              <label
                htmlFor="n-diag"
                className="text-xs font-medium text-slate-600"
              >
                Diagnosis
              </label>
              <input
                id="n-diag"
                maxLength={500}
                value={noteForm.diagnosis}
                onChange={(e) =>
                  setNoteForm((f) => ({ ...f, diagnosis: e.target.value }))
                }
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="n-notes"
              className="text-xs font-medium text-slate-600"
            >
              Notes
            </label>
            <textarea
              id="n-notes"
              rows={5}
              maxLength={4000}
              value={noteForm.notes}
              onChange={(e) =>
                setNoteForm((f) => ({ ...f, notes: e.target.value }))
              }
              className={`${inputClass} resize-y`}
            />
            <p className="text-right text-[11px] text-slate-400 mt-1">
              {noteForm.notes.length}/4000
            </p>
          </div>
          <div>
            <label
              htmlFor="n-follow"
              className="text-xs font-medium text-slate-600"
            >
              Follow-up date (optional)
            </label>
            <input
              id="n-follow"
              type="date"
              value={noteForm.followUpDate}
              onChange={(e) =>
                setNoteForm((f) => ({ ...f, followUpDate: e.target.value }))
              }
              className={inputClass}
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button
              onClick={closeDialog}
              className="px-4 py-2.5 sm:py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Close
            </button>
            <button
              onClick={submitNote}
              disabled={saving}
              className="px-4 py-2.5 sm:py-2 text-sm font-medium rounded-lg text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save note"}
            </button>
          </div>
        </Sheet>
      )}

      {/* ------------------------------------------------ PRESCRIPTION DIALOG */}
      {dialog === "rx" && (
        <Sheet
          labelledBy="rx-title"
          maxWidth="sm:max-w-2xl"
          onClose={closeDialog}
        >
          <div>
            <h2 id="rx-title" className="font-bold text-slate-900">
              New prescription
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              For {profile.name}. The patient will see it in their panel.
            </p>
          </div>
          {allergies.length > 0 && (
            <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              Known allergies: {allergies.join(", ")}
            </div>
          )}
          {formError && (
            <div
              role="alert"
              className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700"
            >
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="r-appt"
                className="text-xs font-medium text-slate-600"
              >
                Appointment
              </label>
              <select
                id="r-appt"
                value={rxForm.appointment}
                onChange={(e) =>
                  setRxForm((f) => ({ ...f, appointment: e.target.value }))
                }
                className={inputClass}
              >
                {eligible.map((a) => (
                  <option key={a._id} value={a._id}>
                    {apptLabel(a)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="r-diag"
                className="text-xs font-medium text-slate-600"
              >
                Diagnosis
              </label>
              <input
                id="r-diag"
                maxLength={500}
                value={rxForm.diagnosis}
                onChange={(e) =>
                  setRxForm((f) => ({ ...f, diagnosis: e.target.value }))
                }
                className={inputClass}
              />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-medium text-slate-600">Medicines</p>
            {rxForm.medicines.map((m, i) => (
              <div
                key={i}
                className="rounded-lg border border-slate-100 bg-slate-50/60 p-3 sm:border-0 sm:bg-transparent sm:p-0 grid grid-cols-2 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 items-center"
              >
                <input
                  aria-label={`Medicine ${i + 1} name`}
                  placeholder="Medicine name"
                  value={m.name}
                  onChange={(e) => setMed(i, "name", e.target.value)}
                  className={`col-span-2 sm:col-span-1 ${medInputClass}`}
                />
                <input
                  aria-label={`Medicine ${i + 1} dosage`}
                  placeholder="Dosage"
                  value={m.dosage}
                  onChange={(e) => setMed(i, "dosage", e.target.value)}
                  className={medInputClass}
                />
                <input
                  aria-label={`Medicine ${i + 1} frequency`}
                  placeholder="Frequency"
                  value={m.frequency}
                  onChange={(e) => setMed(i, "frequency", e.target.value)}
                  className={medInputClass}
                />
                <input
                  aria-label={`Medicine ${i + 1} duration`}
                  placeholder="Duration"
                  value={m.duration}
                  onChange={(e) => setMed(i, "duration", e.target.value)}
                  className={medInputClass}
                />
                <button
                  type="button"
                  aria-label={`Remove medicine ${i + 1}`}
                  disabled={rxForm.medicines.length === 1}
                  onClick={() =>
                    setRxForm((f) => ({
                      ...f,
                      medicines: f.medicines.filter((_, idx) => idx !== i),
                    }))
                  }
                  className="justify-self-end w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 flex items-center justify-center text-xs disabled:opacity-40"
                >
                  <FaTrash />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setRxForm((f) => ({
                  ...f,
                  medicines: [...f.medicines, { ...emptyMed }],
                }))
              }
              className="flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:underline"
            >
              <FaPlus className="text-xs" /> Add medicine
            </button>
          </div>

          <div>
            <label
              htmlFor="r-instr"
              className="text-xs font-medium text-slate-600"
            >
              Instructions for the patient
            </label>
            <textarea
              id="r-instr"
              rows={3}
              maxLength={1500}
              value={rxForm.instructions}
              onChange={(e) =>
                setRxForm((f) => ({ ...f, instructions: e.target.value }))
              }
              placeholder="e.g. Take after meals. Return if the fever lasts more than 3 days."
              className={`${inputClass} resize-y`}
            />
            <p className="text-right text-[11px] text-slate-400 mt-1">
              {rxForm.instructions.length}/1500
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
              onClick={submitRx}
              disabled={saving}
              className="px-4 py-2.5 sm:py-2 text-sm font-medium rounded-lg text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Create prescription"}
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

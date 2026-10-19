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

function Field({ label, children }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="text-sm text-slate-800 mt-0.5 break-words">
        {children || "—"}
      </dd>
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
      <div className="min-h-screen px-8 py-7">
        <p className="text-sm text-slate-400">Loading patient record…</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen px-8 py-7 space-y-4">
        <button
          onClick={() => navigate(ROUTES.directory)}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-teal-700"
        >
          <FaArrowLeft /> Back to patients
        </button>
        <div className="rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-center justify-between gap-4">
          <span>{error || "Patient not found."}</span>
          <button
            onClick={load}
            className="font-semibold underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <main className="px-8 py-7 space-y-6">
        <button
          onClick={() => navigate(ROUTES.directory)}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-teal-700"
        >
          <FaArrowLeft /> Back to patients
        </button>

        {error && (
          <div className="rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
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

        {/* Header */}
        <div className="bg-white rounded-xl border border-slate-100 p-6 flex flex-wrap items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-teal-700 text-white flex items-center justify-center text-xl font-semibold shrink-0">
            {initials(profile.name)}
          </div>
          <div className="flex-1 min-w-[220px]">
            <h1 className="text-2xl font-bold text-slate-900">
              {profile.name}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {[
                profile.gender,
                age != null ? `${age} years` : null,
                profile.bloodGroup ? `Blood group ${profile.bloodGroup}` : null,
              ]
                .filter(Boolean)
                .join(" · ") || "No demographic details on file"}
            </p>
            <p className="text-sm text-slate-500">
              {[profile.email, profile.phone].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => openDialog("note")}
              disabled={eligible.length === 0}
              title={
                eligible.length === 0
                  ? "Needs a confirmed or completed appointment"
                  : ""
              }
              className="flex items-center gap-2 border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium px-4 py-2.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaNotesMedical /> Write note
            </button>
            <button
              onClick={() => openDialog("rx")}
              disabled={eligible.length === 0}
              title={
                eligible.length === 0
                  ? "Needs a confirmed or completed appointment"
                  : ""
              }
              className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaPrescriptionBottleAlt /> New prescription
            </button>
          </div>
        </div>

        {/* Allergy alert */}
        {allergies.length > 0 && (
          <div className="rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <span className="font-semibold">Allergies:</span>{" "}
            {allergies.join(", ")}
          </div>
        )}

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
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

        {/* OVERVIEW */}
        {tab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-100 p-6">
              <h2 className="font-bold text-slate-900 mb-4">Contact details</h2>
              <dl className="grid grid-cols-2 gap-4">
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
            </div>

            <div className="bg-white rounded-xl border border-slate-100 p-6 space-y-5">
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
                  <p className="text-sm text-slate-400">No history recorded.</p>
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

            <div className="bg-white rounded-xl border border-slate-100 p-6 lg:col-span-2">
              <h2 className="font-bold text-slate-900 mb-4">Latest activity</h2>
              {appointments.length === 0 && notes.length === 0 ? (
                <p className="text-sm text-slate-400">Nothing yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-400">Last appointment</p>
                    <p className="text-slate-800 mt-0.5">
                      {appointments[0]
                        ? `${formatDate(appointments[0].date)}, ${formatTime(appointments[0].time)}`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Last note</p>
                    <p className="text-slate-800 mt-0.5 truncate">
                      {notes[0]?.diagnosis || notes[0]?.notes || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Last prescription</p>
                    <p className="text-slate-800 mt-0.5">
                      {prescriptions[0]
                        ? formatDate(prescriptions[0].createdAt)
                        : "—"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* APPOINTMENTS */}
        {tab === "appointments" && (
          <div className="bg-white rounded-xl border border-slate-100 p-6">
            {appointments.length === 0 ? (
              <p className="text-sm text-slate-400">
                No appointments with this patient.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {appointments.map((a) => {
                  const s = normalizeStatus(a.status);
                  const label = (
                    s === "canceled" ? "cancelled" : s
                  ).toUpperCase();
                  return (
                    <div
                      key={a._id}
                      className="py-4 first:pt-0 last:pb-0 flex flex-wrap items-center gap-4"
                    >
                      <div className="flex-1 min-w-[200px]">
                        <p className="font-semibold text-slate-900 text-sm">
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
                          {formatDate(a.date)}
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
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* NOTES */}
        {tab === "notes" && (
          <div className="bg-white rounded-xl border border-slate-100 p-6">
            {notes.length === 0 ? (
              <p className="text-sm text-slate-400">
                No visit notes yet. Use Write note after a consultation.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {notes.map((n) => {
                  const a = apptById(n.appointment);
                  return (
                    <div
                      key={n._id}
                      className="py-4 first:pt-0 last:pb-0 space-y-1.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
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
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">
                        {n.notes}
                      </p>
                      {n.followUpDate && (
                        <p className="text-xs text-teal-700">
                          Follow-up: {formatDate(n.followUpDate)}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PRESCRIPTIONS */}
        {tab === "prescriptions" && (
          <div className="space-y-4">
            {prescriptions.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-100 p-6">
                <p className="text-sm text-slate-400">No prescriptions yet.</p>
              </div>
            ) : (
              prescriptions.map((rx) => (
                <div
                  key={rx._id}
                  className="bg-white rounded-xl border border-slate-100 p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">
                        {rx.diagnosis || "Prescription"}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Issued {formatDate(rx.createdAt)}
                      </p>
                    </div>
                    <button
                      onClick={() => printPrescription(rx, profile, doctorName)}
                      className="flex items-center gap-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium px-3 py-2 rounded-lg"
                    >
                      <FaPrint /> Print
                    </button>
                  </div>
                  <div className="overflow-x-auto">
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
                    <p className="text-sm text-slate-600 mt-3 whitespace-pre-wrap">
                      <span className="font-medium text-slate-800">
                        Instructions:{" "}
                      </span>
                      {rx.instructions}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* ------------------------------------------------ NOTE DIALOG */}
      {dialog === "note" && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-modal="true"
          aria-label="Write visit note"
        >
          <div className="bg-white rounded-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div>
              <h2 className="font-bold text-slate-900">Visit note</h2>
              <p className="text-sm text-slate-500 mt-1">
                Saved to this appointment for {profile.name}.
              </p>
            </div>
            {formError && (
              <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
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
                className="mt-1.5 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600 bg-white"
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
                  className="mt-1.5 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600"
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
                  className="mt-1.5 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600"
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
                className="mt-1.5 w-full border border-slate-200 rounded-lg p-3 text-sm outline-none focus:border-teal-600"
              />
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
                className="mt-1.5 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600"
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
                onClick={submitNote}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save note"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------ PRESCRIPTION DIALOG */}
      {dialog === "rx" && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-modal="true"
          aria-label="New prescription"
        >
          <div className="bg-white rounded-xl w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div>
              <h2 className="font-bold text-slate-900">New prescription</h2>
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
              <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
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
                  className="mt-1.5 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600 bg-white"
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
                  className="mt-1.5 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600"
                />
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-medium text-slate-600">Medicines</p>
              {rxForm.medicines.map((m, i) => (
                <div
                  key={i}
                  className="grid grid-cols-2 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 items-center"
                >
                  <input
                    aria-label={`Medicine ${i + 1} name`}
                    placeholder="Medicine name"
                    value={m.name}
                    onChange={(e) => setMed(i, "name", e.target.value)}
                    className="col-span-2 sm:col-span-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600"
                  />
                  <input
                    aria-label={`Medicine ${i + 1} dosage`}
                    placeholder="Dosage"
                    value={m.dosage}
                    onChange={(e) => setMed(i, "dosage", e.target.value)}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600"
                  />
                  <input
                    aria-label={`Medicine ${i + 1} frequency`}
                    placeholder="Frequency"
                    value={m.frequency}
                    onChange={(e) => setMed(i, "frequency", e.target.value)}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600"
                  />
                  <input
                    aria-label={`Medicine ${i + 1} duration`}
                    placeholder="Duration"
                    value={m.duration}
                    onChange={(e) => setMed(i, "duration", e.target.value)}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600"
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
                    className="w-9 h-9 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center justify-center text-xs disabled:opacity-40"
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
                onClick={submitRx}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Create prescription"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

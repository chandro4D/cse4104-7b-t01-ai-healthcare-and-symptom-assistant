import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { FaPlus, FaTimes } from "react-icons/fa";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");
const API = `${API_URL}/api/v1/doctor-panel`;

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const SLOT_LENGTHS = [10, 15, 20, 30, 45, 60];
const VISIT_TYPES = ["In-person", "Video", "Follow-up", "Check-up"];

// Default schedule used until the doctor saves their own (Sat/Sun off).
const defaultWeekly = () =>
  DAYS.map((_, day) => ({
    day,
    enabled: day >= 1 && day <= 5,
    start: "09:00",
    end: "17:00",
  }));

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

const formatDay = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const initials = (name) =>
  String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "D";

const inputClass =
  "mt-1.5 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-600 bg-white";

function Card({ title, subtitle, children }) {
  return (
    <section className="bg-white rounded-xl border border-slate-100 p-6 space-y-4">
      <div>
        <h2 className="font-bold text-slate-900">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Label({ htmlFor, children }) {
  return (
    <label htmlFor={htmlFor} className="text-xs font-medium text-slate-600">
      {children}
    </label>
  );
}

// ---------------------------------------------------------------- page
export default function DoctorProfile() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState(null); // pendingChanges from server

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    bio: "",
    photo: "",
    experience: "",
    fee: "",
    visitTypes: ["In-person"],
    specialty: "",
    qualifications: "",
    licenseNumber: "",
    slotMinutes: 30,
    weekly: defaultWeekly(),
    daysOff: [],
  });
  const [newOff, setNewOff] = useState("");

  const [pw, setPw] = useState({
    currentPassword: "",
    newPassword: "",
    confirm: "",
  });
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  const todayKey = dateKey(new Date());
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const applyServer = useCallback((user, doctor) => {
    const av = doctor?.availability;
    setForm({
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      bio: doctor?.bio || "",
      photo: doctor?.photo || "",
      experience: doctor?.experience ?? "",
      fee: doctor?.fee ?? "",
      visitTypes: doctor?.visitTypes?.length
        ? doctor.visitTypes
        : ["In-person"],
      specialty: doctor?.specialty || "",
      qualifications: Array.isArray(doctor?.qualifications)
        ? doctor.qualifications.join(", ")
        : doctor?.qualifications || "",
      licenseNumber: doctor?.licenseNumber || "",
      slotMinutes: av?.slotMinutes || 30,
      weekly:
        Array.isArray(av?.weekly) && av.weekly.length === 7
          ? [...av.weekly].sort((a, b) => a.day - b.day)
          : defaultWeekly(),
      daysOff: doctor?.daysOff || [],
    });
    setPending(
      doctor?.pendingChanges?.status === "Pending"
        ? doctor.pendingChanges
        : null,
    );
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${API}/profile`, authConfig());
      applyServer(res.data?.data?.user, res.data?.data?.doctor);
    } catch (err) {
      console.error(err);
      setError(errorText(err, "Could not load your profile."));
    } finally {
      setLoading(false);
    }
  }, [applyServer]);

  useEffect(() => {
    load();
  }, [load]);

  const setDay = (day, patch) =>
    setForm((f) => ({
      ...f,
      weekly: f.weekly.map((w) => (w.day === day ? { ...w, ...patch } : w)),
    }));

  const toggleVisitType = (type) =>
    setForm((f) => {
      const has = f.visitTypes.includes(type);
      const next = has
        ? f.visitTypes.filter((t) => t !== type)
        : [...f.visitTypes, type];
      return { ...f, visitTypes: next };
    });

  const addDayOff = () => {
    if (!newOff || form.daysOff.includes(newOff)) return;
    set("daysOff", [...form.daysOff, newOff].sort());
    setNewOff("");
  };

  const validate = () => {
    if (!form.name.trim()) return "Enter your name.";
    if (form.visitTypes.length === 0) return "Choose at least one visit type.";
    if (form.fee !== "" && Number(form.fee) < 0)
      return "Fee cannot be negative.";
    if (form.experience !== "" && Number(form.experience) < 0)
      return "Experience cannot be negative.";
    for (const w of form.weekly) {
      if (w.enabled && (!w.start || !w.end || w.start >= w.end)) {
        return `${DAYS[w.day]}: end time must be after start time.`;
      }
    }
    return "";
  };

  const save = async () => {
    setError("");
    setSuccess("");
    const problem = validate();
    if (problem) return setError(problem);

    setSaving(true);
    try {
      const res = await axios.patch(
        `${API}/profile`,
        {
          name: form.name,
          phone: form.phone,
          bio: form.bio,
          photo: form.photo,
          experience:
            form.experience === "" ? undefined : Number(form.experience),
          fee: form.fee === "" ? undefined : Number(form.fee),
          visitTypes: form.visitTypes,
          specialty: form.specialty,
          qualifications: form.qualifications,
          licenseNumber: form.licenseNumber,
          availability: {
            slotMinutes: Number(form.slotMinutes),
            weekly: form.weekly,
          },
          daysOff: form.daysOff,
        },
        authConfig(),
      );
      const doctor = res.data?.data;
      setPending(
        doctor?.pendingChanges?.status === "Pending"
          ? doctor.pendingChanges
          : null,
      );
      // keep the header name in sync for the dashboard greeting
      try {
        const u = JSON.parse(localStorage.getItem("user") || "{}");
        localStorage.setItem(
          "user",
          JSON.stringify({ ...u, name: form.name.trim() }),
        );
      } catch {
        /* ignore */
      }
      setSuccess(
        res.data?.pending
          ? "Saved. Your specialty, qualification or license changes are waiting for admin approval."
          : "Your profile and schedule are saved.",
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(errorText(err, "Could not save your profile."));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    setPwError("");
    setPwSuccess("");
    if (!pw.currentPassword || !pw.newPassword)
      return setPwError("Fill in all password fields.");
    if (pw.newPassword.length < 8)
      return setPwError("New password must be at least 8 characters.");
    if (pw.newPassword !== pw.confirm)
      return setPwError("New passwords do not match.");
    setPwSaving(true);
    try {
      await axios.patch(
        `${API}/password`,
        { currentPassword: pw.currentPassword, newPassword: pw.newPassword },
        authConfig(),
      );
      setPw({ currentPassword: "", newPassword: "", confirm: "" });
      setPwSuccess("Password updated.");
    } catch (err) {
      setPwError(errorText(err, "Could not update the password."));
    } finally {
      setPwSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen px-8 py-7">
        <p className="text-sm text-slate-400">Loading your profile…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <main className="px-8 py-7 space-y-6 max-w-5xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Profile &amp; availability
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Keep your details current and set the hours patients can book.
            </p>
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium px-5 py-2.5 rounded-lg disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>

        {error && (
          <div className="flex items-center justify-between gap-4 rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <span>{error}</span>
            <button
              onClick={() => setError("")}
              className="font-semibold underline hover:no-underline"
            >
              Dismiss
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
        {pending && (
          <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Waiting for admin approval:{" "}
            {["specialty", "qualifications", "licenseNumber"]
              .filter((k) => pending[k] !== undefined)
              .map(
                (k) =>
                  ({
                    specialty: "specialty",
                    qualifications: "qualifications",
                    licenseNumber: "license number",
                  })[k],
              )
              .join(", ")}
            . Your current approved details stay visible to patients until then.
          </div>
        )}

        {/* PROFILE */}
        <Card
          title="Personal details"
          subtitle="Shown to patients when they choose a doctor."
        >
          <div className="flex flex-wrap gap-6">
            <div className="flex flex-col items-center gap-2">
              {form.photo ? (
                <img
                  src={form.photo}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover border border-slate-200"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-teal-700 text-white flex items-center justify-center text-2xl font-semibold">
                  {initials(form.name)}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-[260px] grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="p-name">Full name</Label>
                <input
                  id="p-name"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <Label htmlFor="p-email">Email</Label>
                <input
                  id="p-email"
                  value={form.email}
                  disabled
                  className={`${inputClass} bg-slate-50 text-slate-500`}
                />
              </div>
              <div>
                <Label htmlFor="p-phone">Phone</Label>
                <input
                  id="p-phone"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <Label htmlFor="p-photo">Photo link</Label>
                <input
                  id="p-photo"
                  value={form.photo}
                  onChange={(e) => set("photo", e.target.value)}
                  placeholder="https://..."
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="p-bio">About you</Label>
                <textarea
                  id="p-bio"
                  rows={4}
                  maxLength={1000}
                  value={form.bio}
                  onChange={(e) => set("bio", e.target.value)}
                  placeholder="A short introduction patients will read before booking."
                  className={`${inputClass} p-3`}
                />
                <p className="text-xs text-slate-400 mt-1">
                  {form.bio.length}/1000
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* PRACTICE */}
        <Card
          title="Practice details"
          subtitle="Changes here save immediately."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="p-exp">Experience (years)</Label>
              <input
                id="p-exp"
                type="number"
                min="0"
                value={form.experience}
                onChange={(e) => set("experience", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <Label htmlFor="p-fee">Consultation fee</Label>
              <input
                id="p-fee"
                type="number"
                min="0"
                value={form.fee}
                onChange={(e) => set("fee", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-600">
              Visit types you offer
            </p>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {VISIT_TYPES.map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={form.visitTypes.includes(v)}
                  onClick={() => toggleVisitType(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                    form.visitTypes.includes(v)
                      ? "bg-teal-700 text-white border-teal-700"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* VERIFIED */}
        <Card
          title="Verified credentials"
          subtitle="An admin reviews changes to these fields before patients see them."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="p-spec">Specialty</Label>
              <input
                id="p-spec"
                value={form.specialty}
                onChange={(e) => set("specialty", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <Label htmlFor="p-lic">License number</Label>
              <input
                id="p-lic"
                value={form.licenseNumber}
                onChange={(e) => set("licenseNumber", e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="p-qual">Qualifications</Label>
              <input
                id="p-qual"
                value={form.qualifications}
                onChange={(e) => set("qualifications", e.target.value)}
                placeholder="e.g. MBBS, FCPS (Medicine)"
                className={inputClass}
              />
            </div>
          </div>
        </Card>

        {/* SCHEDULE */}
        <Card
          title="Weekly schedule"
          subtitle="Patients can only book inside these hours. Booked slots are hidden automatically."
        >
          <div className="max-w-xs">
            <Label htmlFor="p-slot">Slot length</Label>
            <select
              id="p-slot"
              value={form.slotMinutes}
              onChange={(e) => set("slotMinutes", Number(e.target.value))}
              className={inputClass}
            >
              {SLOT_LENGTHS.map((m) => (
                <option key={m} value={m}>
                  {m} minutes
                </option>
              ))}
            </select>
          </div>

          <div className="divide-y divide-slate-100">
            {form.weekly.map((w) => (
              <div
                key={w.day}
                className="py-3 first:pt-0 last:pb-0 flex flex-wrap items-center gap-4"
              >
                <label className="flex items-center gap-3 w-40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={w.enabled}
                    onChange={(e) =>
                      setDay(w.day, { enabled: e.target.checked })
                    }
                    className="w-4 h-4 accent-teal-700"
                  />
                  <span className="text-sm font-medium text-slate-800">
                    {DAYS[w.day]}
                  </span>
                </label>
                {w.enabled ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      aria-label={`${DAYS[w.day]} start time`}
                      value={w.start}
                      onChange={(e) => setDay(w.day, { start: e.target.value })}
                      className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-teal-600"
                    />
                    <span className="text-sm text-slate-400">to</span>
                    <input
                      type="time"
                      aria-label={`${DAYS[w.day]} end time`}
                      value={w.end}
                      onChange={(e) => setDay(w.day, { end: e.target.value })}
                      className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-teal-600"
                    />
                  </div>
                ) : (
                  <span className="text-sm text-slate-400">Day off</span>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* DAYS OFF */}
        <Card
          title="Days off"
          subtitle="Holidays or leave. No slots are offered on these dates."
        >
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label htmlFor="p-off">Date</Label>
              <input
                id="p-off"
                type="date"
                min={todayKey}
                value={newOff}
                onChange={(e) => setNewOff(e.target.value)}
                className={inputClass}
              />
            </div>
            <button
              type="button"
              onClick={addDayOff}
              disabled={!newOff}
              className="flex items-center gap-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50"
            >
              <FaPlus className="text-xs" /> Add day off
            </button>
          </div>
          {form.daysOff.length === 0 ? (
            <p className="text-sm text-slate-400">No days off added.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {form.daysOff.map((d) => (
                <span
                  key={d}
                  className={`inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full ${
                    d < todayKey
                      ? "bg-slate-100 text-slate-400"
                      : "bg-teal-50 text-teal-800"
                  }`}
                >
                  {formatDay(d)}
                  <button
                    type="button"
                    aria-label={`Remove ${formatDay(d)}`}
                    onClick={() =>
                      set(
                        "daysOff",
                        form.daysOff.filter((x) => x !== d),
                      )
                    }
                    className="hover:text-rose-600"
                  >
                    <FaTimes />
                  </button>
                </span>
              ))}
            </div>
          )}
        </Card>

        <div className="flex justify-end">
          <button
            onClick={save}
            disabled={saving}
            className="bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium px-5 py-2.5 rounded-lg disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>

        {/* PASSWORD */}
        <Card title="Change password" subtitle="Use at least 8 characters.">
          {pwError && (
            <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {pwError}
            </div>
          )}
          {pwSuccess && (
            <div className="rounded-lg border border-teal-100 bg-teal-50 px-3 py-2 text-sm text-teal-800">
              {pwSuccess}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="pw-cur">Current password</Label>
              <input
                id="pw-cur"
                type="password"
                autoComplete="current-password"
                value={pw.currentPassword}
                onChange={(e) =>
                  setPw((p) => ({ ...p, currentPassword: e.target.value }))
                }
                className={inputClass}
              />
            </div>
            <div>
              <Label htmlFor="pw-new">New password</Label>
              <input
                id="pw-new"
                type="password"
                autoComplete="new-password"
                value={pw.newPassword}
                onChange={(e) =>
                  setPw((p) => ({ ...p, newPassword: e.target.value }))
                }
                className={inputClass}
              />
            </div>
            <div>
              <Label htmlFor="pw-conf">Confirm new password</Label>
              <input
                id="pw-conf"
                type="password"
                autoComplete="new-password"
                value={pw.confirm}
                onChange={(e) =>
                  setPw((p) => ({ ...p, confirm: e.target.value }))
                }
                className={inputClass}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={changePassword}
              disabled={pwSaving}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {pwSaving ? "Updating…" : "Update password"}
            </button>
          </div>
        </Card>
      </main>
    </div>
  );
}

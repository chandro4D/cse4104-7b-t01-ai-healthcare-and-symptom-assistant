import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import {
  FaPlus,
  FaTimes,
  FaCheckCircle,
  FaStar,
  FaRegClock,
  FaRegCalendarAlt,
  FaRegCopy,
  FaExclamationTriangle,
} from "react-icons/fa";

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

const STATUSES = [
  { value: "Available Today", dot: "bg-emerald-500" },
  { value: "Available Tomorrow", dot: "bg-sky-500" },
  { value: "Busy", dot: "bg-amber-500" },
];

const CURRENCY = "৳";

const defaultWeekly = () =>
  DAYS.map((_, day) => ({
    day,
    enabled: day >= 1 && day <= 5,
    start: "09:00",
    end: "17:00",
  }));

const authConfig = () => ({
  withCredentials: true,
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
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

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

const initials = (name) =>
  String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase() || "D";

const toMinutes = (time) => {
  if (!time) return 0;

  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const slotCount = (day, slot) =>
  day.enabled && day.start && day.end && day.end > day.start
    ? Math.floor((toMinutes(day.end) - toMinutes(day.start)) / slot)
    : 0;

const inputClass =
  "mt-1.5 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none bg-white transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15 disabled:bg-slate-50 disabled:text-slate-500";

const PENDING_LABELS = {
  specialty: "specialty",
  qualifications: "qualifications",
  licenseNumber: "license number",
};

// ------------------------------------------------------------------
// UI components
// ------------------------------------------------------------------

function Card({ id, title, subtitle, aside, children }) {
  return (
    <section
      id={id}
      className="bg-white rounded-2xl border border-slate-200/80 shadow-sm scroll-mt-24"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>

          {subtitle && (
            <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
          )}
        </div>

        {aside}
      </header>

      <div className="p-6 space-y-5">{children}</div>
    </section>
  );
}

function Field({ label, htmlFor, hint, children, className = "" }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="text-xs font-medium text-slate-600">
        {label}
      </label>

      {children}

      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

function Banner({ tone, children, onDismiss }) {
  const tones = {
    error: "border-rose-200 bg-rose-50 text-rose-800",
    success: "border-teal-200 bg-teal-50 text-teal-800",
    warn: "border-amber-200 bg-amber-50 text-amber-900",
  };

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex items-start justify-between gap-4 rounded-xl border px-4 py-3 text-sm ${tones[tone]}`}
    >
      <div>{children}</div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="mt-0.5 opacity-60 hover:opacity-100"
        >
          <FaTimes />
        </button>
      )}
    </div>
  );
}

function Stat({ icon, value, label }) {
  return (
    <div className="flex-1 text-center px-2 py-3">
      <div className="text-lg font-semibold text-slate-900 flex items-center justify-center gap-1.5">
        {icon}
        {value}
      </div>

      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-6 rounded-full transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40 ${
        checked ? "bg-teal-700" : "bg-slate-300"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          checked ? "translate-x-4" : ""
        }`}
      />
    </button>
  );
}

const SECTIONS = [
  ["personal", "Personal details"],
  ["practice", "Practice"],
  ["credentials", "Credentials"],
  ["schedule", "Weekly schedule"],
  ["daysoff", "Days off"],
  ["security", "Password"],
];

// ------------------------------------------------------------------
// Doctor profile page
// ------------------------------------------------------------------

export default function DoctorProfile() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState(null);

  const [meta, setMeta] = useState({
    rating: 0,
    isVerified: false,
    isActive: true,
    verifiedAt: null,
    rejectionReason: "",
  });

  const emptyForm = {
    name: "",
    email: "",
    phone: "",
    bio: "",
    image: "",
    hospital: "",
    experience: "",
    consultationFee: "",
    visitTypes: ["In-person"],

    // This field stores the patient-facing availability label.
    status: "Available Today",

    specialty: "",
    qualifications: "",
    licenseNumber: "",
    slotMinutes: 30,
    weekly: defaultWeekly(),
    daysOff: [],
  };

  const [form, setForm] = useState(emptyForm);
  const [initial, setInitial] = useState(JSON.stringify(emptyForm));
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

  const set = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const dirty = JSON.stringify(form) !== initial;

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return undefined;

    const handler = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);

    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // ---------------------------------------------------------------
  // Convert backend data into the frontend form.
  // ---------------------------------------------------------------

  const applyServer = useCallback((user, doctor) => {
    const savedSchedule =
      doctor?.schedule && typeof doctor.schedule === "object"
        ? doctor.schedule
        : null;

    const savedAvailability = [
      "Available Today",
      "Available Tomorrow",
      "Busy",
    ].includes(doctor?.availability)
      ? doctor.availability
      : "Available Today";

    const next = {
      name: user?.name || doctor?.name || "",
      email: user?.email || doctor?.email || "",
      phone: user?.phone || doctor?.phone || "",
      bio: doctor?.bio || "",
      image: doctor?.image || doctor?.photo || "",

      hospital:
        doctor?.hospital && doctor.hospital !== "Not set"
          ? doctor.hospital
          : "",

      experience: doctor?.experience ?? "",
      consultationFee: doctor?.consultationFee ?? doctor?.fee ?? "",

      visitTypes:
        Array.isArray(doctor?.visitTypes) && doctor.visitTypes.length > 0
          ? doctor.visitTypes
          : ["In-person"],

      // Read the patient-facing availability string from MongoDB.
      status: savedAvailability,

      specialty: doctor?.specialty || "",

      qualifications: Array.isArray(doctor?.qualifications)
        ? doctor.qualifications.join(", ")
        : doctor?.qualifications || "",

      licenseNumber: doctor?.licenseNumber || "",

      // Read the weekly schedule from the separate schedule field.
      slotMinutes: savedSchedule?.slotMinutes ?? 30,

      weekly:
        Array.isArray(savedSchedule?.weekly) &&
        savedSchedule.weekly.length === 7
          ? [...savedSchedule.weekly].sort((a, b) => a.day - b.day)
          : defaultWeekly(),

      daysOff: Array.isArray(doctor?.daysOff) ? doctor.daysOff : [],
    };

    setForm(next);
    setInitial(JSON.stringify(next));

    setMeta({
      rating: doctor?.rating || 0,
      isVerified: Boolean(doctor?.isVerified),
      isActive: doctor?.isActive !== false,
      verifiedAt: doctor?.verifiedAt || null,
      rejectionReason: doctor?.rejectionReason || "",
    });

    setPending(
      doctor?.pendingChanges?.status === "Pending"
        ? doctor.pendingChanges
        : null,
    );
  }, []);

  // ---------------------------------------------------------------
  // Load doctor profile.
  // ---------------------------------------------------------------

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await axios.get(`${API}/profile`, authConfig());
      const data = response.data?.data;

      if (!data) {
        throw new Error("The server returned an empty profile.");
      }

      applyServer(data.user, data.doctor);
    } catch (err) {
      console.error("Load doctor profile error:", err);
      setError(errorText(err, "Could not load your profile."));
    } finally {
      setLoading(false);
    }
  }, [applyServer]);

  useEffect(() => {
    load();
  }, [load]);

  // ---------------------------------------------------------------
  // Schedule actions.
  // ---------------------------------------------------------------

  const setDay = (day, patch) => {
    setForm((current) => ({
      ...current,
      weekly: current.weekly.map((item) =>
        item.day === day ? { ...item, ...patch } : item,
      ),
    }));
  };

  const applyToAll = (source) => {
    setForm((current) => ({
      ...current,
      weekly: current.weekly.map((item) =>
        item.enabled ? { ...item, start: source.start, end: source.end } : item,
      ),
    }));
  };

  const toggleVisitType = (type) => {
    setForm((current) => ({
      ...current,
      visitTypes: current.visitTypes.includes(type)
        ? current.visitTypes.filter((item) => item !== type)
        : [...current.visitTypes, type],
    }));
  };

  const addDayOff = () => {
    if (!newOff || form.daysOff.includes(newOff)) return;

    set("daysOff", [...form.daysOff, newOff].sort());
    setNewOff("");
  };

  const weeklySlots = useMemo(
    () =>
      form.weekly.reduce(
        (sum, day) => sum + slotCount(day, Number(form.slotMinutes)),
        0,
      ),
    [form.weekly, form.slotMinutes],
  );

  // ---------------------------------------------------------------
  // Validate form.
  // ---------------------------------------------------------------

  const validate = () => {
    if (!form.name.trim()) return "Enter your name.";

    if (!STATUSES.some((item) => item.value === form.status)) {
      return "Choose a valid availability status.";
    }

    if (form.visitTypes.length === 0) {
      return "Choose at least one visit type.";
    }

    if (
      form.consultationFee !== "" &&
      (!Number.isFinite(Number(form.consultationFee)) ||
        Number(form.consultationFee) < 0)
    ) {
      return "Fee must be a valid non-negative number.";
    }

    if (
      form.experience !== "" &&
      (!Number.isFinite(Number(form.experience)) || Number(form.experience) < 0)
    ) {
      return "Experience must be a valid non-negative number.";
    }

    if (!SLOT_LENGTHS.includes(Number(form.slotMinutes))) {
      return "Choose a valid appointment slot length.";
    }

    if (form.image && !/^https?:\/\//i.test(form.image.trim())) {
      return "Photo link must start with http:// or https://";
    }

    for (const day of form.weekly) {
      if (day.enabled && (!day.start || !day.end || day.start >= day.end)) {
        return `${DAYS[day.day]}: end time must be after start time.`;
      }
    }

    return "";
  };

  // ---------------------------------------------------------------
  // Save profile, availability, schedule and days off.
  // ---------------------------------------------------------------

  const save = async () => {
    setError("");
    setSuccess("");

    const problem = validate();

    if (problem) {
      setError(problem);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setSaving(true);

    try {
      const requestBody = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        bio: form.bio,
        photo: form.image.trim(),
        hospital: form.hospital.trim() || "Not set",

        // Backend schema field: availability is a STRING enum.
        availability: form.status,

        // Backend schema field: status is a separate operational status.
        status: form.status === "Busy" ? "Busy" : "Available",

        experience:
          form.experience === "" ? undefined : Number(form.experience),

        fee:
          form.consultationFee === ""
            ? undefined
            : Number(form.consultationFee),

        visitTypes: form.visitTypes,
        specialty: form.specialty,
        qualifications: form.qualifications,
        licenseNumber: form.licenseNumber,

        // Store weekly working hours in schedule, NOT availability.
        schedule: {
          slotMinutes: Number(form.slotMinutes),
          weekly: form.weekly.map((day) => ({
            day: Number(day.day),
            enabled: Boolean(day.enabled),
            start: day.start,
            end: day.end,
          })),
        },

        daysOff: form.daysOff,
      };

      const response = await axios.patch(
        `${API}/profile`,
        requestBody,
        authConfig(),
      );

      const data = response.data?.data;
      const doctor = data?.doctor || data;

      // Use the response returned by the backend to synchronize the form.
      if (doctor && typeof doctor === "object") {
        const savedAvailability = [
          "Available Today",
          "Available Tomorrow",
          "Busy",
        ].includes(doctor.availability)
          ? doctor.availability
          : form.status;

        const savedSchedule =
          doctor.schedule && typeof doctor.schedule === "object"
            ? doctor.schedule
            : requestBody.schedule;

        const savedForm = {
          ...form,
          name: doctor.name ?? form.name.trim(),
          phone: doctor.phone ?? form.phone.trim(),
          bio: doctor.bio ?? form.bio,
          image: doctor.image ?? doctor.photo ?? form.image.trim(),
          hospital:
            doctor.hospital && doctor.hospital !== "Not set"
              ? doctor.hospital
              : doctor.hospital === "Not set"
                ? ""
                : form.hospital,
          status: savedAvailability,
          experience: doctor.experience ?? form.experience,
          consultationFee:
            doctor.consultationFee ?? doctor.fee ?? form.consultationFee,
          visitTypes: doctor.visitTypes ?? form.visitTypes,
          specialty: doctor.specialty ?? form.specialty,
          qualifications: Array.isArray(doctor.qualifications)
            ? doctor.qualifications.join(", ")
            : (doctor.qualifications ?? form.qualifications),
          licenseNumber: doctor.licenseNumber ?? form.licenseNumber,
          slotMinutes: savedSchedule.slotMinutes ?? Number(form.slotMinutes),
          weekly:
            Array.isArray(savedSchedule.weekly) &&
            savedSchedule.weekly.length === 7
              ? [...savedSchedule.weekly].sort((a, b) => a.day - b.day)
              : form.weekly,
          daysOff: doctor.daysOff ?? form.daysOff,
        };

        setForm(savedForm);
        setInitial(JSON.stringify(savedForm));

        setMeta({
          rating: doctor.rating ?? meta.rating,
          isVerified: doctor.isVerified ?? meta.isVerified,
          isActive: doctor.isActive ?? meta.isActive,
          verifiedAt: doctor.verifiedAt ?? meta.verifiedAt,
          rejectionReason: doctor.rejectionReason ?? meta.rejectionReason,
        });

        setPending(
          doctor.pendingChanges?.status === "Pending"
            ? doctor.pendingChanges
            : null,
        );
      } else {
        // If the API returns no doctor object, mark the submitted values saved.
        setInitial(JSON.stringify(form));
      }

      // Keep the locally stored user name in sync.
      try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");

        localStorage.setItem(
          "user",
          JSON.stringify({
            ...user,
            name: form.name.trim(),
          }),
        );
      } catch {
        // Ignore localStorage parsing errors.
      }

      setSuccess(
        response.data?.pending
          ? "Saved. Your specialty, qualifications or license changes are waiting for admin approval."
          : "Your profile, availability and schedule have been saved.",
      );

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Save doctor profile error:", err);
      setError(errorText(err, "Could not save your profile."));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------
  // Change password.
  // ---------------------------------------------------------------

  const changePassword = async () => {
    setPwError("");
    setPwSuccess("");

    if (!pw.currentPassword || !pw.newPassword || !pw.confirm) {
      setPwError("Fill in all password fields.");
      return;
    }

    if (pw.newPassword.length < 8) {
      setPwError("New password must be at least 8 characters.");
      return;
    }

    if (pw.newPassword !== pw.confirm) {
      setPwError("New passwords do not match.");
      return;
    }

    setPwSaving(true);

    try {
      await axios.patch(
        `${API}/password`,
        {
          currentPassword: pw.currentPassword,
          newPassword: pw.newPassword,
        },
        authConfig(),
      );

      setPw({
        currentPassword: "",
        newPassword: "",
        confirm: "",
      });

      setPwSuccess("Password updated.");
    } catch (err) {
      setPwError(errorText(err, "Could not update the password."));
    } finally {
      setPwSaving(false);
    }
  };

  // ---------------------------------------------------------------
  // Loading state.
  // ---------------------------------------------------------------

  if (loading) {
    return (
      <div className="min-h-screen px-8 py-7 max-w-6xl animate-pulse space-y-4">
        <div className="h-8 w-64 bg-slate-200 rounded" />
        <div className="h-4 w-96 bg-slate-100 rounded" />

        <div className="grid lg:grid-cols-[300px_1fr] gap-6 pt-4">
          <div className="h-80 bg-slate-100 rounded-2xl" />
          <div className="h-[28rem] bg-slate-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  const selectedStatus =
    STATUSES.find((item) => item.value === form.status) || STATUSES[0];

  const pendingKeys = pending
    ? Object.keys(PENDING_LABELS).filter((key) => pending[key] !== undefined)
    : [];

  const workingDays = form.weekly.filter((day) => day.enabled);
  const firstWorking = workingDays[0];

  // ---------------------------------------------------------------
  // Main page.
  // ---------------------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-50/60 pb-28">
      <main className="px-4 sm:px-8 py-7 max-w-6xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Profile &amp; availability
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Keep your details current and set the hours patients can book.
          </p>
        </div>

        {error && (
          <Banner tone="error" onDismiss={() => setError("")}>
            {error}
          </Banner>
        )}

        {success && (
          <Banner tone="success" onDismiss={() => setSuccess("")}>
            {success}
          </Banner>
        )}

        {!meta.isVerified && meta.rejectionReason && (
          <Banner tone="error">
            <span className="font-semibold">Verification was declined: </span>
            {meta.rejectionReason}. Update your credentials below and save to
            resubmit.
          </Banner>
        )}

        {!meta.isVerified && !meta.rejectionReason && (
          <Banner tone="warn">
            Your account is awaiting admin verification. Patients will see you
            once it is approved.
          </Banner>
        )}

        {pendingKeys.length > 0 && (
          <Banner tone="warn">
            Waiting for admin approval:{" "}
            {pendingKeys.map((key) => PENDING_LABELS[key]).join(", ")}. Your
            current approved details stay visible to patients until then.
          </Banner>
        )}

        <div className="grid lg:grid-cols-[300px_minmax(0,1fr)] gap-6 items-start">
          {/* Sidebar */}
          <aside className="lg:sticky lg:top-6 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="h-16 bg-gradient-to-r from-teal-700 to-teal-600" />

              <div className="px-6 pb-6 -mt-10 text-center">
                {form.image ? (
                  <img
                    src={form.image}
                    alt={form.name || "Doctor"}
                    className="w-20 h-20 rounded-full object-cover border-4 border-white mx-auto bg-white"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full border-4 border-white mx-auto bg-teal-700 text-white flex items-center justify-center text-2xl font-semibold">
                    {initials(form.name)}
                  </div>
                )}

                <h2 className="mt-3 font-semibold text-slate-900 leading-tight">
                  {form.name || "Your name"}
                </h2>

                <p className="text-sm text-slate-500">
                  {form.specialty || "Specialty not set"}
                </p>

                {form.hospital && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    {form.hospital}
                  </p>
                )}

                <div className="flex flex-wrap justify-center gap-2 mt-3">
                  {meta.isVerified ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-100 px-2.5 py-1 rounded-full">
                      <FaCheckCircle />
                      Verified
                      {meta.verifiedAt && ` · ${formatDate(meta.verifiedAt)}`}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full">
                      <FaExclamationTriangle />
                      Not verified
                    </span>
                  )}

                  {!meta.isActive && (
                    <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                      Inactive
                    </span>
                  )}
                </div>
              </div>

              <div className="flex divide-x divide-slate-100 border-t border-slate-100">
                <Stat
                  value={form.experience === "" ? "–" : `${form.experience}y`}
                  label="Experience"
                />

                <Stat
                  icon={<FaStar className="text-amber-400 text-sm" />}
                  value={meta.rating ? Number(meta.rating).toFixed(1) : "New"}
                  label="Rating"
                />

                <Stat
                  value={
                    form.consultationFee === ""
                      ? "–"
                      : `${CURRENCY}${Number(form.consultationFee)}`
                  }
                  label="Fee"
                />
              </div>

              {/* Patient-facing availability */}
              <div className="px-6 py-4 border-t border-slate-100">
                <label
                  htmlFor="p-status"
                  className="text-xs font-medium text-slate-600"
                >
                  Availability shown to patients
                </label>

                <div className="relative mt-1.5">
                  <span
                    className={`absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${selectedStatus.dot}`}
                  />

                  <select
                    id="p-status"
                    value={form.status}
                    onChange={(event) => set("status", event.target.value)}
                    className="w-full border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-sm outline-none bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15"
                  >
                    {STATUSES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.value}
                      </option>
                    ))}
                  </select>
                </div>

                <p className="text-xs text-slate-400 mt-2">
                  Remember to save your changes to update your availability.
                </p>
              </div>
            </div>

            <nav
              aria-label="Page sections"
              className="hidden lg:block bg-white rounded-2xl border border-slate-200/80 shadow-sm p-2"
            >
              {SECTIONS.map(([id, label]) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className="block px-4 py-2 text-sm text-slate-600 rounded-lg hover:bg-slate-50 hover:text-teal-800"
                >
                  {label}
                </a>
              ))}
            </nav>
          </aside>

          {/* Main content */}
          <div className="space-y-6 min-w-0">
            {/* Personal details */}
            <Card
              id="personal"
              title="Personal details"
              subtitle="Shown to patients when they choose a doctor."
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Full name" htmlFor="p-name">
                  <input
                    id="p-name"
                    value={form.name}
                    onChange={(event) => set("name", event.target.value)}
                    className={inputClass}
                  />
                </Field>

                <Field
                  label="Email"
                  htmlFor="p-email"
                  hint="Email is your login and can't be changed here."
                >
                  <input
                    id="p-email"
                    value={form.email}
                    disabled
                    className={inputClass}
                  />
                </Field>

                <Field label="Phone" htmlFor="p-phone">
                  <input
                    id="p-phone"
                    type="tel"
                    value={form.phone}
                    onChange={(event) => set("phone", event.target.value)}
                    placeholder="+880 1XXX-XXXXXX"
                    className={inputClass}
                  />
                </Field>

                <Field label="Hospital / clinic" htmlFor="p-hosp">
                  <input
                    id="p-hosp"
                    value={form.hospital}
                    onChange={(event) => set("hospital", event.target.value)}
                    placeholder="Where you practise"
                    className={inputClass}
                  />
                </Field>

                <Field
                  label="Photo link"
                  htmlFor="p-photo"
                  className="sm:col-span-2"
                  hint="Paste a link to a square photo. It appears in the card on the left."
                >
                  <input
                    id="p-photo"
                    value={form.image}
                    onChange={(event) => set("image", event.target.value)}
                    placeholder="https://..."
                    className={inputClass}
                  />
                </Field>

                <Field
                  label="About you"
                  htmlFor="p-bio"
                  className="sm:col-span-2"
                >
                  <textarea
                    id="p-bio"
                    rows={4}
                    maxLength={1000}
                    value={form.bio}
                    onChange={(event) => set("bio", event.target.value)}
                    placeholder="A short introduction patients will read before booking."
                    className={inputClass}
                  />

                  <p className="text-xs text-slate-400 mt-1 text-right">
                    {form.bio.length}/1000
                  </p>
                </Field>
              </div>
            </Card>

            {/* Practice */}
            <Card
              id="practice"
              title="Practice"
              subtitle="Changes here are published as soon as you save."
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Experience (years)" htmlFor="p-exp">
                  <input
                    id="p-exp"
                    type="number"
                    min="0"
                    value={form.experience}
                    onChange={(event) => set("experience", event.target.value)}
                    className={inputClass}
                  />
                </Field>

                <Field label={`Consultation fee (${CURRENCY})`} htmlFor="p-fee">
                  <input
                    id="p-fee"
                    type="number"
                    min="0"
                    value={form.consultationFee}
                    onChange={(event) =>
                      set("consultationFee", event.target.value)
                    }
                    className={inputClass}
                  />
                </Field>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-600">
                  Visit types you offer
                </p>

                <div className="flex flex-wrap gap-2 mt-2">
                  {VISIT_TYPES.map((type) => {
                    const selected = form.visitTypes.includes(type);

                    return (
                      <button
                        key={type}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => toggleVisitType(type)}
                        className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition ${
                          selected
                            ? "bg-teal-700 text-white border-teal-700"
                            : "bg-white text-slate-600 border-slate-200 hover:border-teal-600 hover:text-teal-800"
                        }`}
                      >
                        {type}
                      </button>
                    );
                  })}
                </div>
              </div>
            </Card>

            {/* Credentials */}
            <Card
              id="credentials"
              title="Verified credentials"
              subtitle="An admin reviews changes to these fields before patients see them."
              aside={
                pendingKeys.length > 0 && (
                  <span className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full">
                    Review pending
                  </span>
                )
              }
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Specialty" htmlFor="p-spec">
                  <input
                    id="p-spec"
                    value={form.specialty}
                    onChange={(event) => set("specialty", event.target.value)}
                    className={inputClass}
                  />
                </Field>

                <Field label="License number" htmlFor="p-lic">
                  <input
                    id="p-lic"
                    value={form.licenseNumber}
                    onChange={(event) =>
                      set("licenseNumber", event.target.value)
                    }
                    placeholder="e.g. BMDC A-12345"
                    className={inputClass}
                  />
                </Field>

                <Field
                  label="Qualifications"
                  htmlFor="p-qual"
                  className="sm:col-span-2"
                  hint="Separate with commas."
                >
                  <input
                    id="p-qual"
                    value={form.qualifications}
                    onChange={(event) =>
                      set("qualifications", event.target.value)
                    }
                    placeholder="e.g. MBBS, FCPS (Medicine)"
                    className={inputClass}
                  />
                </Field>
              </div>
            </Card>

            {/* Weekly schedule */}
            <Card
              id="schedule"
              title="Weekly schedule"
              subtitle="Patients can only book inside these hours. Booked slots are hidden automatically."
              aside={
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                  <FaRegClock />
                  {weeklySlots} slots per week
                </span>
              }
            >
              <div className="flex flex-wrap items-end justify-between gap-4">
                <Field label="Slot length" htmlFor="p-slot" className="w-48">
                  <select
                    id="p-slot"
                    value={form.slotMinutes}
                    onChange={(event) =>
                      set("slotMinutes", Number(event.target.value))
                    }
                    className={inputClass}
                  >
                    {SLOT_LENGTHS.map((minutes) => (
                      <option key={minutes} value={minutes}>
                        {minutes} minutes
                      </option>
                    ))}
                  </select>
                </Field>

                {firstWorking && workingDays.length > 1 && (
                  <button
                    type="button"
                    onClick={() => applyToAll(firstWorking)}
                    className="inline-flex items-center gap-2 text-sm font-medium text-teal-800 hover:bg-teal-50 border border-teal-200 px-3.5 py-2 rounded-lg"
                  >
                    <FaRegCopy className="text-xs" />
                    Use {DAYS[firstWorking.day]}&apos;s hours for all days
                  </button>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                {form.weekly.map((day) => {
                  const count = slotCount(day, Number(form.slotMinutes));
                  const invalid = day.enabled && day.end <= day.start;

                  return (
                    <div
                      key={day.day}
                      className={`px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2 ${
                        day.enabled ? "bg-white" : "bg-slate-50/70"
                      }`}
                    >
                      <div className="flex items-center gap-3 w-44">
                        <Toggle
                          checked={day.enabled}
                          onChange={(value) =>
                            setDay(day.day, { enabled: value })
                          }
                          label={`${DAYS[day.day]} available`}
                        />

                        <span
                          className={`text-sm font-medium ${
                            day.enabled ? "text-slate-900" : "text-slate-400"
                          }`}
                        >
                          {DAYS[day.day]}
                        </span>
                      </div>

                      {day.enabled ? (
                        <>
                          <div className="flex items-center gap-2">
                            <input
                              type="time"
                              aria-label={`${DAYS[day.day]} start time`}
                              value={day.start}
                              onChange={(event) =>
                                setDay(day.day, {
                                  start: event.target.value,
                                })
                              }
                              className={`border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-teal-600 ${
                                invalid ? "border-rose-300" : "border-slate-200"
                              }`}
                            />

                            <span className="text-sm text-slate-400">to</span>

                            <input
                              type="time"
                              aria-label={`${DAYS[day.day]} end time`}
                              value={day.end}
                              onChange={(event) =>
                                setDay(day.day, {
                                  end: event.target.value,
                                })
                              }
                              className={`border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-teal-600 ${
                                invalid ? "border-rose-300" : "border-slate-200"
                              }`}
                            />
                          </div>

                          <span
                            className={`text-xs ml-auto ${
                              invalid ? "text-rose-600" : "text-slate-400"
                            }`}
                          >
                            {invalid
                              ? "End must be after start"
                              : `${count} slots`}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm text-slate-400">Day off</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Days off */}
            <Card
              id="daysoff"
              title="Days off"
              subtitle="Holidays or leave. No slots are offered on these dates."
            >
              <div className="flex flex-wrap items-end gap-3">
                <Field label="Date" htmlFor="p-off" className="w-52">
                  <input
                    id="p-off"
                    type="date"
                    min={todayKey}
                    value={newOff}
                    onChange={(event) => setNewOff(event.target.value)}
                    className={inputClass}
                  />
                </Field>

                <button
                  type="button"
                  onClick={addDayOff}
                  disabled={!newOff}
                  className="flex items-center gap-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  <FaPlus className="text-xs" />
                  Add day off
                </button>
              </div>

              {form.daysOff.length === 0 ? (
                <div className="flex items-center gap-3 text-sm text-slate-400 border border-dashed border-slate-200 rounded-xl px-4 py-5">
                  <FaRegCalendarAlt />
                  No days off added. Pick a date above to block it.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {form.daysOff.map((dayOff) => (
                    <span
                      key={dayOff}
                      className={`inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full ${
                        dayOff < todayKey
                          ? "bg-slate-100 text-slate-400"
                          : "bg-teal-50 text-teal-800"
                      }`}
                    >
                      {formatDay(dayOff)}

                      <button
                        type="button"
                        aria-label={`Remove ${formatDay(dayOff)}`}
                        onClick={() =>
                          set(
                            "daysOff",
                            form.daysOff.filter((item) => item !== dayOff),
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

            {/* Change password */}
            <Card
              id="security"
              title="Change password"
              subtitle="Use at least 8 characters. This is saved separately from your profile."
            >
              {pwError && <Banner tone="error">{pwError}</Banner>}
              {pwSuccess && <Banner tone="success">{pwSuccess}</Banner>}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Current password" htmlFor="pw-cur">
                  <input
                    id="pw-cur"
                    type="password"
                    autoComplete="current-password"
                    value={pw.currentPassword}
                    onChange={(event) =>
                      setPw((current) => ({
                        ...current,
                        currentPassword: event.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </Field>

                <Field label="New password" htmlFor="pw-new">
                  <input
                    id="pw-new"
                    type="password"
                    autoComplete="new-password"
                    value={pw.newPassword}
                    onChange={(event) =>
                      setPw((current) => ({
                        ...current,
                        newPassword: event.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </Field>

                <Field label="Confirm new password" htmlFor="pw-conf">
                  <input
                    id="pw-conf"
                    type="password"
                    autoComplete="new-password"
                    value={pw.confirm}
                    onChange={(event) =>
                      setPw((current) => ({
                        ...current,
                        confirm: event.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </Field>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={changePassword}
                  disabled={pwSaving}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {pwSaving ? "Updating…" : "Update password"}
                </button>
              </div>
            </Card>
          </div>
        </div>
      </main>

      {/* Sticky save bar */}
      <div
        className={`fixed bottom-0 inset-x-0 z-30 transition-transform duration-200 ${
          dirty ? "translate-y-0" : "translate-y-full"
        }`}
        aria-hidden={!dirty}
      >
        <div className="bg-white/95 backdrop-blur border-t border-slate-200 shadow-[0_-4px_16px_rgba(15,23,42,0.06)]">
          <div className="max-w-6xl px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
            <p className="text-sm text-slate-600">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-2" />
              You have unsaved changes.
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setForm(JSON.parse(initial))}
                disabled={saving || !dirty}
                tabIndex={dirty ? 0 : -1}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Discard
              </button>

              <button
                type="button"
                onClick={save}
                disabled={saving || !dirty}
                tabIndex={dirty ? 0 : -1}
                className="bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium px-5 py-2 rounded-lg disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

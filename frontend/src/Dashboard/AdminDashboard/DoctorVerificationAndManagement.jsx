import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Search,
  RefreshCw,
  Stethoscope,
  ShieldCheck,
  Clock3,
  CheckCircle2,
  XCircle,
  Ban,
  Eye,
  X,
  Mail,
  Phone,
  FileText,
  GraduationCap,
  BadgeCheck,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { ADMIN_API, authConfig, errorText } from "./Adminshared.jsx";

const PAGE_SIZE = 8;
const TABS = ["Pending", "Approved", "Rejected", "Suspended"];

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10";

const statusColors = {
  Pending: "bg-amber-50 text-amber-700",
  Approved: "bg-emerald-50 text-emerald-700",
  Rejected: "bg-rose-50 text-rose-700",
  Suspended: "bg-slate-100 text-slate-700",
};

function getId(doctor) {
  return String(doctor?._id || doctor?.id || "");
}

function getDoctorName(doctor) {
  const user = doctor?.user || doctor?.userId || {};
  return (
    doctor?.name ||
    user?.name ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    doctor?.email ||
    user?.email ||
    "Unnamed doctor"
  );
}

function getEmail(doctor) {
  return doctor?.email || doctor?.user?.email || doctor?.userId?.email || "";
}

function getPhone(doctor) {
  return doctor?.phone || doctor?.user?.phone || doctor?.userId?.phone || "";
}

function getLicense(doctor) {
  return doctor?.licenseNumber || doctor?.medicalLicenseNumber || "";
}

function getQualifications(doctor) {
  const value =
    doctor?.qualifications || doctor?.qualification || doctor?.education || "";
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        typeof item === "string"
          ? item
          : item?.degree || item?.title || item?.name || "",
      )
      .filter(Boolean);
  }
  return value ? [String(value)] : [];
}

function getSpecialty(doctor) {
  return (
    doctor?.specialty || doctor?.specialization || doctor?.department || ""
  );
}

function getDocuments(doctor) {
  const source =
    doctor?.documents ||
    doctor?.verificationDocuments ||
    doctor?.licenseDocuments ||
    [];
  const docs = Array.isArray(source) ? source : source ? [source] : [];

  return docs.map((item, index) =>
    typeof item === "string"
      ? { name: `Document ${index + 1}`, url: item }
      : {
          name:
            item?.name ||
            item?.title ||
            item?.fileName ||
            `Document ${index + 1}`,
          url: item?.url || item?.fileUrl || item?.documentUrl || "",
        },
  );
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

/*
 * Current Doctor model fields:
 *   isVerified: Boolean
 *   isActive: Boolean
 *   user: ObjectId reference
 *
 * Rejection status/reason require extra fields and backend support.
 */
function getStatus(doctor) {
  if (doctor?.isActive === false) return "Suspended";
  if (doctor?.rejectionReason) return "Rejected";
  return doctor?.isVerified === true ? "Approved" : "Pending";
}

function getDoctorList(response) {
  const root = response?.data ?? response ?? {};
  const list = Array.isArray(root)
    ? root
    : (root?.data?.doctors ??
      root?.data?.results ??
      root?.data ??
      root?.doctors ??
      root?.results ??
      []);

  return Array.isArray(list) ? list : [];
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        statusColors[status] || statusColors.Pending
      }`}
    >
      {status}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  const colorClasses = {
    teal: "bg-teal-50 text-teal-700",
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${
            colorClasses[color] || colorClasses.teal
          }`}
        >
          <Icon size={21} />
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon size={17} className="mt-0.5 shrink-0 text-slate-400" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="break-words text-sm font-medium text-slate-700">
          {value || "Not provided"}
        </p>
      </div>
    </div>
  );
}

function ActionDialog({
  action,
  doctor,
  reason,
  setReason,
  busy,
  error,
  onClose,
  onConfirm,
}) {
  if (!action || !doctor) return null;

  const needsReason = action === "reject" || action === "suspend";
  const titles = {
    approve: "Approve doctor application?",
    reject: "Reject doctor application?",
    suspend: "Suspend doctor?",
    restore: "Restore doctor?",
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
      <section
        role="dialog"
        aria-modal="true"
        className="my-auto w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900">{titles[action]}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        <p className="mt-2 text-sm text-slate-500">
          {getDoctorName(doctor)}
          {getEmail(doctor) ? ` · ${getEmail(doctor)}` : ""}
        </p>

        {action === "approve" && (
          <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm leading-6 text-emerald-800">
            Confirm that the submitted qualifications and medical license have
            been reviewed.
          </p>
        )}

        {needsReason && (
          <div className="mt-4">
            <label
              htmlFor="doctor-action-reason"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              {action === "reject"
                ? "Reason for rejection"
                : "Reason for suspension"}{" "}
              *
            </label>
            <textarea
              id="doctor-action-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={4}
              maxLength={500}
              placeholder="Enter the reason..."
              className={inputClass}
            />
          </div>
        )}

        {action === "restore" && (
          <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
            This restores the doctor's active status. Booking eligibility must
            still require verification.
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700"
          >
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || (needsReason && !reason.trim())}
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${
              needsReason ? "bg-rose-600" : "bg-teal-700"
            }`}
          >
            {busy
              ? "Saving..."
              : action === "approve"
                ? "Approve application"
                : action === "reject"
                  ? "Reject application"
                  : action === "suspend"
                    ? "Confirm suspension"
                    : "Restore doctor"}
          </button>
        </div>
      </section>
    </div>
  );
}

export default function DoctorVerificationAndManagement() {
  const [doctors, setDoctors] = useState([]);
  const [tab, setTab] = useState("Pending");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [action, setAction] = useState(null);
  const [reason, setReason] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);

  const loadDoctors = useCallback(async (mode = "initial") => {
    if (mode === "initial") setLoading(true);
    if (mode === "manual") setRefreshing(true);
    setError("");

    try {
      const response = await axios.get(`${ADMIN_API}/doctors`, authConfig());
      setDoctors(getDoctorList(response.data));
    } catch (err) {
      console.error("Could not load doctors:", err);
      setError(errorText(err, "Could not load doctor applications."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDoctors();
    const onFocus = () => loadDoctors("silent");
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadDoctors]);

  const counts = useMemo(() => {
    const result = { Pending: 0, Approved: 0, Rejected: 0, Suspended: 0 };
    doctors.forEach((doctor) => {
      result[getStatus(doctor)] += 1;
    });
    return result;
  }, [doctors]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return doctors.filter((doctor) => {
      const searchable = [
        getDoctorName(doctor),
        getEmail(doctor),
        getPhone(doctor),
        getLicense(doctor),
        getSpecialty(doctor),
        ...getQualifications(doctor),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        getStatus(doctor) === tab && (!query || searchable.includes(query))
      );
    });
  }, [doctors, tab, search]);

  useEffect(() => setPage(1), [tab, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageDoctors = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const openAction = (type, doctor) => {
    setSelectedDoctor(doctor);
    setAction(type);
    setReason("");
    setActionError("");
  };

  const closeAction = () => {
    if (busy) return;
    setAction(null);
    setActionError("");
    setReason("");
  };

  const performAction = async () => {
    if (!selectedDoctor || !action) return;

    const id = getId(selectedDoctor);
    if (!id) {
      setActionError("The doctor record has no valid ID.");
      return;
    }

    if ((action === "reject" || action === "suspend") && !reason.trim()) {
      setActionError("A reason is required.");
      return;
    }

    setBusy(true);
    setActionError("");
    setError("");
    setNotice("");

    try {
      const doctorUrl = `${ADMIN_API}/doctors/${encodeURIComponent(id)}`;

      if (action === "approve") {
        await axios.put(
          `${doctorUrl}/verify`,
          { isVerified: true },
          authConfig(),
        );
      } else if (action === "reject") {
        await axios.put(
          `${doctorUrl}/verify`,
          { isVerified: false, rejectionReason: reason.trim() },
          authConfig(),
        );
      } else {
        setActionError(
          "Suspend and restore require a backend status endpoint. Add that route before using these actions.",
        );
        return;
      }

      setNotice(
        action === "approve"
          ? "Doctor application approved successfully."
          : "Doctor application rejected. Note: your current backend needs a rejectionReason field in the Doctor schema to preserve the reason.",
      );
      setAction(null);
      setSelectedDoctor(null);
      setReason("");
      await loadDoctors("silent");
    } catch (err) {
      console.error("Doctor management action failed:", err);
      setActionError(
        errorText(err, "Could not complete the doctor management action."),
      );
    } finally {
      setBusy(false);
    }
  };

  const resetSearch = () => setSearch("");

  return (
    <div className="min-h-screen bg-[#f7f9fc]">
      <header className="border-b border-slate-200 bg-white px-4 py-5 sm:px-7">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-teal-700">
              Admin console
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Doctor Verification &amp; Management
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Review qualifications, verify licenses and manage doctor access.
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadDoctors("manual")}
            disabled={refreshing}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] space-y-6 px-4 py-6 sm:px-7">
        {notice && (
          <div
            role="status"
            className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            <CheckCircle2 size={19} />
            <p className="flex-1">{notice}</p>
            <button onClick={() => setNotice("")} aria-label="Dismiss notice">
              <X size={17} />
            </button>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
          >
            <AlertTriangle size={19} />
            <p className="flex-1">{error}</p>
            <button
              onClick={() => loadDoctors("manual")}
              className="font-semibold underline"
            >
              Retry
            </button>
          </div>
        )}

        <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard
            icon={Clock3}
            label="Pending applications"
            value={counts.Pending}
            color="amber"
          />
          <StatCard
            icon={BadgeCheck}
            label="Approved doctors"
            value={counts.Approved}
            color="emerald"
          />
          <StatCard
            icon={XCircle}
            label="Rejected applications"
            value={counts.Rejected}
            color="rose"
          />
          <StatCard
            icon={Ban}
            label="Suspended doctors"
            value={counts.Suspended}
            color="teal"
          />
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4 sm:p-6">
            <div className="flex flex-wrap gap-2">
              {TABS.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setTab(status)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    tab === status
                      ? "bg-teal-700 text-white"
                      : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {status}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${tab === status ? "bg-white/20" : "bg-slate-100"}`}
                  >
                    {counts[status]}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-bold text-slate-900">{tab} doctors</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Search by name, email, specialty, qualification or license.
                </p>
              </div>
              <div className="relative w-full sm:max-w-sm">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search doctor applications..."
                  className={`${inputClass} pl-9`}
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-xl bg-slate-100"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <Stethoscope size={32} className="mx-auto text-slate-300" />
              <h3 className="mt-3 font-semibold text-slate-900">
                No {tab.toLowerCase()} doctors found
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {search
                  ? "Try another search term."
                  : "Doctor applications with this status will appear here."}
              </p>
              {search && (
                <button
                  onClick={resetSearch}
                  className="mt-3 text-sm font-semibold text-teal-700"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[950px] text-left">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-4">Doctor</th>
                      <th className="px-4 py-4">Specialty</th>
                      <th className="px-4 py-4">License</th>
                      <th className="px-4 py-4">Qualifications</th>
                      <th className="px-4 py-4">Status</th>
                      <th className="px-5 py-4 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pageDoctors.map((doctor) => {
                      const qualifications = getQualifications(doctor);
                      return (
                        <tr key={getId(doctor)} className="hover:bg-slate-50">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-700">
                                <Stethoscope size={18} />
                              </div>
                              <div className="min-w-0">
                                <p className="max-w-[230px] truncate text-sm font-semibold text-slate-900">
                                  {getDoctorName(doctor)}
                                </p>
                                <p className="max-w-[230px] truncate text-xs text-slate-500">
                                  {getEmail(doctor) || "No email"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-600">
                            {getSpecialty(doctor) || "Not provided"}
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-600">
                            {getLicense(doctor) || "Not provided"}
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-600">
                            {qualifications.length
                              ? qualifications.slice(0, 2).join(", ")
                              : "Not provided"}
                            {qualifications.length > 2 ? "..." : ""}
                          </td>
                          <td className="px-4 py-4">
                            <StatusBadge status={getStatus(doctor)} />
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedDoctor(doctor)}
                              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
                            >
                              <Eye size={16} /> Review
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4">
                <p className="text-sm text-slate-500">
                  Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                  {Math.min(currentPage * PAGE_SIZE, filtered.length)} of{" "}
                  {filtered.length}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded-lg border p-2 disabled:opacity-40"
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={17} />
                  </button>
                  <span className="text-sm">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="rounded-lg border p-2 disabled:opacity-40"
                    aria-label="Next page"
                  >
                    <ChevronRight size={17} />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        <section className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <ShieldCheck size={20} className="mt-0.5 shrink-0 text-amber-800" />
          <div>
            <h3 className="text-sm font-bold text-amber-900">
              Verification and booking security
            </h3>
            <p className="mt-1 text-sm leading-6 text-amber-900/80">
              The appointment API should allow bookings only for verified,
              active doctors.
            </p>
          </div>
        </section>
      </main>

      {selectedDoctor && (
        <div className="fixed inset-0 z-[70] flex justify-end bg-slate-950/40">
          <button
            className="absolute inset-0"
            onClick={() => setSelectedDoctor(null)}
            aria-label="Close doctor details"
          />
          <aside
            role="dialog"
            aria-modal="true"
            className="relative z-10 h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl"
          >
            <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-teal-700">
                  Application review
                </p>
                <h2 className="mt-1 text-lg font-bold text-slate-900">
                  Doctor details
                </h2>
              </div>
              <button
                onClick={() => setSelectedDoctor(null)}
                aria-label="Close drawer"
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X size={19} />
              </button>
            </header>

            <div className="space-y-6 p-5 sm:p-7">
              <section className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                    <Stethoscope size={25} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="break-words text-lg font-bold text-slate-900">
                      {getDoctorName(selectedDoctor)}
                    </h3>
                    <p className="mt-1 break-all text-sm text-slate-500">
                      {getEmail(selectedDoctor) || "No email provided"}
                    </p>
                    <div className="mt-3">
                      <StatusBadge status={getStatus(selectedDoctor)} />
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="mb-2 text-sm font-bold text-slate-900">
                  Contact and application
                </h3>
                <DetailRow
                  icon={Mail}
                  label="Email"
                  value={getEmail(selectedDoctor)}
                />
                <DetailRow
                  icon={Phone}
                  label="Phone"
                  value={getPhone(selectedDoctor)}
                />
                <DetailRow
                  icon={Stethoscope}
                  label="Specialty"
                  value={getSpecialty(selectedDoctor)}
                />
                <DetailRow
                  icon={BadgeCheck}
                  label="Medical license number"
                  value={getLicense(selectedDoctor)}
                />
                <DetailRow
                  icon={Clock3}
                  label="Application submitted"
                  value={formatDate(selectedDoctor.createdAt)}
                />
                <DetailRow
                  icon={ShieldCheck}
                  label="Doctor record ID"
                  value={getId(selectedDoctor)}
                />
                <DetailRow
                  icon={GraduationCap}
                  label="Experience"
                  value={
                    selectedDoctor.experience != null
                      ? `${selectedDoctor.experience} years`
                      : ""
                  }
                />
                <DetailRow
                  icon={Stethoscope}
                  label="Hospital"
                  value={selectedDoctor.hospital}
                />
                <DetailRow
                  icon={FileText}
                  label="Consultation fee"
                  value={
                    selectedDoctor.consultationFee != null
                      ? String(selectedDoctor.consultationFee)
                      : ""
                  }
                />
              </section>

              <section>
                <h3 className="mb-3 text-sm font-bold text-slate-900">
                  Qualifications
                </h3>
                {getQualifications(selectedDoctor).length ? (
                  <ul className="space-y-2">
                    {getQualifications(selectedDoctor).map(
                      (qualification, index) => (
                        <li
                          key={`${qualification}-${index}`}
                          className="flex items-start gap-3 rounded-xl border border-slate-100 p-3"
                        >
                          <GraduationCap
                            size={18}
                            className="mt-0.5 shrink-0 text-teal-700"
                          />
                          <span className="text-sm text-slate-700">
                            {qualification}
                          </span>
                        </li>
                      ),
                    )}
                  </ul>
                ) : (
                  <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                    No qualifications have been provided.
                  </p>
                )}
              </section>

              <section>
                <h3 className="mb-3 text-sm font-bold text-slate-900">
                  Verification documents
                </h3>
                {getDocuments(selectedDoctor).length ? (
                  <div className="space-y-2">
                    {getDocuments(selectedDoctor).map((document, index) => (
                      <div
                        key={`${document.name}-${index}`}
                        className="flex items-center gap-3 rounded-xl border border-slate-100 p-3"
                      >
                        <FileText
                          size={19}
                          className="shrink-0 text-teal-700"
                        />
                        <span className="min-w-0 flex-1 break-words text-sm font-medium text-slate-700">
                          {document.name}
                        </span>
                        {document.url ? (
                          <a
                            href={document.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-teal-700 hover:underline"
                          >
                            View <ExternalLink size={14} />
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400">No URL</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                    No verification documents have been provided.
                  </p>
                )}
              </section>

              {selectedDoctor.rejectionReason && (
                <section className="rounded-xl border border-rose-100 bg-rose-50 p-4">
                  <h3 className="text-sm font-bold text-rose-800">
                    Rejection reason
                  </h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-rose-700">
                    {selectedDoctor.rejectionReason}
                  </p>
                </section>
              )}

              <section>
                <h3 className="mb-3 text-sm font-bold text-slate-900">
                  Administrative actions
                </h3>
                <div className="space-y-2">
                  {getStatus(selectedDoctor) === "Pending" && (
                    <>
                      <button
                        onClick={() => openAction("approve", selectedDoctor)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 p-3 text-sm font-semibold text-white hover:bg-teal-800"
                      >
                        <CheckCircle2 size={17} /> Approve application
                      </button>
                      <button
                        onClick={() => openAction("reject", selectedDoctor)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 p-3 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                      >
                        <XCircle size={17} /> Reject application
                      </button>
                    </>
                  )}

                  {getStatus(selectedDoctor) === "Approved" && (
                    <button
                      onClick={() => openAction("suspend", selectedDoctor)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 p-3 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                    >
                      <Ban size={17} /> Suspend doctor
                    </button>
                  )}

                  {getStatus(selectedDoctor) === "Suspended" && (
                    <button
                      onClick={() => openAction("restore", selectedDoctor)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 p-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
                    >
                      <CheckCircle2 size={17} /> Restore doctor
                    </button>
                  )}

                  {getStatus(selectedDoctor) === "Rejected" && (
                    <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                      This application was rejected. A resubmission workflow is
                      needed before it can be reviewed again.
                    </p>
                  )}
                </div>
              </section>
            </div>
          </aside>
        </div>
      )}

      <ActionDialog
        action={action}
        doctor={selectedDoctor}
        reason={reason}
        setReason={setReason}
        busy={busy}
        error={actionError}
        onClose={closeAction}
        onConfirm={performAction}
      />
    </div>
  );
}

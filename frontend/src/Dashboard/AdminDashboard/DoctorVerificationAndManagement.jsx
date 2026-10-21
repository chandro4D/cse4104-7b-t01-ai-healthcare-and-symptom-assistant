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
  Hash,
  CalendarDays,
  Building2,
  Banknote,
  Briefcase,
  SearchX,
  Info,
  ChevronRight as Chevron,
} from "lucide-react";
import { ADMIN_API, authConfig, errorText } from "./Adminshared.jsx";

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */

const PAGE_SIZE = 8;
const TABS = ["Pending", "Approved", "Rejected", "Suspended"];

const STATUS = {
  Pending: {
    icon: Clock3,
    pill: "bg-amber-50 text-amber-700 ring-amber-600/20",
    dot: "bg-amber-500",
    chip: "bg-amber-50 text-amber-600",
    empty: "No applications are waiting for review.",
  },
  Approved: {
    icon: BadgeCheck,
    pill: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    dot: "bg-emerald-500",
    chip: "bg-emerald-50 text-emerald-600",
    empty: "Approved doctors will appear here.",
  },
  Rejected: {
    icon: XCircle,
    pill: "bg-rose-50 text-rose-700 ring-rose-600/20",
    dot: "bg-rose-500",
    chip: "bg-rose-50 text-rose-600",
    empty: "Rejected applications will appear here.",
  },
  Suspended: {
    icon: Ban,
    pill: "bg-slate-100 text-slate-700 ring-slate-500/20",
    dot: "bg-slate-500",
    chip: "bg-slate-100 text-slate-600",
    empty: "Suspended doctors will appear here.",
  },
};

const field =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2";

/* ------------------------------------------------------------------ */
/*  Data helpers (unchanged logic)                                     */
/* ------------------------------------------------------------------ */

const getId = (d) => String(d?._id || d?.id || "");

function getDoctorName(d) {
  const user = d?.user || d?.userId || {};
  return (
    d?.name ||
    user?.name ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    d?.email ||
    user?.email ||
    "Unnamed doctor"
  );
}
const getEmail = (d) => d?.email || d?.user?.email || d?.userId?.email || "";
const getPhone = (d) => d?.phone || d?.user?.phone || d?.userId?.phone || "";
const getLicense = (d) => d?.licenseNumber || d?.medicalLicenseNumber || "";
const getSpecialty = (d) =>
  d?.specialty || d?.specialization || d?.department || "";

function getQualifications(d) {
  const value = d?.qualifications || d?.qualification || d?.education || "";
  if (Array.isArray(value)) {
    return value
      .map((i) =>
        typeof i === "string" ? i : i?.degree || i?.title || i?.name || "",
      )
      .filter(Boolean);
  }
  return value ? [String(value)] : [];
}

function getDocuments(d) {
  const source =
    d?.documents || d?.verificationDocuments || d?.licenseDocuments || [];
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
 * Current Doctor model fields: isVerified, isActive, user (ObjectId).
 * Rejection status/reason need an extra `rejectionReason` field + backend support.
 */
function getStatus(d) {
  if (d?.isActive === false) return "Suspended";
  if (d?.rejectionReason) return "Rejected";
  return d?.isVerified === true ? "Approved" : "Pending";
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

/* ------------------------------------------------------------------ */
/*  Building blocks                                                    */
/* ------------------------------------------------------------------ */

function DoctorAvatar({ doctor, size = "md" }) {
  const initials = getDoctorName(doctor)
    .replace(/^dr\.?\s+/i, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase();
  const dims = size === "lg" ? "h-14 w-14 text-base" : "h-10 w-10 text-sm";
  return (
    <div
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-violet-100 font-semibold text-violet-800 ${dims}`}
    >
      {initials || <Stethoscope size={18} />}
    </div>
  );
}

function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.Pending;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${s.pill}`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${s.dot}`}
      />
      {status}
    </span>
  );
}

function IconButton({ label, onClick, tone = "default", children }) {
  const tones = {
    default: "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
    danger: "text-slate-500 hover:bg-rose-50 hover:text-rose-700",
    success: "text-slate-500 hover:bg-emerald-50 hover:text-emerald-700",
  };
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={`rounded-lg p-2 transition ${tones[tone]} ${focusRing}`}
    >
      {children}
    </button>
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
            <span className="font-normal text-slate-400">Not provided</span>
          )}
        </p>
      </div>
    </div>
  );
}

function SummaryStrip({ counts, loading }) {
  return (
    <section
      aria-label="Application summary"
      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
    >
      <dl className="grid grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-slate-200 [&>*]:border-slate-200 max-lg:[&>*]:border-b">
        {TABS.map((status) => {
          const s = STATUS[status];
          const Icon = s.icon;
          const highlight = status === "Pending" && counts.Pending > 0;
          return (
            <div key={status} className="flex items-center gap-3 px-5 py-4">
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${highlight ? s.chip : "bg-slate-100 text-slate-600"}`}
              >
                <Icon size={18} aria-hidden="true" />
              </span>
              <div>
                <dt className="text-xs text-slate-500">
                  {status === "Pending"
                    ? "Awaiting review"
                    : status === "Approved"
                      ? "Approved doctors"
                      : status === "Rejected"
                        ? "Rejected"
                        : "Suspended"}
                </dt>
                <dd className="text-xl font-semibold tabular-nums text-slate-900">
                  {loading ? (
                    <span className="inline-block h-6 w-8 animate-pulse rounded bg-slate-100" />
                  ) : (
                    counts[status]
                  )}
                </dd>
              </div>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Action dialog                                                      */
/* ------------------------------------------------------------------ */

function ActionDialog({
  state,
  reason,
  setReason,
  busy,
  error,
  onClose,
  onConfirm,
}) {
  if (!state) return null;
  const { type, doctor } = state;
  const needsReason = type === "reject" || type === "suspend";

  const config = {
    approve: {
      icon: CheckCircle2,
      tone: "bg-emerald-50 text-emerald-600",
      title: "Approve this application?",
      text: "The doctor will be marked as verified and can start receiving bookings.",
      cta: "Approve application",
      btn: "bg-teal-700 hover:bg-teal-800",
    },
    reject: {
      icon: XCircle,
      tone: "bg-rose-50 text-rose-600",
      title: "Reject this application?",
      text: "The doctor will not be verified and will not be able to receive bookings.",
      cta: "Reject application",
      btn: "bg-rose-600 hover:bg-rose-700",
    },
    suspend: {
      icon: Ban,
      tone: "bg-rose-50 text-rose-600",
      title: "Suspend this doctor?",
      text: "They will stop appearing for new bookings until they are restored.",
      cta: "Suspend doctor",
      btn: "bg-rose-600 hover:bg-rose-700",
    },
    restore: {
      icon: CheckCircle2,
      tone: "bg-emerald-50 text-emerald-600",
      title: "Restore this doctor?",
      text: "Their account becomes active again. Booking still requires verification.",
      cta: "Restore doctor",
      btn: "bg-teal-700 hover:bg-teal-800",
    },
  }[type];
  const Icon = config.icon;

  return (
    <div
      className="ui-fade fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="doctor-dialog-title"
        className="ui-pop my-auto w-full max-w-md rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start gap-4 p-6 pb-4">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${config.tone}`}
          >
            <Icon size={21} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id="doctor-dialog-title"
              className="text-base font-semibold text-slate-900"
            >
              {config.title}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              {config.text}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close dialog"
            className={`rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 ${focusRing}`}
          >
            <X size={18} />
          </button>
        </div>

        <div className="mx-6 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <DoctorAvatar doctor={doctor} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900">
              {getDoctorName(doctor)}
            </p>
            <p className="truncate text-xs text-slate-500">
              {getEmail(doctor) || "No email"}
            </p>
          </div>
        </div>

        <div className="space-y-4 px-6 pt-4">
          {type === "approve" && (
            <p className="flex gap-2 rounded-lg bg-emerald-50 p-3 text-sm leading-relaxed text-emerald-800">
              <ShieldCheck
                size={16}
                className="mt-0.5 shrink-0"
                aria-hidden="true"
              />
              Confirm that the submitted qualifications and medical license have
              been reviewed.
            </p>
          )}

          {needsReason && (
            <div>
              <label
                htmlFor="doctor-action-reason"
                className="mb-1.5 block text-sm font-medium text-slate-800"
              >
                {type === "reject"
                  ? "Reason for rejection"
                  : "Reason for suspension"}
              </label>
              <textarea
                id="doctor-action-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                maxLength={500}
                autoFocus
                placeholder={
                  type === "reject"
                    ? "Tell the applicant what needs to be corrected."
                    : "Describe why this doctor is being suspended."
                }
                className={`${field} resize-none`}
              />
              <p className="mt-1 text-right text-xs tabular-nums text-slate-400">
                {reason.length}/500
              </p>
            </div>
          )}

          {type === "reject" && (
            <p className="flex gap-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800">
              <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              The reason is stored only if the Doctor schema has a{" "}
              <code className="font-mono">rejectionReason</code> field.
            </p>
          )}

          {(type === "suspend" || type === "restore") && (
            <p className="flex gap-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800">
              <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              This action needs a backend status endpoint, which is not
              available yet.
            </p>
          )}

          {error && (
            <p
              role="alert"
              className="flex gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-700"
            >
              <AlertTriangle
                size={16}
                className="mt-0.5 shrink-0"
                aria-hidden="true"
              />
              {error}
            </p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3 rounded-b-2xl border-t border-slate-100 bg-slate-50/60 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className={`rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 ${focusRing}`}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || (needsReason && !reason.trim())}
            onClick={onConfirm}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${config.btn} ${focusRing}`}
          >
            {busy && (
              <RefreshCw
                size={14}
                className="animate-spin"
                aria-hidden="true"
              />
            )}
            {busy ? "Saving…" : config.cta}
          </button>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Review drawer                                                      */
/* ------------------------------------------------------------------ */

function ReviewDrawer({ doctor, onClose, onAction }) {
  if (!doctor) return null;
  const status = getStatus(doctor);
  const qualifications = getQualifications(doctor);
  const documents = getDocuments(doctor);

  return (
    <div className="ui-fade fixed inset-0 z-[70] flex justify-end bg-slate-900/40">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-label="Close doctor details"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-title"
        className="ui-slide relative z-10 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2
            id="review-title"
            className="text-base font-semibold text-slate-900"
          >
            Application review
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className={`rounded-lg p-2 text-slate-500 hover:bg-slate-100 ${focusRing}`}
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center gap-4 px-6 py-6">
            <DoctorAvatar doctor={doctor} size="lg" />
            <div className="min-w-0">
              <h3 className="break-words text-lg font-semibold text-slate-900">
                {getDoctorName(doctor)}
              </h3>
              <p className="break-all text-sm text-slate-500">
                {getSpecialty(doctor) ||
                  getEmail(doctor) ||
                  "No details provided"}
              </p>
              <div className="mt-2">
                <StatusBadge status={status} />
              </div>
            </div>
          </div>

          {doctor.rejectionReason && (
            <div className="mx-6 mb-2 rounded-xl border border-rose-200 bg-rose-50 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-rose-800">
                <XCircle size={16} aria-hidden="true" /> Rejection reason
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-rose-700">
                {doctor.rejectionReason}
              </p>
            </div>
          )}

          <div className="px-6 pb-6">
            <h4 className="pt-3 text-sm font-semibold text-slate-900">
              Contact
            </h4>
            <div className="divide-y divide-slate-100">
              <InfoRow icon={Mail} label="Email" value={getEmail(doctor)} />
              <InfoRow icon={Phone} label="Phone" value={getPhone(doctor)} />
            </div>

            <h4 className="pt-5 text-sm font-semibold text-slate-900">
              Professional
            </h4>
            <div className="divide-y divide-slate-100">
              <InfoRow
                icon={Stethoscope}
                label="Specialty"
                value={getSpecialty(doctor)}
              />
              <InfoRow
                icon={BadgeCheck}
                label="Medical license number"
                value={getLicense(doctor)}
                mono
              />
              <InfoRow
                icon={Briefcase}
                label="Experience"
                value={
                  doctor.experience != null ? `${doctor.experience} years` : ""
                }
              />
              <InfoRow
                icon={Building2}
                label="Hospital"
                value={doctor.hospital}
              />
              <InfoRow
                icon={Banknote}
                label="Consultation fee"
                value={
                  doctor.consultationFee != null
                    ? String(doctor.consultationFee)
                    : ""
                }
              />
            </div>

            <h4 className="pt-5 text-sm font-semibold text-slate-900">
              Application
            </h4>
            <div className="divide-y divide-slate-100">
              <InfoRow
                icon={CalendarDays}
                label="Submitted"
                value={formatDate(doctor.createdAt)}
              />
              <InfoRow
                icon={Hash}
                label="Doctor record ID"
                value={getId(doctor)}
                mono
              />
            </div>

            <h4 className="pb-2 pt-5 text-sm font-semibold text-slate-900">
              Qualifications
            </h4>
            {qualifications.length ? (
              <ul className="space-y-2">
                {qualifications.map((q, i) => (
                  <li
                    key={`${q}-${i}`}
                    className="flex items-start gap-3 rounded-lg border border-slate-200 p-3"
                  >
                    <GraduationCap
                      size={17}
                      className="mt-0.5 shrink-0 text-teal-700"
                      aria-hidden="true"
                    />
                    <span className="text-sm text-slate-700">{q}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
                No qualifications have been provided.
              </p>
            )}

            <h4 className="pb-2 pt-5 text-sm font-semibold text-slate-900">
              Verification documents
            </h4>
            {documents.length ? (
              <ul className="space-y-2">
                {documents.map((d, i) => (
                  <li
                    key={`${d.name}-${i}`}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 p-3"
                  >
                    <FileText
                      size={18}
                      className="shrink-0 text-teal-700"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 break-words text-sm font-medium text-slate-700">
                      {d.name}
                    </span>
                    {d.url ? (
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noreferrer"
                        className={`inline-flex shrink-0 items-center gap-1 rounded text-sm font-medium text-teal-700 hover:underline ${focusRing}`}
                      >
                        Open <ExternalLink size={13} aria-hidden="true" />
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">No link</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
                No verification documents have been provided.
              </p>
            )}
          </div>
        </div>

        <footer className="space-y-2 border-t border-slate-200 bg-slate-50/60 p-5">
          {status === "Pending" && (
            <>
              <button
                type="button"
                onClick={() => onAction("approve", doctor)}
                className={`flex w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-teal-800 ${focusRing}`}
              >
                <CheckCircle2 size={16} aria-hidden="true" /> Approve
                application
              </button>
              <button
                type="button"
                onClick={() => onAction("reject", doctor)}
                className={`flex w-full items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-4 py-2.5 text-sm font-medium text-rose-700 hover:bg-rose-50 ${focusRing}`}
              >
                <XCircle size={16} aria-hidden="true" /> Reject application
              </button>
            </>
          )}
          {status === "Approved" && (
            <button
              type="button"
              onClick={() => onAction("suspend", doctor)}
              className={`flex w-full items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-4 py-2.5 text-sm font-medium text-rose-700 hover:bg-rose-50 ${focusRing}`}
            >
              <Ban size={16} aria-hidden="true" /> Suspend doctor
            </button>
          )}
          {status === "Suspended" && (
            <button
              type="button"
              onClick={() => onAction("restore", doctor)}
              className={`flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-white px-4 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50 ${focusRing}`}
            >
              <CheckCircle2 size={16} aria-hidden="true" /> Restore doctor
            </button>
          )}
          {status === "Rejected" && (
            <p className="text-center text-sm text-slate-500">
              This application was rejected. A resubmission workflow is needed
              before it can be reviewed again.
            </p>
          )}
        </footer>
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

function pageWindow(current, total) {
  const span = 5;
  let start = Math.max(1, current - Math.floor(span / 2));
  const end = Math.min(total, start + span - 1);
  start = Math.max(1, end - span + 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
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

  const [detailId, setDetailId] = useState(null);
  const [actionState, setActionState] = useState(null); // { type, doctor }
  const [reason, setReason] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);

  /* ---------- data ---------- */

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

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(t);
  }, [notice]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (actionState) {
        if (!busy) setActionState(null);
      } else if (detailId) {
        setDetailId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [actionState, detailId, busy]);

  /* ---------- derived ---------- */

  const counts = useMemo(() => {
    const result = { Pending: 0, Approved: 0, Rejected: 0, Suspended: 0 };
    doctors.forEach((d) => {
      result[getStatus(d)] += 1;
    });
    return result;
  }, [doctors]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return doctors.filter((d) => {
      const text = [
        getDoctorName(d),
        getEmail(d),
        getPhone(d),
        getLicense(d),
        getSpecialty(d),
        ...getQualifications(d),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return getStatus(d) === tab && (!q || text.includes(q));
    });
  }, [doctors, tab, search]);

  useEffect(() => setPage(1), [tab, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageDoctors = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const rangeStart = filtered.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filtered.length);

  const detailDoctor = useMemo(
    () => doctors.find((d) => getId(d) === detailId) || null,
    [doctors, detailId],
  );

  /* ---------- actions ---------- */

  const openAction = (type, doctor) => {
    setActionState({ type, doctor });
    setReason("");
    setActionError("");
  };

  const closeAction = () => {
    if (busy) return;
    setActionState(null);
    setActionError("");
    setReason("");
  };

  const performAction = async () => {
    if (!actionState) return;
    const { type, doctor } = actionState;
    const id = getId(doctor);

    if (!id) return setActionError("The doctor record has no valid ID.");
    if ((type === "reject" || type === "suspend") && !reason.trim())
      return setActionError("A reason is required.");

    setBusy(true);
    setActionError("");
    setError("");
    setNotice("");

    try {
      const doctorUrl = `${ADMIN_API}/doctors/${encodeURIComponent(id)}`;

      if (type === "approve") {
        await axios.put(
          `${doctorUrl}/verify`,
          { isVerified: true },
          authConfig(),
        );
      } else if (type === "reject") {
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
        type === "approve"
          ? `${getDoctorName(doctor)} has been approved.`
          : `${getDoctorName(doctor)}’s application was rejected.`,
      );
      setActionState(null);
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

  /* ---------- render ---------- */

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased">
      <style>{`
        @keyframes ui-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes ui-pop { from { opacity: 0; transform: translateY(8px) scale(.98) } to { opacity: 1; transform: none } }
        @keyframes ui-slide { from { transform: translateX(24px); opacity: 0 } to { transform: none; opacity: 1 } }
        .ui-fade { animation: ui-fade .15s ease-out }
        .ui-pop { animation: ui-pop .18s ease-out }
        .ui-slide { animation: ui-slide .2s ease-out }
        @media (prefers-reduced-motion: reduce) { .ui-fade, .ui-pop, .ui-slide { animation: none } }
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
              <span className="font-medium text-slate-700">Doctors</span>
            </nav>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
              Doctor verification
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Review qualifications, verify licenses and manage doctor access.
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadDoctors("manual")}
            disabled={refreshing}
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
            className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          >
            <AlertTriangle size={18} className="shrink-0" aria-hidden="true" />
            <span className="flex-1">{error}</span>
            <button
              type="button"
              onClick={() => loadDoctors("manual")}
              className={`rounded-md px-2 py-1 font-semibold hover:underline ${focusRing}`}
            >
              Try again
            </button>
          </div>
        )}

        <SummaryStrip counts={counts} loading={loading} />

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="space-y-4 border-b border-slate-200 p-4 sm:px-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div
                role="tablist"
                aria-label="Filter by status"
                className="inline-flex w-full overflow-x-auto rounded-lg bg-slate-100 p-1 lg:w-auto"
              >
                {TABS.map((status) => {
                  const selected = tab === status;
                  return (
                    <button
                      key={status}
                      role="tab"
                      type="button"
                      aria-selected={selected}
                      onClick={() => setTab(status)}
                      className={`flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition ${focusRing} ${
                        selected
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {status}
                      <span
                        className={`rounded-full px-1.5 text-xs tabular-nums ${selected ? "bg-slate-100 text-slate-700" : "bg-slate-200/70 text-slate-500"}`}
                      >
                        {counts[status]}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="relative lg:w-80">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, specialty or license"
                  aria-label="Search doctors"
                  className={`${field} pl-9`}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm text-slate-500">
              <p aria-live="polite">
                <span className="font-medium tabular-nums text-slate-900">
                  {filtered.length}
                </span>{" "}
                {tab.toLowerCase()}{" "}
                {filtered.length === 1 ? "doctor" : "doctors"}
                {search && " match your search"}
              </p>
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className={`rounded-md px-2 py-1 font-medium text-teal-700 hover:bg-teal-50 ${focusRing}`}
                >
                  Clear search
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div
              className="divide-y divide-slate-100"
              aria-busy="true"
              aria-label="Loading doctors"
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <div className="h-10 w-10 animate-pulse rounded-full bg-slate-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-40 animate-pulse rounded bg-slate-100" />
                    <div className="h-3 w-56 animate-pulse rounded bg-slate-100" />
                  </div>
                  <div className="hidden h-6 w-24 animate-pulse rounded bg-slate-100 sm:block" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                {search ? <SearchX size={22} /> : <Stethoscope size={22} />}
              </span>
              <p className="mt-4 text-sm font-semibold text-slate-900">
                {search
                  ? "No doctors match your search"
                  : `No ${tab.toLowerCase()} doctors`}
              </p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                {search
                  ? "Try a different name, specialty or license number."
                  : STATUS[tab].empty}
              </p>
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className={`mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 ${focusRing}`}
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left">
                  <thead className="bg-slate-50 text-xs font-medium text-slate-500">
                    <tr className="border-b border-slate-200">
                      <th scope="col" className="px-5 py-3 font-medium">
                        Doctor
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Specialty
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        License
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Qualifications
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
                    {pageDoctors.map((d) => {
                      const id = getId(d);
                      const status = getStatus(d);
                      const quals = getQualifications(d);
                      return (
                        <tr
                          key={id || getEmail(d)}
                          onClick={() => setDetailId(id)}
                          className="cursor-pointer transition-colors hover:bg-slate-50/80"
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <DoctorAvatar doctor={d} />
                              <div className="min-w-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDetailId(id);
                                  }}
                                  className={`block max-w-[240px] truncate rounded text-left text-sm font-semibold text-slate-900 hover:text-teal-700 ${focusRing}`}
                                >
                                  {getDoctorName(d)}
                                </button>
                                <p className="max-w-[240px] truncate text-xs text-slate-500">
                                  {getEmail(d) || "No email"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-sm text-slate-600">
                            {getSpecialty(d) || (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 font-mono text-[13px] text-slate-600">
                            {getLicense(d) || (
                              <span className="font-sans text-slate-400">
                                —
                              </span>
                            )}
                          </td>
                          <td className="max-w-[220px] px-4 py-3.5 text-sm text-slate-600">
                            {quals.length ? (
                              <span className="line-clamp-2">
                                {quals.slice(0, 2).join(", ")}
                                {quals.length > 2 && ` +${quals.length - 2}`}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <StatusBadge status={status} />
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center justify-end gap-0.5">
                              {status === "Pending" && (
                                <>
                                  <IconButton
                                    label={`Approve ${getDoctorName(d)}`}
                                    tone="success"
                                    onClick={() => openAction("approve", d)}
                                  >
                                    <CheckCircle2 size={17} />
                                  </IconButton>
                                  <IconButton
                                    label={`Reject ${getDoctorName(d)}`}
                                    tone="danger"
                                    onClick={() => openAction("reject", d)}
                                  >
                                    <XCircle size={17} />
                                  </IconButton>
                                </>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDetailId(id);
                                }}
                                className={`ml-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 ${focusRing}`}
                              >
                                Review
                              </button>
                            </div>
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
                    {filtered.length}
                  </span>
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
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
                    disabled={currentPage === totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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

        <aside className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3.5">
          <ShieldCheck
            size={18}
            className="mt-0.5 shrink-0 text-amber-700"
            aria-hidden="true"
          />
          <p className="text-sm leading-relaxed text-amber-900">
            <span className="font-medium">Booking security.</span> The
            appointment API should only allow bookings for doctors who are both
            verified and active.
          </p>
        </aside>
      </main>

      {notice && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[100] flex justify-center px-4">
          <div
            role="status"
            className="ui-pop pointer-events-auto flex items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-xl"
          >
            <CheckCircle2
              size={18}
              className="shrink-0 text-emerald-400"
              aria-hidden="true"
            />
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice("")}
              aria-label="Dismiss"
              className={`rounded p-0.5 text-slate-400 hover:text-white ${focusRing}`}
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      <ReviewDrawer
        doctor={detailDoctor}
        onClose={() => setDetailId(null)}
        onAction={openAction}
      />

      <ActionDialog
        state={actionState}
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

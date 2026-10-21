import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Search,
  RefreshCw,
  Users,
  X,
  Mail,
  Phone,
  CalendarDays,
  ShieldCheck,
  ShieldAlert,
  UserRound,
  Stethoscope,
  Ban,
  CheckCircle2,
  UserCog,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Hash,
  ChevronRight as Chevron,
  SearchX,
  Info,
} from "lucide-react";
import {
  ADMIN_API,
  authConfig,
  errorText,
  storedUser,
} from "./Adminshared.jsx";

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */

const PAGE_SIZE = 8;

const ROLES = {
  patient: {
    label: "Patient",
    plural: "Patients",
    icon: UserRound,
    pill: "bg-sky-50 text-sky-700 ring-sky-600/20",
    avatar: "bg-sky-100 text-sky-800",
    bar: "bg-sky-500",
    hint: "Can book appointments and use the symptom assistant.",
  },
  doctor: {
    label: "Doctor",
    plural: "Doctors",
    icon: Stethoscope,
    pill: "bg-violet-50 text-violet-700 ring-violet-600/20",
    avatar: "bg-violet-100 text-violet-800",
    bar: "bg-violet-500",
    hint: "Can manage patients, schedules and consultations.",
  },
  admin: {
    label: "Administrator",
    plural: "Administrators",
    icon: ShieldCheck,
    pill: "bg-teal-50 text-teal-800 ring-teal-600/20",
    avatar: "bg-teal-100 text-teal-800",
    bar: "bg-teal-600",
    hint: "Full access to this console, users and system settings.",
  },
};

const field =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const normalizeRole = (role) => {
  const r = String(role || "patient").toLowerCase();
  return ROLES[r] ? r : "patient";
};
const getId = (u) => String(u?._id || u?.id || u?.userId || "");
const getName = (u) =>
  u?.name ||
  u?.fullName ||
  [u?.firstName, u?.lastName].filter(Boolean).join(" ") ||
  u?.email?.split("@")[0] ||
  "Unnamed user";
const isActive = (u) => u?.isActive !== false;
const getPhone = (u) => u?.phone || u?.phoneNumber || "";

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

function getUsers(payload) {
  const root = payload?.data ?? payload ?? {};
  const users = Array.isArray(root)
    ? root
    : (root.users ?? root.results ?? root.data?.users ?? root.data ?? []);
  return Array.isArray(users) ? users : [];
}

/* ------------------------------------------------------------------ */
/*  Small building blocks                                              */
/* ------------------------------------------------------------------ */

function Avatar({ user, size = "md" }) {
  const initials = getName(user)
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
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${dims} ${
        ROLES[normalizeRole(user?.role)].avatar
      }`}
    >
      {initials || "U"}
    </div>
  );
}

function RolePill({ role }) {
  const r = ROLES[normalizeRole(role)];
  const Icon = r.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${r.pill}`}
    >
      <Icon size={13} aria-hidden="true" />
      {r.label}
    </span>
  );
}

function StatusPill({ active }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium ${
        active ? "text-emerald-700" : "text-rose-700"
      }`}
    >
      <span
        aria-hidden="true"
        className={`h-2 w-2 rounded-full ${active ? "bg-emerald-500" : "bg-rose-500"}`}
      />
      {active ? "Active" : "Suspended"}
    </span>
  );
}

function IconButton({ label, onClick, disabled, tone = "default", children }) {
  const tones = {
    default: "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
    danger: "text-slate-500 hover:bg-rose-50 hover:text-rose-700",
    success: "text-slate-500 hover:bg-emerald-50 hover:text-emerald-700",
    brand: "text-slate-500 hover:bg-teal-50 hover:text-teal-700",
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
      disabled={disabled}
      className={`rounded-lg p-2 transition disabled:cursor-not-allowed disabled:opacity-30 ${tones[tone]} ${focusRing}`}
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
          className={`mt-0.5 break-words text-sm text-slate-900 ${
            mono ? "font-mono text-[13px]" : "font-medium"
          }`}
        >
          {value || (
            <span className="font-normal text-slate-400">Not provided</span>
          )}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Summary strip (stats + role distribution)                          */
/* ------------------------------------------------------------------ */

function SummaryStrip({ stats, loading }) {
  const items = [
    { label: "Total accounts", value: stats.total, icon: Users },
    { label: "Patients", value: stats.patient, icon: ROLES.patient.icon },
    { label: "Doctors", value: stats.doctor, icon: ROLES.doctor.icon },
    { label: "Administrators", value: stats.admin, icon: ROLES.admin.icon },
    {
      label: "Suspended",
      value: stats.suspended,
      icon: ShieldAlert,
      warn: stats.suspended > 0,
    },
  ];

  return (
    <section
      aria-label="Account summary"
      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
    >
      <dl className="grid grid-cols-2 divide-slate-200 sm:grid-cols-3 lg:grid-cols-5 lg:divide-x [&>*]:border-slate-200 max-lg:[&>*]:border-b">
        {items.map(({ label, value, icon: Icon, warn }) => (
          <div key={label} className="flex items-center gap-3 px-5 py-4">
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                warn
                  ? "bg-rose-50 text-rose-600"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              <Icon size={18} aria-hidden="true" />
            </span>
            <div>
              <dt className="text-xs text-slate-500">{label}</dt>
              <dd className="text-xl font-semibold tabular-nums text-slate-900">
                {loading ? (
                  <span className="inline-block h-6 w-8 animate-pulse rounded bg-slate-100" />
                ) : (
                  value
                )}
              </dd>
            </div>
          </div>
        ))}
      </dl>

      {/* Role distribution */}
      <div className="border-t border-slate-200 bg-slate-50/60 px-5 py-3">
        <div
          className="flex h-2 w-full overflow-hidden rounded-full bg-slate-200"
          role="img"
          aria-label={`Role distribution: ${stats.patient} patients, ${stats.doctor} doctors, ${stats.admin} administrators`}
        >
          {stats.total > 0 &&
            ["patient", "doctor", "admin"].map((key) => (
              <div
                key={key}
                className={`${ROLES[key].bar} transition-all`}
                style={{ width: `${(stats[key] / stats.total) * 100}%` }}
              />
            ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
          {["patient", "doctor", "admin"].map((key) => (
            <span key={key} className="inline-flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${ROLES[key].bar}`}
                aria-hidden="true"
              />
              {ROLES[key].plural}
              <span className="font-medium tabular-nums text-slate-700">
                {stats.total ? Math.round((stats[key] / stats.total) * 100) : 0}
                %
              </span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Confirm dialog                                                     */
/* ------------------------------------------------------------------ */

function ConfirmDialog({
  state,
  reason,
  setReason,
  role,
  setRole,
  busy,
  error,
  onClose,
  onConfirm,
}) {
  if (!state) return null;
  const { type, user } = state;
  const isSuspend = type === "suspend";
  const isRestore = type === "restore";
  const isRole = type === "role";

  const config = isSuspend
    ? {
        icon: Ban,
        tone: "bg-rose-50 text-rose-600",
        title: "Suspend this account?",
        text: "They will be signed out and blocked from logging in until the account is restored.",
        cta: "Suspend account",
        btn: "bg-rose-600 hover:bg-rose-700",
      }
    : isRestore
      ? {
          icon: CheckCircle2,
          tone: "bg-emerald-50 text-emerald-600",
          title: "Restore this account?",
          text: "They will be able to sign in and use the platform again straight away.",
          cta: "Restore account",
          btn: "bg-teal-700 hover:bg-teal-800",
        }
      : {
          icon: UserCog,
          tone: "bg-teal-50 text-teal-700",
          title: "Change role",
          text: "Permissions update immediately the next time they load the app.",
          cta: "Save role",
          btn: "bg-teal-700 hover:bg-teal-800",
        };
  const Icon = config.icon;

  const disabled =
    busy ||
    (isSuspend && !reason.trim()) ||
    (isRole && role === normalizeRole(user.role));

  return (
    <div
      className="ui-fade fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
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
              id="dialog-title"
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
            aria-label="Close"
            className={`rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 ${focusRing}`}
          >
            <X size={18} />
          </button>
        </div>

        <div className="mx-6 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <Avatar user={user} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900">
              {getName(user)}
            </p>
            <p className="truncate text-xs text-slate-500">
              {user.email || "No email"}
            </p>
          </div>
        </div>

        <div className="px-6 pt-4">
          {isSuspend && (
            <div>
              <label
                htmlFor="suspension-reason"
                className="mb-1.5 block text-sm font-medium text-slate-800"
              >
                Reason for suspension
              </label>
              <textarea
                id="suspension-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                rows={4}
                autoFocus
                placeholder="Describe why this account is being suspended. The user may see this."
                className={`${field} resize-none`}
              />
              <p className="mt-1 text-right text-xs tabular-nums text-slate-400">
                {reason.length}/500
              </p>
            </div>
          )}

          {isRole && (
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-slate-800">
                Select a role
              </legend>
              <div className="space-y-2">
                {Object.entries(ROLES).map(([key, r]) => {
                  const RIcon = r.icon;
                  const selected = role === key;
                  return (
                    <label
                      key={key}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                        selected
                          ? "border-teal-600 bg-teal-50/60 ring-1 ring-teal-600"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={key}
                        checked={selected}
                        onChange={() => setRole(key)}
                        className="mt-1 accent-teal-700"
                      />
                      <RIcon
                        size={18}
                        className="mt-0.5 shrink-0 text-slate-500"
                        aria-hidden="true"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-slate-900">
                          {r.label}
                        </span>
                        <span className="block text-xs text-slate-500">
                          {r.hint}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
              <p className="mt-3 flex gap-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800">
                <Info
                  size={14}
                  className="mt-0.5 shrink-0"
                  aria-hidden="true"
                />
                The last remaining administrator cannot be demoted. This is
                enforced by the server.
              </p>
            </fieldset>
          )}

          {error && (
            <p
              role="alert"
              className="mt-4 flex gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-700"
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

        <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4 rounded-b-2xl">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className={`rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 ${focusRing}`}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={disabled}
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
/*  Detail drawer                                                      */
/* ------------------------------------------------------------------ */

function DetailDrawer({ user, isSelf, onClose, onAction }) {
  if (!user) return null;
  const active = isActive(user);

  return (
    <div className="ui-fade fixed inset-0 z-[70] flex justify-end bg-slate-900/40">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-label="Close details"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className="ui-slide relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2
            id="drawer-title"
            className="text-base font-semibold text-slate-900"
          >
            Account details
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
            <Avatar user={user} size="lg" />
            <div className="min-w-0">
              <h3 className="break-words text-lg font-semibold text-slate-900">
                {getName(user)}
                {isSelf && (
                  <span className="ml-2 text-sm font-medium text-teal-700">
                    (You)
                  </span>
                )}
              </h3>
              <p className="break-all text-sm text-slate-500">
                {user.email || "No email"}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <RolePill role={user.role} />
                <StatusPill active={active} />
              </div>
            </div>
          </div>

          {!active && (
            <div className="mx-6 mb-2 rounded-xl border border-rose-200 bg-rose-50 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-rose-800">
                <ShieldAlert size={16} aria-hidden="true" /> Account suspended
              </p>
              <p className="mt-1 text-sm text-rose-700">
                {user.suspensionReason || "No reason was recorded."}
              </p>
            </div>
          )}

          <div className="space-y-1 px-6">
            <h4 className="pt-3 text-sm font-semibold text-slate-900">
              Contact
            </h4>
            <div className="divide-y divide-slate-100">
              <InfoRow icon={Mail} label="Email" value={user.email} />
              <InfoRow icon={Phone} label="Phone" value={getPhone(user)} />
            </div>

            <h4 className="pt-5 text-sm font-semibold text-slate-900">
              Account
            </h4>
            <div className="divide-y divide-slate-100">
              <InfoRow
                icon={CalendarDays}
                label="Registered"
                value={formatDate(user.createdAt || user.created_at)}
              />
              <InfoRow icon={Hash} label="User ID" value={getId(user)} mono />
            </div>
          </div>
        </div>

        <footer className="space-y-2 border-t border-slate-200 bg-slate-50/60 p-5">
          <button
            type="button"
            disabled={isSelf}
            onClick={() => onAction("role", user)}
            className={`flex w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
          >
            <UserCog size={16} aria-hidden="true" /> Change role
          </button>
          {active ? (
            <button
              type="button"
              disabled={isSelf}
              onClick={() => onAction("suspend", user)}
              className={`flex w-full items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-4 py-2.5 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
            >
              <Ban size={16} aria-hidden="true" /> Suspend account
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onAction("restore", user)}
              className={`flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-white px-4 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50 ${focusRing}`}
            >
              <CheckCircle2 size={16} aria-hidden="true" /> Restore account
            </button>
          )}
          {isSelf && (
            <p className="pt-1 text-center text-xs text-slate-500">
              You can’t change the role or status of your own account.
            </p>
          )}
        </footer>
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pagination                                                         */
/* ------------------------------------------------------------------ */

function pageWindow(current, total) {
  const span = 5;
  let start = Math.max(1, current - Math.floor(span / 2));
  const end = Math.min(total, start + span - 1);
  start = Math.max(1, end - span + 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [detailId, setDetailId] = useState(null);
  const [actionState, setActionState] = useState(null); // { type, user }
  const [reason, setReason] = useState("");
  const [newRole, setNewRole] = useState("patient");
  const [busy, setBusy] = useState(false);

  const currentUser = storedUser() || {};
  const currentUserId = getId(currentUser);

  /* ---------- data ---------- */

  const loadUsers = useCallback(async (mode = "initial") => {
    if (mode === "initial") setLoading(true);
    if (mode === "manual") setRefreshing(true);
    setError("");
    try {
      const response = await axios.get(`${ADMIN_API}/users`, authConfig());
      setUsers(getUsers(response.data));
    } catch (err) {
      console.error("Could not load users:", err);
      setError(errorText(err, "Could not load user accounts."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    const onFocus = () => loadUsers("silent");
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadUsers]);

  // Auto-dismiss success notice
  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(t);
  }, [notice]);

  // Escape closes the top-most layer
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

  const stats = useMemo(() => {
    const count = (r) =>
      users.filter((u) => normalizeRole(u.role) === r).length;
    return {
      total: users.length,
      patient: count("patient"),
      doctor: count("doctor"),
      admin: count("admin"),
      suspended: users.filter((u) => !isActive(u)).length,
    };
  }, [users]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const text = [getName(u), u.email, getPhone(u), getId(u)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return (
        (!q || text.includes(q)) &&
        (roleFilter === "all" || normalizeRole(u.role) === roleFilter) &&
        (statusFilter === "all" ||
          (statusFilter === "active" && isActive(u)) ||
          (statusFilter === "suspended" && !isActive(u)))
      );
    });
  }, [users, search, roleFilter, statusFilter]);

  useEffect(() => setPage(1), [search, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageUsers = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const rangeStart = filtered.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filtered.length);

  // Keep the drawer in sync with refreshed data
  const detailUser = useMemo(
    () => users.find((u) => getId(u) === detailId) || null,
    [users, detailId],
  );

  const hasFilters = search || roleFilter !== "all" || statusFilter !== "all";

  /* ---------- actions ---------- */

  const openAction = (type, user) => {
    setActionState({ type, user });
    setReason("");
    setActionError("");
    setNewRole(normalizeRole(user.role));
  };

  const closeAction = () => {
    if (busy) return;
    setActionState(null);
    setActionError("");
    setReason("");
  };

  const performAction = async () => {
    if (!actionState) return;
    const { type, user } = actionState;
    const id = getId(user);

    if (!id) return setActionError("This user has no valid ID.");
    if (id === currentUserId && type === "role")
      return setActionError("You cannot change your own role.");
    if (id === currentUserId && type === "suspend")
      return setActionError("You cannot suspend your own account.");
    if (type === "suspend" && !reason.trim())
      return setActionError("A suspension reason is required.");
    if (type === "role" && newRole === normalizeRole(user.role))
      return setActionError("Choose a different role.");

    setBusy(true);
    setActionError("");
    setError("");
    setNotice("");

    try {
      if (type === "suspend" || type === "restore") {
        await axios.patch(
          `${ADMIN_API}/users/${encodeURIComponent(id)}/status`,
          {
            isActive: type === "restore",
            reason:
              type === "suspend"
                ? reason.trim()
                : "Account restored by administrator",
          },
          authConfig(),
        );
      } else {
        await axios.patch(
          `${ADMIN_API}/users/${encodeURIComponent(id)}/role`,
          { role: newRole },
          authConfig(),
        );
      }

      setNotice(
        type === "suspend"
          ? `${getName(user)} has been suspended.`
          : type === "restore"
            ? `${getName(user)} has been restored.`
            : `${getName(user)} is now ${ROLES[newRole].label.toLowerCase()}.`,
      );
      setActionState(null);
      await loadUsers("silent");
    } catch (err) {
      console.error("User action failed:", err);
      setActionError(errorText(err, "The action could not be completed."));
    } finally {
      setBusy(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setRoleFilter("all");
    setStatusFilter("all");
    setPage(1);
  };

  /* ---------- render ---------- */

  const roleTabs = [
    { key: "all", label: "All", count: stats.total },
    { key: "patient", label: "Patients", count: stats.patient },
    { key: "doctor", label: "Doctors", count: stats.doctor },
    { key: "admin", label: "Admins", count: stats.admin },
  ];

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

      {/* Page header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-8">
          <div>
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-1 text-xs text-slate-500"
            >
              <span>Admin</span>
              <Chevron size={12} aria-hidden="true" />
              <span className="font-medium text-slate-700">Users</span>
            </nav>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
              User management
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Review accounts, assign roles and control who can access the
              platform.
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadUsers("manual")}
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
        {/* Banners */}
        {error && (
          <div
            role="alert"
            className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          >
            <AlertTriangle size={18} className="shrink-0" aria-hidden="true" />
            <span className="flex-1">{error}</span>
            <button
              type="button"
              onClick={() => loadUsers("manual")}
              className={`rounded-md px-2 py-1 font-semibold underline-offset-2 hover:underline ${focusRing}`}
            >
              Try again
            </button>
          </div>
        )}

        <SummaryStrip stats={stats} loading={loading} />

        {/* Table card */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Toolbar */}
          <div className="space-y-4 border-b border-slate-200 p-4 sm:px-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              {/* Role tabs */}
              <div
                role="tablist"
                aria-label="Filter by role"
                className="inline-flex w-full overflow-x-auto rounded-lg bg-slate-100 p-1 lg:w-auto"
              >
                {roleTabs.map((t) => {
                  const selected = roleFilter === t.key;
                  return (
                    <button
                      key={t.key}
                      role="tab"
                      type="button"
                      aria-selected={selected}
                      onClick={() => setRoleFilter(t.key)}
                      className={`flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition ${focusRing} ${
                        selected
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {t.label}
                      <span
                        className={`rounded-full px-1.5 text-xs tabular-nums ${selected ? "bg-slate-100 text-slate-700" : "bg-slate-200/70 text-slate-500"}`}
                      >
                        {t.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative sm:w-72">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, email or phone"
                    aria-label="Search users"
                    className={`${field} pl-9`}
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label="Filter by status"
                  className={`${field} sm:w-40`}
                >
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm text-slate-500">
              <p aria-live="polite">
                <span className="font-medium text-slate-900 tabular-nums">
                  {filtered.length}
                </span>{" "}
                {filtered.length === 1 ? "account" : "accounts"}
                {hasFilters && " match your filters"}
              </p>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className={`rounded-md px-2 py-1 font-medium text-teal-700 hover:bg-teal-50 ${focusRing}`}
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {/* Body */}
          {loading ? (
            <div
              className="divide-y divide-slate-100"
              aria-busy="true"
              aria-label="Loading users"
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <div className="h-10 w-10 animate-pulse rounded-full bg-slate-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-40 animate-pulse rounded bg-slate-100" />
                    <div className="h-3 w-56 animate-pulse rounded bg-slate-100" />
                  </div>
                  <div className="hidden h-6 w-20 animate-pulse rounded bg-slate-100 sm:block" />
                  <div className="hidden h-6 w-16 animate-pulse rounded bg-slate-100 md:block" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                {hasFilters ? <SearchX size={22} /> : <Users size={22} />}
              </span>
              <p className="mt-4 text-sm font-semibold text-slate-900">
                {hasFilters
                  ? "No accounts match your filters"
                  : "No user accounts yet"}
              </p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                {hasFilters
                  ? "Try a different search term, or clear the filters to see everyone."
                  : "Accounts will appear here as soon as people register."}
              </p>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className={`mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 ${focusRing}`}
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left">
                  <thead className="sticky top-0 bg-slate-50 text-xs font-medium text-slate-500">
                    <tr className="border-b border-slate-200">
                      <th scope="col" className="px-5 py-3 font-medium">
                        User
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Role
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Status
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Phone
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Registered
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
                    {pageUsers.map((u) => {
                      const id = getId(u);
                      const self = id === currentUserId;
                      const active = isActive(u);
                      return (
                        <tr
                          key={id || u.email}
                          onClick={() => setDetailId(id)}
                          className="cursor-pointer transition-colors hover:bg-slate-50/80"
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <Avatar user={u} />
                              <div className="min-w-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDetailId(id);
                                  }}
                                  className={`block max-w-[260px] truncate rounded text-left text-sm font-semibold text-slate-900 hover:text-teal-700 ${focusRing}`}
                                >
                                  {getName(u)}
                                  {self && (
                                    <span className="ml-1.5 text-xs font-medium text-teal-700">
                                      (You)
                                    </span>
                                  )}
                                </button>
                                <p className="max-w-[260px] truncate text-xs text-slate-500">
                                  {u.email || "No email"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <RolePill role={u.role} />
                          </td>
                          <td className="px-4 py-3.5">
                            <StatusPill active={active} />
                          </td>
                          <td className="px-4 py-3.5 text-sm text-slate-600">
                            {getPhone(u) || "—"}
                          </td>
                          <td className="px-4 py-3.5 text-sm text-slate-600">
                            {formatDate(u.createdAt || u.created_at)}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex justify-end gap-0.5">
                              <IconButton
                                label={`Change role for ${getName(u)}`}
                                tone="brand"
                                disabled={self}
                                onClick={() => openAction("role", u)}
                              >
                                <UserCog size={17} />
                              </IconButton>
                              {active ? (
                                <IconButton
                                  label={`Suspend ${getName(u)}`}
                                  tone="danger"
                                  disabled={self}
                                  onClick={() => openAction("suspend", u)}
                                >
                                  <Ban size={17} />
                                </IconButton>
                              ) : (
                                <IconButton
                                  label={`Restore ${getName(u)}`}
                                  tone="success"
                                  onClick={() => openAction("restore", u)}
                                >
                                  <CheckCircle2 size={17} />
                                </IconButton>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <nav
                aria-label="Pagination"
                className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-3.5"
              >
                <p className="text-sm text-slate-500">
                  Showing{" "}
                  <span className="font-medium text-slate-900 tabular-nums">
                    {rangeStart}–{rangeEnd}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-slate-900 tabular-nums">
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
      </main>

      {/* Success toast */}
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

      <DetailDrawer
        user={detailUser}
        isSelf={getId(detailUser) === currentUserId}
        onClose={() => setDetailId(null)}
        onAction={openAction}
      />

      <ConfirmDialog
        state={actionState}
        reason={reason}
        setReason={setReason}
        role={newRole}
        setRole={setNewRole}
        busy={busy}
        error={actionError}
        onClose={closeAction}
        onConfirm={performAction}
      />
    </div>
  );
}

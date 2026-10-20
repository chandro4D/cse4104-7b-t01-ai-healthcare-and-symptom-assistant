import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Activity,
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  FileSearch,
  Fingerprint,
  History,
  LockKeyhole,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  ShieldX,
  UserRound,
  X,
} from "lucide-react";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

const ADMIN_API = `${API_URL}/api/v1/admin`;
const PAGE_SIZE = 10;

const getToken = () =>
  localStorage.getItem("token") || localStorage.getItem("accessToken") || "";

const authConfig = () => ({
  headers: {
    Authorization: `Bearer ${getToken()}`,
  },
});

const formatDateTime = (value) => {
  if (!value) return "Not recorded";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const capitalize = (value = "") =>
  value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();

const outcomeStyles = {
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  failure: "bg-rose-50 text-rose-700 ring-rose-200",
  denied: "bg-amber-50 text-amber-700 ring-amber-200",
};

function OutcomeBadge({ outcome }) {
  const value = String(outcome || "success").toLowerCase();

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
        outcomeStyles[value] || "bg-slate-100 text-slate-600 ring-slate-200"
      }`}
    >
      {capitalize(value)}
    </span>
  );
}

function SummaryCard({ title, value, icon: Icon, tone, loading }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          {loading ? (
            <div className="mt-3 h-8 w-16 animate-pulse rounded bg-slate-100" />
          ) : (
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              {value}
            </p>
          )}
        </div>

        <div className={`rounded-xl p-3 ${tone}`}>
          <Icon size={21} />
        </div>
      </div>
    </div>
  );
}

function AuditAndSecurity() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [actor, setActor] = useState("");
  const [action, setAction] = useState("All");
  const [target, setTarget] = useState("");
  const [outcome, setOutcome] = useState("All");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      setError("");

      try {
        const params = {
          page,
          limit: PAGE_SIZE,
        };

        if (actor.trim()) params.actor = actor.trim();
        if (action !== "All") params.action = action;
        if (target.trim()) params.target = target.trim();
        if (outcome !== "All") params.outcome = outcome;
        if (from) params.from = from;
        if (to) params.to = to;

        const response = await axios.get(`${ADMIN_API}/audit-logs`, {
          ...authConfig(),
          params,
        });

        const payload = response.data;
        const rows = Array.isArray(payload?.data) ? payload.data : [];

        setLogs(rows);
        setPagination(
          payload?.pagination || {
            page,
            limit: PAGE_SIZE,
            total: rows.length,
            totalPages: rows.length ? 1 : 0,
          },
        );
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Could not load audit logs. Check the backend endpoint and admin permissions.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [actor, action, target, outcome, from, to, page],
  );

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const summary = useMemo(() => {
    const total = Number(pagination.total || 0);

    // These outcome counts reflect the currently loaded page only.
    // They are not presented as database-wide totals.
    const success = logs.filter((item) => item.outcome === "success").length;
    const denied = logs.filter((item) => item.outcome === "denied").length;
    const failure = logs.filter((item) => item.outcome === "failure").length;

    return { total, success, denied, failure };
  }, [logs, pagination.total]);

  const resetFilters = () => {
    setActor("");
    setAction("All");
    setTarget("");
    setOutcome("All");
    setFrom("");
    setTo("");
    setPage(1);
  };

  const actionOptions = [
    ["All", "All actions"],
    ["ROLE_CHANGED", "Role changes"],
    ["USER_SUSPENDED", "User suspensions"],
    ["USER_REACTIVATED", "User reactivations"],
    ["DOCTOR_VERIFICATION_APPROVED", "Doctor approved"],
    ["DOCTOR_VERIFICATION_REJECTED", "Doctor rejected"],
    ["DOCTOR_SUSPENDED", "Doctor suspended"],
    ["DOCTOR_REACTIVATED", "Doctor reactivated"],
    ["APPOINTMENT_CANCELLED_BY_ADMIN", "Appointment cancellations"],
    ["APPOINTMENT_CONFLICT_RESOLVED", "Appointment conflict resolution"],
    ["SENSITIVE_RECORD_ACCESS", "Sensitive record access"],
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-teal-700">
              <ShieldCheck size={17} />
              Governance & compliance
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Audit Logs & Security
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Review administrative actions and sensitive-record access. Audit
              records are read-only and exclude clinical content.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchLogs(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:opacity-50 sm:self-auto"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            Refresh logs
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
          >
            <AlertCircle size={19} className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Audit logs unavailable</p>
              <p className="mt-1">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => fetchLogs(true)}
              className="font-semibold underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Matching log records"
            value={summary.total}
            icon={History}
            tone="bg-slate-100 text-slate-700"
            loading={loading}
          />
          <SummaryCard
            title="Successful actions"
            value={summary.success}
            icon={ShieldCheck}
            tone="bg-emerald-50 text-emerald-700"
            loading={loading}
          />
          <SummaryCard
            title="Denied actions"
            value={summary.denied}
            icon={ShieldX}
            tone="bg-amber-50 text-amber-700"
            loading={loading}
          />
          <SummaryCard
            title="Failed actions"
            value={summary.failure}
            icon={LockKeyhole}
            tone="bg-rose-50 text-rose-700"
            loading={loading}
          />
        </div>

        {/* Security reminder */}
        <div className="flex items-start gap-3 rounded-2xl border border-teal-100 bg-teal-50 p-4">
          <div className="rounded-lg bg-white p-2 text-teal-700">
            <Fingerprint size={20} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-teal-900">
              Read-only audit trail
            </h2>
            <p className="mt-1 text-sm leading-5 text-teal-800">
              This screen does not allow editing or deleting audit records. Each
              entry should identify who acted, what action occurred, which
              record was affected, when it happened, and the reason when
              applicable.
            </p>
          </div>
        </div>

        {/* Filters */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Search size={18} className="text-teal-700" />
              <h2 className="font-semibold text-slate-900">
                Filter audit records
              </h2>
            </div>

            <button
              type="button"
              onClick={resetFilters}
              className="text-sm font-semibold text-teal-700 hover:text-teal-800"
            >
              Clear filters
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <input
              value={actor}
              onChange={(event) => {
                setActor(event.target.value);
                setPage(1);
              }}
              placeholder="Actor name or user ID"
              aria-label="Filter by actor"
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />

            <select
              value={action}
              onChange={(event) => {
                setAction(event.target.value);
                setPage(1);
              }}
              aria-label="Filter by action"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            >
              {actionOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <input
              value={target}
              onChange={(event) => {
                setTarget(event.target.value);
                setPage(1);
              }}
              placeholder="Target type or target ID"
              aria-label="Filter by target"
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />

            <select
              value={outcome}
              onChange={(event) => {
                setOutcome(event.target.value);
                setPage(1);
              }}
              aria-label="Filter by outcome"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            >
              <option value="All">All outcomes</option>
              <option value="success">Success</option>
              <option value="failure">Failure</option>
              <option value="denied">Denied</option>
            </select>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">
                From date
              </label>
              <input
                type="date"
                value={from}
                onChange={(event) => {
                  setFrom(event.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">
                To date
              </label>
              <input
                type="date"
                min={from || undefined}
                value={to}
                onChange={(event) => {
                  setTo(event.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
            </div>
          </div>
        </section>

        {/* Read-only audit table */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-900">
              Audit event history
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {pagination.total} matching record(s)
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 px-5 py-20 text-sm text-slate-500">
              <RefreshCw size={19} className="animate-spin text-teal-600" />
              Loading audit records...
            </div>
          ) : logs.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <FileSearch size={40} className="mx-auto text-slate-300" />
              <h3 className="mt-4 font-semibold text-slate-800">
                No matching audit records
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Try different filters, or check whether audit logging has been
                integrated into your backend actions.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-left">
                  <thead className="bg-slate-50">
                    <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-4">Event</th>
                      <th className="px-5 py-4">Actor</th>
                      <th className="px-5 py-4">Target</th>
                      <th className="px-5 py-4">Outcome</th>
                      <th className="px-5 py-4">Date & time</th>
                      <th className="px-5 py-4 text-right">Details</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {logs.map((log) => (
                      <tr
                        key={log._id}
                        className="transition hover:bg-slate-50/80"
                      >
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-800">
                            {String(log.action || "Unknown action")
                              .replaceAll("_", " ")
                              .toLowerCase()
                              .replace(/\b\w/g, (char) => char.toUpperCase())}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {log.reason || "No reason recorded"}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-700">
                              <UserRound size={16} />
                            </div>
                            <div>
                              <p className="font-medium text-slate-800">
                                {log.actorLabel || "Unknown actor"}
                              </p>
                              <p className="mt-1 text-xs text-slate-400">
                                {log.actorRole || "unknown"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-medium text-slate-800">
                            {log.targetType || "Unknown target"}
                          </p>
                          <p className="mt-1 max-w-48 truncate font-mono text-xs text-slate-400">
                            {log.targetId || "No ID"}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <OutcomeBadge outcome={log.outcome} />
                        </td>

                        <td className="px-5 py-4">
                          <p className="flex items-center gap-2 text-sm text-slate-700">
                            <CalendarDays
                              size={14}
                              className="shrink-0 text-slate-400"
                            />
                            {formatDateTime(log.createdAt)}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedLog(log)}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800"
                          >
                            <Eye size={15} />
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">
                  Page {pagination.page || page} of{" "}
                  {Math.max(1, pagination.totalPages || 1)}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((value) => value - 1)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronLeft size={15} />
                    Previous
                  </button>

                  <button
                    type="button"
                    disabled={page >= Math.max(1, pagination.totalPages || 1)}
                    onClick={() => setPage((value) => value + 1)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    Next
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        <p className="flex items-start gap-2 text-xs leading-5 text-slate-500">
          <LockKeyhole size={15} className="mt-0.5 shrink-0" />
          Audit entries are intended to be immutable. Do not add edit or delete
          controls to this page. Restrict access to authorized administrators
          and apply a documented retention policy.
        </p>
      </div>

      {/* Read-only details panel */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            aria-label="Close audit details"
            onClick={() => setSelectedLog(null)}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"
          />

          <aside className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">
                  Read-only record
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  Audit event details
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  ID: {selectedLog._id}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close details"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Action
                </p>
                <p className="mt-2 break-words font-semibold text-slate-900">
                  {selectedLog.action}
                </p>
                <div className="mt-3">
                  <OutcomeBadge outcome={selectedLog.outcome} />
                </div>
              </div>

              {[
                ["Actor", selectedLog.actorLabel],
                ["Actor ID", selectedLog.actorId],
                ["Role", selectedLog.actorRole],
                ["Target type", selectedLog.targetType],
                ["Target ID", selectedLog.targetId],
                ["Reason", selectedLog.reason],
                ["Timestamp", formatDateTime(selectedLog.createdAt)],
                ["IP address", selectedLog.ipAddress],
                ["Request ID", selectedLog.requestId],
                ["User agent", selectedLog.userAgent],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="border-b border-slate-100 pb-3 last:border-0"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    {label}
                  </p>
                  <p className="mt-1 break-words text-sm text-slate-800">
                    {value || "Not recorded"}
                  </p>
                </div>
              ))}

              {selectedLog.metadata &&
                Object.keys(selectedLog.metadata).length > 0 && (
                  <div>
                    <h3 className="mb-2 flex items-center gap-2 font-semibold text-slate-900">
                      <Activity size={16} className="text-teal-700" />
                      Nonclinical metadata
                    </h3>
                    <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-700">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}

              <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                <Shield size={15} className="mt-0.5 shrink-0" />
                This record is read-only. Clinical record contents should never
                be displayed or stored in this audit detail panel.
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

export default AuditAndSecurity;

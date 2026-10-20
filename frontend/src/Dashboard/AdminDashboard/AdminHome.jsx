import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FaSyncAlt, FaChevronRight } from "react-icons/fa";

import {
  ADMIN_API,
  ROUTES,
  authConfig,
  errorText,
  storedUser,
  initials,
  formatDay,
  formatTime,
  timeAgo,
  humanizeAction,
  Banner,
  Pill,
} from "./Adminshared.jsx";

const REFRESH_MS = 60000;

const STATUS_COLORS = {
  Pending: "#fbbf24",
  Confirmed: "#0f766e",
  Completed: "#64748b",
  Cancelled: "#fb7185",
};

const STATUS_TONE = {
  Pending: "amber",
  Confirmed: "teal",
  Completed: "slate",
  Cancelled: "rose",
};

function greeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";

  return "Good evening";
}

// Clickable block inside the dark strip.
function StripBlock({
  label,
  value,
  note,
  valueClass = "text-white",
  onClick,
  loading,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-6 py-5 flex-1 min-w-[170px] text-left hover:bg-white/5 transition-colors first:rounded-l-2xl last:rounded-r-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
    >
      <p className="text-[11px] tracking-widest text-slate-400 uppercase">
        {label}
      </p>

      <p className={`mt-1 text-2xl font-semibold ${valueClass}`}>
        {loading ? "…" : (value ?? 0)}
      </p>

      <p className="text-xs text-slate-400 mt-0.5">{note}</p>
    </button>
  );
}

// White metric card.
function MetricCard({ label, value, note, onClick, loading }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-white rounded-xl border border-slate-100 p-5 text-left hover:shadow-sm transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
    >
      <p className="text-[11px] tracking-widest text-slate-400 uppercase">
        {label}
      </p>

      <p className="mt-1 text-2xl font-semibold text-slate-900">
        {loading ? "…" : (value ?? 0)}
      </p>

      <p className="text-xs text-slate-500 mt-0.5">{note}</p>
    </button>
  );
}

// 30-day line chart.
function TrendChart({ data }) {
  const [hover, setHover] = useState(null);

  if (!Array.isArray(data) || data.length === 0) {
    return (
      <p className="text-sm text-slate-400 py-8 text-center">
        Daily appointment trend is not available yet.
      </p>
    );
  }

  const W = 640;
  const H = 210;

  const pad = { l: 34, r: 10, t: 12, b: 26 };

  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;

  const max = Math.max(1, ...data.map((d) => Number(d.count) || 0));
  const top = Math.max(4, Math.ceil(max / 4) * 4);

  const x = (i) => pad.l + (i * innerW) / Math.max(1, data.length - 1);

  const y = (v) => pad.t + innerH * (1 - v / top);

  const line = data
    .map((d, i) => `${i ? "L" : "M"}${x(i)},${y(Number(d.count) || 0)}`)
    .join(" ");

  const area = `${line} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = ((e.clientX - rect.left) / rect.width) * W;

    const idx = Math.round(((rel - pad.l) / innerW) * (data.length - 1));

    setHover(Math.min(data.length - 1, Math.max(0, idx)));
  };

  const point = hover !== null ? data[hover] : null;

  return (
    <div>
      <p className="text-sm text-slate-500 h-5 mb-2" aria-live="polite">
        {point
          ? `${formatDay(point.date, {
              weekday: "short",
              day: "numeric",
              month: "short",
            })}: ${point.count} booking${Number(point.count) === 1 ? "" : "s"}`
          : `${data
              .reduce((sum, d) => sum + (Number(d.count) || 0), 0)
              .toLocaleString()} bookings in the available trend data`}
      </p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label="Bookings per day"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {[0, 1, 2, 3, 4].map((k) => {
          const v = (top * k) / 4;

          return (
            <g key={k}>
              <line
                x1={pad.l}
                x2={W - pad.r}
                y1={y(v)}
                y2={y(v)}
                stroke="#e2e8f0"
                strokeWidth="1"
              />

              <text
                x={pad.l - 6}
                y={y(v) + 3}
                textAnchor="end"
                fontSize="10"
                fill="#94a3b8"
              >
                {v}
              </text>
            </g>
          );
        })}

        {data.map((d, i) =>
          i % 5 === 0 || i === data.length - 1 ? (
            <text
              key={`${d.date}-${i}`}
              x={x(i)}
              y={H - 8}
              textAnchor="middle"
              fontSize="10"
              fill="#94a3b8"
            >
              {formatDay(d.date)}
            </text>
          ) : null,
        )}

        <path d={area} fill="#0f766e" opacity="0.1" />

        <path
          d={line}
          fill="none"
          stroke="#0f766e"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {point && (
          <g>
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={pad.t}
              y2={y(0)}
              stroke="#0f766e"
              strokeDasharray="3 3"
              opacity="0.5"
            />

            <circle
              cx={x(hover)}
              cy={y(Number(point.count) || 0)}
              r="4"
              fill="#fff"
              stroke="#0f766e"
              strokeWidth="2"
            />
          </g>
        )}
      </svg>
    </div>
  );
}

// Horizontal stacked bar: appointments by status.
function StatusBar({ byStatus }) {
  const entries = Object.entries(byStatus || {});
  const total = entries.reduce(
    (sum, [, count]) => sum + (Number(count) || 0),
    0,
  );

  if (!total) {
    return <p className="text-sm text-slate-400">No appointments yet.</p>;
  }

  return (
    <div>
      <div
        className="flex h-3 rounded-full overflow-hidden bg-slate-100"
        role="img"
        aria-label="Appointments by status"
      >
        {entries.map(([status, count]) => {
          const amount = Number(count) || 0;

          if (!amount) return null;

          return (
            <div
              key={status}
              style={{
                width: `${(amount / total) * 100}%`,
                background: STATUS_COLORS[status] || "#94a3b8",
              }}
              title={`${status}: ${amount}`}
            />
          );
        })}
      </div>

      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
        {entries.map(([status, count]) => (
          <li
            key={status}
            className="flex items-center justify-between text-xs text-slate-600"
          >
            <span className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  background: STATUS_COLORS[status] || "#94a3b8",
                }}
              />
              {status}
            </span>

            <span className="font-semibold text-slate-900">
              {Number(count || 0).toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SkeletonRows({ rows = 4 }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 rounded-lg bg-slate-100" />
      ))}
    </div>
  );
}

export default function AdminHome() {
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);

  // Load and normalize the backend dashboard response.
  const load = useCallback(async (mode = "initial") => {
    if (mode === "initial") setLoading(true);
    if (mode === "manual") setRefreshing(true);

    setError("");

    try {
      // The dashboard endpoint and user endpoint are both required.
      const [dashboardResponse, usersResponse] = await Promise.all([
        axios.get(`${ADMIN_API}/dashboard`, authConfig()),
        axios.get(`${ADMIN_API}/users`, authConfig()),
      ]);

      const payload =
        dashboardResponse.data?.data ?? dashboardResponse.data ?? {};

      const usersPayload = usersResponse.data?.data;

      const users = Array.isArray(usersPayload) ? usersPayload : [];

      // Count accounts by role.
      const countRole = (role) =>
        users.filter((user) => String(user.role || "").toLowerCase() === role)
          .length;

      const patients = countRole("patient");
      const doctorsCount = countRole("doctor");
      const admins = countRole("admin");

      const active = users.filter((user) => user.isActive !== false).length;

      const suspended = users.filter((user) => user.isActive === false).length;

      // Convert [{ _id: "Pending", count: 6 }]
      // into { Pending: 6 } for the status bar.
      const statusInput = payload.appointmentsByStatus;

      const byStatus = Array.isArray(statusInput)
        ? statusInput.reduce((result, item) => {
            const status = String(item?._id || "").trim();

            if (status) {
              result[status] =
                (result[status] || 0) + (Number(item.count) || 0);
            }

            return result;
          }, {})
        : statusInput && typeof statusInput === "object"
          ? statusInput
          : {};

      const normalized = {
        users: {
          patients,
          doctors: doctorsCount,
          admins,
          active,
          suspended,
        },

        doctors: {
          pendingVerification: Number(
            payload.pendingDoctors ?? payload.doctors?.pendingVerification ?? 0,
          ),
        },

        appointments: {
          total: Number(
            payload.totalAppointments ?? payload.appointments?.total ?? 0,
          ),

          // The current API does not return today's count.
          today: Number(payload.appointments?.today ?? 0),

          trend: Array.isArray(payload.appointments?.trend)
            ? payload.appointments.trend
            : [],

          byStatus,

          recent: Array.isArray(payload.appointments?.recent)
            ? payload.appointments.recent
            : [],
        },

        audit: {
          recent: Array.isArray(payload.audit?.recent)
            ? payload.audit.recent
            : [],
        },
      };

      setData(normalized);
      setUpdatedAt(new Date());
    } catch (err) {
      console.error("Failed to load admin dashboard:", err);

      setError(errorText(err, "Could not load the dashboard."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();

    const onFocus = () => load("silent");

    window.addEventListener("focus", onFocus);

    const timer = setInterval(() => load("silent"), REFRESH_MS);

    return () => {
      window.removeEventListener("focus", onFocus);
      clearInterval(timer);
    };
  }, [load]);

  const user = storedUser() || {};
  const name = user.name || user.fullName || "";

  const today = new Date().toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
  });

  const u = data?.users;
  const a = data?.appointments;

  const pendingDoctors = data?.doctors?.pendingVerification ?? 0;

  // Match the backend's "Pending" status capitalization.
  const pendingAppointments = a?.byStatus?.Pending ?? a?.byStatus?.pending ?? 0;

  const noData = !data;

  const go = (path, query = "") => navigate(query ? `${path}?${query}` : path);

  const attention = [
    {
      label: "Doctor applications to review",
      count: pendingDoctors,
      onClick: () => go(ROUTES.doctors, "status=pending"),
    },
    {
      label: "Appointments awaiting a doctor",
      count: pendingAppointments,
      onClick: () => go(ROUTES.appointments, "status=pending"),
    },
    {
      label: "Suspended accounts",
      count: u?.suspended ?? 0,
      onClick: () => go(ROUTES.users, "status=suspended"),
    },
  ];

  const allClear = attention.every((item) => item.count === 0);

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="flex items-center gap-4 px-8 py-4 bg-white border-b border-slate-100">
        <div className="flex-1">
          <p className="text-xs font-semibold tracking-widest text-teal-700 uppercase">
            Admin console
          </p>
        </div>

        {updatedAt && (
          <span className="text-xs text-slate-400 hidden sm:inline">
            Updated{" "}
            {updatedAt.toLocaleTimeString(undefined, {
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        )}

        <button
          type="button"
          onClick={() => load("manual")}
          disabled={refreshing}
          aria-label="Refresh dashboard"
          className="w-10 h-10 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-50"
        >
          <FaSyncAlt className={refreshing ? "animate-spin" : ""} />
        </button>

        <div className="w-10 h-10 rounded-full bg-teal-700 text-white flex items-center justify-center text-sm font-semibold">
          {initials(name)}
        </div>
      </header>

      <main className="px-8 py-7 space-y-6">
        {error && <Banner onAction={() => load()}>{error}</Banner>}

        {/* Greeting */}
        <div>
          <p className="text-xs font-semibold tracking-widest text-teal-700 uppercase">
            {greeting()}
          </p>

          <h1 className="text-3xl font-bold text-slate-900 mt-1">
            {name ? `Welcome back, ${name}` : "Welcome back"}
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Here's how the platform is doing today, {today}.
          </p>
        </div>

        {/* Accounts: dark strip */}
        <div
          className={`bg-[#0f211d] rounded-2xl flex flex-wrap divide-x divide-white/10 ${
            loading ? "animate-pulse" : ""
          }`}
        >
          <StripBlock
            label="Patients"
            value={u?.patients?.toLocaleString()}
            note="View patient accounts"
            loading={loading || noData}
            onClick={() => go(ROUTES.users, "role=patient")}
          />

          <StripBlock
            label="Doctors"
            value={u?.doctors?.toLocaleString()}
            note="View doctor accounts"
            loading={loading || noData}
            onClick={() => go(ROUTES.users, "role=doctor")}
          />

          <StripBlock
            label="Administrators"
            value={u?.admins?.toLocaleString()}
            note="View admin accounts"
            loading={loading || noData}
            onClick={() => go(ROUTES.users, "role=admin")}
          />

          <StripBlock
            label="Pending verification"
            value={pendingDoctors.toLocaleString()}
            valueClass={pendingDoctors > 0 ? "text-amber-300" : "text-white"}
            note={
              pendingDoctors > 0
                ? "Doctors waiting for review"
                : "Nothing to review"
            }
            loading={loading || noData}
            onClick={() => go(ROUTES.doctors, "status=pending")}
          />
        </div>

        {/* Main metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Total appointments"
            value={a?.total?.toLocaleString()}
            note="All time"
            loading={loading || noData}
            onClick={() => go(ROUTES.appointments, "status=all")}
          />

          <MetricCard
            label="Today"
            value={a?.today?.toLocaleString()}
            note="Scheduled for today"
            loading={loading || noData}
            onClick={() => go(ROUTES.appointments, "date=today")}
          />

          <MetricCard
            label="Active accounts"
            value={u?.active?.toLocaleString()}
            note="Can log in"
            loading={loading || noData}
            onClick={() => go(ROUTES.users, "status=active")}
          />

          <MetricCard
            label="Suspended accounts"
            value={u?.suspended?.toLocaleString()}
            note="Access blocked"
            loading={loading || noData}
            onClick={() => go(ROUTES.users, "status=suspended")}
          />
        </div>

        {/* Trend + attention */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <section className="xl:col-span-2 bg-white rounded-xl border border-slate-100 p-6">
            <h2 className="font-bold text-slate-900 mb-4">Appointment trend</h2>

            {loading || noData ? (
              <SkeletonRows rows={5} />
            ) : a?.trend?.length > 0 ? (
              <TrendChart data={a.trend} />
            ) : (
              <p className="text-sm text-slate-400 py-8 text-center">
                Daily appointment trend is not available yet.
              </p>
            )}
          </section>

          <div className="space-y-6">
            {/* Needs attention */}
            <section className="bg-white rounded-xl border border-slate-100 p-6">
              <h2 className="font-bold text-slate-900 mb-4">Needs attention</h2>

              {loading || noData ? (
                <SkeletonRows rows={3} />
              ) : allClear ? (
                <p className="text-sm text-slate-400">
                  All clear. Nothing needs your attention.
                </p>
              ) : (
                <ul className="space-y-2">
                  {attention.map((item) => (
                    <li key={item.label}>
                      <button
                        type="button"
                        onClick={item.onClick}
                        className="w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-slate-50"
                      >
                        <span className="text-sm text-slate-700">
                          {item.label}
                        </span>

                        <span className="flex items-center gap-2">
                          <Pill tone={item.count > 0 ? "amber" : "slate"}>
                            {item.count}
                          </Pill>

                          <FaChevronRight className="text-[10px] text-slate-300" />
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Appointments by status */}
            <section className="bg-white rounded-xl border border-slate-100 p-6">
              <h2 className="font-bold text-slate-900 mb-4">
                Appointments by status
              </h2>

              {loading || noData ? (
                <SkeletonRows rows={2} />
              ) : (
                <StatusBar byStatus={a?.byStatus || {}} />
              )}
            </section>
          </div>
        </div>

        {/* Recent appointments + recent activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent appointments */}
          <section className="bg-white rounded-xl border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900">Recent appointments</h2>

              <button
                type="button"
                onClick={() => go(ROUTES.appointments, "status=all")}
                className="text-sm font-medium text-teal-700 hover:underline"
              >
                View all
              </button>
            </div>

            {loading || noData ? (
              <SkeletonRows />
            ) : (a?.recent ?? []).length === 0 ? (
              <p className="text-sm text-slate-400">
                {a?.total > 0
                  ? "Appointment records are not included in the current dashboard API."
                  : "No appointments have been booked yet."}
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {(a?.recent ?? []).map((appt) => (
                  <li key={appt._id}>
                    <button
                      type="button"
                      onClick={() => go(ROUTES.appointments, `id=${appt._id}`)}
                      className="w-full flex items-center gap-4 py-3 text-left first:pt-0 last:pb-0 hover:opacity-80"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {appt.patientName || "Patient"}{" "}
                          <span className="font-normal text-slate-400">
                            with
                          </span>{" "}
                          {appt.doctorName || "Doctor"}
                        </p>

                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          {formatDay(appt.date, {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                          , {formatTime(appt.time)}
                          {appt.specialty ? ` · ${appt.specialty}` : ""}
                        </p>
                      </div>

                      <Pill tone={STATUS_TONE[appt.status] || "slate"}>
                        {appt.status}
                      </Pill>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Recent activity */}
          <section className="bg-white rounded-xl border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900">Recent activity</h2>

              <button
                type="button"
                onClick={() => go(ROUTES.audit)}
                className="text-sm font-medium text-teal-700 hover:underline"
              >
                View audit log
              </button>
            </div>

            {loading || noData ? (
              <SkeletonRows />
            ) : (data?.audit?.recent ?? []).length === 0 ? (
              <p className="text-sm text-slate-400">
                No activity has been recorded yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {(data?.audit?.recent ?? []).map((entry) => (
                  <li key={entry._id} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center text-[11px] font-semibold shrink-0">
                      {initials(entry.actor?.name)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800">
                        <span className="font-semibold">
                          {entry.actor?.name || "System"}
                        </span>{" "}
                        <span className="text-slate-500">
                          · {humanizeAction(entry.action)}
                        </span>
                      </p>

                      <p className="text-xs text-slate-400 mt-0.5">
                        {[entry.actorRole, entry.targetType]
                          .filter(Boolean)
                          .join(" · ")}

                        {entry.actorRole || entry.targetType ? " · " : ""}

                        {timeAgo(entry.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

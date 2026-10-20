
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Search, RefreshCw, Users, Eye, X, Mail, Phone, CalendarDays,
  ShieldCheck, ShieldAlert, UserRound, Stethoscope, Ban,
  CheckCircle2, UserCog, ChevronLeft, ChevronRight, AlertTriangle,
} from "lucide-react";
import { ADMIN_API, authConfig, errorText, storedUser } from "./Adminshared.jsx";

const PAGE_SIZE = 8;
const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10";

const roleColors = {
  patient: "bg-sky-50 text-sky-700",
  doctor: "bg-violet-50 text-violet-700",
  admin: "bg-teal-50 text-teal-800",
};

const normalizeRole = (role) => String(role || "patient").toLowerCase();
const getId = (u) => String(u?._id || u?.id || u?.userId || "");
const getName = (u) =>
  u?.name || u?.fullName ||
  [u?.firstName, u?.lastName].filter(Boolean).join(" ") ||
  u?.email?.split("@")[0] || "Unnamed user";
const active = (u) => u?.isActive !== false;

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString(undefined, {
        day: "numeric", month: "short", year: "numeric",
      });
}

function getUsers(payload) {
  const root = payload?.data ?? payload ?? {};
  const users = Array.isArray(root)
    ? root
    : root.users ?? root.results ?? root.data?.users ?? root.data ?? [];
  return Array.isArray(users) ? users : [];
}

function Avatar({ user }) {
  const initials = getName(user)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0] || "")
    .join("")
    .toUpperCase();

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-50 text-xs font-bold text-teal-800">
      {initials || "U"}
    </div>
  );
}

function Badge({ children, color = "bg-slate-100 text-slate-700" }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>
      {children}
    </span>
  );
}

function Detail({ icon: Icon, label, value }) {
  return (
    <div className="flex gap-3 py-2">
      <Icon size={17} className="mt-0.5 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="break-words text-sm font-medium text-slate-700">{value || "Not provided"}</p>
      </div>
    </div>
  );
}

function ConfirmDialog({
  action, user, reason, setReason, role, setRole, busy, error,
  onClose, onConfirm,
}) {
  if (!action || !user) return null;

  const isSuspend = action === "suspend";
  const isRestore = action === "restore";
  const isRole = action === "role";

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
      <section
        role="dialog"
        aria-modal="true"
        className="my-auto w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            {isSuspend ? "Suspend account?" : isRestore ? "Restore account?" : "Change user role?"}
          </h2>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <p className="mt-2 text-sm text-slate-500">
          {getName(user)} · {user.email}
        </p>

        {isSuspend && (
          <div className="mt-4">
            <label htmlFor="suspension-reason" className="mb-2 block text-sm font-semibold">
              Reason for suspension *
            </label>
            <textarea
              id="suspension-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={4}
              placeholder="Explain why this account is being suspended..."
              className={inputClass}
            />
          </div>
        )}

        {isRole && (
          <div className="mt-4">
            <label htmlFor="new-role" className="mb-2 block text-sm font-semibold">
              Select new role
            </label>
            <select
              id="new-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className={inputClass}
            >
              <option value="patient">Patient</option>
              <option value="doctor">Doctor</option>
              <option value="admin">Administrator</option>
            </select>
            <p className="mt-2 text-xs text-amber-700">
              The server must prevent self-demotion and removal of the last administrator.
            </p>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-xl border px-4 py-2.5 text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={
              busy ||
              (isSuspend && !reason.trim()) ||
              (isRole && role === normalizeRole(user.role))
            }
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${
              isSuspend ? "bg-rose-600" : "bg-teal-700"
            }`}
          >
            {busy ? "Saving..." : isSuspend ? "Confirm suspension" : isRestore ? "Restore account" : "Confirm role change"}
          </button>
        </div>
      </section>
    </div>
  );
}

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

  const [selectedUser, setSelectedUser] = useState(null);
  const [action, setAction] = useState(null);
  const [reason, setReason] = useState("");
  const [newRole, setNewRole] = useState("patient");
  const [busy, setBusy] = useState(false);

  const currentUser = storedUser() || {};
  const currentUserId = getId(currentUser);

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

  const stats = useMemo(() => ({
    total: users.length,
    patients: users.filter((u) => normalizeRole(u.role) === "patient").length,
    doctors: users.filter((u) => normalizeRole(u.role) === "doctor").length,
    admins: users.filter((u) => normalizeRole(u.role) === "admin").length,
    suspended: users.filter((u) => !active(u)).length,
  }), [users]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const text = [getName(u), u.email, u.phone, u.phoneNumber, getId(u)]
        .filter(Boolean).join(" ").toLowerCase();
      return (
        (!q || text.includes(q)) &&
        (roleFilter === "all" || normalizeRole(u.role) === roleFilter) &&
        (statusFilter === "all" ||
          (statusFilter === "active" && active(u)) ||
          (statusFilter === "suspended" && !active(u)))
      );
    });
  }, [users, search, roleFilter, statusFilter]);

  useEffect(() => setPage(1), [search, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageUsers = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const openAction = (type, user) => {
    setSelectedUser(user);
    setAction(type);
    setReason("");
    setActionError("");
    setNewRole(normalizeRole(user.role));
  };

  const closeAction = () => {
    if (busy) return;
    setAction(null);
    setActionError("");
    setReason("");
  };

  const performAction = async () => {
    if (!selectedUser || !action) return;
    const id = getId(selectedUser);

    if (!id) {
      setActionError("This user has no valid ID.");
      return;
    }
    if (id === currentUserId && action === "role") {
      setActionError("You cannot change your own role.");
      return;
    }
    if (id === currentUserId && action === "suspend") {
      setActionError("You cannot suspend your own account.");
      return;
    }
    if (action === "suspend" && !reason.trim()) {
      setActionError("A suspension reason is required.");
      return;
    }
    if (action === "role" && newRole === normalizeRole(selectedUser.role)) {
      setActionError("Choose a different role.");
      return;
    }

    setBusy(true);
    setActionError("");
    setError("");
    setNotice("");

    try {
      if (action === "suspend" || action === "restore") {
        await axios.patch(
          `${ADMIN_API}/users/${encodeURIComponent(id)}/status`,
          {
            isActive: action === "restore",
            ...(action === "suspend"
              ? { reason: reason.trim() }
              : { reason: "Account restored by administrator" }),
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
        action === "suspend" ? "Account suspended successfully." :
        action === "restore" ? "Account restored successfully." :
        "User role updated successfully."
      );
      setAction(null);
      setSelectedUser(null);
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

  return (
    <div className="min-h-screen bg-[#f7f9fc]">
      <header className="border-b bg-white px-4 py-5 sm:px-7">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-teal-700">Admin console</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">User Management</h1>
            <p className="mt-1 text-sm text-slate-500">Manage accounts, roles and access.</p>
          </div>
          <button
            type="button"
            onClick={() => loadUsers("manual")}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] space-y-6 px-4 py-6 sm:px-7">
        {notice && (
          <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <CheckCircle2 size={18} /> <span className="flex-1">{notice}</span>
            <button onClick={() => setNotice("")} aria-label="Dismiss"><X size={16} /></button>
          </div>
        )}
        {error && (
          <div role="alert" className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            <AlertTriangle size={18} /> <span className="flex-1">{error}</span>
            <button onClick={() => loadUsers("manual")} className="font-semibold underline">Retry</button>
          </div>
        )}

        <section className="grid grid-cols-2 gap-4 xl:grid-cols-5">
          {[
            [Users, "Total accounts", stats.total],
            [UserRound, "Patients", stats.patients],
            [Stethoscope, "Doctors", stats.doctors],
            [ShieldCheck, "Administrators", stats.admins],
            [ShieldAlert, "Suspended", stats.suspended],
          ].map(([Icon, label, value]) => (
            <div key={label} className="rounded-2xl border bg-white p-4 shadow-sm">
              <Icon size={20} className="text-teal-700" />
              <p className="mt-3 text-sm text-slate-500">{label}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
            </div>
          ))}
        </section>

        <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="space-y-4 border-b p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-slate-900">All user accounts</h2>
                <p className="mt-1 text-sm text-slate-500">Search, inspect and manage user access.</p>
              </div>
              <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                {filtered.length} result{filtered.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(240px,1fr)_180px_180px_auto]">
              <div className="relative">
                <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, email, phone or ID..."
                  className={inputClass + " pl-9"}
                />
              </div>
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={inputClass}>
                <option value="all">All roles</option>
                <option value="patient">Patient</option>
                <option value="doctor">Doctor</option>
                <option value="admin">Administrator</option>
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputClass}>
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
              <button onClick={clearFilters} className="rounded-xl border px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">
                Clear filters
              </button>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Users size={32} className="mx-auto text-slate-300" />
              <p className="mt-3 font-semibold text-slate-800">No users found</p>
              <p className="mt-1 text-sm text-slate-500">Try a different search or clear the filters.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-4">User</th>
                      <th className="px-4 py-4">Role</th>
                      <th className="px-4 py-4">Status</th>
                      <th className="px-4 py-4">Registered</th>
                      <th className="px-5 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pageUsers.map((u) => {
                      const self = getId(u) === currentUserId;
                      return (
                        <tr key={getId(u)} className="hover:bg-slate-50">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar user={u} />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-900">
                                  {getName(u)} {self && <span className="text-xs text-teal-700">(You)</span>}
                                </p>
                                <p className="truncate text-xs text-slate-500">{u.email || "No email"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <Badge color={roleColors[normalizeRole(u.role)] || "bg-slate-100 text-slate-700"}>
                              {normalizeRole(u.role)}
                            </Badge>
                          </td>
                          <td className="px-4 py-4">
                            <Badge color={active(u) ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}>
                              {active(u) ? "Active" : "Suspended"}
                            </Badge>
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-500">{formatDate(u.createdAt || u.created_at)}</td>
                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => setSelectedUser(u)} title="View details" aria-label={`View ${getName(u)}`} className="rounded-lg border p-2 text-slate-600 hover:bg-teal-50 hover:text-teal-700">
                                <Eye size={16} />
                              </button>
                              {active(u) ? (
                                <button
                                  disabled={self}
                                  onClick={() => openAction("suspend", u)}
                                  title="Suspend account"
                                  className="rounded-lg border p-2 text-rose-700 hover:bg-rose-50 disabled:opacity-30"
                                ><Ban size={16} /></button>
                              ) : (
                                <button
                                  onClick={() => openAction("restore", u)}
                                  title="Restore account"
                                  className="rounded-lg border p-2 text-emerald-700 hover:bg-emerald-50"
                                ><CheckCircle2 size={16} /></button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4">
                <p className="text-sm text-slate-500">
                  Showing {filtered.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
                </p>
                <div className="flex items-center gap-2">
                  <button disabled={currentPage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-lg border p-2 disabled:opacity-40"><ChevronLeft size={17} /></button>
                  <span className="text-sm">{currentPage} / {totalPages}</span>
                  <button disabled={currentPage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="rounded-lg border p-2 disabled:opacity-40"><ChevronRight size={17} /></button>
                </div>
              </div>
            </>
          )}
        </section>
      </main>

      {/* User detail drawer */}
      {selectedUser && (
        <div className="fixed inset-0 z-[70] flex justify-end bg-slate-950/40">
          <button className="absolute inset-0" onClick={() => setSelectedUser(null)} aria-label="Close details" />
          <aside role="dialog" aria-modal="true" className="relative z-10 h-full w-full max-w-lg overflow-y-auto bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b p-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-teal-700">Account overview</p>
                <h2 className="mt-1 text-lg font-bold">User details</h2>
              </div>
              <button onClick={() => setSelectedUser(null)} aria-label="Close drawer" className="rounded-lg p-2 hover:bg-slate-100"><X size={19} /></button>
            </header>
            <div className="space-y-6 p-5 sm:p-7">
              <div className="flex items-start gap-4 rounded-2xl bg-slate-50 p-4">
                <Avatar user={selectedUser} />
                <div className="min-w-0">
                  <h3 className="break-words font-bold text-slate-900">{getName(selectedUser)}</h3>
                  <p className="break-all text-sm text-slate-500">{selectedUser.email}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge color={roleColors[normalizeRole(selectedUser.role)]}>{normalizeRole(selectedUser.role)}</Badge>
                    <Badge color={active(selectedUser) ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}>
                      {active(selectedUser) ? "Active" : "Suspended"}
                    </Badge>
                  </div>
                </div>
              </div>

              <section>
                <h3 className="mb-2 text-sm font-bold">Contact information</h3>
                <Detail icon={Mail} label="Email" value={selectedUser.email} />
                <Detail icon={Phone} label="Phone" value={selectedUser.phone || selectedUser.phoneNumber} />
                <Detail icon={CalendarDays} label="Registered" value={formatDate(selectedUser.createdAt || selectedUser.created_at)} />
              </section>

              <section>
                <h3 className="mb-2 text-sm font-bold">Account information</h3>
                <Detail icon={ShieldCheck} label="Account status" value={active(selectedUser) ? "Active" : "Suspended"} />
                <Detail icon={UserCog} label="Role" value={normalizeRole(selectedUser.role)} />
                <Detail icon={Users} label="User ID" value={getId(selectedUser)} />
                {!active(selectedUser) && (
                  <Detail icon={ShieldAlert} label="Suspension reason" value={selectedUser.suspensionReason} />
                )}
              </section>

              <section>
                <h3 className="mb-3 text-sm font-bold">Administrative actions</h3>
                <div className="space-y-2">
                  {active(selectedUser) ? (
                    <button
                      disabled={getId(selectedUser) === currentUserId}
                      onClick={() => openAction("suspend", selectedUser)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 p-3 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-40"
                    ><Ban size={17} /> Suspend account</button>
                  ) : (
                    <button onClick={() => openAction("restore", selectedUser)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 p-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50">
                      <CheckCircle2 size={17} /> Restore account
                    </button>
                  )}
                  <button
                    disabled={getId(selectedUser) === currentUserId}
                    onClick={() => openAction("role", selectedUser)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 p-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-40"
                  ><UserCog size={17} /> Change user role</button>
                </div>
              </section>
            </div>
          </aside>
        </div>
      )}

      <ConfirmDialog
        action={action}
        user={selectedUser}
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

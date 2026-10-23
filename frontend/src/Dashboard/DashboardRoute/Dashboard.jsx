import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  FaHome,
  FaCalendarAlt,
  FaHeart,
  FaUser,
  FaUsers,
  FaCartPlus,
  FaList,
  FaUserMd,
  FaBars,
  FaTimes,
} from "react-icons/fa";

function SidebarLink({ to, icon, children }) {
  return (
    <li>
      <NavLink
        to={to}
        className={({ isActive }) =>
          `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            isActive
              ? "bg-teal-700 text-white"
              : "text-slate-300 hover:bg-white/5 hover:text-white"
          }`
        }
      >
        <span className="text-base">{icon}</span>
        {children}
      </NavLink>
    </li>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="px-4 pt-6 pb-2 text-[11px] font-semibold tracking-widest text-slate-500 uppercase">
      {children}
    </p>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold text-sm">
        AH
      </div>

      <div>
        <p className="text-white font-semibold leading-tight text-[15px]">
          AI Healthcare
        </p>

        <p className="text-[10px] tracking-widest text-slate-400 uppercase">
          Symptom Assistant
        </p>
      </div>
    </div>
  );
}

function readUser() {
  try {
    const userString = localStorage.getItem("user");
    return userString ? JSON.parse(userString) : null;
  } catch {
    return null;
  }
}

function Dashboard() {
  const user = readUser();
  const role = user?.role?.toLowerCase();

  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // Close the drawer after navigating.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Close on Escape and lock page scroll while the mobile drawer is open.
  useEffect(() => {
    if (!menuOpen) return undefined;

    const onKey = (e) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
      }
    };

    window.addEventListener("keydown", onKey);

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  return (
    <div className="flex min-h-screen bg-[#f6f5f1]">
      {/* Backdrop: mobile and tablet only */}
      <div
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
        className={`fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-[1px] transition-opacity duration-200 lg:hidden ${
          menuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Sidebar */}
      <aside
        id="app-sidebar"
        className={`fixed inset-y-0 left-0 z-40 w-[260px] max-w-[85vw] bg-[#0f211d] flex flex-col transition-transform duration-200 ease-out ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen lg:self-start lg:shrink-0 lg:max-w-none`}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-6 py-6">
          <Brand />

          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
            className="lg:hidden w-9 h-9 rounded-lg text-slate-300 hover:bg-white/10 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
          >
            <FaTimes />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 pb-6 overflow-y-auto">
          <ul className="space-y-1">
            {/* Admin Menu */}
            {role === "admin" && (
              <>
                <SectionLabel>Admin</SectionLabel>

                <SidebarLink to="/dashboard/adminHome" icon={<FaHome />}>
                  Dashboard
                </SidebarLink>

                <SidebarLink to="/dashboard/userManagement" icon={<FaList />}>
                  User Management
                </SidebarLink>

                <SidebarLink
                  to="/dashboard/doctorVerification"
                  icon={<FaUsers />}
                >
                  Doctors Management
                </SidebarLink>

                <SidebarLink
                  to="/dashboard/appointmentOverview"
                  icon={<FaCartPlus />}
                >
                  Appointment Overview
                </SidebarLink>

                <SectionLabel>General</SectionLabel>

                <SidebarLink to="/" icon={<FaHome />}>
                  Home
                </SidebarLink>

                <SidebarLink to="/doctors" icon={<FaUserMd />}>
                  Doctors
                </SidebarLink>
              </>
            )}

            {/* Doctor Menu */}
            {role === "doctor" && (
              <>
                <SectionLabel>Doctor</SectionLabel>

                <SidebarLink to="/dashboard/doctorHome" icon={<FaHome />}>
                  Dashboard
                </SidebarLink>

                <SidebarLink
                  to="/dashboard/appointmentManagement"
                  icon={<FaCalendarAlt />}
                >
                  Appointment Management
                </SidebarLink>

                <SidebarLink
                  to="/dashboard/patientVisitRequests"
                  icon={<FaUsers />}
                >
                  Patient Visit Requests
                </SidebarLink>

                <SidebarLink
                  to="/dashboard/patientRecordsDetails"
                  icon={<FaCartPlus />}
                >
                  Patient Details
                </SidebarLink>

                <SidebarLink
                  to="/dashboard/doctorProfileAndAvailability"
                  icon={<FaUser />}
                >
                  Profile & Availability
                </SidebarLink>

                <SectionLabel>General</SectionLabel>

                <SidebarLink to="/" icon={<FaHome />}>
                  Home
                </SidebarLink>

                <SidebarLink to="/doctors" icon={<FaUserMd />}>
                  Doctors
                </SidebarLink>
              </>
            )}

            {/* Patient Menu */}
            {role === "patient" && (
              <>
                <SectionLabel>Patient</SectionLabel>

                <SidebarLink to="/dashboard/patientHome" icon={<FaHome />}>
                  Dashboard
                </SidebarLink>

                <SidebarLink
                  to="/dashboard/patientAppointments"
                  icon={<FaCalendarAlt />}
                >
                  Appointments
                </SidebarLink>

                <SidebarLink to="/dashboard/symptomChecker" icon={<FaHeart />}>
                  AI Symptom Checker
                </SidebarLink>

                <SectionLabel>General</SectionLabel>

                <SidebarLink to="/" icon={<FaHome />}>
                  Home
                </SidebarLink>

                <SidebarLink to="/doctors" icon={<FaUserMd />}>
                  Doctors
                </SidebarLink>
              </>
            )}

            {!role && (
              <p className="px-4 pt-8 text-slate-400 text-sm">
                Please log in to continue.
              </p>
            )}
          </ul>
        </nav>
      </aside>

      {/* Main content area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile and tablet top bar */}
        <header className="lg:hidden sticky top-0 z-20 flex items-center gap-3 bg-[#0f211d] px-4 py-3 shadow-sm">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            aria-controls="app-sidebar"
            className="w-10 h-10 rounded-lg text-white hover:bg-white/10 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
          >
            <FaBars />
          </button>

          <Brand />
        </header>

        {/* Page content */}
        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

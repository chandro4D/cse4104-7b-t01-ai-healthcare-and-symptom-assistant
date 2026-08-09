import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  FaHome,
  FaSearch,
  FaCalendarAlt,
  FaHeart,
  FaFileMedical,
  FaPrescriptionBottleAlt,
  FaUser,
  FaCog,
  FaUsers,
  FaCartPlus,
  FaList,
  FaBook,
  FaEnvelope,
  FaBox,
  FaWallet,
  FaMapMarkerAlt,
  FaHeadset,
} from "react-icons/fa";
import { MdOutlineManageAccounts } from "react-icons/md";

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

function Dashboard() {
  const userString = localStorage.getItem("user");
  const user = userString ? JSON.parse(userString) : null;
  const role = user?.role;

  return (
    <div className="flex min-h-screen bg-[#f6f5f1]">
      {/* Sidebar */}
      <aside className="w-[260px] shrink-0 min-h-screen bg-[#0f211d] flex flex-col">
        {/* Brand */}
        <div className="flex items-center gap-3 px-6 py-6">
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

        <nav className="flex-1 px-3 overflow-y-auto">
          <ul className="space-y-1">
            {role === "admin" && (
              <>
                <SectionLabel>Admin</SectionLabel>
                <SidebarLink to="/dashboard/adminHome" icon={<FaHome />}>
                  Dashboard
                </SidebarLink>
                <SidebarLink to="/dashboard/adminAnalytics" icon={<FaList />}>
                  Analytics
                </SidebarLink>
                <SidebarLink to="/dashboard/manageUsers" icon={<FaUsers />}>
                  Manage Users
                </SidebarLink>
                <SidebarLink
                  to="/dashboard/manageProducts"
                  icon={<FaCartPlus />}
                >
                  Manage Products
                </SidebarLink>
                <SidebarLink
                  to="/dashboard/manageCategory"
                  icon={<MdOutlineManageAccounts />}
                >
                  Manage Categories
                </SidebarLink>
                <SidebarLink
                  to="/dashboard/adminManageBanner"
                  icon={<MdOutlineManageAccounts />}
                >
                  Manage Banners
                </SidebarLink>
                <SidebarLink to="/dashboard/orders" icon={<FaList />}>
                  Orders & Payments
                </SidebarLink>
                <SidebarLink to="/dashboard/adminSalesReport" icon={<FaBook />}>
                  Sales Report
                </SidebarLink>
                <SidebarLink
                  to="/dashboard/notifications"
                  icon={<FaEnvelope />}
                >
                  Notifications
                </SidebarLink>
                <SidebarLink
                  to="/dashboard/settings"
                  icon={<MdOutlineManageAccounts />}
                >
                  Settings
                </SidebarLink>
              </>
            )}

            {role === "doctor" && (
              <>
                <SectionLabel>Doctor</SectionLabel>
                <SidebarLink to="/dashboard/seller" icon={<FaHome />}>
                  Dashboard
                </SidebarLink>
                <SidebarLink
                  to="/dashboard/manageSellerProducts"
                  icon={<FaBox />}
                >
                  My Products
                </SidebarLink>
                <SidebarLink to="/dashboard/addProduct" icon={<FaCartPlus />}>
                  Add Product
                </SidebarLink>
                <SidebarLink to="/dashboard/sellerOrders" icon={<FaList />}>
                  Orders
                </SidebarLink>
                <SidebarLink
                  to="/dashboard/sellerPaymentHistory"
                  icon={<FaWallet />}
                >
                  Earnings
                </SidebarLink>
                <SidebarLink to="/dashboard/sellerAd" icon={<FaEnvelope />}>
                  Advertisements
                </SidebarLink>
                <SidebarLink to="/dashboard/settings" icon={<FaUser />}>
                  Profile
                </SidebarLink>
              </>
            )}

            {role === "patient" && (
              <>
                <SectionLabel>Patient</SectionLabel>
                <SidebarLink to="/dashboard/patientHome" icon={<FaHome />}>
                  Dashboard
                </SidebarLink>
                <SidebarLink to="/dashboard/findDoctor" icon={<FaSearch />}>
                  Find a Doctor
                </SidebarLink>
                <SidebarLink
                  to="/dashboard/appointments"
                  icon={<FaCalendarAlt />}
                >
                  Appointments
                </SidebarLink>
                <SidebarLink to="/dashboard/symptomChecker" icon={<FaHeart />}>
                  AI Symptom Checker
                </SidebarLink>
                <SidebarLink to="/dashboard/records" icon={<FaFileMedical />}>
                  Health Records
                </SidebarLink>
                <SidebarLink
                  to="/dashboard/prescriptions"
                  icon={<FaPrescriptionBottleAlt />}
                >
                  Prescriptions
                </SidebarLink>

                <SectionLabel>Account</SectionLabel>
                <SidebarLink to="/dashboard/profile" icon={<FaUser />}>
                  Profile
                </SidebarLink>
                <SidebarLink to="/dashboard/settings" icon={<FaCog />}>
                  Settings
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

        <div className="px-3 pb-4 pt-2 border-t border-white/5 mt-2">
          <ul className="space-y-1">
            <SidebarLink to="/" icon={<FaHome />}>
              Home
            </SidebarLink>
            <SidebarLink to="/shop" icon={<FaCartPlus />}>
              Shop
            </SidebarLink>
            <SidebarLink to="/contact" icon={<FaEnvelope />}>
              Contact
            </SidebarLink>
          </ul>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 min-w-0">
        <Outlet />
      </div>
    </div>
  );
}

export default Dashboard;

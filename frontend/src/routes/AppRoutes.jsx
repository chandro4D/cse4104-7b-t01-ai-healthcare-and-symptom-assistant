import { Routes, Route, Navigate } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";

// Route guards
import ProtectedRoute from "../components/ProtectedRoute";
import PublicOnlyRoute from "../components/PublicOnlyRoute";
import DashboardIndex from "../components/DashboardIndex";

// General pages
import Home from "../pages/Home/Home";
import SignUp from "../pages/SignUp/SignUp";
import Login from "../pages/Login/Login";
import About from "../pages/About/About";
import Doctors from "../pages/Doctors/Doctors";
import Appointments from "../pages/Appointments/Appointments";

// Dashboard
import Dashboard from "../Dashboard/DashboardRoute/Dashboard";
import PatientHome from "../Dashboard/PatientDashboard/PatientHome";
import SymptomChecker from "../Dashboard/PatientDashboard/SymptomChecker";
import PatientAppointments from "../Dashboard/PatientDashboard/PatientAppointments";
import AdminHome from "../Dashboard/AdminDashboard/AdminHome";
import DoctorHome from "../Dashboard/DoctorDashboard/DoctorHome";
import AppointmentManagement from "../Dashboard/DoctorDashboard/AppointmentManagement";
import PatientVisitRequests from "../Dashboard/DoctorDashboard/PatientVisitRequests";
import PatientRecordsDetails from "../Dashboard/DoctorDashboard/PatientRecordsDetails";
import DoctorProfileAndAvailability from "../Dashboard/DoctorDashboard/DoctorProfileAndAvailability";
import UserManagement from "../Dashboard/AdminDashboard/UserManagement";
import AuditAndSecurity from "../Dashboard/AdminDashboard/AuditAndSecurity";
import AppointmentOverview from "../Dashboard/AdminDashboard/AppointmentOverview";
import DoctorVerificationAndManagement from "../Dashboard/AdminDashboard/DoctorVerificationAndManagement";

// Shown for dashboard pages that are not built yet
function ComingSoon() {
  return <div className="p-10 text-slate-500">This page is coming soon.</div>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        {/* ───────── Public pages (anyone) ───────── */}
        <Route index element={<Home />} />
        <Route path="about" element={<About />} />
        <Route path="doctors" element={<Doctors />} />

        {/* Login / Signup: hidden from logged-in users */}
        <Route element={<PublicOnlyRoute />}>
          <Route path="login" element={<Login />} />
          <Route path="signup" element={<SignUp />} />
        </Route>

        {/* ───────── Private pages (login required) ───────── */}
        <Route element={<ProtectedRoute />}>
          {/* Booking page */}
          <Route path="appointments" element={<Appointments />} />

          {/* Dashboard is a PARENT route with nested children */}
          <Route path="dashboard" element={<Dashboard />}>
            {/* /dashboard -> redirect to the user's own role home */}
            <Route index element={<DashboardIndex />} />

            {/* Patient only */}
            <Route element={<ProtectedRoute allowedRoles={["patient"]} />}>
              <Route path="patientHome" element={<PatientHome />} />
              <Route path="symptomChecker" element={<SymptomChecker />} />
              <Route
                path="patientAppointments"
                element={<PatientAppointments />}
              />
              {/* Add more patient routes here, e.g.: */}
              {/* <Route path="findDoctor" element={<FindDoctor />} /> */}
            </Route>

            {/* Doctor only */}
            <Route element={<ProtectedRoute allowedRoles={["doctor"]} />}>
              <Route path="doctorHome" element={<DoctorHome />} />
              <Route
                path="appointmentManagement"
                element={<AppointmentManagement />}
              />

              {/* Patient directory + visit requests (same page, 2 tabs) */}
              <Route
                path="patientDirectory"
                element={<PatientVisitRequests />}
              />
              <Route
                path="patientVisitRequests"
                element={
                  <Navigate
                    to="/dashboard/patientDirectory?tab=requests"
                    replace
                  />
                }
              />

              {/* Patient record: needs the patient id at the end of the URL */}
              <Route
                path="patientRecordsDetails/:patientId"
                element={<PatientRecordsDetails />}
              />
              {/* Old link without an id -> go to the directory */}
              <Route
                path="patientRecordsDetails"
                element={<Navigate to="/dashboard/patientDirectory" replace />}
              />

              <Route
                path="doctorProfileAndAvailability"
                element={<DoctorProfileAndAvailability />}
              />
            </Route>

            {/* Admin only */}
            <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
              <Route path="adminHome" element={<AdminHome />} />
              <Route path="userManagement" element={<UserManagement />} />
              <Route
                path="doctorVerification"
                element={<DoctorVerificationAndManagement />}
              />
              <Route path="auditAndSecurity" element={<AuditAndSecurity />} />
              <Route
                path="appointmentOverview"
                element={<AppointmentOverview />}
              />
            </Route>

            {/* Any other /dashboard/... URL */}
            <Route path="*" element={<ComingSoon />} />
          </Route>
        </Route>

        {/* Unknown URL -> home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;

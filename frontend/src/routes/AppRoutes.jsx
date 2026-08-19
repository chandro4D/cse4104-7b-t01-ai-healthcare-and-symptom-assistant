import { Routes, Route } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";

{
  /* General Page Locations */
}
import Home from "../pages/Home/Home";
import SignUp from "../pages/SignUp/SignUp";
import Login from "../pages/Login/Login";
import Doctors from "../pages/Doctors/Doctors";

import Dashboard from "../Dashboard/DashboardRoute/Dashboard";
import PatientHome from "../Dashboard/PatientDashboard/PatientHome";
import SymptomChecker from "../Dashboard/PatientDashboard/SymptomChecker";
import Appointments from "../pages/Appointments/Appointments";
import About from "../pages/About/About";


function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        {/* General Page Locations */}
        <Route index element={<Home />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" element={<Login />} />
        <Route path="/doctors" element={<Doctors />} />
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/about" element={<About/>} />

        {/* Dashboard is now a PARENT route with nested children */}
        <Route path="/dashboard" element={<Dashboard />}>
          {/* Patient Dashboard Routes */}
          <Route path="patientHome" element={<PatientHome />} />
          <Route path="symptomChecker" element={<SymptomChecker />} />
          {/* Add more nested routes here as you build them, e.g.: */}
          {/* <Route path="findDoctor" element={<FindDoctor />} /> */}
          {/* <Route path="appointments" element={<Appointments />} /> */}
        </Route>
      </Route>
    </Routes>
  );
}

export default AppRoutes;
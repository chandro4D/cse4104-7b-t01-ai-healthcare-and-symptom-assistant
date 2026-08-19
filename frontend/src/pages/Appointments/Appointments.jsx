import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
function Appointments() {
  const location = useLocation();
  const selectedDoctor = location.state?.doctor;

  const [appointments, setAppointments] = useState([
    {
      id: 1,
      patientName: "John Smith",
      doctor: "Dr. Sarah Johnson",
      specialty: "Cardiologist",
      date: "2026-07-20",
      time: "10:00",
      status: "Confirmed",
    },
    {
      id: 2,
      patientName: "Emma Brown",
      doctor: "Dr. Michael Brown",
      specialty: "Dermatologist",
      date: "2026-07-23",
      time: "15:30",
      status: "Pending",
    },
  ]);

  const [formData, setFormData] = useState({
    patientName: "",
    doctor: "",
    specialty: "",
    date: "",
    time: "",
    reason: "",
  });

  // Auto-fill doctor information when coming from Doctors page
  useEffect(() => {
    if (selectedDoctor) {
      setFormData((prev) => ({
        ...prev,
        doctor: selectedDoctor.name,
        specialty: selectedDoctor.specialty,
      }));
    }
  }, [selectedDoctor]);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.patientName ||
      !formData.doctor ||
      !formData.specialty ||
      !formData.date ||
      !formData.time ||
      !formData.reason
    ) {
      alert("Please fill in all fields.");
      return;
    }

    try {
      // Send appointment to backend
      const res = await axios.post(
        "http://localhost:5000/api/v1/appointments",
        formData,
        {
          withCredentials: true,
        },
      );

      // Backend response
      const savedAppointment = res.data.data;

      // Show instantly in Upcoming Appointments
      setAppointments((prev) => [savedAppointment, ...prev]);

      alert("Appointment Booked Successfully!");

      // Reset form but keep selected doctor
      setFormData({
        patientName: "",
        doctor: selectedDoctor?.name || "",
        specialty: selectedDoctor?.specialty || "",
        date: "",
        time: "",
        reason: "",
      });
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Failed to book appointment.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-600 to-blue-700 text-white p-10">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold">Book Medical Appointment</h1>
          <p className="mt-3 text-blue-100 max-w-3xl">
            Easily schedule appointments with experienced healthcare
            professionals.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Statistics */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-gray-500 font-semibold">Total Appointments</h2>
            <p className="text-4xl font-bold text-cyan-600 mt-3">
              {appointments.length}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-gray-500 font-semibold">Confirmed</h2>
            <p className="text-4xl font-bold text-green-600 mt-3">
              {appointments.filter((a) => a.status === "Confirmed").length}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-gray-500 font-semibold">Pending</h2>
            <p className="text-4xl font-bold text-orange-500 mt-3">
              {appointments.filter((a) => a.status === "Pending").length}
            </p>
          </div>
        </div>

        {/* Main */}
        <div className="grid lg:grid-cols-2 gap-8 mt-10">
          {/* Booking Form */}
          <div className="bg-white rounded-3xl shadow-xl p-8">
            <h2 className="text-2xl font-bold mb-6">Schedule Appointment</h2>

            {!selectedDoctor && (
              <div className="bg-yellow-100 text-yellow-800 p-4 rounded-xl mb-4">
                Please select a doctor from the Doctors page first.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <input
                type="text"
                name="patientName"
                placeholder="Patient Name"
                value={formData.patientName}
                onChange={handleChange}
                className="w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-cyan-500"
              />

              <input
                type="text"
                name="doctor"
                value={formData.doctor}
                readOnly
                className="w-full border rounded-xl p-3 bg-gray-100"
              />

              <input
                type="text"
                name="specialty"
                value={formData.specialty}
                readOnly
                className="w-full border rounded-xl p-3 bg-gray-100"
              />

              <div className="grid sm:grid-cols-2 gap-4">
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className="border rounded-xl p-3 outline-none focus:ring-2 focus:ring-cyan-500"
                />

                <input
                  type="time"
                  name="time"
                  value={formData.time}
                  onChange={handleChange}
                  className="border rounded-xl p-3 outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <textarea
                rows="5"
                name="reason"
                placeholder="Describe your symptoms or reason for appointment..."
                value={formData.reason}
                onChange={handleChange}
                className="w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-cyan-500"
              />

              <button className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-3 rounded-xl font-semibold transition">
                Book Appointment
              </button>
            </form>
          </div>

          {/* Upcoming Appointments */}
          <div className="bg-white rounded-3xl shadow-xl p-8">
            <h2 className="text-2xl font-bold mb-6">Upcoming Appointments</h2>

            <div className="space-y-5">
              {appointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="border rounded-2xl p-5 hover:shadow-lg transition"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-lg">
                        {appointment.doctor}
                      </h3>
                      <p className="text-gray-500">{appointment.specialty}</p>
                    </div>

                    <span
                      className={`px-4 py-2 rounded-full text-sm font-semibold ${
                        appointment.status === "Confirmed"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {appointment.status}
                    </span>
                  </div>

                  <div className="mt-4 text-gray-600 space-y-1">
                    <p>
                      <strong>Patient:</strong> {appointment.patientName}
                    </p>
                    <p>
                      📅 <strong>{appointment.date}</strong>
                    </p>
                    <p>
                      🕒 <strong>{appointment.time}</strong>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Appointments;

import React from "react";
import {
  FaSearch,
  FaBell,
  FaHeart,
  FaFileAlt,
  FaVideo,
  FaRobot,
} from "react-icons/fa";

const quickActions = [
  {
    icon: <FaHeart className="text-teal-700" />,
    title: "Check symptoms",
    subtitle: "Get instant AI guidance",
  },
  {
    icon: <FaSearch className="text-teal-700" />,
    title: "Find a doctor",
    subtitle: "Browse by department",
  },
  {
    icon: <FaFileAlt className="text-teal-700" />,
    title: "Scan prescription",
    subtitle: "Upload via OCR",
  },
  {
    icon: <FaVideo className="text-teal-700" />,
    title: "Video consult",
    subtitle: "Connect with a doctor",
  },
];

const statusStyles = {
  CONFIRMED: "bg-teal-50 text-teal-700",
  PENDING: "bg-amber-50 text-amber-700",
  SCHEDULED: "bg-slate-100 text-slate-600",
};

const appointments = [
  {
    day: "16",
    month: "JUN",
    doctor: "Dr. Anika Chowdhury",
    dept: "General Medicine · Follow-up",
    time: "10:30 AM",
    status: "CONFIRMED",
  },
  {
    day: "22",
    month: "JUN",
    doctor: "Dr. Tanvir Rahman",
    dept: "Cardiology · Risk Review",
    time: "2:00 PM",
    status: "PENDING",
  },
  {
    day: "30",
    month: "JUN",
    doctor: "Dr. Farzana Akter",
    dept: "Dermatology · Initial Visit",
    time: "11:15 AM",
    status: "SCHEDULED",
  },
];

const recommendations = [
  {
    title: "Mild headache pattern detected",
    body: "Logged 3 times this week — consider reducing screen time and tracking sleep hours.",
  },
  {
    title: "Cardiology check suggested",
    body: "Based on your last vitals entry, a routine BP review with Dr. Tanvir is recommended within 2 weeks.",
  },
  {
    title: "Prescription refill reminder",
    body: "Metformin 500mg refill due in 5 days. Tap to request from Dr. Anika.",
  },
];

function StatBlock({ label, value, unit, note }) {
  return (
    <div className="px-6 py-5 flex-1">
      <p className="text-[11px] tracking-widest text-slate-400 uppercase">
        {label}
      </p>
      <p className="mt-1 text-white">
        <span className="text-2xl font-semibold">{value}</span>{" "}
        {unit && <span className="text-sm text-slate-300">{unit}</span>}
      </p>
      <p className="text-xs text-slate-400 mt-0.5">{note}</p>
    </div>
  );
}

export default function PatientHome({ patientName = "Rafiul" }) {
  const today = new Date().toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="flex items-center gap-4 px-8 py-4 bg-white border-b border-slate-100">
        <div className="flex-1 flex items-center gap-2 bg-slate-50 rounded-lg px-4 py-2.5 max-w-md">
          <FaSearch className="text-slate-400 text-sm" />
          <input
            type="text"
            placeholder="Search doctors, records, prescriptions..."
            className="bg-transparent outline-none text-sm w-full placeholder:text-slate-400"
          />
        </div>
        <button className="w-10 h-10 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50">
          <FaBell />
        </button>
        <div className="w-10 h-10 rounded-full bg-teal-700 text-white flex items-center justify-center text-sm font-semibold">
          RI
        </div>
      </header>

      <main className="px-8 py-7 space-y-6">
        {/* Greeting */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold tracking-widest text-teal-700 uppercase">
              Good afternoon
            </p>
            <h1 className="text-3xl font-bold text-slate-900 mt-1">
              Welcome back, Chandra Shekhor
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Here's what's happening with your health today, {today}.
            </p>
          </div>
          <button className="bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
            + Book Appointment
          </button>
        </div>

        {/* Stat strip */}
        <div className="bg-[#0f211d] rounded-2xl flex flex-wrap divide-x divide-white/10">
          <StatBlock
            label="Last checkup"
            value="12"
            unit="days ago"
            note="Dr. Anika Chowdhury · General"
          />
          <StatBlock
            label="AI risk score"
            value="Low"
            unit="12%"
            note="↓ Improved since last scan"
          />
          <StatBlock
            label="Active prescriptions"
            value="2"
            unit="meds"
            note="Next refill in 5 days"
          />
          <StatBlock
            label="Upcoming"
            value="1"
            unit="appt."
            note="Tomorrow, 10:30 AM"
          />
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <button
              key={action.title}
              className="bg-white rounded-xl border border-slate-100 p-5 text-left hover:shadow-sm transition-shadow"
            >
              <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center mb-3">
                {action.icon}
              </div>
              <p className="font-semibold text-slate-900 text-sm">
                {action.title}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {action.subtitle}
              </p>
            </button>
          ))}
        </div>

        {/* Appointments + AI recommendations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900">
                Upcoming Appointments
              </h2>
              <button className="text-sm font-medium text-teal-700 hover:underline">
                View all
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {appointments.map((appt, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <div className="w-14 h-14 rounded-lg bg-slate-50 flex flex-col items-center justify-center shrink-0">
                    <span className="text-lg font-bold text-slate-900 leading-none">
                      {appt.day}
                    </span>
                    <span className="text-[10px] tracking-widest text-slate-400 uppercase mt-0.5">
                      {appt.month}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">
                      {appt.doctor}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {appt.dept}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm text-slate-700">{appt.time}</p>
                    <span
                      className={`inline-block mt-1 text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full ${
                        statusStyles[appt.status]
                      }`}
                    >
                      {appt.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900">AI Recommendations</h2>
              <span className="text-[10px] font-semibold tracking-widest text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full">
                LIVE
              </span>
            </div>
            <div className="space-y-3">
              {recommendations.map((rec, i) => (
                <div
                  key={i}
                  className="flex gap-3 bg-teal-50/60 rounded-lg p-4"
                >
                  <div className="w-7 h-7 rounded-full bg-teal-700 text-white flex items-center justify-center shrink-0 text-xs">
                    <FaRobot />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">
                      {rec.title}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                      {rec.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

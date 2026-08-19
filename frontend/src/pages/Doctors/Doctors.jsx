import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const doctors = [
  {
    id: 1,
    name: "Dr. Sarah Ahmed",
    specialty: "Cardiologist",
    experience: "12 Years",
    rating: 4.9,
    hospital: "National Heart Center",
    availability: "Available Today",
    image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=600",
  },
  {
    id: 2,
    name: "Dr. Michael Johnson",
    specialty: "Neurologist",
    experience: "10 Years",
    rating: 4.8,
    hospital: "City Medical Hospital",
    availability: "Available Tomorrow",
    image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=600",
  },
  {
    id: 3,
    name: "Dr. Emily Watson",
    specialty: "Dermatologist",
    experience: "8 Years",
    rating: 4.7,
    hospital: "Skin Care Clinic",
    availability: "Available Today",
    image: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=600",
  },
  {
    id: 4,
    name: "Dr. David Wilson",
    specialty: "Pediatrician",
    experience: "15 Years",
    rating: 5.0,
    hospital: "Children Hospital",
    availability: "Available Today",
    image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=600",
  },
  {
    id: 5,
    name: "Dr. Sophia Khan",
    specialty: "Gynecologist",
    experience: "11 Years",
    rating: 4.8,
    hospital: "Women's Care Center",
    availability: "Busy",
    image: "https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=600",
  },
  {
    id: 6,
    name: "Dr. James Brown",
    specialty: "Orthopedic",
    experience: "14 Years",
    rating: 4.9,
    hospital: "Orthopedic Institute",
    availability: "Available Today",
    image: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=600",
  },
];
function Doctors() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("All");

  const specialties = [
    "All",
    ...new Set(doctors.map((doctor) => doctor.specialty)),
  ];

  const filteredDoctors = useMemo(() => {
    return doctors.filter((doctor) => {
      const matchesSearch =
        doctor.name.toLowerCase().includes(search.toLowerCase()) ||
        doctor.specialty.toLowerCase().includes(search.toLowerCase());

      const matchesSpecialty =
        specialty === "All" || doctor.specialty === specialty;

      return matchesSearch && matchesSpecialty;
    });
  }, [search, specialty]);

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Hero */}

      <div className="bg-gradient-to-r from-cyan-600 to-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-6 py-20 text-center">
          <h1 className="text-4xl md:text-5xl font-bold">
            Meet Our Medical Experts
          </h1>

          <p className="mt-5 max-w-3xl mx-auto text-lg text-blue-100">
            Connect with experienced and verified doctors across multiple
            specialties. Book appointments, receive expert guidance, and enjoy
            secure healthcare consultations.
          </p>
        </div>
      </div>

      {/* Search */}

      <div className="max-w-7xl mx-auto px-6 -mt-10">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="grid md:grid-cols-2 gap-5">
            <input
              type="text"
              placeholder="Search doctor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border rounded-lg p-3 w-full outline-none focus:ring-2 focus:ring-cyan-500"
            />

            <select
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="border rounded-lg p-3 outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {specialties.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Doctors */}

      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredDoctors.map((doctor) => (
            <div
              key={doctor.id}
              className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl duration-300"
            >
              <img
                src={doctor.image}
                alt={doctor.name}
                className="h-72 w-full object-cover"
              />

              <div className="p-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold">{doctor.name}</h2>

                  <span className="text-yellow-500 font-semibold">
                    ⭐ {doctor.rating}
                  </span>
                </div>

                <p className="text-cyan-600 font-semibold mt-2">
                  {doctor.specialty}
                </p>

                <div className="space-y-2 mt-4 text-gray-600">
                  <p>
                    <strong>Experience:</strong> {doctor.experience}
                  </p>

                  <p>
                    <strong>Hospital:</strong> {doctor.hospital}
                  </p>

                  <p>
                    <strong>Status:</strong>{" "}
                    <span
                      className={`font-semibold ${
                        doctor.availability === "Busy"
                          ? "text-red-500"
                          : "text-green-600"
                      }`}
                    >
                      {doctor.availability}
                    </span>
                  </p>
                </div>
                <button
                  disabled={doctor.availability === "Busy"}
                  onClick={() =>
                    navigate("/appointments", {
                      state: { doctor },
                    })
                  }
                  className={`mt-6 w-full py-3 rounded-lg font-semibold transition ${
                    doctor.availability === "Busy"
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-cyan-600 hover:bg-cyan-700 text-white"
                  }`}
                >
                  {doctor.availability === "Busy"
                    ? "Currently Unavailable"
                    : "Book Appointment"}
                </button>
                {/* <button
                  className="mt-6 w-full bg-cyan-600 hover:bg-cyan-700 text-white py-3 rounded-lg font-semibold transition"
                  onClick={() =>
                    navigate("/appointments", {
                      state: { doctor },
                    })
                  }
                >
                  Book Appointment
                </button> */}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Why Choose */}

      <div className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-center">
            Why Choose Our Doctors?
          </h2>

          <div className="grid md:grid-cols-3 gap-8 mt-12">
            <div className="bg-slate-50 rounded-xl p-8 text-center shadow">
              <div className="text-5xl">👨‍⚕️</div>

              <h3 className="font-bold text-xl mt-4">Certified Specialists</h3>

              <p className="text-gray-600 mt-3">
                All doctors are professionally certified with years of clinical
                experience.
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-8 text-center shadow">
              <div className="text-5xl">💻</div>

              <h3 className="font-bold text-xl mt-4">Online Consultation</h3>

              <p className="text-gray-600 mt-3">
                Easily consult healthcare professionals from the comfort of your
                home.
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-8 text-center shadow">
              <div className="text-5xl">🔒</div>

              <h3 className="font-bold text-xl mt-4">Secure & Private</h3>

              <p className="text-gray-600 mt-3">
                Your health records and consultation data remain confidential
                and protected.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Emergency */}

      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white">
        <div className="max-w-7xl mx-auto px-6 py-16 text-center">
          <h2 className="text-4xl font-bold">
            Need Immediate Medical Assistance?
          </h2>

          <p className="mt-4 text-red-100 max-w-2xl mx-auto">
            If you are experiencing severe symptoms or a life-threatening
            emergency, contact your local emergency services immediately or
            visit the nearest hospital.
          </p>

          <button className="mt-8 bg-white text-red-600 px-8 py-3 rounded-lg font-bold hover:bg-gray-100">
            Emergency Support
          </button>
        </div>
      </div>
    </div>
  );
}

export default Doctors;

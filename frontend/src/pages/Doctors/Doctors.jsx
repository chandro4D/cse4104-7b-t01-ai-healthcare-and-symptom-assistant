import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDoctors, getSpecialties } from "../../services/doctorService";

function Doctors() {
  const navigate = useNavigate();

  // -----------------------------
  // State
  // -----------------------------
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("All");

  const [doctors, setDoctors] = useState([]);
  const [specialties, setSpecialties] = useState(["All"]);

  const [loading, setLoading] = useState(true);
  const [specialtyLoading, setSpecialtyLoading] = useState(true);

  const [error, setError] = useState("");
  const [specialtyError, setSpecialtyError] = useState("");

  // -----------------------------
  // Pagination
  // -----------------------------
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 9,
    totalPages: 1,
  });

  // -----------------------------
  // Fetch specialties
  // -----------------------------
  useEffect(() => {
    const fetchSpecialties = async () => {
      try {
        setSpecialtyLoading(true);
        setSpecialtyError("");

        const response = await getSpecialties();

        if (response.success) {
          setSpecialties(["All", ...(response.data || [])]);
        }
      } catch (error) {
        console.error("Specialty fetch error:", error);

        setSpecialtyError("Unable to load specialties.");
      } finally {
        setSpecialtyLoading(false);
      }
    };

    fetchSpecialties();
  }, []);

  // -----------------------------
  // Fetch doctors
  // -----------------------------
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await getDoctors({
          search,
          specialty,
          page,
          limit: 9,
        });

        if (response.success) {
          setDoctors(response.data?.doctors || []);

          setPagination(
            response.data?.pagination || {
              total: 0,
              page: 1,
              limit: 9,
              totalPages: 1,
            },
          );
        } else {
          setDoctors([]);
          setError(response.message || "Unable to load doctors.");
        }
      } catch (error) {
        console.error("Doctor fetch error:", error);

        setDoctors([]);
        setError(error.message || "Unable to load doctors.");
      } finally {
        setLoading(false);
      }
    };

    // Debounce search
    const timer = setTimeout(() => {
      fetchDoctors();
    }, 400);

    return () => clearTimeout(timer);
  }, [search, specialty, page]);

  // -----------------------------
  // Search handler
  // -----------------------------
  const handleSearchChange = (e) => {
    setSearch(e.target.value);

    // Go back to page 1 when searching
    setPage(1);
  };

  // -----------------------------
  // Specialty handler
  // -----------------------------
  const handleSpecialtyChange = (e) => {
    setSpecialty(e.target.value);

    // Go back to page 1
    setPage(1);
  };

  // -----------------------------
  // Book appointment
  // -----------------------------
  const handleBookAppointment = (doctor) => {
    if (doctor.availability === "Busy") {
      return;
    }

    // Pass only the doctor ID
    navigate("/appointments", {
      state: {
        doctorId: doctor._id,
        doctor: doctor,
      },
    });
  };

  // -----------------------------
  // Loading screen
  // -----------------------------
  if (loading && doctors.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        {/* Hero */}
        <div className="bg-gradient-to-r from-cyan-600 to-blue-700 text-white">
          <div className="max-w-7xl mx-auto px-6 py-20 text-center">
            <h1 className="text-4xl md:text-5xl font-bold">
              Meet Our Medical Experts
            </h1>

            <p className="mt-5 max-w-3xl mx-auto text-lg text-blue-100">
              Connect with experienced and verified doctors across multiple
              specialties.
            </p>
          </div>
        </div>

        {/* Loading */}
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin" />

            <p className="mt-5 text-gray-600 font-medium">Loading doctors...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* =====================================================
          HERO SECTION
      ====================================================== */}
      <section className="bg-gradient-to-r from-cyan-600 to-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-sm mb-6">
            <span className="w-2 h-2 bg-green-400 rounded-full"></span>
            Verified Healthcare Professionals
          </div>

          <h1 className="text-4xl md:text-5xl font-bold">
            Meet Our Medical Experts
          </h1>

          <p className="mt-5 max-w-3xl mx-auto text-lg text-blue-100 leading-relaxed">
            Connect with experienced and verified doctors across multiple
            specialties. Book appointments, receive expert guidance, and enjoy
            secure healthcare consultations.
          </p>
        </div>
      </section>

      {/* =====================================================
          SEARCH SECTION
      ====================================================== */}
      <section className="max-w-7xl mx-auto px-6 -mt-10 relative z-10">
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="grid md:grid-cols-2 gap-5">
            {/* Search */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Search Doctor
              </label>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by doctor name, specialty or hospital..."
                  value={search}
                  onChange={handleSearchChange}
                  className="
                    border border-gray-200
                    rounded-xl
                    p-3 pl-11
                    w-full
                    outline-none
                    transition
                    focus:ring-2
                    focus:ring-cyan-500
                    focus:border-cyan-500
                  "
                />

                {/* Search icon */}
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  🔍
                </div>
              </div>
            </div>

            {/* Specialty */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Specialty
              </label>

              <select
                value={specialty}
                onChange={handleSpecialtyChange}
                disabled={specialtyLoading}
                className="
                  border border-gray-200
                  rounded-xl
                  p-3
                  w-full
                  outline-none
                  transition
                  focus:ring-2
                  focus:ring-cyan-500
                  focus:border-cyan-500
                  disabled:bg-gray-100
                "
              >
                {specialties.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              {specialtyError && (
                <p className="text-xs text-red-500 mt-2">{specialtyError}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          DOCTORS SECTION
      ====================================================== */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Our Doctors</h2>

            <p className="text-gray-500 mt-2">
              {pagination.total} {pagination.total === 1 ? "doctor" : "doctors"}{" "}
              available
            </p>
          </div>

          {(search || specialty !== "All") && (
            <button
              onClick={() => {
                setSearch("");
                setSpecialty("All");
                setPage(1);
              }}
              className="
                text-cyan-600
                font-semibold
                hover:text-cyan-700
                transition
              "
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center mb-10">
            <div className="text-4xl mb-3">⚠️</div>

            <h3 className="font-bold text-red-700 text-lg">
              Unable to Load Doctors
            </h3>

            <p className="text-red-600 mt-2">{error}</p>

            <button
              onClick={() => window.location.reload()}
              className="
                mt-5
                bg-red-600
                hover:bg-red-700
                text-white
                px-6
                py-2
                rounded-lg
                font-semibold
                transition
              "
            >
              Try Again
            </button>
          </div>
        )}

        {/* Loading while searching */}
        {loading && doctors.length > 0 && (
          <div className="flex justify-center mb-8">
            <div className="w-8 h-8 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && doctors.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <div className="text-6xl mb-5">🩺</div>

            <h3 className="text-2xl font-bold text-gray-800">
              No Doctors Found
            </h3>

            <p className="text-gray-500 mt-3 max-w-md mx-auto">
              We couldn't find any doctors matching your search or selected
              specialty.
            </p>

            <button
              onClick={() => {
                setSearch("");
                setSpecialty("All");
                setPage(1);
              }}
              className="
                mt-6
                bg-cyan-600
                hover:bg-cyan-700
                text-white
                px-6
                py-3
                rounded-lg
                font-semibold
                transition
              "
            >
              View All Doctors
            </button>
          </div>
        )}

        {/* Doctor Cards */}
        {!error && doctors.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {doctors.map((doctor) => (
              <div
                key={doctor._id}
                className="
                  bg-white
                  rounded-2xl
                  overflow-hidden
                  shadow-md
                  hover:shadow-xl
                  transition
                  duration-300
                  border
                  border-gray-100
                  group
                "
              >
                {/* Doctor Image */}
                <div className="relative overflow-hidden">
                  <img
                    src={
                      doctor.image ||
                      "https://via.placeholder.com/600x400?text=Doctor"
                    }
                    alt={doctor.name}
                    className="
                      h-72
                      w-full
                      object-cover
                      group-hover:scale-105
                      transition
                      duration-500
                    "
                    onError={(e) => {
                      e.currentTarget.src =
                        "https://via.placeholder.com/600x400?text=Doctor";
                    }}
                  />

                  {/* Verified badge */}
                  {doctor.isVerified && (
                    <div
                      className="
                      absolute
                      top-4
                      left-4
                      bg-white
                      text-green-600
                      px-3
                      py-1.5
                      rounded-full
                      text-xs
                      font-bold
                      shadow
                    "
                    >
                      ✓ Verified
                    </div>
                  )}

                  {/* Availability badge */}
                  <div
                    className={`
                      absolute
                      top-4
                      right-4
                      px-3
                      py-1.5
                      rounded-full
                      text-xs
                      font-bold
                      shadow
                      ${
                        doctor.availability === "Busy"
                          ? "bg-red-100 text-red-600"
                          : "bg-green-100 text-green-600"
                      }
                    `}
                  >
                    {doctor.availability}
                  </div>
                </div>

                {/* Doctor Information */}
                <div className="p-6">
                  {/* Name + Rating */}
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">
                        {doctor.name}
                      </h2>

                      <p className="text-cyan-600 font-semibold mt-1">
                        {doctor.specialty}
                      </p>
                    </div>

                    <div
                      className="
                      flex
                      items-center
                      gap-1
                      bg-yellow-50
                      text-yellow-600
                      px-2.5
                      py-1
                      rounded-lg
                      text-sm
                      font-bold
                    "
                    >
                      ⭐ {doctor.rating ?? 0}
                    </div>
                  </div>

                  {/* Doctor Details */}
                  <div className="space-y-3 mt-5 text-gray-600">
                    <div className="flex items-start gap-3">
                      <span className="text-lg">🎓</span>

                      <p>
                        <span className="font-semibold text-gray-800">
                          Experience:
                        </span>{" "}
                        {doctor.experience}{" "}
                        {Number(doctor.experience) === 1 ? "Year" : "Years"}
                      </p>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="text-lg">🏥</span>

                      <p>
                        <span className="font-semibold text-gray-800">
                          Hospital:
                        </span>{" "}
                        {doctor.hospital}
                      </p>
                    </div>

                    {doctor.consultationFee !== undefined && (
                      <div className="flex items-start gap-3">
                        <span className="text-lg">💳</span>

                        <p>
                          <span className="font-semibold text-gray-800">
                            Consultation:
                          </span>{" "}
                          ৳{doctor.consultationFee}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Bio */}
                  {doctor.bio && (
                    <p
                      className="
                      text-sm
                      text-gray-500
                      mt-5
                      line-clamp-2
                    "
                    >
                      {doctor.bio}
                    </p>
                  )}

                  {/* Book Appointment */}
                  <button
                    disabled={doctor.availability === "Busy"}
                    onClick={() => handleBookAppointment(doctor)}
                    className={`
                      mt-6
                      w-full
                      py-3
                      rounded-xl
                      font-semibold
                      transition
                      ${
                        doctor.availability === "Busy"
                          ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                          : "bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm hover:shadow-md"
                      }
                    `}
                  >
                    {doctor.availability === "Busy"
                      ? "Currently Unavailable"
                      : "Book Appointment"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* =====================================================
            PAGINATION
        ====================================================== */}
        {!loading &&
          !error &&
          doctors.length > 0 &&
          pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-3 mt-12">
              {/* Previous */}
              <button
                disabled={page === 1}
                onClick={() => setPage((prev) => prev - 1)}
                className="
                  px-4
                  py-2
                  rounded-lg
                  border
                  border-gray-200
                  font-semibold
                  disabled:opacity-40
                  disabled:cursor-not-allowed
                  hover:bg-gray-50
                "
              >
                ← Previous
              </button>

              {/* Page numbers */}
              <div className="flex items-center gap-2">
                {Array.from(
                  {
                    length: pagination.totalPages,
                  },
                  (_, index) => index + 1,
                ).map((pageNumber) => (
                  <button
                    key={pageNumber}
                    onClick={() => setPage(pageNumber)}
                    className={`
                      w-10
                      h-10
                      rounded-lg
                      font-semibold
                      ${
                        page === pageNumber
                          ? "bg-cyan-600 text-white"
                          : "border border-gray-200 hover:bg-gray-50"
                      }
                    `}
                  >
                    {pageNumber}
                  </button>
                ))}
              </div>

              {/* Next */}
              <button
                disabled={page === pagination.totalPages}
                onClick={() => setPage((prev) => prev + 1)}
                className="
                  px-4
                  py-2
                  rounded-lg
                  border
                  border-gray-200
                  font-semibold
                  disabled:opacity-40
                  disabled:cursor-not-allowed
                  hover:bg-gray-50
                "
              >
                Next →
              </button>
            </div>
          )}
      </section>

      {/* =====================================================
          WHY CHOOSE OUR DOCTORS
      ====================================================== */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <span className="text-cyan-600 font-semibold">
              QUALITY HEALTHCARE
            </span>

            <h2 className="text-4xl font-bold text-gray-900 mt-2">
              Why Choose Our Doctors?
            </h2>

            <p className="text-gray-500 mt-4 max-w-2xl mx-auto">
              We connect patients with trusted healthcare professionals who are
              committed to providing quality medical care.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-12">
            {/* Card 1 */}
            <div
              className="
              bg-slate-50
              rounded-2xl
              p-8
              text-center
              shadow-sm
              hover:shadow-md
              transition
            "
            >
              <div className="text-5xl">👨‍⚕️</div>

              <h3 className="font-bold text-xl mt-5">Certified Specialists</h3>

              <p className="text-gray-600 mt-3 leading-relaxed">
                All doctors are professionally certified with years of clinical
                experience.
              </p>
            </div>

            {/* Card 2 */}
            <div
              className="
              bg-slate-50
              rounded-2xl
              p-8
              text-center
              shadow-sm
              hover:shadow-md
              transition
            "
            >
              <div className="text-5xl">💻</div>

              <h3 className="font-bold text-xl mt-5">Online Consultation</h3>

              <p className="text-gray-600 mt-3 leading-relaxed">
                Easily consult healthcare professionals from the comfort of your
                home.
              </p>
            </div>

            {/* Card 3 */}
            <div
              className="
              bg-slate-50
              rounded-2xl
              p-8
              text-center
              shadow-sm
              hover:shadow-md
              transition
            "
            >
              <div className="text-5xl">🔒</div>

              <h3 className="font-bold text-xl mt-5">Secure & Private</h3>

              <p className="text-gray-600 mt-3 leading-relaxed">
                Your health records and consultation data remain confidential
                and protected.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          EMERGENCY SECTION
      ====================================================== */}
      <section className="bg-gradient-to-r from-red-600 to-red-700 text-white">
        <div className="max-w-7xl mx-auto px-6 py-16 text-center">
          <div className="text-5xl mb-5">🚨</div>

          <h2 className="text-4xl font-bold">
            Need Immediate Medical Assistance?
          </h2>

          <p className="mt-4 text-red-100 max-w-2xl mx-auto leading-relaxed">
            If you are experiencing severe symptoms or a life-threatening
            emergency, contact your local emergency services immediately or
            visit the nearest hospital.
          </p>

          <button
            onClick={() => {
              alert(
                "For a medical emergency, please contact your local emergency services or visit the nearest hospital.",
              );
            }}
            className="
              mt-8
              bg-white
              text-red-600
              px-8
              py-3
              rounded-xl
              font-bold
              hover:bg-gray-100
              transition
              shadow-lg
            "
          >
            Emergency Support
          </button>
        </div>
      </section>
    </div>
  );
}

export default Doctors;

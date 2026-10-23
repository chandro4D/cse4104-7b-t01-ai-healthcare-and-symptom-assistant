const Doctor = require("../models/Doctor.model");

// Only verified + active doctors are visible to the public
const PUBLIC_FILTER = { isVerified: true, isActive: true };

// Private fields that should never be sent from public endpoints
const PRIVATE_FIELDS =
  "-licenseNumber -rejectionReason -pendingChanges -email -phone";

// Fields that only an admin verification flow may change
const PROTECTED_FIELDS = [
  "isVerified",
  "verifiedAt",
  "rejectionReason",
  "isActive",
  "user",
  "rating",
];

// Escape user input so characters like ( or * can't break the regex
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const stripProtectedFields = (data = {}) => {
  const clean = { ...data };
  PROTECTED_FIELDS.forEach((field) => delete clean[field]);
  return clean;
};

const getDoctors = async ({ search, specialty, page = 1, limit = 9 }) => {
  console.log("NEW SERVICE RUNNING", PUBLIC_FILTER);

  const query = { ...PUBLIC_FILTER };

  if (search && search.trim()) {
    const regex = new RegExp(escapeRegex(search.trim()), "i");
    query.$or = [{ name: regex }, { specialty: regex }, { hospital: regex }];
  }

  if (specialty && specialty !== "All") {
    query.specialty = specialty;
  }

  const skip = (page - 1) * limit;

  const [doctors, total] = await Promise.all([
    Doctor.find(query)
      // _id tiebreaker keeps pagination stable when many doctors share a rating
      .sort({ rating: -1, _id: 1 })
      .skip(skip)
      .limit(limit)
      .select(PRIVATE_FIELDS)
      .lean(),

    Doctor.countDocuments(query),
  ]);

  // ---------- TEMPORARY TEST LOGS (delete after testing) ----------
  console.log("DB:", Doctor.db.name, "| collection:", Doctor.collection.name);
  console.log("QUERY:", JSON.stringify(query));
  console.log(
    "RESULT:",
    doctors.map((d) => ({
      name: d.name,
      isVerified: d.isVerified,
      isActive: d.isActive,
    })),
  );
  // ----------------------------------------------------------------

  return {
    doctors,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

const getDoctorById = async (id) => {
  return Doctor.findOne({ _id: id, ...PUBLIC_FILTER })
    .select(PRIVATE_FIELDS)
    .lean();
};

const createDoctor = async (doctorData) => {
  // New doctors always start unverified
  return Doctor.create({
    ...stripProtectedFields(doctorData),
    isVerified: false,
  });
};

const updateDoctor = async (id, doctorData) => {
  return Doctor.findByIdAndUpdate(id, stripProtectedFields(doctorData), {
    new: true,
    runValidators: true,
  });
};

const deleteDoctor = async (id) => {
  return Doctor.findByIdAndUpdate(id, { isActive: false }, { new: true });
};

const getSpecialties = async () => {
  const specialties = await Doctor.distinct("specialty", PUBLIC_FILTER);
  return specialties.filter(Boolean).sort();
};

// ---------- Admin only (protect the route with admin middleware) ----------

const verifyDoctor = async (id) => {
  return Doctor.findByIdAndUpdate(
    id,
    {
      isVerified: true,
      verifiedAt: new Date(),
      rejectionReason: "",
      availability: "Available",
    },
    { new: true },
  );
};

const rejectDoctor = async (id, reason = "") => {
  return Doctor.findByIdAndUpdate(
    id,
    { isVerified: false, verifiedAt: null, rejectionReason: reason },
    { new: true },
  );
};

module.exports = {
  getDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor,
  getSpecialties,
  verifyDoctor,
  rejectDoctor,
};

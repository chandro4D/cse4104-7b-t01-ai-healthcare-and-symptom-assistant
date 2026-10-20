const Doctor = require("../models/Doctor.model");

const getDoctors = async ({ search, specialty, page = 1, limit = 9 }) => {
  console.log("DB:", Doctor.db.name);
  console.log("Total docs (no filter):", await Doctor.countDocuments({}));
  console.log(
    "Total active docs:",
    await Doctor.countDocuments({ isActive: true }),
  );
  const query = {
    isActive: true,
  };

  if (search) {
    query.$or = [
      {
        name: {
          $regex: search,
          $options: "i",
        },
      },
      {
        specialty: {
          $regex: search,
          $options: "i",
        },
      },
      {
        hospital: {
          $regex: search,
          $options: "i",
        },
      },
    ];
  }

  if (specialty && specialty !== "All") {
    query.specialty = specialty;
  }

  const skip = (page - 1) * limit;

  const [doctors, total] = await Promise.all([
    Doctor.find(query).sort({ rating: -1 }).skip(skip).limit(limit).lean(),

    Doctor.countDocuments(query),
  ]);

  return {
    doctors,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getDoctorById = async (id) => {
  return Doctor.findOne({
    _id: id,
    isActive: true,
  }).lean();
};

const createDoctor = async (doctorData) => {
  return Doctor.create(doctorData);
};

const updateDoctor = async (id, doctorData) => {
  return Doctor.findByIdAndUpdate(id, doctorData, {
    new: true,
    runValidators: true,
  });
};

const deleteDoctor = async (id) => {
  return Doctor.findByIdAndUpdate(
    id,
    {
      isActive: false,
    },
    {
      new: true,
    },
  );
};

const getSpecialties = async () => {
  return Doctor.distinct("specialty", {
    isActive: true,
  });
};

module.exports = {
  getDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor,
  getSpecialties,
};

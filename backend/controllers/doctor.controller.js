const asyncHandler = require("express-async-handler");
const User = require("../models/User.model");
const Doctor = require("../models/Doctor.model");
const Prescription = require("../models/Prescription.model");

// ─── @desc    Get all verified doctors (with filters)
// ─── @route   GET /api/v1/doctors
// ─── @access  Public
const getAllDoctors = asyncHandler(async (req, res) => {
  const { specialization, location, available } = req.query;

  // Build filter
  let filter = { isVerified: true };
  if (specialization) filter.specialization = new RegExp(specialization, "i");
  if (location) filter.location = new RegExp(location, "i");

  const doctors = await Doctor.find(filter)
    .populate("userId", "name email avatar phone")
    .sort({ rating: -1 });

  res.status(200).json({
    success: true,
    count: doctors.length,
    data: doctors,
  });
});

// ─── @desc    Get doctor by ID
// ─── @route   GET /api/v1/doctors/:id
// ─── @access  Public
const getDoctorById = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findOne({ userId: req.params.id }).populate(
    "userId",
    "name email avatar phone",
  );

  if (!doctor) {
    res.status(404);
    throw new Error("Doctor not found.");
  }

  res.status(200).json({ success: true, data: doctor });
});

// ─── @desc    Create/update doctor profile
// ─── @route   PUT /api/v1/doctors/profile
// ─── @access  Doctor
const updateDoctorProfile = asyncHandler(async (req, res) => {
  const {
    specialization,
    licenseNumber,
    qualifications,
    experience,
    consultationFee,
    hospital,
    location,
    bio,
    availability,
  } = req.body;

  let doctor = await Doctor.findOne({ userId: req.user._id });

  if (doctor) {
    // Update existing
    doctor = await Doctor.findOneAndUpdate(
      { userId: req.user._id },
      {
        specialization,
        licenseNumber,
        qualifications,
        experience,
        consultationFee,
        hospital,
        location,
        bio,
        availability,
      },
      { new: true, runValidators: true },
    );
  } else {
    // Create new doctor profile
    doctor = await Doctor.create({
      userId: req.user._id,
      specialization,
      licenseNumber,
      qualifications,
      experience,
      consultationFee,
      hospital,
      location,
      bio,
      availability,
    });
  }

  res.status(200).json({
    success: true,
    message: "Doctor profile updated successfully.",
    data: doctor,
  });
});

// ─── @desc    Create digital prescription
// ─── @route   POST /api/v1/doctors/prescriptions
// ─── @access  Doctor
const createPrescription = asyncHandler(async (req, res) => {
  const {
    patientId,
    appointmentId,
    diagnosis,
    medicines,
    advice,
    followUpDate,
  } = req.body;

  const prescription = await Prescription.create({
    doctorId: req.user._id,
    patientId,
    appointmentId,
    diagnosis,
    medicines,
    advice,
    followUpDate,
  });

  res.status(201).json({
    success: true,
    message: "Prescription created successfully.",
    data: prescription,
  });
});

// ─── @desc    Get doctor's prescriptions
// ─── @route   GET /api/v1/doctors/prescriptions
// ─── @access  Doctor
const getDoctorPrescriptions = asyncHandler(async (req, res) => {
  const prescriptions = await Prescription.find({ doctorId: req.user._id })
    .populate("patientId", "name email")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: prescriptions.length,
    data: prescriptions,
  });
});

module.exports = {
  getAllDoctors,
  getDoctorById,
  updateDoctorProfile,
  createPrescription,
  getDoctorPrescriptions,
};

const asyncHandler = require("express-async-handler");
const Patient = require("../models/Patient.model");
const Appointment = require("../models/Appointment.model");
const Prescription = require("../models/Prescription.model");
const MedicalRecord = require("../models/MedicalRecord.model");

// ─── @desc    Get patient profile
// ─── @route   GET /api/v1/patients/profile
// ─── @access  Patient
const getPatientProfile = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ userId: req.user._id }).populate(
    "userId",
    "name email phone avatar",
  );

  if (!patient) {
    res.status(404);
    throw new Error("Patient profile not found.");
  }

  res.status(200).json({ success: true, data: patient });
});

// ─── @desc    Update patient profile
// ─── @route   PUT /api/v1/patients/profile
// ─── @access  Patient
const updatePatientProfile = asyncHandler(async (req, res) => {
  const {
    dateOfBirth,
    gender,
    bloodGroup,
    allergies,
    chronicConditions,
    currentMedications,
    emergencyContact,
    address,
  } = req.body;

  const patient = await Patient.findOneAndUpdate(
    { userId: req.user._id },
    {
      dateOfBirth,
      gender,
      bloodGroup,
      allergies,
      chronicConditions,
      currentMedications,
      emergencyContact,
      address,
    },
    { new: true, runValidators: true },
  );

  res.status(200).json({
    success: true,
    message: "Profile updated successfully.",
    data: patient,
  });
});

// ─── @desc    Get patient dashboard summary
// ─── @route   GET /api/v1/patients/dashboard
// ─── @access  Patient
const getPatientDashboard = asyncHandler(async (req, res) => {
  const patientId = req.user._id;

  const [upcomingAppointments, recentPrescriptions, recordCount] =
    await Promise.all([
      Appointment.find({
        patientId,
        date: { $gte: new Date() },
        status: { $in: ["pending", "confirmed"] },
      })
        .populate("doctorId", "name avatar")
        .sort({ date: 1 })
        .limit(5),

      Prescription.find({ patientId })
        .populate("doctorId", "name")
        .sort({ createdAt: -1 })
        .limit(5),

      MedicalRecord.countDocuments({ patientId }),
    ]);

  res.status(200).json({
    success: true,
    data: {
      upcomingAppointments,
      recentPrescriptions,
      totalMedicalRecords: recordCount,
    },
  });
});

// ─── @desc    Get patient prescriptions
// ─── @route   GET /api/v1/patients/prescriptions
// ─── @access  Patient
const getPatientPrescriptions = asyncHandler(async (req, res) => {
  const prescriptions = await Prescription.find({ patientId: req.user._id })
    .populate("doctorId", "name avatar")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: prescriptions.length,
    data: prescriptions,
  });
});

// ─── @desc    Get patient medical records
// ─── @route   GET /api/v1/patients/records
// ─── @access  Patient
const getMedicalRecords = asyncHandler(async (req, res) => {
  const records = await MedicalRecord.find({ patientId: req.user._id }).sort({
    date: -1,
  });

  res.status(200).json({
    success: true,
    count: records.length,
    data: records,
  });
});

// ─── @desc    Upload a medical record
// ─── @route   POST /api/v1/patients/records
// ─── @access  Patient
const addMedicalRecord = asyncHandler(async (req, res) => {
  const { type, title, description, fileUrl, date } = req.body;

  const record = await MedicalRecord.create({
    patientId: req.user._id,
    uploadedBy: req.user._id,
    type,
    title,
    description,
    fileUrl,
    date,
  });

  res.status(201).json({
    success: true,
    message: "Medical record added successfully.",
    data: record,
  });
});

module.exports = {
  getPatientProfile,
  updatePatientProfile,
  getPatientDashboard,
  getPatientPrescriptions,
  getMedicalRecords,
  addMedicalRecord,
};

const asyncHandler = require("express-async-handler");
const User = require("../models/User.model");
const Doctor = require("../models/Doctor.model");
const Appointment = require("../models/Appointment.model");
const Notification = require("../models/Notification.model");

// ─── @desc    Get admin dashboard stats
// ─── @route   GET /api/v1/admin/dashboard
// ─── @access  Admin
const getDashboard = asyncHandler(async (req, res) => {
  const [totalUsers, totalDoctors, pendingDoctors, totalAppointments] =
    await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "doctor" }),
      Doctor.countDocuments({ isVerified: false }),
      Appointment.countDocuments(),
    ]);

  const appointmentsByStatus = await Appointment.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalUsers,
      totalDoctors,
      pendingDoctors,
      totalAppointments,
      appointmentsByStatus,
    },
  });
});

// ─── @desc    Get all users
// ─── @route   GET /api/v1/admin/users
// ─── @access  Admin
const getAllUsers = asyncHandler(async (req, res) => {
  const { role, search } = req.query;
  let filter = {};
  if (role) filter.role = role;
  if (search) filter.name = new RegExp(search, "i");

  const users = await User.find(filter)
    .select("-password")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: users.length,
    data: users,
  });
});

// ─── @desc    Update user status (activate/suspend)
// ─── @route   PUT /api/v1/admin/users/:id
// ─── @access  Admin
const updateUserStatus = asyncHandler(async (req, res) => {
  const { isActive } = req.body;

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isActive },
    { new: true },
  ).select("-password");

  if (!user) {
    res.status(404);
    throw new Error("User not found.");
  }

  res.status(200).json({
    success: true,
    message: `User ${isActive ? "activated" : "suspended"} successfully.`,
    data: user,
  });
});

// ─── @desc    Get pending doctors (awaiting verification)
// ─── @route   GET /api/v1/admin/doctors
// ─── @access  Admin
const getPendingDoctors = asyncHandler(async (req, res) => {
  const doctors = await Doctor.find({ isVerified: false })
    .populate("userId", "name email phone createdAt")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: doctors.length,
    data: doctors,
  });
});

// ─── @desc    Verify / reject a doctor
// ─── @route   PUT /api/v1/admin/doctors/:id/verify
// ─── @access  Admin
const verifyDoctor = asyncHandler(async (req, res) => {
  const { isVerified, rejectionReason } = req.body;

  const doctor = await Doctor.findByIdAndUpdate(
    req.params.id,
    {
      isVerified,
      verifiedAt: isVerified ? new Date() : undefined,
    },
    { new: true },
  ).populate("userId", "name email");

  if (!doctor) {
    res.status(404);
    throw new Error("Doctor not found.");
  }

  // Notify doctor
  await Notification.create({
    userId: doctor.userId._id,
    title: isVerified ? "Account Verified ✅" : "Account Rejected ❌",
    message: isVerified
      ? "Congratulations! Your doctor account has been verified. You can now receive appointments."
      : `Your account was not approved. Reason: ${rejectionReason || "Does not meet requirements."}`,
    type: "system",
  });

  res.status(200).json({
    success: true,
    message: `Doctor ${isVerified ? "verified" : "rejected"} successfully.`,
    data: doctor,
  });
});

module.exports = {
  getDashboard,
  getAllUsers,
  updateUserStatus,
  getPendingDoctors,
  verifyDoctor,
};

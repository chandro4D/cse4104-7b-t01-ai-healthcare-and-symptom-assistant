const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");

const User = require("../models/User.model");
const Doctor = require("../models/Doctor.model");
const Appointment = require("../models/Appointment.model");
const Notification = require("../models/Notification.model");
const { writeAuditLog } = require("../utils/auditLogger");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// ============================================
// AUDIT LOG HELPER
// ============================================
const logAdminAudit = async ({
  req,
  action,
  targetType,
  targetId,
  reason,
  metadata,
}) => {
  try {
    await writeAuditLog({
      req,
      action,
      targetType,
      targetId,
      reason,
      outcome: "success",
      metadata,
    });
  } catch (error) {
    // Monitor this error in production.
    // Do not return a failed response after the
    // administrative change has already been saved.
    console.error("Failed to write admin audit log:", error.message);
  }
};

// ============================================
// ADMIN DASHBOARD
// GET /api/v1/admin/dashboard
// ============================================
const getDashboard = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalDoctors,
    pendingDoctors,
    approvedDoctors,
    suspendedDoctors,
    totalAppointments,
    appointmentsByStatus,
  ] = await Promise.all([
    User.countDocuments(),

    Doctor.countDocuments(),

    Doctor.countDocuments({
      isVerified: false,
      isActive: true,
      rejectionReason: "",
    }),

    Doctor.countDocuments({
      isVerified: true,
      isActive: true,
    }),

    Doctor.countDocuments({
      isActive: false,
    }),

    Appointment.countDocuments(),

    Appointment.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalUsers,
      totalDoctors,
      pendingDoctors,
      approvedDoctors,
      suspendedDoctors,
      totalAppointments,
      appointmentsByStatus,
    },
  });
});

// ============================================
// GET ALL USERS
// GET /api/v1/admin/users
// Optional query: ?role=patient&search=example
// ============================================
const getAllUsers = asyncHandler(async (req, res) => {
  const { role, search } = req.query;
  const filter = {};

  if (role) {
    const allowedRoles = ["patient", "doctor", "admin"];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role filter.",
      });
    }

    filter.role = role;
  }

  if (search && String(search).trim()) {
    const escapedSearch = String(search)
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const regex = new RegExp(escapedSearch, "i");

    filter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
  }

  const users = await User.find(filter)
    .select("-password")
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({
    success: true,
    count: users.length,
    data: users,
  });
});

// ============================================
// ACTIVATE OR SUSPEND USER ACCOUNT
// PATCH /api/v1/admin/users/:id/status
// Body: { "isActive": false }
// ============================================
const updateUserStatus = asyncHandler(async (req, res) => {
  const { isActive, reason } = req.body;

  if (typeof isActive !== "boolean") {
    return res.status(400).json({
      success: false,
      message: "isActive must be true or false.",
    });
  }

  if (!isValidId(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid user ID.",
    });
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found.",
    });
  }

  const previousIsActive = user.isActive !== false;

  // Prevent an administrator from suspending their own account.
  if (user._id.toString() === req.user._id.toString() && isActive === false) {
    return res.status(400).json({
      success: false,
      message: "You cannot suspend your own account.",
    });
  }

  // Do not suspend the final active administrator.
  if (user.role === "admin" && isActive === false && previousIsActive) {
    const activeAdminCount = await User.countDocuments({
      role: "admin",
      isActive: { $ne: false },
    });

    if (activeAdminCount <= 1) {
      return res.status(400).json({
        success: false,
        message: "Cannot suspend the last active administrator.",
      });
    }
  }

  user.isActive = isActive;
  await user.save();

  // Log only when the account status actually changes.
  if (previousIsActive !== isActive) {
    await logAdminAudit({
      req,
      action: isActive ? "USER_REACTIVATED" : "USER_SUSPENDED",
      targetType: "user",
      targetId: user._id,
      reason:
        String(reason || "").trim() ||
        (isActive
          ? "Account reactivated by administrator."
          : "Account suspended by administrator."),
      metadata: {
        previousIsActive,
        newIsActive: isActive,
      },
    });
  }

  const safeUser = await User.findById(user._id).select("-password").lean();

  res.status(200).json({
    success: true,
    message: `User ${isActive ? "activated" : "suspended"} successfully.`,
    data: safeUser,
  });
});

// ============================================
// CHANGE USER ROLE
// PATCH /api/v1/admin/users/:id/role
// Body: { "role": "doctor", "reason": "..." }
// ============================================
const updateUserRole = asyncHandler(async (req, res) => {
  const { role, reason } = req.body;
  const userId = req.params.id;
  const adminId = req.user._id.toString();

  const allowedRoles = ["patient", "doctor", "admin"];

  if (!allowedRoles.includes(role)) {
    return res.status(400).json({
      success: false,
      message: "Role must be patient, doctor, or admin.",
    });
  }

  if (!isValidId(userId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid user ID.",
    });
  }

  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found.",
    });
  }

  if (user._id.toString() === adminId) {
    return res.status(400).json({
      success: false,
      message: "You cannot change your own role.",
    });
  }

  const previousRole = user.role;

  if (previousRole === role) {
    return res.status(200).json({
      success: true,
      message: "User already has this role.",
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    });
  }

  if (previousRole === "admin" && role !== "admin") {
    const activeAdminCount = await User.countDocuments({
      role: "admin",
      isActive: { $ne: false },
    });

    if (user.isActive !== false && activeAdminCount <= 1) {
      return res.status(400).json({
        success: false,
        message: "Cannot demote the last active administrator.",
      });
    }
  }

  user.role = role;
  await user.save();

  await logAdminAudit({
    req,
    action: "ROLE_CHANGED",
    targetType: "user",
    targetId: user._id,
    reason:
      String(reason || "").trim() ||
      `User role changed from ${previousRole} to ${role}.`,
    metadata: {
      previousRole,
      newRole: role,
    },
  });

  res.status(200).json({
    success: true,
    message: `User role changed from ${previousRole} to ${role}.`,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    },
  });
});

// ============================================
// LIST ALL DOCTOR PROFILES
// GET /api/v1/admin/doctors
// ============================================
const getPendingDoctors = asyncHandler(async (req, res) => {
  const doctors = await Doctor.find({})
    .populate("user", "name email phone role isActive createdAt")
    .sort({ createdAt: -1 })
    .lean();

  const normalizedDoctors = doctors.map((doctor) => ({
    ...doctor,
    verificationStatus:
      doctor.isActive === false
        ? "Suspended"
        : doctor.rejectionReason
          ? "Rejected"
          : doctor.isVerified
            ? "Approved"
            : "Pending",
  }));

  res.status(200).json({
    success: true,
    count: normalizedDoctors.length,
    data: normalizedDoctors,
  });
});

// ============================================
// APPROVE OR REJECT A DOCTOR
// PUT /api/v1/admin/doctors/:id/verify
// Approve: { "isVerified": true }
// Reject: { "isVerified": false, "rejectionReason": "..." }
// ============================================
const verifyDoctor = asyncHandler(async (req, res) => {
  const { isVerified, rejectionReason } = req.body;

  if (typeof isVerified !== "boolean") {
    return res.status(400).json({
      success: false,
      message: "isVerified must be true or false.",
    });
  }

  if (!isValidId(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid doctor ID.",
    });
  }

  if (isVerified === false && !String(rejectionReason || "").trim()) {
    return res.status(400).json({
      success: false,
      message: "A rejection reason is required.",
    });
  }

  const doctor = await Doctor.findById(req.params.id).populate(
    "user",
    "name email phone",
  );

  if (!doctor) {
    return res.status(404).json({
      success: false,
      message: "Doctor not found.",
    });
  }

  if (doctor.isActive === false) {
    return res.status(400).json({
      success: false,
      message: "Restore this doctor before changing verification status.",
    });
  }

  const previousIsVerified = doctor.isVerified === true;
  const normalizedRejectionReason = isVerified
    ? ""
    : String(rejectionReason).trim();

  doctor.isVerified = isVerified;
  doctor.verifiedAt = isVerified ? new Date() : null;
  doctor.rejectionReason = normalizedRejectionReason;

  await doctor.save();

  if (doctor.user?._id) {
    await Notification.create({
      userId: doctor.user._id,
      title: isVerified
        ? "Doctor Account Verified"
        : "Doctor Application Rejected",
      message: isVerified
        ? "Your doctor account has been verified. You may now receive appointments."
        : `Your doctor application was rejected. Reason: ${normalizedRejectionReason}`,
      type: "system",
    });
  }

  if (previousIsVerified !== isVerified) {
    await logAdminAudit({
      req,
      action: isVerified
        ? "DOCTOR_VERIFICATION_APPROVED"
        : "DOCTOR_VERIFICATION_REJECTED",
      targetType: "doctor",
      targetId: doctor._id,
      reason: isVerified
        ? "Doctor verification approved by administrator."
        : normalizedRejectionReason,
      metadata: {
        previousIsVerified,
        newIsVerified: isVerified,
        decision: isVerified ? "approved" : "rejected",
        notificationQueued: Boolean(doctor.user?._id),
      },
    });
  }

  const updatedDoctor = await Doctor.findById(doctor._id)
    .populate("user", "name email phone role isActive createdAt")
    .lean();

  res.status(200).json({
    success: true,
    message: isVerified
      ? "Doctor verified successfully."
      : "Doctor application rejected successfully.",
    data: {
      ...updatedDoctor,
      verificationStatus: isVerified ? "Approved" : "Rejected",
    },
  });
});

// ============================================
// SUSPEND OR RESTORE DOCTOR PROFILE
// PATCH /api/v1/admin/doctors/:id/status
// Suspend: { "isActive": false, "reason": "..." }
// Restore: { "isActive": true }
// ============================================
const updateDoctorStatus = asyncHandler(async (req, res) => {
  const { isActive, reason } = req.body;

  if (typeof isActive !== "boolean") {
    return res.status(400).json({
      success: false,
      message: "isActive must be true or false.",
    });
  }

  if (!isValidId(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid doctor ID.",
    });
  }

  const normalizedReason = String(reason || "").trim();

  if (isActive === false && !normalizedReason) {
    return res.status(400).json({
      success: false,
      message: "A reason is required to suspend a doctor.",
    });
  }

  const doctor = await Doctor.findById(req.params.id).populate(
    "user",
    "name email",
  );

  if (!doctor) {
    return res.status(404).json({
      success: false,
      message: "Doctor not found.",
    });
  }

  if (isActive === false && !doctor.isVerified) {
    return res.status(400).json({
      success: false,
      message: "Only approved doctors can be suspended.",
    });
  }

  const previousIsActive = doctor.isActive !== false;

  doctor.isActive = isActive;
  await doctor.save();

  if (doctor.user?._id && previousIsActive !== isActive) {
    await Notification.create({
      userId: doctor.user._id,
      title: isActive ? "Doctor Account Restored" : "Doctor Account Suspended",
      message: isActive
        ? "Your doctor profile has been restored. Booking eligibility depends on your verification status."
        : `Your doctor profile has been suspended. Reason: ${normalizedReason}`,
      type: "system",
    });
  }

  if (previousIsActive !== isActive) {
    await logAdminAudit({
      req,
      action: isActive ? "DOCTOR_REACTIVATED" : "DOCTOR_SUSPENDED",
      targetType: "doctor",
      targetId: doctor._id,
      reason:
        normalizedReason ||
        (isActive
          ? "Doctor profile restored by administrator."
          : "Doctor profile suspended by administrator."),
      metadata: {
        previousIsActive,
        newIsActive: isActive,
        notificationQueued: Boolean(doctor.user?._id),
      },
    });
  }

  const updatedDoctor = await Doctor.findById(doctor._id)
    .populate("user", "name email phone role isActive createdAt")
    .lean();

  res.status(200).json({
    success: true,
    message: `Doctor ${isActive ? "restored" : "suspended"} successfully.`,
    data: {
      ...updatedDoctor,
      verificationStatus:
        updatedDoctor.isActive === false
          ? "Suspended"
          : updatedDoctor.rejectionReason
            ? "Rejected"
            : updatedDoctor.isVerified
              ? "Approved"
              : "Pending",
    },
  });
});

module.exports = {
  getDashboard,
  getAllUsers,
  updateUserStatus,
  updateUserRole,
  getPendingDoctors,
  verifyDoctor,
  updateDoctorStatus,
};

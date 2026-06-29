const asyncHandler = require("express-async-handler");
const Appointment = require("../models/Appointment.model");
const Notification = require("../models/Notification.model");
const User = require("../models/User.model");

// ─── @desc    Book a new appointment
// ─── @route   POST /api/v1/appointments
// ─── @access  Patient
const bookAppointment = asyncHandler(async (req, res) => {
  const { doctorId, date, timeSlot, reason, symptoms, type } = req.body;

  // Verify doctor exists
  const doctor = await User.findOne({ _id: doctorId, role: "doctor" });
  if (!doctor) {
    res.status(404);
    throw new Error("Doctor not found.");
  }

  // Check if slot is already taken
  const existingAppointment = await Appointment.findOne({
    doctorId,
    date,
    timeSlot,
    status: { $in: ["pending", "confirmed"] },
  });

  if (existingAppointment) {
    res.status(400);
    throw new Error("This time slot is already booked. Please choose another.");
  }

  // Create appointment
  const appointment = await Appointment.create({
    patientId: req.user._id,
    doctorId,
    date,
    timeSlot,
    reason,
    symptoms,
    type: type || "in-person",
  });

  // Notify doctor
  await Notification.create({
    userId: doctorId,
    title: "New Appointment Request",
    message: `You have a new appointment request from ${req.user.name} on ${new Date(date).toDateString()} at ${timeSlot}.`,
    type: "appointment",
  });

  // Notify patient
  await Notification.create({
    userId: req.user._id,
    title: "Appointment Booked",
    message: `Your appointment with Dr. ${doctor.name} on ${new Date(date).toDateString()} at ${timeSlot} is pending confirmation.`,
    type: "appointment",
  });

  res.status(201).json({
    success: true,
    message:
      "Appointment booked successfully! Waiting for doctor confirmation.",
    data: appointment,
  });
});

// ─── @desc    Get all appointments (filtered by role)
// ─── @route   GET /api/v1/appointments
// ─── @access  Private
const getAppointments = asyncHandler(async (req, res) => {
  let query = {};

  if (req.user.role === "patient") {
    query.patientId = req.user._id;
  } else if (req.user.role === "doctor") {
    query.doctorId = req.user._id;
  }
  // Admin sees all

  const appointments = await Appointment.find(query)
    .populate("patientId", "name email avatar")
    .populate("doctorId", "name email avatar")
    .sort({ date: -1 });

  res.status(200).json({
    success: true,
    count: appointments.length,
    data: appointments,
  });
});

// ─── @desc    Get single appointment
// ─── @route   GET /api/v1/appointments/:id
// ─── @access  Private
const getAppointmentById = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id)
    .populate("patientId", "name email phone avatar")
    .populate("doctorId", "name email avatar");

  if (!appointment) {
    res.status(404);
    throw new Error("Appointment not found.");
  }

  res.status(200).json({ success: true, data: appointment });
});

// ─── @desc    Update appointment status (doctor confirms/rejects)
// ─── @route   PUT /api/v1/appointments/:id
// ─── @access  Doctor / Patient / Admin
const updateAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);

  if (!appointment) {
    res.status(404);
    throw new Error("Appointment not found.");
  }

  const { status, notes, diagnosis, cancelReason } = req.body;

  // Update allowed fields
  if (status) appointment.status = status;
  if (notes) appointment.notes = notes;
  if (diagnosis) appointment.diagnosis = diagnosis;
  if (cancelReason) {
    appointment.cancelReason = cancelReason;
    appointment.cancelledBy = req.user.role;
  }

  await appointment.save();

  // Notify the other party
  const notifyUserId =
    req.user.role === "doctor" ? appointment.patientId : appointment.doctorId;

  const statusMessages = {
    confirmed: "Your appointment has been confirmed!",
    rejected: "Your appointment request was rejected.",
    completed: "Your appointment has been marked as completed.",
    cancelled: "An appointment has been cancelled.",
  };

  if (statusMessages[status]) {
    await Notification.create({
      userId: notifyUserId,
      title: "Appointment Update",
      message: statusMessages[status],
      type: "appointment",
    });
  }

  res.status(200).json({
    success: true,
    message: "Appointment updated successfully.",
    data: appointment,
  });
});

// ─── @desc    Cancel appointment
// ─── @route   DELETE /api/v1/appointments/:id
// ─── @access  Patient / Admin
const cancelAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);

  if (!appointment) {
    res.status(404);
    throw new Error("Appointment not found.");
  }

  appointment.status = "cancelled";
  appointment.cancelledBy = req.user.role;
  appointment.cancelReason = req.body.reason || "Cancelled by user";
  await appointment.save();

  res.status(200).json({
    success: true,
    message: "Appointment cancelled successfully.",
  });
});

module.exports = {
  bookAppointment,
  getAppointments,
  getAppointmentById,
  updateAppointment,
  cancelAppointment,
};

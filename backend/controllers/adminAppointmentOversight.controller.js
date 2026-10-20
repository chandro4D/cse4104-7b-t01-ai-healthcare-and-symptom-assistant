const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const Appointment = require("../models/Appointment.model");
const Notification = require("../models/Notification.model");
const { writeAuditLog } = require("../utils/auditLogger");

const VALID_STATUSES = ["pending", "confirmed", "completed", "cancelled"];

const appointmentPopulate = [
  { path: "patient", select: "name email phone" },
  { path: "doctor", select: "name email phone specialty user" },
];

const getAllAdminAppointments = asyncHandler(async (req, res) => {
  const {
    status,
    doctor,
    patient,
    from,
    to,
    page = "1",
    limit = "20",
  } = req.query;

  const currentPage = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const filter = {};

  if (status) {
    const normalized = String(status).toLowerCase();
    if (!VALID_STATUSES.includes(normalized)) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment status filter.",
      });
    }
    filter.status = normalized;
  }

  if (doctor) {
    if (!mongoose.isValidObjectId(doctor)) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor ID.",
      });
    }
    filter.doctor = doctor;
  }

  if (patient) {
    if (!mongoose.isValidObjectId(patient)) {
      return res.status(400).json({
        success: false,
        message: "Invalid patient ID.",
      });
    }
    filter.patient = patient;
  }

  if (from || to) {
    filter.date = {};

    if (from) {
      const start = new Date(`${from}T00:00:00.000Z`);
      if (Number.isNaN(start.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid from date.",
        });
      }
      filter.date.$gte = start;
    }

    if (to) {
      const end = new Date(`${to}T23:59:59.999Z`);
      if (Number.isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid to date.",
        });
      }
      filter.date.$lte = end;
    }
  }

  const [appointments, total] = await Promise.all([
    Appointment.find(filter)
      .populate(appointmentPopulate)
      .sort({ date: -1, createdAt: -1 })
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    Appointment.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: appointments,
    pagination: {
      page: currentPage,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
});

const getAdminAppointmentById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid appointment ID.",
    });
  }

  const appointment = await Appointment.findById(id)
    .populate(appointmentPopulate)
    .lean();

  if (!appointment) {
    return res.status(404).json({
      success: false,
      message: "Appointment not found.",
    });
  }

  res.status(200).json({
    success: true,
    data: appointment,
  });
});

const performAppointmentOversight = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action, reason, newDate, newTime } = req.body;

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid appointment ID.",
    });
  }

  if (!["cancel", "resolve_conflict"].includes(action)) {
    return res.status(400).json({
      success: false,
      message: "Unsupported administrative action.",
    });
  }

  const cleanReason = String(reason || "").trim();

  if (cleanReason.length < 10 || cleanReason.length > 500) {
    return res.status(400).json({
      success: false,
      message: "Reason must be between 10 and 500 characters.",
    });
  }

  const appointment = await Appointment.findById(id);

  if (!appointment) {
    return res.status(404).json({
      success: false,
      message: "Appointment not found.",
    });
  }

  const previousStatus = String(appointment.status || "pending").toLowerCase();

  if (!VALID_STATUSES.includes(previousStatus)) {
    return res.status(409).json({
      success: false,
      message: "Appointment has an unsupported status.",
    });
  }

  if (["cancelled", "completed"].includes(previousStatus)) {
    return res.status(409).json({
      success: false,
      message: `Cannot perform this action on a ${previousStatus} appointment.`,
    });
  }

  const oldDate = appointment.date
    ? new Date(appointment.date).toISOString()
    : "";
  const oldTime = String(appointment.time || "");

  let newDateValue = oldDate;
  let newTimeValue = oldTime;

  if (action === "cancel") {
    appointment.status = "cancelled";
  } else {
    if (!newDate || !newTime) {
      return res.status(400).json({
        success: false,
        message: "A new date and time are required to resolve a conflict.",
      });
    }

    const parsedDate = new Date(`${newDate}T00:00:00.000Z`);

    if (Number.isNaN(parsedDate.getTime()) || !/^\d{2}:\d{2}$/.test(newTime)) {
      return res.status(400).json({
        success: false,
        message: "Invalid new date or time.",
      });
    }

    if (parsedDate < new Date(new Date().toISOString().slice(0, 10))) {
      return res.status(400).json({
        success: false,
        message: "The new appointment date cannot be in the past.",
      });
    }

    // IMPORTANT:
    // Implement a doctor schedule/availability conflict check here before
    // saving. The exact logic depends on your schedule model and time zone.
    // Do not deploy rescheduling until this check is implemented.
    appointment.date = parsedDate;
    appointment.time = newTime;
    newDateValue = parsedDate.toISOString();
    newTimeValue = newTime;
  }

  if (!Array.isArray(appointment.statusHistory)) {
    appointment.statusHistory = [];
  }

  const historyEntry = {
    action:
      action === "cancel"
        ? "ADMIN_CANCELLED_APPOINTMENT"
        : "ADMIN_RESOLVED_SCHEDULING_CONFLICT",
    fromStatus: previousStatus,
    toStatus: String(appointment.status).toLowerCase(),
    reason: cleanReason,
    performedBy: req.user._id,
    performedByRole: "admin",
    createdAt: new Date(),
    previousDate: oldDate,
    newDate: newDateValue,
    previousTime: oldTime,
    newTime: newTimeValue,
  };

  appointment.statusHistory.push(historyEntry);

  await appointment.save();

  // The notification schema may differ in your project. These writes should
  // match your existing Notification model before production deployment.
  const recipientIds = [appointment.patient, appointment.doctor].filter(
    Boolean,
  );

  let notificationQueued = false;

  try {
    for (const userId of recipientIds) {
      await Notification.create({
        userId,
        type: "system",
        title:
          action === "cancel"
            ? "Appointment cancelled by administrator"
            : "Appointment scheduling updated",
        message:
          action === "cancel"
            ? "An administrator cancelled your appointment. Please contact support if you need help."
            : "An administrator updated your appointment schedule. Please check the appointment details.",
        isRead: false,
      });
    }
    notificationQueued = recipientIds.length > 0;
  } catch (error) {
    console.error("Appointment notification creation failed:", error.message);
  }

  // Persist the audit entry separately from the appointment.
  await writeAuditLog({
    req,
    action:
      action === "cancel"
        ? "APPOINTMENT_CANCELLED_BY_ADMIN"
        : "APPOINTMENT_CONFLICT_RESOLVED",
    targetType: "appointment",
    targetId: appointment._id.toString(),
    reason: cleanReason,
    metadata: {
      previousStatus,
      newStatus: String(appointment.status).toLowerCase(),
      previousDate: oldDate,
      newDate: newDateValue,
      previousTime: oldTime,
      newTime: newTimeValue,
      notificationQueued,
    },
  });

  const updated = await Appointment.findById(appointment._id)
    .populate(appointmentPopulate)
    .lean();

  res.status(200).json({
    success: true,
    message:
      action === "cancel"
        ? "Appointment cancelled."
        : "Scheduling conflict resolution saved.",
    data: updated,
  });
});

module.exports = {
  getAllAdminAppointments,
  getAdminAppointmentById,
  performAppointmentOversight,
};

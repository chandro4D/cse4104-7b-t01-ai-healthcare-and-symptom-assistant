const mongoose = require("mongoose");
const Appointment = require("../models/Appointment.model");
const Doctor = require("../models/Doctor.model");

// ============================================
// BOOKING RULES (keep in sync with frontend)
// ============================================
const MAX_DAYS_AHEAD = 90;
const MIN_BOOKING_NOTICE_MINUTES = 30;
const MIN_CANCEL_HOURS = 2;
const OPEN_TIME = "09:00";
const CLOSE_TIME = "21:00";

// "YYYY-MM-DD" + "HH:mm" -> Date
const toDateTime = (date, time) => new Date(`${date}T${time}`);

// ============================================
// CREATE APPOINTMENT
// ============================================
const createAppointment = async (req, res) => {
  try {
    const { doctorId, date, time, reason, patientName } = req.body;

    if (!doctorId || !date || !time || !reason || !patientName) {
      return res.status(400).json({
        success: false,
        message: "All appointment fields are required.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor.",
      });
    }

    const cleanName = String(patientName).trim();
    const cleanReason = String(reason).trim();

    if (cleanName.length < 3 || cleanName.length > 60) {
      return res.status(400).json({
        success: false,
        message: "Patient name must be between 3 and 60 characters.",
      });
    }

    if (cleanReason.length < 10 || cleanReason.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Reason must be between 10 and 500 characters.",
      });
    }

    // Format check
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
      return res.status(400).json({
        success: false,
        message: "Invalid date or time format.",
      });
    }

    const appointmentTime = toDateTime(date, time);

    if (isNaN(appointmentTime.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date or time.",
      });
    }

    const now = new Date();

    // Do not allow past dates / times
    if (
      appointmentTime.getTime() <
      now.getTime() + MIN_BOOKING_NOTICE_MINUTES * 60 * 1000
    ) {
      return res.status(400).json({
        success: false,
        message: `Past dates are not allowed. Appointments must be booked at least ${MIN_BOOKING_NOTICE_MINUTES} minutes in advance.`,
      });
    }

    if (
      appointmentTime.getTime() >
      now.getTime() + MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000
    ) {
      return res.status(400).json({
        success: false,
        message: `You can only book up to ${MAX_DAYS_AHEAD} days in advance.`,
      });
    }

    // Clinic hours
    if (time < OPEN_TIME || time > CLOSE_TIME) {
      return res.status(400).json({
        success: false,
        message: `Appointments are available between ${OPEN_TIME} and ${CLOSE_TIME}.`,
      });
    }

    // Find doctor
    const doctor = await Doctor.findById(doctorId);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found.",
      });
    }

    // Do not allow booking busy doctor
    if (doctor.availability === "Busy") {
      return res.status(400).json({
        success: false,
        message: "This doctor is currently unavailable.",
      });
    }

    // Prevent duplicate booking at same time
    const existingAppointment = await Appointment.findOne({
      doctor: doctorId,
      date,
      time,
      status: { $in: ["Pending", "Confirmed"] },
    });

    if (existingAppointment) {
      return res.status(409).json({
        success: false,
        message: "This time slot is already booked.",
      });
    }

    // Create appointment
    const appointment = await Appointment.create({
      patient: req.user._id,

      doctor: doctor._id,

      patientName: cleanName,

      doctorName: doctor.name,

      specialty: doctor.specialty,

      date,

      time,

      reason: cleanReason,

      status: "Pending",
    });

    return res.status(201).json({
      success: true,
      message: "Appointment booked successfully.",
      data: appointment,
    });
  } catch (error) {
    // Unique index hit (two people booked the same slot at the same moment)
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This time slot is already booked.",
      });
    }

    console.error("Create appointment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to book appointment.",
    });
  }
};

// ============================================
// GET LOGGED-IN USER APPOINTMENTS
// ============================================
const getMyAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({
      patient: req.user._id,
    })
      .populate("doctor", "name specialty image hospital")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: appointments,
    });
  } catch (error) {
    console.error("Get my appointments error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load appointments.",
    });
  }
};

// ============================================
// CANCEL APPOINTMENT - PATIENT (owner) / ADMIN
// ============================================
const cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment ID.",
      });
    }

    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found.",
      });
    }

    // Only the patient who booked it (or an admin) can cancel
    const isOwner = String(appointment.patient) === String(req.user._id);
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to cancel this appointment.",
      });
    }

    if (appointment.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "This appointment is already cancelled.",
      });
    }

    if (appointment.status === "Completed") {
      return res.status(400).json({
        success: false,
        message: "A completed appointment cannot be cancelled.",
      });
    }

    const appointmentTime = toDateTime(appointment.date, appointment.time);
    const now = new Date();

    if (appointmentTime <= now) {
      return res.status(400).json({
        success: false,
        message: "This appointment time has already passed.",
      });
    }

    // Patients must cancel in advance (admins can override)
    const hoursLeft = (appointmentTime - now) / (1000 * 60 * 60);

    if (!isAdmin && hoursLeft < MIN_CANCEL_HOURS) {
      return res.status(400).json({
        success: false,
        message: `Appointments cannot be cancelled within ${MIN_CANCEL_HOURS} hours of the start time.`,
      });
    }

    const cancelReason = String(req.body?.reason || "")
      .trim()
      .slice(0, 200);

    appointment.status = "Cancelled";
    appointment.cancelledAt = now;
    appointment.cancelledBy = req.user._id;

    if (cancelReason) {
      appointment.cancelReason = cancelReason;
    }

    await appointment.save();

    return res.status(200).json({
      success: true,
      message: "Appointment cancelled successfully.",
      data: appointment,
    });
  } catch (error) {
    console.error("Cancel appointment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to cancel appointment.",
    });
  }
};

// ============================================
// GET DOCTOR APPOINTMENTS
// ============================================
const getDoctorAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({
      doctor: req.user.doctorId,
    })
      .populate("patient", "name email")
      .sort({ date: 1, time: 1 });

    return res.status(200).json({
      success: true,
      data: appointments,
    });
  } catch (error) {
    console.error("Get doctor appointments error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load doctor appointments.",
    });
  }
};

// ============================================
// GET ALL APPOINTMENTS - ADMIN
// ============================================
const getAllAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .populate("patient", "name email")
      .populate("doctor", "name specialty hospital")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: appointments,
    });
  } catch (error) {
    console.error("Get all appointments error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load appointments.",
    });
  }
};

// ============================================
// UPDATE APPOINTMENT STATUS - ADMIN / DOCTOR
// ============================================
const updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ["Pending", "Confirmed", "Cancelled", "Completed"];

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment ID.",
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment status.",
      });
    }

    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found.",
      });
    }

    // A doctor can only update their own appointments
    if (
      req.user.role === "doctor" &&
      String(appointment.doctor) !== String(req.user.doctorId)
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own appointments.",
      });
    }

    // Final states cannot be changed
    if (["Cancelled", "Completed"].includes(appointment.status)) {
      return res.status(400).json({
        success: false,
        message: `A ${appointment.status.toLowerCase()} appointment cannot be changed.`,
      });
    }

    // Cannot complete an appointment that has not started yet
    if (status === "Completed") {
      const appointmentTime = toDateTime(appointment.date, appointment.time);

      if (appointmentTime > new Date()) {
        return res.status(400).json({
          success: false,
          message: "An upcoming appointment cannot be marked as completed.",
        });
      }

      appointment.completedAt = new Date();
    }

    if (status === "Cancelled") {
      appointment.cancelledAt = new Date();
      appointment.cancelledBy = req.user._id;

      const cancelReason = String(req.body?.reason || "")
        .trim()
        .slice(0, 200);

      if (cancelReason) {
        appointment.cancelReason = cancelReason;
      }
    }

    appointment.status = status;

    await appointment.save();

    return res.status(200).json({
      success: true,
      message: "Appointment status updated successfully.",
      data: appointment,
    });
  } catch (error) {
    console.error("Update appointment status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update appointment status.",
    });
  }
};

module.exports = {
  createAppointment,
  getMyAppointments,
  cancelAppointment,
  getDoctorAppointments,
  getAllAppointments,
  updateAppointmentStatus,
};

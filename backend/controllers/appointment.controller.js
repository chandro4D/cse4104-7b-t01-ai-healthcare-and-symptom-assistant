const mongoose = require("mongoose");
const Appointment = require("../models/Appointment.model");
const Doctor = require("../models/Doctor.model");
const { notify, notifyDoctor } = require("../utils/notify");

// ============================================
// BOOKING RULES (keep in sync with frontend)
// ============================================
const MAX_DAYS_AHEAD = 90;
const MIN_BOOKING_NOTICE_MINUTES = 30;
const MIN_CANCEL_HOURS = 2;
const OPEN_TIME = "09:00";
const CLOSE_TIME = "21:00";

const ACTIVE = ["Pending", "Confirmed"];

// "YYYY-MM-DD" + "HH:mm" -> Date
const toDateTime = (date, time) => new Date(`${date}T${time}`);

const fmt = (date, time) => `${date} at ${time}`;

// Shared date/time validation. Returns an error message or "" when valid.
const checkSlot = (date, time) => {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date || "") ||
    !/^\d{2}:\d{2}$/.test(time || "")
  ) {
    return "Invalid date or time format.";
  }

  const when = toDateTime(date, time);
  if (isNaN(when.getTime())) return "Invalid date or time.";

  const now = Date.now();
  if (when.getTime() < now + MIN_BOOKING_NOTICE_MINUTES * 60 * 1000) {
    return `The time must be at least ${MIN_BOOKING_NOTICE_MINUTES} minutes from now.`;
  }
  if (when.getTime() > now + MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000) {
    return `You can only schedule up to ${MAX_DAYS_AHEAD} days ahead.`;
  }
  if (time < OPEN_TIME || time > CLOSE_TIME) {
    return `Appointments are available between ${OPEN_TIME} and ${CLOSE_TIME}.`;
  }
  return "";
};

// ============================================
// CREATE APPOINTMENT
// ✅ UPDATED: notifies the doctor about the new request
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
      return res
        .status(400)
        .json({ success: false, message: "Invalid doctor." });
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

    const slotError = checkSlot(date, time);
    if (slotError) {
      return res.status(400).json({ success: false, message: slotError });
    }

    const doctor = await Doctor.findById(doctorId);

    if (!doctor) {
      return res
        .status(404)
        .json({ success: false, message: "Doctor not found." });
    }

    // ✅ UPDATED: suspended / deactivated doctors cannot be booked
    if (doctor.isActive === false || doctor.availability === "Busy") {
      return res.status(400).json({
        success: false,
        message: "This doctor is currently unavailable.",
      });
    }

    const existingAppointment = await Appointment.findOne({
      doctor: doctorId,
      date,
      time,
      status: { $in: ACTIVE },
    });

    if (existingAppointment) {
      return res.status(409).json({
        success: false,
        message: "This time slot is already booked.",
      });
    }

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

    // ✅ NEW
    await notifyDoctor(doctor._id, {
      title: "New appointment request",
      message: `${cleanName} requested ${fmt(date, time)}.`,
      link: "/dashboard/appointmentManagement?status=pending",
    });

    return res.status(201).json({
      success: true,
      message: "Appointment booked successfully.",
      data: appointment,
    });
  } catch (error) {
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
// GET LOGGED-IN USER APPOINTMENTS   (unchanged)
// ============================================
const getMyAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({ patient: req.user._id })
      .populate("doctor", "name specialty image hospital")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: appointments });
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
// ✅ UPDATED: clears any reschedule proposal and notifies the other side
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
    if (cancelReason) appointment.cancelReason = cancelReason;

    // ✅ NEW: an open proposal is no longer relevant
    appointment.proposedDate = undefined;
    appointment.proposedTime = undefined;
    appointment.rescheduleNote = undefined;
    appointment.rescheduleProposedAt = undefined;

    await appointment.save();

    // ✅ NEW
    if (isOwner) {
      await notifyDoctor(appointment.doctor, {
        title: "Appointment cancelled by patient",
        message: `${appointment.patientName} cancelled ${fmt(appointment.date, appointment.time)}.`,
        link: "/dashboard/appointmentManagement?status=cancelled",
      });
    } else {
      await notify(appointment.patient, {
        title: "Appointment cancelled",
        message: `Your appointment on ${fmt(appointment.date, appointment.time)} was cancelled by an administrator.`,
        link: "/dashboard/patientAppointments",
      });
    }

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
// ✅ UPDATED: uses req.doctorId (set by attachDoctor middleware)
// ============================================
const getDoctorAppointments = async (req, res) => {
  try {
    if (!req.doctorId) {
      return res.status(403).json({
        success: false,
        message: "Your account is not linked to a doctor profile.",
      });
    }

    const appointments = await Appointment.find({ doctor: req.doctorId })
      .populate("patient", "name email")
      .sort({ date: 1, time: 1 });

    return res.status(200).json({ success: true, data: appointments });
  } catch (error) {
    console.error("Get doctor appointments error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load doctor appointments.",
    });
  }
};

// ============================================
// GET ALL APPOINTMENTS - ADMIN   (unchanged)
// ============================================
const getAllAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .populate("patient", "name email")
      .populate("doctor", "name specialty hospital")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: appointments });
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
// ✅ UPDATED: req.doctorId, blocks confirming while a reschedule is
//    waiting for the patient, clears proposals, notifies the patient
// ============================================
const ALLOWED_NEXT = {
  Pending: ["Confirmed", "Cancelled"],
  Confirmed: ["Completed", "Cancelled"],
};

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
      String(appointment.doctor) !== String(req.doctorId)
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own appointments.",
      });
    }

    if (["Cancelled", "Completed"].includes(appointment.status)) {
      return res.status(400).json({
        success: false,
        message: `A ${appointment.status.toLowerCase()} appointment cannot be changed.`,
      });
    }

    if (!(ALLOWED_NEXT[appointment.status] || []).includes(status)) {
      return res.status(400).json({
        success: false,
        message: `A ${appointment.status.toLowerCase()} appointment cannot be changed to ${status.toLowerCase()}.`,
      });
    }

    // ✅ NEW: the patient has not answered the new time yet
    if (status === "Confirmed" && appointment.proposedDate) {
      return res.status(400).json({
        success: false,
        message: "A new time was proposed. Wait for the patient to respond.",
      });
    }

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

    let cancelReason = "";
    if (status === "Cancelled") {
      appointment.cancelledAt = new Date();
      appointment.cancelledBy = req.user._id;

      cancelReason = String(req.body?.reason || "")
        .trim()
        .slice(0, 200);

      if (cancelReason) appointment.cancelReason = cancelReason;
    }

    // ✅ NEW: any open proposal ends with a final status
    if (["Cancelled", "Completed"].includes(status)) {
      appointment.proposedDate = undefined;
      appointment.proposedTime = undefined;
      appointment.rescheduleNote = undefined;
      appointment.rescheduleProposedAt = undefined;
    }

    appointment.status = status;
    await appointment.save();

    // ✅ NEW: tell the patient
    const when = fmt(appointment.date, appointment.time);
    const messages = {
      Confirmed: {
        title: "Appointment confirmed",
        message: `Dr. ${appointment.doctorName} confirmed your appointment on ${when}.`,
      },
      Cancelled: {
        title: "Appointment cancelled",
        message: `Your appointment on ${when} was cancelled.${
          cancelReason ? ` Reason: ${cancelReason}` : ""
        }`,
      },
      Completed: {
        title: "Visit completed",
        message: `Your visit with Dr. ${appointment.doctorName} on ${when} is marked as completed.`,
      },
    };
    if (messages[status]) {
      await notify(appointment.patient, {
        ...messages[status],
        link: "/dashboard/patientAppointments",
      });
    }

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

// ============================================
// ✅ NEW: DOCTOR PROPOSES A NEW TIME
// PATCH /appointments/:id/reschedule   body: { date, time, note? }
// ============================================
const proposeReschedule = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, time } = req.body;
    const note = String(req.body?.note || "")
      .trim()
      .slice(0, 200);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment ID.",
      });
    }

    const slotError = checkSlot(date, time);
    if (slotError) {
      return res.status(400).json({ success: false, message: slotError });
    }

    const appointment = await Appointment.findOne({
      _id: id,
      doctor: req.doctorId,
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found.",
      });
    }

    if (!ACTIVE.includes(appointment.status)) {
      return res.status(400).json({
        success: false,
        message: `A ${appointment.status.toLowerCase()} appointment cannot be rescheduled.`,
      });
    }

    if (appointment.date === date && appointment.time === time) {
      return res.status(400).json({
        success: false,
        message: "Choose a different date or time.",
      });
    }

    const conflict = await Appointment.findOne({
      doctor: req.doctorId,
      date,
      time,
      status: { $in: ACTIVE },
      _id: { $ne: appointment._id },
    });

    if (conflict) {
      return res.status(409).json({
        success: false,
        message: "You already have an appointment at that time.",
      });
    }

    appointment.proposedDate = date;
    appointment.proposedTime = time;
    appointment.rescheduleNote = note || undefined;
    appointment.rescheduleProposedAt = new Date();
    await appointment.save();

    await notify(appointment.patient, {
      title: "New appointment time proposed",
      message: `Dr. ${appointment.doctorName} proposed ${fmt(date, time)} instead of ${fmt(
        appointment.date,
        appointment.time,
      )}.${note ? ` Note: ${note}` : ""}`,
      link: "/dashboard/patientAppointments",
    });

    return res.status(200).json({
      success: true,
      message: "New time proposed. Waiting for the patient.",
      data: appointment,
    });
  } catch (error) {
    console.error("Propose reschedule error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to propose a new time.",
    });
  }
};

// ============================================
// ✅ NEW: PATIENT ANSWERS A PROPOSED TIME
// PATCH /appointments/:id/reschedule/respond   body: { accept: true|false }
// accept  -> appointment moves to the new time and becomes Confirmed
// decline -> appointment is cancelled
// ============================================
const respondReschedule = async (req, res) => {
  try {
    const { id } = req.params;
    const accept = req.body?.accept === true;

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

    if (String(appointment.patient) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "This is not your appointment.",
      });
    }

    if (!appointment.proposedDate || !ACTIVE.includes(appointment.status)) {
      return res.status(400).json({
        success: false,
        message: "There is no new time waiting for your answer.",
      });
    }

    const oldWhen = fmt(appointment.date, appointment.time);
    const newDate = appointment.proposedDate;
    const newTime = appointment.proposedTime;

    const clearProposal = () => {
      appointment.proposedDate = undefined;
      appointment.proposedTime = undefined;
      appointment.rescheduleNote = undefined;
      appointment.rescheduleProposedAt = undefined;
    };

    if (accept) {
      if (toDateTime(newDate, newTime) <= new Date()) {
        return res.status(400).json({
          success: false,
          message:
            "The proposed time has already passed. Ask the doctor for a new time.",
        });
      }

      const conflict = await Appointment.findOne({
        doctor: appointment.doctor,
        date: newDate,
        time: newTime,
        status: { $in: ACTIVE },
        _id: { $ne: appointment._id },
      });

      if (conflict) {
        return res.status(409).json({
          success: false,
          message:
            "That time is no longer available. Ask the doctor for a new time.",
        });
      }

      appointment.date = newDate;
      appointment.time = newTime;
      appointment.status = "Confirmed";
      clearProposal();
    } else {
      appointment.status = "Cancelled";
      appointment.cancelledAt = new Date();
      appointment.cancelledBy = req.user._id;
      appointment.cancelReason = "New time declined by patient";
      clearProposal();
    }

    try {
      await appointment.save();
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({
          success: false,
          message:
            "That time is no longer available. Ask the doctor for a new time.",
        });
      }
      throw err;
    }

    await notifyDoctor(appointment.doctor, {
      title: accept ? "New time accepted" : "New time declined",
      message: accept
        ? `${appointment.patientName} accepted ${fmt(newDate, newTime)}. The appointment is confirmed.`
        : `${appointment.patientName} declined the new time. The appointment on ${oldWhen} was cancelled.`,
      link: `/dashboard/appointmentManagement?status=${accept ? "confirmed" : "cancelled"}`,
    });

    return res.status(200).json({
      success: true,
      message: accept
        ? "Appointment moved to the new time."
        : "Appointment cancelled.",
      data: appointment,
    });
  } catch (error) {
    console.error("Respond reschedule error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save your answer.",
    });
  }
};

// ============================================
// SAVE DOCTOR NOTES - DOCTOR (own appointments only)
// ✅ UPDATED: uses req.doctorId
// ============================================
const updateDoctorNotes = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment ID.",
      });
    }

    const appointment = await Appointment.findOneAndUpdate(
      { _id: id, doctor: req.doctorId },
      {
        doctorNotes: String(req.body?.doctorNotes || "")
          .trim()
          .slice(0, 2000),
      },
      { new: true },
    );

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notes saved.",
      data: appointment,
    });
  } catch (error) {
    console.error("Update doctor notes error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save notes.",
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
  proposeReschedule, // ✅ NEW
  respondReschedule, // ✅ NEW
  updateDoctorNotes,
};

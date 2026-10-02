const Appointment = require("../models/Appointment.model");
const Doctor = require("../models/Doctor.model");

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

    // Optional: prevent duplicate booking at same time
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

      patientName,

      doctorName: doctor.name,

      specialty: doctor.specialty,

      date,

      time,

      reason,

      status: "Pending",
    });

    return res.status(201).json({
      success: true,
      message: "Appointment booked successfully.",
      data: appointment,
    });
  } catch (error) {
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
// UPDATE APPOINTMENT STATUS
// ============================================
const updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ["Pending", "Confirmed", "Cancelled", "Completed"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment status.",
      });
    }

    const appointment = await Appointment.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true },
    );

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found.",
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

module.exports = {
  createAppointment,
  getMyAppointments,
  getDoctorAppointments,
  getAllAppointments,
  updateAppointmentStatus,
};

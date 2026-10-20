const express = require("express");

const {
  createAppointment,
  getMyAppointments,
  cancelAppointment,
  getDoctorAppointments,
  getAllAppointments,
  updateAppointmentStatus,
  proposeReschedule, // ✅ NEW
  respondReschedule, // ✅ NEW
  updateDoctorNotes,
} = require("../controllers/appointment.controller");

const { protect, authorize } = require("../middleware/auth.middleware");
const { attachDoctor } = require("../middleware/doctor.middleware"); // ✅ NEW

const router = express.Router();

// ============================================
// PATIENT
// ============================================

router.post("/", protect, createAppointment);

router.get("/my", protect, getMyAppointments);

// Cancel own appointment (admin can cancel any)
router.patch("/:id/cancel", protect, cancelAppointment);

// ✅ NEW: patient accepts / declines the doctor's proposed time
router.patch("/:id/reschedule/respond", protect, respondReschedule);

// ============================================
// DOCTOR
// attachDoctor guarantees a linked Doctor profile -> req.doctorId
// ============================================

router.get(
  "/doctor",
  protect,
  authorize("doctor"),
  attachDoctor,
  getDoctorAppointments,
);

// ✅ NEW: doctor proposes a new time
router.patch(
  "/:id/reschedule",
  protect,
  authorize("doctor"),
  attachDoctor,
  proposeReschedule,
);

router.patch(
  "/:id/notes",
  protect,
  authorize("doctor"),
  attachDoctor,
  updateDoctorNotes,
);

// ============================================
// ADMIN
// ============================================

router.get("/", protect, authorize("admin"), getAllAppointments);

// ============================================
// UPDATE STATUS (admin or doctor)
// attachDoctor only does work for doctors; admins pass straight through
// ============================================

router.patch(
  "/:id/status",
  protect,
  authorize("admin", "doctor"),
  attachDoctor,
  updateAppointmentStatus,
);

module.exports = router;

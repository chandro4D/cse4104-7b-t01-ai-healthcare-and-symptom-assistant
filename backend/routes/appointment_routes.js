const express = require("express");

const {
  createAppointment,
  getMyAppointments,
  getDoctorAppointments,
  getAllAppointments,
  updateAppointmentStatus,
} = require("../controllers/appointment.controller");

const { protect, authorize } = require("../middleware/auth.middleware");

const router = express.Router();

// ============================================
// PATIENT
// ============================================

router.post("/", protect, createAppointment);

router.get("/my", protect, getMyAppointments);

// ============================================
// DOCTOR
// ============================================

router.get("/doctor", protect, authorize("doctor"), getDoctorAppointments);

// ============================================
// ADMIN
// ============================================

router.get("/", protect, authorize("admin"), getAllAppointments);

// ============================================
// UPDATE STATUS
// ============================================

router.patch(
  "/:id/status",
  protect,
  authorize("admin", "doctor"),
  updateAppointmentStatus,
);

module.exports = router;

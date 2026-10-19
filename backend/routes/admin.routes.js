const express = require("express");
const router = express.Router();

const {
  getDashboard,
  getAllUsers,
  updateUserStatus,
  updateUserRole,
  getPendingDoctors,
  verifyDoctor,
  updateDoctorStatus,
} = require("../controllers/admin.controller");

const {
  getAllAdminAppointments,
  getAdminAppointmentById,
  performAppointmentOversight,
} = require("../controllers/adminAppointmentOversight.controller");

const { getAuditLogs } = require("../controllers/adminAudit.controller");

const { protect, authorize } = require("../middleware/auth.middleware");

// All routes require an authenticated admin.
router.use(protect, authorize("admin"));

// ============================================
// ADMIN DASHBOARD
// ============================================
router.get("/dashboard", getDashboard);

// ============================================
// USER MANAGEMENT
// ============================================
router.get("/users", getAllUsers);
router.patch("/users/:id/status", updateUserStatus);
router.patch("/users/:id/role", updateUserRole);

// ============================================
// DOCTOR VERIFICATION AND MANAGEMENT
// ============================================
router.get("/doctors", getPendingDoctors);
router.put("/doctors/:id/verify", verifyDoctor);
router.patch("/doctors/:id/status", updateDoctorStatus);

// ============================================
// APPOINTMENT OVERVIEW AND OVERSIGHT
// ============================================

// Get all appointments with filtering and pagination.
router.get("/appointments", getAllAdminAppointments);

// Get a single appointment with its details and history.
router.get("/appointments/:id", getAdminAppointmentById);

// Admin can cancel an appointment or resolve a scheduling conflict.
// Admin cannot confirm or complete an appointment.
router.patch(
  "/appointments/:id/oversight",
  performAppointmentOversight
);

// ============================================
// AUDIT LOGS AND SECURITY
// ============================================

// Get filterable, read-only audit logs.
router.get("/audit-logs", getAuditLogs);

module.exports = router;

const router = require("express").Router();
const { protect } = require("../middleware/auth.middleware"); // use YOUR middleware's real name
const { getPatientDashboard } = require("../controllers/Dashboard.controller");

// GET /api/v1/dashboard/patient
router.get("/patient", protect, getPatientDashboard);

module.exports = router;
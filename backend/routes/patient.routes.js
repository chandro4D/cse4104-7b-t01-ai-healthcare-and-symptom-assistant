const express = require("express");
const router = express.Router();
const {
  getPatientProfile,
  updatePatientProfile,
  getPatientDashboard,
  getPatientPrescriptions,
  getMedicalRecords,
  addMedicalRecord,
} = require("../controllers/patient.controller");
const { protect, authorize } = require("../middleware/auth.middleware");

router.use(protect, authorize("patient")); // All patient routes

router.get("/dashboard", getPatientDashboard);
router.get("/profile", getPatientProfile);
router.put("/profile", updatePatientProfile);
router.get("/prescriptions", getPatientPrescriptions);
router.get("/records", getMedicalRecords);
router.post("/records", addMedicalRecord);

module.exports = router;

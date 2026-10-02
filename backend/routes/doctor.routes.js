const express = require("express");

const {
  getDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor,
  getSpecialties,
} = require("../controllers/doctor.controller");

const router = express.Router();

// Public
router.get("/", getDoctors);
router.get("/specialties", getSpecialties);
router.get("/:id", getDoctorById);

// Admin
router.post("/", createDoctor);
router.patch("/:id", updateDoctor);
router.delete("/:id", deleteDoctor);

module.exports = router;

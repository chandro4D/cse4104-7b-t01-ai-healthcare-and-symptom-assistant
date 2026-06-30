const express = require('express');
const router = express.Router();
const {
  getAllDoctors, getDoctorById, updateDoctorProfile,
  createPrescription, getDoctorPrescriptions,
} = require('../controllers/doctor.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Public routes
router.get('/', getAllDoctors);
router.get('/:id', getDoctorById);

// Protected routes (doctor only)
router.put('/profile', protect, authorize('doctor'), updateDoctorProfile);
router.post('/prescriptions', protect, authorize('doctor'), createPrescription);
router.get('/prescriptions/all', protect, authorize('doctor'), getDoctorPrescriptions);

module.exports = router;
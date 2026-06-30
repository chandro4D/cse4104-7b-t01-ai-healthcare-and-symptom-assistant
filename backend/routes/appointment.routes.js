const express = require('express');
const router = express.Router();
const {
  bookAppointment, getAppointments, getAppointmentById,
  updateAppointment, cancelAppointment,
} = require('../controllers/appointment.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect); // All appointment routes require login

router.route('/')
  .get(getAppointments)
  .post(authorize('patient'), bookAppointment);

router.route('/:id')
  .get(getAppointmentById)
  .put(updateAppointment)
  .delete(authorize('patient', 'admin'), cancelAppointment);

module.exports = router;
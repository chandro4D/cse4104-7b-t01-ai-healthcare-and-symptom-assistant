const express = require("express");

const { protect, authorize } = require("../middleware/auth.middleware");
const { getDashboard } = require("../controllers/Admindashboard.controller");

const router = express.Router();

// Everything in this router is admin-only.
router.use(protect, authorize("admin"));

// Page 1: Admin Dashboard
router.get("/dashboard", getDashboard);

// Pages 2-5 add their routes below (users, doctors, appointments, audit).

module.exports = router;

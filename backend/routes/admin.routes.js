const express = require("express");
const router = express.Router();
const {
  getDashboard,
  getAllUsers,
  updateUserStatus,
  getPendingDoctors,
  verifyDoctor,
} = require("../controllers/admin.controller");
const { protect, authorize } = require("../middleware/auth.middleware");

router.use(protect, authorize("admin")); // Admin only

router.get("/dashboard", getDashboard);
router.get("/users", getAllUsers);
router.put("/users/:id", updateUserStatus);
router.get("/doctors", getPendingDoctors);
router.put("/doctors/:id/verify", verifyDoctor);

module.exports = router;

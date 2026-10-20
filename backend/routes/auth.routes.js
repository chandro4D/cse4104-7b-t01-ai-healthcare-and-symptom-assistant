const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
} = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");

// ─────────────────────────────────────────────
// Validation rules
// ─────────────────────────────────────────────

const passwordRule = (field = "password") =>
  body(field)
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/[A-Za-z]/)
    .withMessage("Password must contain at least one letter")
    .matches(/\d/)
    .withMessage("Password must contain at least one number");

const emailRule = body("email")
  .trim()
  .isEmail()
  .withMessage("Please enter a valid email")
  .normalizeEmail();

const registerValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2, max: 60 })
    .withMessage("Name must be between 2 and 60 characters"),
  emailRule,
  passwordRule(),
  body("role")
    .optional()
    .isIn(["patient", "doctor"])
    .withMessage("Role must be patient or doctor"),
];

const loginValidation = [
  emailRule, // normalizeEmail here too, so login matches the signup email
  body("password").notEmpty().withMessage("Password is required"),
  body("role")
    .optional()
    .isIn(["patient", "doctor", "admin"])
    .withMessage("Invalid role selected"),
];

const emailOnlyValidation = [emailRule];

const resetPasswordValidation = [passwordRule()];

const updateProfileValidation = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 60 })
    .withMessage("Name must be between 2 and 60 characters"),
  body("phone")
    .optional({ checkFalsy: true })
    .matches(/^[0-9+\-\s()]{7,20}$/)
    .withMessage("Please enter a valid phone number"),
];

// ─────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────

router.post("/signup", registerValidation, validate, register);
router.post("/login", loginValidation, validate, login);
router.post("/logout", logout); // public: always clears the cookie
router.get("/profile", protect, getProfile);
router.put(
  "/profile",
  protect,
  updateProfileValidation,
  validate,
  updateProfile,
);
router.get("/verify-email/:token", verifyEmail);
router.post(
  "/resend-verification",
  emailOnlyValidation,
  validate,
  resendVerification,
);
router.post("/forgot-password", emailOnlyValidation, validate, forgotPassword);
router.post(
  "/reset-password/:token",
  resetPasswordValidation,
  validate,
  resetPassword,
);

module.exports = router;

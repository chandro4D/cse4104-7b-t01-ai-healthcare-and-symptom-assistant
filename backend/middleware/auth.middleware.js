const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const User = require("../models/User.model");
const Doctor = require("../models/Doctor.model");

/**
 * Protect routes - must be logged in
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check Authorization header first
  if (req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }
  // Then check cookie
  else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    res.status(401);
    throw new Error("Not authorized. Please login.");
  }

  // Verify token (keep this separate so the real reason is reported)
  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    res.status(401);

    if (error.name === "TokenExpiredError") {
      throw new Error("Session expired. Please login again.");
    }

    throw new Error("Not authorized. Invalid token.");
  }

  // Get user from database (exclude password)
  const user = await User.findById(decoded.id).select("-password");

  if (!user) {
    res.status(401);
    throw new Error("User no longer exists.");
  }

  if (!user.isActive) {
    res.status(401);
    throw new Error("Your account has been suspended.");
  }

  // Doctors: attach their Doctor profile id.
  // (used by appointment routes as req.user.doctorId)
  if (user.role === "doctor") {
    // Change "userId" if your Doctor model links to the user with another field
    const doctorProfile = await Doctor.findOne({ userId: user._id }).select(
      "_id",
    );

    if (doctorProfile) {
      user.doctorId = doctorProfile._id;
    }
  }

  req.user = user;
  next();
});

/**
 * Restrict to specific roles
 * Usage: authorize('admin'), authorize('doctor', 'admin')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401);
      throw new Error("Not authorized. Please login.");
    }

    if (!roles.includes(req.user.role)) {
      res.status(403);
      throw new Error(
        `Role '${req.user.role}' is not allowed to access this route.`,
      );
    }

    next();
  };
};

module.exports = { protect, authorize };

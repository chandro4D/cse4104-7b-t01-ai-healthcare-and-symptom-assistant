const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User.model');

/**
 * Protect routes — must be logged in
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check Authorization header first
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  // Then check cookie
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized. No token provided.');
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database (exclude password)
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      res.status(401);
      throw new Error('User not found.');
    }

    if (!req.user.isActive) {
      res.status(401);
      throw new Error('Your account has been suspended.');
    }

    next();
  } catch (error) {
    res.status(401);
    throw new Error('Not authorized. Invalid token.');
  }
});

/**
 * Restrict to specific roles
 * Usage: authorize('admin'), authorize('doctor', 'admin')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      res.status(403);
      throw new Error(`Role '${req.user.role}' is not allowed to access this route.`);
    }
    next();
  };
};

module.exports = { protect, authorize };
const asyncHandler = require("express-async-handler");
const crypto = require("crypto");
const User = require("../models/User.model");
const Doctor = require("../models/Doctor.model");
const Patient = require("../models/Patient.model");
const { sendTokenResponse } = require("../utils/generateToken");
const sendEmail = require("../utils/sendEmail");

// ─── @desc    Register new user
// ─── @route   POST /api/v1/auth/register
// ─── @access  Public
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    res.status(400);
    throw new Error("Email already registered. Please login.");
  }

  // Only allow patient or doctor registration (not admin)
  const allowedRoles = ["patient", "doctor"];
  const userRole = allowedRoles.includes(role) ? role : "patient";

  // Create email verification token
  const verificationToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    role: userRole,
    emailVerificationToken: hashedToken,
    emailVerificationExpire: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  });

  // Create role-specific profile
  if (userRole === "patient") {
    await Patient.create({ userId: user._id });
  }
  // Doctor profile will be completed separately after basic registration

  // Send verification email
  const verifyUrl = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;
  try {
    await sendEmail({
      to: email,
      subject: "Verify Your Email — AI Healthcare",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Welcome to AI Healthcare! 🏥</h2>
          <p>Hi ${name},</p>
          <p>Thank you for registering. Please verify your email by clicking the button below:</p>
          <a href="${verifyUrl}" 
             style="display:inline-block; padding:12px 24px; background:#2563eb; color:white; 
                    text-decoration:none; border-radius:6px; margin:16px 0;">
            Verify Email
          </a>
          <p>This link expires in 24 hours.</p>
          <p>If you did not register, please ignore this email.</p>
        </div>
      `,
    });
  } catch (emailError) {
    console.log("Email sending failed:", emailError.message);
    // Don't fail registration if email fails
  }

  res.status(201).json({
    success: true,
    message:
      "Registration successful! Please check your email to verify your account.",
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

// ─── @desc    Login user
// ─── @route   POST /api/v1/auth/login
// ─── @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user (include password for comparison)
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    res.status(401);
    throw new Error("Invalid email or password.");
  }

  // Check password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    res.status(401);
    throw new Error("Invalid email or password.");
  }

  // Check if account is active
  if (!user.isActive) {
    res.status(401);
    throw new Error("Your account has been suspended. Contact support.");
  }

  sendTokenResponse(user, 200, res, "Login successful!");
});

// ─── @desc    Logout user
// ─── @route   POST /api/v1/auth/logout
// ─── @access  Private
const logout = asyncHandler(async (req, res) => {
  res.cookie("token", "", {
    expires: new Date(0),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: "Logged out successfully.",
  });
});

// ─── @desc    Get current user profile
// ─── @route   GET /api/v1/auth/profile
// ─── @access  Private
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  res.status(200).json({
    success: true,
    data: user,
  });
});

// ─── @desc    Update user profile
// ─── @route   PUT /api/v1/auth/profile
// ─── @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, avatar } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { name, phone, avatar },
    { new: true, runValidators: true },
  );

  res.status(200).json({
    success: true,
    message: "Profile updated successfully.",
    data: user,
  });
});

// ─── @desc    Verify email
// ─── @route   GET /api/v1/auth/verify-email/:token
// ─── @access  Public
const verifyEmail = asyncHandler(async (req, res) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpire: { $gt: Date.now() },
  });

  if (!user) {
    res.status(400);
    throw new Error("Invalid or expired verification token.");
  }

  user.isVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpire = undefined;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Email verified successfully! You can now login.",
  });
});

// ─── @desc    Forgot password — send reset email
// ─── @route   POST /api/v1/auth/forgot-password
// ─── @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    res.status(404);
    throw new Error("No account found with that email.");
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hour
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

  try {
    await sendEmail({
      to: user.email,
      subject: "Password Reset Request — AI Healthcare",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Password Reset</h2>
          <p>Hi ${user.name},</p>
          <p>You requested a password reset. Click the button below to set a new password:</p>
          <a href="${resetUrl}" 
             style="display:inline-block; padding:12px 24px; background:#2563eb; color:white; 
                    text-decoration:none; border-radius:6px; margin:16px 0;">
            Reset Password
          </a>
          <p>This link expires in 1 hour.</p>
          <p>If you did not request this, please ignore this email.</p>
        </div>
      `,
    });

    res.status(200).json({
      success: true,
      message: "Password reset email sent. Check your inbox.",
    });
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });

    res.status(500);
    throw new Error("Email could not be sent. Try again later.");
  }
});

// ─── @desc    Reset password
// ─── @route   POST /api/v1/auth/reset-password/:token
// ─── @access  Public
const resetPassword = asyncHandler(async (req, res) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    res.status(400);
    throw new Error("Invalid or expired reset token.");
  }

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  sendTokenResponse(user, 200, res, "Password reset successful!");
});

module.exports = {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  verifyEmail,
  forgotPassword,
  resetPassword,
};

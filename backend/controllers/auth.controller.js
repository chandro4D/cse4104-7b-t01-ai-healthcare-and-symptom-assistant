const asyncHandler = require("express-async-handler");
const crypto = require("crypto");
const User = require("../models/User.model");
const Patient = require("../models/Patient.model");
const {
  sendTokenResponse,
  getCookieOptions,
} = require("../utils/generateToken");
const sendEmail = require("../utils/sendEmail");

// Set REQUIRE_EMAIL_VERIFICATION=true in .env to block login until verified
const requireVerification = () =>
  String(process.env.REQUIRE_EMAIL_VERIFICATION).toLowerCase() === "true";

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

// Creates a verification token on the user, saves it, and emails the link.
// Never throws - a mail failure must not break the request.
const sendVerificationEmail = async (user) => {
  const verificationToken = crypto.randomBytes(32).toString("hex");

  user.emailVerificationToken = hashToken(verificationToken);
  user.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  await user.save({ validateBeforeSave: false });

  const verifyUrl = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;

  try {
    await sendEmail({
      to: user.email,
      subject: "Verify Your Email — AI Healthcare",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Welcome to AI Healthcare! 🏥</h2>
          <p>Hi ${user.name},</p>
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
    return true;
  } catch (emailError) {
    console.log("Email sending failed:", emailError.message);
    return false;
  }
};

// ─── @desc    Register user
// ─── @route   POST /api/v1/auth/signup
// ─── @access  Public
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    res.status(400);
    throw new Error("Email already registered. Please login.");
  }

  // SECURITY: public signup can only create patient or doctor accounts.
  // Admin accounts must be created with scripts/createAdmin.js
  const allowedRoles = ["patient", "doctor"];
  const userRole = allowedRoles.includes(role) ? role : "patient";

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    role: userRole,
  });

  // Create role-specific profile
  if (userRole === "patient") {
    await Patient.create({ userId: user._id });
  }
  // Doctor profile will be completed separately after basic registration

  // Send verification email (does not fail registration if mail fails)
  await sendVerificationEmail(user);

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
  const { email, password, role } = req.body;

  // Find user (include password for comparison)
  const user = await User.findOne({ email }).select("+password");

  // Same message for "no user" and "wrong password"
  if (!user || !(await user.comparePassword(password))) {
    res.status(401);
    throw new Error("Invalid email or password.");
  }

  // Check if account is active
  if (!user.isActive) {
    res.status(401);
    throw new Error("Your account has been suspended. Contact support.");
  }

  // The login page has Patient / Doctor / Admin tabs. If a role was selected,
  // it must match the account's real role.
  if (role && role !== user.role) {
    res.status(403);
    throw new Error(
      `This account is not registered as ${role}. Please select the correct role.`,
    );
  }

  // Optional: require verified email
  if (requireVerification() && !user.isVerified) {
    res.status(403);
    throw new Error("Please verify your email before logging in.");
  }

  sendTokenResponse(user, 200, res, "Login successful!");
});

// ─── @desc    Logout user
// ─── @route   POST /api/v1/auth/logout
// ─── @access  Public (always clears the cookie, even if the token expired)
const logout = asyncHandler(async (req, res) => {
  res.cookie("token", "", { ...getCookieOptions(), expires: new Date(0) });

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

  // Only update fields that were actually sent
  const updates = {};
  if (name !== undefined) updates.name = String(name).trim();
  if (phone !== undefined) updates.phone = String(phone).trim();
  if (avatar !== undefined) updates.avatar = avatar;

  if (Object.keys(updates).length === 0) {
    res.status(400);
    throw new Error("No profile fields provided to update.");
  }

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });

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
  const user = await User.findOne({
    emailVerificationToken: hashToken(req.params.token),
    emailVerificationExpire: { $gt: Date.now() },
  });

  if (!user) {
    res.status(400);
    throw new Error("Invalid or expired verification token.");
  }

  user.isVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpire = undefined;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: "Email verified successfully! You can now login.",
  });
});

// ─── @desc    Resend verification email
// ─── @route   POST /api/v1/auth/resend-verification
// ─── @access  Public
const resendVerification = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });

  // Same response whether or not the account exists
  if (user && !user.isVerified) {
    await sendVerificationEmail(user);
  }

  res.status(200).json({
    success: true,
    message:
      "If an unverified account exists for that email, a new verification link has been sent.",
  });
});

// ─── @desc    Forgot password - send reset email
// ─── @route   POST /api/v1/auth/forgot-password
// ─── @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
  const genericResponse = {
    success: true,
    message:
      "If an account exists for that email, a password reset link has been sent.",
  };

  const user = await User.findOne({ email: req.body.email });

  // Do not reveal whether the email is registered
  if (!user) {
    return res.status(200).json(genericResponse);
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString("hex");

  user.resetPasswordToken = hashToken(resetToken);
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

    res.status(200).json(genericResponse);
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
  const user = await User.findOne({
    resetPasswordToken: hashToken(req.params.token),
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
  resendVerification,
  forgotPassword,
  resetPassword,
};

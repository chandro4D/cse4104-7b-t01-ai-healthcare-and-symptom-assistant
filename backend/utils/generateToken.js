const jwt = require("jsonwebtoken");

/**
 * Generate JWT token and optionally set it as a cookie
 */
const generateToken = (userId, role) => {
  return jwt.sign({ id: userId, role: role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
};

/**
 * Send token as response + cookie
 */
const sendTokenResponse = (user, statusCode, res, message = "Success") => {
  const token = generateToken(user._id, user.role);

  // Cookie options
  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true, // can't be accessed via JavaScript (XSS protection)
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  };

  res
    .status(statusCode)
    .cookie("token", token, cookieOptions)
    .json({
      success: true,
      message,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        avatar: user.avatar,
      },
    });
};

module.exports = { generateToken, sendTokenResponse };

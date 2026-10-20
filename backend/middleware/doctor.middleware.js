const { ensureDoctorProfile } = require("../utils/ensureDoctorProfile");

// Use AFTER protect (and authorize). For doctor accounts it guarantees a
// linked Doctor profile and exposes it as req.doctorId / req.doctor.
// Admins and patients pass straight through.
exports.attachDoctor = async (req, res, next) => {
  try {
    if (req.user?.role !== "doctor") return next();

    const doctor = await ensureDoctorProfile(req.user);
    req.doctor = doctor;
    req.doctorId = doctor._id;
    next();
  } catch (err) {
    console.error("attachDoctor error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Could not load your doctor profile.",
    });
  }
};

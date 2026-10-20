// Notification helpers. They NEVER throw, so a notification problem can
// never break an appointment action.
//
// If your Notification schema uses different field names, change them in
// ONE place: the object passed to Notification.create below.

let Notification = null;
try {
  Notification = require("../models/Notification.model");
} catch {
  console.warn(
    "notify: models/Notification.model not found - notifications are skipped.",
  );
}

const notify = async (
  userId,
  { type = "appointment", title, message, link = "" },
) => {
  if (!Notification || !userId) return null;
  try {
    return await Notification.create({
      user: userId, // <- rename if your schema uses `recipient` etc.
      type,
      title,
      message,
      link,
    });
  } catch (err) {
    console.error("Notification not saved:", err.message);
    return null;
  }
};

// Notify the user account that owns a Doctor profile.
const notifyDoctor = async (doctorId, payload) => {
  try {
    const Doctor = require("../models/Doctor.model");
    const User = require("../models/User.model");

    const doc = await Doctor.findById(doctorId).select("user");
    if (doc?.user) return notify(doc.user, payload);

    const user = await User.findOne({ doctorId }).select("_id");
    return user ? notify(user._id, payload) : null;
  } catch (err) {
    console.error("notifyDoctor error:", err.message);
    return null;
  }
};

module.exports = { notify, notifyDoctor };

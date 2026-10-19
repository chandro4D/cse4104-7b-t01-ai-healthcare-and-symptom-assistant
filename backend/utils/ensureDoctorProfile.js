// ROOT FIX for the "doctorId is undefined" problem.
//
// Every doctor-role user is guaranteed a linked Doctor profile:
//   - old doctors are found (by link, email) and linked automatically
//   - new doctors get a profile created automatically
// Used by: attachDoctor middleware, register controller, admin createDoctor,
// and scripts/linkDoctors.js (one-time migration).

const Doctor = require("../models/Doctor.model");
const User = require("../models/User.model");

// Only query fields that really exist in your Doctor schema.
// (With strictQuery, an unknown field in a filter is dropped and
// findOne() could then match ANY doctor, so we guard every lookup.)
const hasPath = (p) => Boolean(Doctor.schema.path(p));

// A profile auto-created for a doctor account. "Busy" means patients
// cannot book until the profile is completed / verified.
// Your Doctor schema REQUIRES specialty, experience and hospital, so each
// one needs a placeholder. The doctor (or an admin) edits them afterwards.
// isVerified stays false until an admin approves the doctor.
const NEW_PROFILE_DEFAULTS = {
  specialty: "General Physician",
  experience: 0,
  hospital: "Not set",
  availability: "Busy",
  isVerified: false,
  isActive: true,
};

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const ownedByOther = (doctor, user) =>
  Boolean(doctor.user) && String(doctor.user) !== String(user._id);

// Look for the doctor profile that belongs to this user.
async function findExistingDoctor(user, { matchByName = false } = {}) {
  // 1. Already linked from the user side
  if (user.doctorId) {
    const d = await Doctor.findById(user.doctorId);
    if (d) return d;
  }

  // 2. Linked from the doctor side (Doctor.user)
  if (hasPath("user")) {
    const d = await Doctor.findOne({ user: user._id });
    if (d) return d;
  }

  // 3. Same email address
  if (hasPath("email") && user.email) {
    const d = await Doctor.findOne({
      email: new RegExp(`^${escapeRegex(user.email)}$`, "i"),
    });
    if (d && !ownedByOther(d, user)) return d;
  }

  // 4. Same name - ONLY used by the migration script, never at request time.
  if (matchByName && hasPath("name") && user.name) {
    const matches = await Doctor.find({
      name: new RegExp(`^${escapeRegex(user.name.trim())}$`, "i"),
    });
    const free = matches.filter((d) => !ownedByOther(d, user));
    if (free.length === 1) return free[0];
  }

  return null;
}

// Save the link on both sides.
async function linkUserToDoctor(user, doctor) {
  await User.updateOne({ _id: user._id }, { $set: { doctorId: doctor._id } });
  user.doctorId = doctor._id;

  if (hasPath("user") && !doctor.user) {
    await Doctor.updateOne(
      { _id: doctor._id, $or: [{ user: { $exists: false } }, { user: null }] },
      { $set: { user: user._id } },
    );
    doctor.user = user._id;
  }
}

async function createProfile(user) {
  const data = { name: user.name, ...NEW_PROFILE_DEFAULTS };
  if (hasPath("email")) data.email = user.email;
  if (hasPath("user")) data.user = user._id;

  try {
    return await Doctor.create(data);
  } catch (err) {
    // Two requests created it at the same moment -> use the existing one.
    if (err.code === 11000 && hasPath("user")) {
      const d = await Doctor.findOne({ user: user._id });
      if (d) return d;
    }
    // Another doctor profile already uses this email address.
    if (err.code === 11000 && err.keyPattern?.email) {
      throw new Error(
        `A doctor profile with the email ${user.email} already belongs to another account. Open the doctors collection and fix the email or the link.`,
      );
    }
    if (err.name === "ValidationError") {
      throw new Error(
        `Could not auto-create the doctor profile. Add defaults for: ${Object.keys(
          err.errors,
        ).join(", ")} in NEW_PROFILE_DEFAULTS (utils/ensureDoctorProfile.js).`,
      );
    }
    throw err;
  }
}

async function run(user) {
  let doctor = await findExistingDoctor(user);
  if (!doctor) doctor = await createProfile(user);

  const needsLink =
    String(user.doctorId || "") !== String(doctor._id) ||
    (hasPath("user") && !doctor.user);
  if (needsLink) await linkUserToDoctor(user, doctor);

  return doctor;
}

// One run per user at a time (dashboard fires several requests at once).
const inflight = new Map();
function ensureDoctorProfile(user) {
  const key = String(user._id);
  if (!inflight.has(key)) {
    inflight.set(
      key,
      run(user).finally(() => inflight.delete(key)),
    );
  }
  return inflight.get(key);
}

module.exports = {
  ensureDoctorProfile,
  findExistingDoctor,
  linkUserToDoctor,
  createProfile,
  hasPath,
};

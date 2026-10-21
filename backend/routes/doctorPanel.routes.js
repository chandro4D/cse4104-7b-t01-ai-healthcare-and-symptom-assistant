const express = require("express");
const mongoose = require("mongoose");

// ───────────────────────── CONFIG ─────────────────────────
const { protect } = require("../middleware/auth.middleware"); // must set req.user
const Appointment = require("../models/Appointment.model");
const User = require("../models/User.model");
const Doctor = require("../models/Doctor.model");
const VisitRequest = require("../models/VisitRequest");
const VisitNote = require("../models/VisitNote");
const Prescription = require("../models/Prescription");

let Notification = null; // optional – skipped silently if the file does not exist
try {
  Notification = require("../models/Notification");
} catch {
  /* none */
}
let PatientProfile = null; // optional – where allergies / history live, if separate from User
try {
  PatientProfile = require("../models/Patient");
} catch {
  /* none */
}
let bcrypt;
try {
  bcrypt = require("bcryptjs");
} catch {
  bcrypt = require("bcrypt");
}

// Which id does Appointment.doctor store?  "profile" = Doctor._id,  "user" = User._id
const APPOINTMENT_DOCTOR_REF = "profile";
// Field on the Doctor model that points to the login User
const DOCTOR_USER_FIELD = "user";
// Visit request validity (hours) before it auto-expires
const REQUEST_VALID_HOURS = 48;
// ───────────────────────────────────────────────────────────

const router = express.Router();
const ok = (res, data, extra = {}) =>
  res.json({ success: true, data, ...extra });
const fail = (res, code, message) =>
  res.status(code).json({ success: false, message });
const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((e) => {
    console.error(e);
    fail(res, 500, e.message || "Server error");
  });
const role =
  (...roles) =>
  (req, res, next) =>
    roles.includes(String(req.user?.role || "").toLowerCase())
      ? next()
      : fail(res, 403, "You do not have permission to do this.");
const isId = (v) => mongoose.Types.ObjectId.isValid(v);

const AccessLog =
  mongoose.models.AccessLog ||
  mongoose.model(
    "AccessLog",
    new mongoose.Schema(
      {
        actor: mongoose.Schema.Types.ObjectId,
        patient: mongoose.Schema.Types.ObjectId,
        action: String,
        ip: String,
      },
      { timestamps: true },
    ),
  );

// ───────────── helpers ─────────────
const pad = (n) => String(n).padStart(2, "0");
const dateKey = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const keyOf = (v) => {
  if (!v) return "";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : dateKey(d);
};
const isDateKey = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ""));
const isTime = (v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(v || ""));
const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
const fromMin = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const startAt = (key, time) => new Date(`${key}T${time}:00`);

async function doctorCtx(req) {
  let profile = await Doctor.findOne({ [DOCTOR_USER_FIELD]: req.user._id });
  if (!profile && req.user.email) {
    // First time: link the Doctor profile to this login account by email.
    profile = await Doctor.findOne({
      email: String(req.user.email).toLowerCase(),
    });
    if (profile && !profile[DOCTOR_USER_FIELD]) {
      await Doctor.updateOne(
        { _id: profile._id },
        { [DOCTOR_USER_FIELD]: req.user._id },
      );
      profile[DOCTOR_USER_FIELD] = req.user._id;
    }
  }
  const ids = [req.user._id];
  if (profile) ids.push(profile._id);
  const ref =
    APPOINTMENT_DOCTOR_REF === "profile" && profile
      ? profile._id
      : req.user._id;
  return { profile, ids, ref };
}

async function notify(userId, title, message, type = "appointment") {
  if (!Notification || !userId) return;
  try {
    await Notification.create({ user: userId, title, message, type });
  } catch (e) {
    console.warn("Notification skipped:", e.message);
  }
}

async function patientAllowed(ids, patientId) {
  return !!(await Appointment.exists({
    doctor: { $in: ids },
    patient: patientId,
  }));
}

async function logAccess(req, patientId, action) {
  try {
    await AccessLog.create({
      actor: req.user._id,
      patient: patientId,
      action,
      ip: req.ip,
    });
  } catch (e) {
    console.warn("Access log skipped:", e.message);
  }
}

// Free slots for a doctor on a date, based on weekly schedule, days off and bookings.
async function freeSlots(profile, ids, key) {
  const av = profile?.schedule;
  if (!av || !Array.isArray(av.weekly) || av.weekly.length === 0) {
    return { configured: false, slots: [] };
  }
  const [y, m, d] = key.split("-").map(Number);
  const dayIndex = new Date(y, m - 1, d).getDay(); // 0 = Sunday
  const day = av.weekly.find((w) => Number(w.day) === dayIndex);
  if ((profile.daysOff || []).includes(key) || !day || !day.enabled) {
    return { configured: true, slots: [] };
  }
  const step = Number(av.slotMinutes) || 30;
  const taken = new Set();
  (
    await Appointment.find({
      doctor: { $in: ids },
      status: { $in: ["Pending", "Confirmed", "pending", "confirmed"] },
    }).lean()
  ).forEach((a) => keyOf(a.date) === key && taken.add(a.time));
  (
    await VisitRequest.find({
      doctor: { $in: ids },
      proposedDate: key,
      status: "Pending",
      expiresAt: { $gt: new Date() },
    }).lean()
  ).forEach((r) => taken.add(r.time));

  const slots = [];
  for (let t = toMin(day.start); t + step <= toMin(day.end); t += step) {
    const time = fromMin(t);
    if (!taken.has(time) && startAt(key, time) > new Date()) slots.push(time);
  }
  return { configured: true, slots };
}

async function slotIsFree(profile, ids, key, time, ignoreRequestId = null) {
  const clash = await Appointment.find({
    doctor: { $in: ids },
    time,
    status: { $in: ["Pending", "Confirmed", "pending", "confirmed"] },
  }).lean();
  if (clash.some((a) => keyOf(a.date) === key)) return false;
  const reqClash = await VisitRequest.findOne({
    doctor: { $in: ids },
    proposedDate: key,
    time,
    status: "Pending",
    expiresAt: { $gt: new Date() },
    ...(ignoreRequestId ? { _id: { $ne: ignoreRequestId } } : {}),
  });
  if (reqClash) return false;
  const { configured, slots } = await freeSlots(profile, ids, key);
  if (configured && !slots.includes(time)) {
    // slot may be "taken" only by the request being accepted – allow if inside schedule
    if (ignoreRequestId) {
      const av = profile.schedule;
      const [y, m, d] = key.split("-").map(Number);
      const day = av.weekly.find(
        (w) => Number(w.day) === new Date(y, m - 1, d).getDay(),
      );
      return !!day?.enabled && !(profile.daysOff || []).includes(key);
    }
    return false;
  }
  return true;
}

// ═════════════ DOCTOR: PATIENT DIRECTORY ═════════════
router.get(
  "/patients",
  protect,
  role("doctor"),
  wrap(async (req, res) => {
    const { ids } = await doctorCtx(req);
    const appts = await Appointment.find({ doctor: { $in: ids } })
      .populate("patient", "name email phone")
      .lean();
    const today = dateKey(new Date());
    const map = new Map();
    for (const a of appts) {
      const p = a.patient;
      if (!p || !p._id) continue;
      const id = String(p._id);
      if (!map.has(id)) {
        map.set(id, {
          _id: p._id,
          name: p.name,
          email: p.email,
          phone: p.phone,
          totalVisits: 0,
          lastVisit: null,
          nextVisit: null,
        });
      }
      const row = map.get(id);
      const status = String(a.status || "").toLowerCase();
      if (status === "cancelled" || status === "canceled") continue;
      const k = keyOf(a.date);
      if (status === "completed") row.totalVisits += 1;
      if (
        k &&
        k <= today &&
        status !== "pending" &&
        (!row.lastVisit || k > row.lastVisit)
      )
        row.lastVisit = k;
      if (k && k >= today && (!row.nextVisit || k < row.nextVisit))
        row.nextVisit = k;
    }
    ok(
      res,
      [...map.values()].sort((a, b) =>
        String(a.name).localeCompare(String(b.name)),
      ),
    );
  }),
);

// ═════════════ DOCTOR: VISIT REQUESTS ═════════════
router.get(
  "/my-slots",
  protect,
  role("doctor"),
  wrap(async (req, res) => {
    const key = String(req.query.date || "");
    if (!isDateKey(key))
      return fail(res, 400, "A valid date (YYYY-MM-DD) is required.");
    const { profile, ids } = await doctorCtx(req);
    ok(res, await freeSlots(profile, ids, key));
  }),
);

router.get(
  "/visit-requests",
  protect,
  role("doctor"),
  wrap(async (req, res) => {
    const { ids } = await doctorCtx(req);
    await VisitRequest.updateMany(
      {
        doctor: { $in: ids },
        status: "Pending",
        expiresAt: { $lt: new Date() },
      },
      { status: "Expired" },
    );
    const list = await VisitRequest.find({ doctor: { $in: ids } })
      .populate("patient", "name email phone")
      .sort({ createdAt: -1 })
      .lean();
    ok(res, list);
  }),
);

router.post(
  "/visit-requests",
  protect,
  role("doctor"),
  wrap(async (req, res) => {
    const { patient, proposedDate, time, visitType, reason } = req.body;
    if (!isId(patient)) return fail(res, 400, "Choose a patient.");
    if (!isDateKey(proposedDate) || !isTime(time))
      return fail(res, 400, "Choose a valid date and time.");
    if (!String(reason || "").trim())
      return fail(res, 400, "Enter a reason for the visit.");
    const when = startAt(proposedDate, time);
    if (when <= new Date())
      return fail(res, 400, "The proposed time must be in the future.");

    const ctx = await doctorCtx(req);
    if (!(await patientAllowed(ctx.ids, patient)))
      return fail(res, 403, "This patient has no booking with you.");
    if (!(await slotIsFree(ctx.profile, ctx.ids, proposedDate, time))) {
      return fail(res, 409, "That slot is not available. Pick another time.");
    }

    const expiresAt = new Date(
      Math.min(Date.now() + REQUEST_VALID_HOURS * 3600 * 1000, when.getTime()),
    );
    const doc = await VisitRequest.create({
      doctor: ctx.ref,
      patient,
      proposedDate,
      time,
      visitType,
      reason: String(reason).trim(),
      expiresAt,
    });
    await notify(
      patient,
      "New visit request",
      `Dr. ${req.user.name || ""} proposed a ${visitType || "visit"} on ${proposedDate} at ${time}.`,
      "visit-request",
    );
    ok(res, doc);
  }),
);

router.patch(
  "/visit-requests/:id/cancel",
  protect,
  role("doctor"),
  wrap(async (req, res) => {
    const { ids } = await doctorCtx(req);
    const vr = await VisitRequest.findOne({
      _id: req.params.id,
      doctor: { $in: ids },
    });
    if (!vr) return fail(res, 404, "Request not found.");
    if (vr.status !== "Pending")
      return fail(res, 400, "Only pending requests can be cancelled.");
    vr.status = "Cancelled";
    await vr.save();
    await notify(
      vr.patient,
      "Visit request cancelled",
      `The visit request for ${vr.proposedDate} was cancelled.`,
      "visit-request",
    );
    ok(res, vr);
  }),
);

// ═════════════ PATIENT SIDE (for the patient panel later) ═════════════
router.get(
  "/my-visit-requests",
  protect,
  role("patient"),
  wrap(async (req, res) => {
    await VisitRequest.updateMany(
      {
        patient: req.user._id,
        status: "Pending",
        expiresAt: { $lt: new Date() },
      },
      { status: "Expired" },
    );
    ok(
      res,
      await VisitRequest.find({ patient: req.user._id })
        .sort({ createdAt: -1 })
        .lean(),
    );
  }),
);

router.patch(
  "/visit-requests/:id/respond",
  protect,
  role("patient"),
  wrap(async (req, res) => {
    const vr = await VisitRequest.findOne({
      _id: req.params.id,
      patient: req.user._id,
    });
    if (!vr) return fail(res, 404, "Request not found.");
    if (vr.status === "Pending" && vr.expiresAt < new Date()) {
      vr.status = "Expired";
      await vr.save();
    }
    if (vr.status !== "Pending")
      return fail(res, 400, `This request is ${vr.status.toLowerCase()}.`);

    const accept = String(req.body.response).toLowerCase() === "accept";
    let doctorUserId = null;
    const profile = await Doctor.findById(vr.doctor);
    const ids = [vr.doctor];
    if (profile) {
      ids.push(profile[DOCTOR_USER_FIELD]);
      doctorUserId = profile[DOCTOR_USER_FIELD];
    } else doctorUserId = vr.doctor;

    if (accept) {
      if (!(await slotIsFree(profile, ids, vr.proposedDate, vr.time, vr._id))) {
        vr.status = "Expired";
        await vr.save();
        return fail(res, 409, "This slot is no longer available.");
      }
      const appt = await Appointment.create({
        patient: req.user._id,
        doctor: vr.doctor,
        date: vr.proposedDate,
        time: vr.time,
        reason: vr.reason,
        status: "Confirmed",
      });
      vr.appointment = appt._id;
      vr.status = "Accepted";
    } else vr.status = "Declined";
    vr.respondedAt = new Date();
    await vr.save();
    await notify(
      doctorUserId,
      `Visit request ${vr.status.toLowerCase()}`,
      `${req.user.name || "A patient"} ${vr.status.toLowerCase()} your request for ${vr.proposedDate} at ${vr.time}.`,
      "visit-request",
    );
    ok(res, vr);
  }),
);

router.get(
  "/my-prescriptions",
  protect,
  role("patient"),
  wrap(async (req, res) => {
    ok(
      res,
      await Prescription.find({ patient: req.user._id })
        .sort({ createdAt: -1 })
        .lean(),
    );
  }),
);

// ═════════════ DOCTOR: PATIENT RECORD ═════════════
router.get(
  "/patients/:patientId",
  protect,
  role("doctor"),
  wrap(async (req, res) => {
    const { patientId } = req.params;
    if (!isId(patientId)) return fail(res, 400, "Invalid patient id.");
    const { ids } = await doctorCtx(req);
    if (!(await patientAllowed(ids, patientId)))
      return fail(res, 403, "You can only open your own patients.");

    const user = await User.findById(patientId).select("-password").lean();
    if (!user) return fail(res, 404, "Patient not found.");
    let extra = {};
    if (PatientProfile) {
      extra = (await PatientProfile.findOne({ user: patientId }).lean()) || {};
    }
    const pick = (k) => user[k] ?? extra[k];
    const profile = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: pick("phone"),
      gender: pick("gender"),
      dateOfBirth: pick("dateOfBirth") || pick("dob"),
      address: pick("address"),
      bloodGroup: pick("bloodGroup"),
      allergies: pick("allergies"),
      medicalHistory:
        pick("medicalHistory") || pick("history") || pick("chronicConditions"),
    };

    const [appointments, notes, prescriptions] = await Promise.all([
      Appointment.find({ doctor: { $in: ids }, patient: patientId })
        .sort({ date: -1, time: -1 })
        .lean(),
      VisitNote.find({ doctor: { $in: ids }, patient: patientId })
        .sort({ createdAt: -1 })
        .lean(),
      Prescription.find({ doctor: { $in: ids }, patient: patientId })
        .sort({ createdAt: -1 })
        .lean(),
    ]);
    await logAccess(req, patientId, "VIEW_RECORD");
    ok(res, { profile, appointments, notes, prescriptions });
  }),
);

async function loadOwnAppointment(
  req,
  patientId,
  appointmentId,
  allowedStatuses,
) {
  if (!isId(appointmentId)) return { error: "Choose an appointment." };
  const { ids, ref } = await doctorCtx(req);
  const appt = await Appointment.findOne({
    _id: appointmentId,
    doctor: { $in: ids },
    patient: patientId,
  });
  if (!appt) return { error: "Appointment not found for this patient." };
  if (
    allowedStatuses &&
    !allowedStatuses.includes(String(appt.status).toLowerCase())
  ) {
    return {
      error: `Only ${allowedStatuses.join(" or ")} appointments can be used here.`,
    };
  }
  return { appt, ref };
}

router.post(
  "/patients/:patientId/notes",
  protect,
  role("doctor"),
  wrap(async (req, res) => {
    const { patientId } = req.params;
    const { appointment, complaint, diagnosis, notes, followUpDate } = req.body;
    if (!String(notes || "").trim())
      return fail(res, 400, "Write the visit note.");
    if (followUpDate && !isDateKey(followUpDate))
      return fail(res, 400, "Follow-up date is not valid.");
    const r = await loadOwnAppointment(req, patientId, appointment, [
      "confirmed",
      "completed",
    ]);
    if (r.error) return fail(res, 400, r.error);
    const doc = await VisitNote.create({
      appointment,
      doctor: r.ref,
      patient: patientId,
      complaint,
      diagnosis,
      notes: String(notes).trim(),
      followUpDate: followUpDate || undefined,
    });
    await logAccess(req, patientId, "ADD_NOTE");
    ok(res, doc);
  }),
);

router.post(
  "/patients/:patientId/prescriptions",
  protect,
  role("doctor"),
  wrap(async (req, res) => {
    const { patientId } = req.params;
    const { appointment, diagnosis, medicines, instructions } = req.body;
    const meds = (Array.isArray(medicines) ? medicines : [])
      .map((m) => ({
        name: String(m.name || "").trim(),
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
      }))
      .filter((m) => m.name);
    if (meds.length === 0) return fail(res, 400, "Add at least one medicine.");
    const r = await loadOwnAppointment(req, patientId, appointment, [
      "confirmed",
      "completed",
    ]);
    if (r.error) return fail(res, 400, r.error);
    const doc = await Prescription.create({
      appointment,
      doctor: r.ref,
      patient: patientId,
      diagnosis,
      medicines: meds,
      instructions,
    });
    await notify(
      patientId,
      "New prescription",
      "Your doctor added a prescription to your record.",
      "prescription",
    );
    await logAccess(req, patientId, "ADD_PRESCRIPTION");
    ok(res, doc);
  }),
);

// ═════════════ DOCTOR: PROFILE & AVAILABILITY ═════════════
router.get(
  "/profile",
  protect,
  role("doctor"),
  wrap(async (req, res) => {
    const { profile } = await doctorCtx(req);
    const user = await User.findById(req.user._id).select("-password").lean();
    ok(res, { user, doctor: profile ? shapeDoctor(profile) : null });
  }),
);

// The page uses photo / fee / availability; the Doctor model stores image / consultationFee / schedule.

const shapeDoctor = (doc) => {
  const o = typeof doc.toObject === "function" ? doc.toObject() : doc;

  return {
    ...o,

    // Keep these fields independent.
    availability: o.availability || "Available Today",
    status: o.status || "Available",
    schedule: o.schedule || {
      slotMinutes: 30,
      weekly: [],
    },

    // Backward-compatible aliases used by the frontend.
    photo: o.image || "",
    fee: o.consultationFee ?? 0,
  };
};

const SENSITIVE = ["specialty", "qualifications", "licenseNumber"];
const SLOT_LENGTHS = [10, 15, 20, 30, 45, 60];

router.patch(
  "/profile",
  protect,
  role("doctor"),
  wrap(async (req, res) => {
    const { profile } = await doctorCtx(req);

    if (!profile) {
      return fail(res, 404, "Doctor profile not found.");
    }

    const b = req.body || {};

    const AVAILABILITY_VALUES = [
      "Available Today",
      "Available Tomorrow",
      "Busy",
    ];

    const STATUS_VALUES = ["Available", "Busy", "Offline"];
    const SLOT_LENGTHS = [10, 15, 20, 30, 45, 60];

    // Availability label: a string, not a schedule object.
    if (
      b.availability !== undefined &&
      (typeof b.availability !== "string" ||
        !AVAILABILITY_VALUES.includes(b.availability))
    ) {
      return fail(res, 400, "Choose a valid availability.");
    }

    if (
      b.status !== undefined &&
      (typeof b.status !== "string" || !STATUS_VALUES.includes(b.status))
    ) {
      return fail(res, 400, "Choose a valid doctor status.");
    }

    // Validate the weekly schedule independently.
    if (b.schedule !== undefined) {
      const schedule = b.schedule;

      if (
        !schedule ||
        typeof schedule !== "object" ||
        !SLOT_LENGTHS.includes(Number(schedule.slotMinutes))
      ) {
        return fail(res, 400, "Choose a valid slot length.");
      }

      if (!Array.isArray(schedule.weekly) || schedule.weekly.length !== 7) {
        return fail(res, 400, "Schedule must include all 7 days.");
      }

      const dayNumbers = schedule.weekly.map((w) => Number(w.day));

      if (
        new Set(dayNumbers).size !== 7 ||
        dayNumbers.some((day) => !Number.isInteger(day) || day < 0 || day > 6)
      ) {
        return fail(
          res,
          400,
          "Schedule must contain each weekday exactly once.",
        );
      }

      for (const w of schedule.weekly) {
        if (typeof w.enabled !== "boolean") {
          return fail(
            res,
            400,
            "Each schedule day must have an enabled value.",
          );
        }

        if (!w.enabled) continue;

        if (
          !isTime(w.start) ||
          !isTime(w.end) ||
          toMin(w.start) >= toMin(w.end)
        ) {
          return fail(
            res,
            400,
            "Each working day needs an end time after its start time.",
          );
        }
      }
    }

    if (
      b.daysOff !== undefined &&
      (!Array.isArray(b.daysOff) || !b.daysOff.every(isDateKey))
    ) {
      return fail(res, 400, "Days off are not valid.");
    }

    if (
      b.fee !== undefined &&
      (b.fee === "" || !Number.isFinite(Number(b.fee)) || Number(b.fee) < 0)
    ) {
      return fail(res, 400, "Fee must be a non-negative number.");
    }

    if (
      b.experience !== undefined &&
      (b.experience === "" ||
        !Number.isFinite(Number(b.experience)) ||
        Number(b.experience) < 0)
    ) {
      return fail(res, 400, "Experience must be a non-negative number.");
    }

    if (
      b.visitTypes !== undefined &&
      (!Array.isArray(b.visitTypes) ||
        b.visitTypes.length === 0 ||
        !b.visitTypes.every((v) =>
          ["In-person", "Video", "Follow-up", "Check-up"].includes(v),
        ))
    ) {
      return fail(res, 400, "Choose at least one valid visit type.");
    }

    // Update the linked user account.
    const userUpdate = {};

    if (typeof b.name === "string" && b.name.trim()) {
      userUpdate.name = b.name.trim();
    }

    if (typeof b.phone === "string") {
      userUpdate.phone = b.phone.trim();
    }

    if (Object.keys(userUpdate).length > 0) {
      const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        { $set: userUpdate },
        {
          new: true,
          runValidators: true,
        },
      );

      if (!updatedUser) {
        return fail(res, 404, "User account not found.");
      }

      // Keep the doctor's public profile synchronized.
      if (userUpdate.name) profile.name = userUpdate.name;
      if (userUpdate.phone !== undefined) {
        profile.phone = userUpdate.phone;
      }
    }

    // Update ordinary doctor profile fields.
    if (typeof b.bio === "string") {
      profile.bio = b.bio.slice(0, 1000);
    }

    if (typeof b.photo === "string") {
      profile.image = b.photo.trim();
    }

    if (typeof b.hospital === "string") {
      profile.hospital = b.hospital.trim() || "Not set";
    }

    if (b.fee !== undefined) {
      profile.consultationFee = Number(b.fee);
    }

    if (b.experience !== undefined) {
      profile.experience = Number(b.experience);
    }

    if (Array.isArray(b.visitTypes)) {
      profile.visitTypes = b.visitTypes;
    }

    // These are separate database fields.
    if (b.availability !== undefined) {
      profile.availability = b.availability;
    }

    if (b.status !== undefined) {
      profile.status = b.status;
    }

    // Only the schedule object is saved to the schedule field.
    if (b.schedule !== undefined) {
      profile.schedule = {
        slotMinutes: Number(b.schedule.slotMinutes),
        weekly: b.schedule.weekly
          .map((w) => ({
            day: Number(w.day),
            enabled: w.enabled,
            start: w.start,
            end: w.end,
          }))
          .sort((a, b) => a.day - b.day),
      };
    }

    if (b.daysOff !== undefined) {
      profile.daysOff = [...new Set(b.daysOff)].sort();
    }

    // Sensitive credentials still require admin approval.
    const sensitiveFields = ["specialty", "qualifications", "licenseNumber"];

    const changes = {};

    for (const key of sensitiveFields) {
      if (
        typeof b[key] === "string" &&
        b[key].trim() !== String(profile[key] ?? "")
      ) {
        changes[key] = b[key].trim();
      }
    }

    const pending = Object.keys(changes).length > 0;

    if (pending) {
      profile.pendingChanges = {
        ...(profile.pendingChanges &&
        profile.pendingChanges.status === "Pending"
          ? profile.pendingChanges
          : {}),
        ...changes,
        status: "Pending",
        requestedAt: new Date(),
      };
    }

    await profile.save();

    return ok(res, shapeDoctor(profile), { pending });
  }),
);

// router.patch(
//   "/profile",
//   protect,
//   role("doctor"),
//   wrap(async (req, res) => {
//     const { profile } = await doctorCtx(req);
//     if (!profile) return fail(res, 404, "Doctor profile not found.");
//     const b = req.body;

//     // availability validation
//     if (b.availability) {
//       const av = b.availability;
//       if (!SLOT_LENGTHS.includes(Number(av.slotMinutes)))
//         return fail(res, 400, "Choose a valid slot length.");
//       if (!Array.isArray(av.weekly) || av.weekly.length !== 7)
//         return fail(res, 400, "Schedule must include all 7 days.");
//       for (const w of av.weekly) {
//         if (!w.enabled) continue;
//         if (
//           !isTime(w.start) ||
//           !isTime(w.end) ||
//           toMin(w.start) >= toMin(w.end)
//         ) {
//           return fail(
//             res,
//             400,
//             "Each working day needs an end time after its start time.",
//           );
//         }
//       }
//     }
//     if (b.daysOff && !(Array.isArray(b.daysOff) && b.daysOff.every(isDateKey)))
//       return fail(res, 400, "Days off are not valid.");
//     if (b.fee != null && (Number.isNaN(Number(b.fee)) || Number(b.fee) < 0))
//       return fail(res, 400, "Fee must be a positive number.");
//     if (
//       b.experience != null &&
//       (Number.isNaN(Number(b.experience)) || Number(b.experience) < 0)
//     )
//       return fail(res, 400, "Experience must be a positive number.");

//     // user fields
//     const userUpdate = {};
//     if (typeof b.name === "string" && b.name.trim())
//       userUpdate.name = b.name.trim();
//     if (typeof b.phone === "string") userUpdate.phone = b.phone.trim();
//     if (Object.keys(userUpdate).length)
//       await User.findByIdAndUpdate(req.user._id, userUpdate, {
//         runValidators: true,
//       });

//     // low-risk doctor fields -> saved immediately
//     if (typeof b.bio === "string") profile.bio = b.bio.slice(0, 1000);
//     if (typeof b.photo === "string") profile.image = b.photo.trim();
//     if (b.fee != null) profile.consultationFee = Number(b.fee);
//     if (b.experience != null) profile.experience = Number(b.experience);
//     if (Array.isArray(b.visitTypes)) profile.visitTypes = b.visitTypes;
//     if (b.availability) profile.schedule = b.availability;
//     if (b.daysOff) profile.daysOff = [...new Set(b.daysOff)].sort();

//     // sensitive fields -> pending admin approval
//     const changes = {};
//     for (const k of SENSITIVE) {
//       if (typeof b[k] === "string" && b[k].trim() !== String(profile[k] ?? ""))
//         changes[k] = b[k].trim();
//     }
//     const pending = Object.keys(changes).length > 0;
//     if (pending)
//       profile.pendingChanges = {
//         ...changes,
//         status: "Pending",
//         requestedAt: new Date(),
//       };
//     await profile.save();
//     ok(res, shapeDoctor(profile), { pending });
//   }),
// );

router.patch(
  "/password",
  protect,
  role("doctor"),
  wrap(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return fail(res, 400, "Enter your current and new password.");
    if (String(newPassword).length < 8)
      return fail(res, 400, "New password must be at least 8 characters.");
    const user = await User.findById(req.user._id).select("+password");
    if (!user || !(await bcrypt.compare(currentPassword, user.password)))
      return fail(res, 400, "Current password is incorrect.");
    user.password = newPassword; // your User model should hash on save (pre-save hook)
    await user.save();
    ok(res, null, { message: "Password updated." });
  }),
);

// ═════════════ SLOTS FOR PATIENT BOOKING ═════════════
// GET /api/v1/doctor-panel/slots/:doctorId?date=YYYY-MM-DD   (use inside createAppointment / booking page)
router.get(
  "/slots/:doctorId",
  protect,
  wrap(async (req, res) => {
    const key = String(req.query.date || "");
    if (!isDateKey(key) || !isId(req.params.doctorId))
      return fail(res, 400, "A valid doctor and date are required.");
    const profile =
      (await Doctor.findById(req.params.doctorId)) ||
      (await Doctor.findOne({ [DOCTOR_USER_FIELD]: req.params.doctorId }));
    if (!profile) return fail(res, 404, "Doctor not found.");
    ok(
      res,
      await freeSlots(profile, [profile._id, profile[DOCTOR_USER_FIELD]], key),
    );
  }),
);

module.exports = router;

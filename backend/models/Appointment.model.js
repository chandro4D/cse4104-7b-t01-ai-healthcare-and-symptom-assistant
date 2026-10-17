const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },

    // Snapshot data for easier display
    patientName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },

    doctorName: {
      type: String,
      required: true,
      trim: true,
    },

    specialty: {
      type: String,
      required: true,
      trim: true,
    },

    date: {
      type: String, // "YYYY-MM-DD"
      required: true,
    },

    time: {
      type: String, // "HH:mm"
      required: true,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Cancelled", "Completed"],
      default: "Pending",
    },

    // ── Cancellation details ──
    cancelledAt: {
      type: Date,
    },

    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    cancelReason: {
      type: String,
      trim: true,
      maxlength: 200,
    },

    // ── Completion details ──
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

// Prevent double-booking of the same doctor/slot while the appointment is active.
// NOTE: if your database already has duplicate active slots, clean them up first
// or this index will fail to build.
appointmentSchema.index(
  { doctor: 1, date: 1, time: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["Pending", "Confirmed"] } },
  },
);

module.exports = mongoose.model("Appointment", appointmentSchema);

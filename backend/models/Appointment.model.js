const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: Date,
      required: [true, "Appointment date is required"],
    },
    timeSlot: {
      type: String,
      required: [true, "Time slot is required"],
      // e.g. "10:00 AM - 10:30 AM"
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled", "rejected"],
      default: "pending",
    },
    type: {
      type: String,
      enum: ["in-person", "video"],
      default: "in-person",
    },
    reason: {
      type: String,
      trim: true,
    },
    symptoms: [String],
    notes: {
      type: String,
      default: "",
    },
    // Doctor's notes after consultation
    diagnosis: {
      type: String,
      default: "",
    },
    cancelledBy: {
      type: String,
      enum: ["patient", "doctor", "admin", ""],
      default: "",
    },
    cancelReason: String,
  },
  { timestamps: true },
);

module.exports = mongoose.model("Appointment", appointmentSchema);

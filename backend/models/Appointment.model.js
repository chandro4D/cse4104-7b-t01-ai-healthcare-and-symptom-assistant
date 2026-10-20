const mongoose = require("mongoose");

// ============================================
// APPOINTMENT STATUS HISTORY
// ============================================
const statusHistorySchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    trim: true,
  },

  fromStatus: {
    type: String,
    enum: ["Pending", "Confirmed", "Cancelled", "Completed"],
  },

  toStatus: {
    type: String,
    enum: ["Pending", "Confirmed", "Cancelled", "Completed"],
  },

  reason: {
    type: String,
    trim: true,
    maxlength: 500,
  },

  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  performedByRole: {
    type: String,
    enum: ["admin", "doctor", "patient", "system"],
  },

  previousDate: {
    type: String,
  },

  newDate: {
    type: String,
  },

  previousTime: {
    type: String,
  },

  newTime: {
    type: String,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// ============================================
// APPOINTMENT SCHEMA
// ============================================
const appointmentSchema = new mongoose.Schema(
  {
    // Patient account
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Doctor profile (not the User ID)
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },

    // Snapshot data for display
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

    // Appointment date: YYYY-MM-DD
    date: {
      type: String,
      required: true,
    },

    // Appointment time: HH:mm
    time: {
      type: String,
      required: true,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    // Appointment status
    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Cancelled", "Completed"],
      default: "Pending",
    },

    // Cancellation details
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

    // Completion details
    completedAt: {
      type: Date,
    },

    // Private notes written by the doctor
    doctorNotes: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    // Reschedule proposal
    proposedDate: {
      type: String,
    },

    proposedTime: {
      type: String,
    },

    rescheduleNote: {
      type: String,
      trim: true,
      maxlength: 200,
    },

    rescheduleProposedAt: {
      type: Date,
    },

    // NEW: Appointment action history
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

// ============================================
// PREVENT DOUBLE-BOOKING
// A doctor cannot have two active appointments
// at the same date and time.
// ============================================
appointmentSchema.index(
  {
    doctor: 1,
    date: 1,
    time: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      status: {
        $in: ["Pending", "Confirmed"],
      },
    },
  },
);
module.exports = mongoose.model("Appointment", appointmentSchema);

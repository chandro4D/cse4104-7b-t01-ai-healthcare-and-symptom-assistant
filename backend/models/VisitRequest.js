const mongoose = require("mongoose");

const visitRequestSchema = new mongoose.Schema(
  {
    // same kind of id your Appointment.doctor uses (see APPOINTMENT_DOCTOR_REF in the routes file)
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    proposedDate: { type: String, required: true }, // "YYYY-MM-DD"
    time: { type: String, required: true }, // "HH:mm" (24h)
    visitType: {
      type: String,
      enum: ["In-person", "Video", "Follow-up", "Check-up"],
      default: "In-person",
    },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    status: {
      type: String,
      enum: ["Pending", "Accepted", "Declined", "Expired", "Cancelled"],
      default: "Pending",
      index: true,
    },
    expiresAt: { type: Date, required: true },
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment" },
    respondedAt: Date,
  },
  { timestamps: true },
);

module.exports =
  mongoose.models.VisitRequest ||
  mongoose.model("VisitRequest", visitRequestSchema);

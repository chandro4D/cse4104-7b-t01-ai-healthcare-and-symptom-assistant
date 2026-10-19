const mongoose = require("mongoose");

const visitNoteSchema = new mongoose.Schema(
  {
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
      index: true,
    },
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
    complaint: { type: String, trim: true, maxlength: 500 },
    diagnosis: { type: String, trim: true, maxlength: 500 },
    notes: { type: String, required: true, trim: true, maxlength: 4000 },
    followUpDate: { type: String }, // "YYYY-MM-DD" (optional)
  },
  { timestamps: true },
);

module.exports =
  mongoose.models.VisitNote || mongoose.model("VisitNote", visitNoteSchema);

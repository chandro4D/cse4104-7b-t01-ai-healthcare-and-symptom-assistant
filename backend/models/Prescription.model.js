const mongoose = require("mongoose");

const prescriptionSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
    },
    diagnosis: {
      type: String,
      required: [true, "Diagnosis is required"],
    },
    medicines: [
      {
        name: { type: String, required: true },
        dosage: { type: String, required: true }, // e.g. "500mg"
        frequency: { type: String, required: true }, // e.g. "3 times daily"
        duration: { type: String, required: true }, // e.g. "7 days"
        instructions: String, // e.g. "Take after meals"
      },
    ],
    advice: String,
    followUpDate: Date,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Prescription", prescriptionSchema);

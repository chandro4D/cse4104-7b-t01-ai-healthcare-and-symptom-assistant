const mongoose = require("mongoose");

const medicineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    dosage: { type: String, trim: true, maxlength: 60 }, // e.g. "500 mg"
    frequency: { type: String, trim: true, maxlength: 60 }, // e.g. "Twice daily"
    duration: { type: String, trim: true, maxlength: 60 }, // e.g. "5 days"
  },
  { _id: false },
);

const prescriptionSchema = new mongoose.Schema(
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
    diagnosis: { type: String, trim: true, maxlength: 500 },
    medicines: {
      type: [medicineSchema],
      validate: (v) => Array.isArray(v) && v.length > 0,
    },
    instructions: { type: String, trim: true, maxlength: 1500 },
  },
  { timestamps: true },
);

module.exports =
  mongoose.models.Prescription ||
  mongoose.model("Prescription", prescriptionSchema);

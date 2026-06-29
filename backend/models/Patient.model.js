const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", ""],
      default: "",
    },
    allergies: [String],
    chronicConditions: [String],
    currentMedications: [String],
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String,
    },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Patient", patientSchema);

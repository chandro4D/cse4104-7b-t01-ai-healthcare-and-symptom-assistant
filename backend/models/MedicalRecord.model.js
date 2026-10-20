const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['lab_report', 'x_ray', 'prescription', 'vaccination', 'other'],
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
    },
    description: String,
    fileUrl: String,   // uploaded file path
    date: {
      type: Date,
      default: Date.now,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);
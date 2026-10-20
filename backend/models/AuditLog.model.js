const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    actorRole: {
      type: String,
      enum: ["admin", "doctor", "patient", "system", "unknown"],
      default: "unknown",
      lowercase: true,
      index: true,
    },
    actorLabel: {
      type: String,
      trim: true,
      maxlength: 150,
      default: "",
    },
    action: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true,
    },
    targetType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true,
    },
    targetId: {
      type: String,
      default: "",
      trim: true,
      maxlength: 100,
      index: true,
    },
    reason: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    outcome: {
      type: String,
      enum: ["success", "failure", "denied"],
      default: "success",
      index: true,
    },
    requestId: {
      type: String,
      default: "",
      maxlength: 100,
    },
    ipAddress: {
      type: String,
      default: "",
      maxlength: 100,
    },
    userAgent: {
      type: String,
      default: "",
      maxlength: 300,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);

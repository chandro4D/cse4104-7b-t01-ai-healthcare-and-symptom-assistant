const AuditLog = require("../models/AuditLog.model");

const ALLOWED_ROLES = ["admin", "doctor", "patient", "system", "unknown"];

const cleanText = (value, maxLength = 300) =>
  String(value ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .trim()
    .slice(0, maxLength);

const safeMetadata = (input = {}) => {
  // Explicit allowlist: never pass medical records or request bodies
  // directly into audit metadata.
  const allowedKeys = [
    "previousRole",
    "newRole",
    "previousStatus",
    "newStatus",
    "previousIsActive",
    "newIsActive",
    "previousIsVerified",
    "newIsVerified",
    "previousDate",
    "newDate",
    "previousTime",
    "newTime",
    "recordType",
    "decision",
    "notificationQueued",
  ];

  const result = {};

  for (const key of allowedKeys) {
    if (input[key] !== undefined && input[key] !== null) {
      result[key] = cleanText(input[key], 150);
    }
  }

  return result;
};

async function writeAuditLog({
  req,
  actor,
  action,
  targetType,
  targetId = "",
  reason = "",
  outcome = "success",
  metadata = {},
}) {
  const user = actor || req?.user || {};

  const roleValue = String(user.role || "unknown").toLowerCase();
  const actorRole = ALLOWED_ROLES.includes(roleValue) ? roleValue : "unknown";

  const forwarded = req?.headers?.["x-forwarded-for"];
  const ipAddress = forwarded
    ? cleanText(String(forwarded).split(",")[0], 100)
    : cleanText(req?.ip || req?.socket?.remoteAddress, 100);

  return AuditLog.create({
    actorId: user._id || user.id || null,
    actorRole,
    actorLabel: cleanText(user.name || user.email || "", 150),
    action: cleanText(action, 100),
    targetType: cleanText(targetType, 100),
    targetId: cleanText(targetId, 100),
    reason: cleanText(reason, 500),
    outcome,
    requestId: cleanText(req?.id || req?.headers?.["x-request-id"], 100),
    ipAddress,
    userAgent: cleanText(req?.headers?.["user-agent"], 300),
    metadata: safeMetadata(metadata),
  });
}

module.exports = { writeAuditLog };

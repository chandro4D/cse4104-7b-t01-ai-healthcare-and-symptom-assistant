const asyncHandler = require("express-async-handler");
const Conversation = require("../models/Conversation");

// This controller does NOT touch appointments.
// PatientHome reads appointments from GET /api/v1/appointments/my (the same
// endpoint the My Appointments page uses). This endpoint only provides:
//   - the user's name
//   - AI risk level + trend (from saved symptom-check conversations)
//   - AI recommendations (from the same history)
//   - active prescription count (only if a Prescription model exists)

// -----------------------------------------------------------------------------
// Optional Prescription model. If it does not exist, the page shows
// "Not available yet" for that card. Change PRESC if your field names differ.
// -----------------------------------------------------------------------------
const tryRequire = (...paths) => {
  for (const p of paths) {
    try {
      return require(p);
    } catch (err) {
      if (err.code !== "MODULE_NOT_FOUND") throw err;
    }
  }
  return null;
};

const Prescription = tryRequire(
  "../models/Prescription.model",
  "../models/Prescription",
);
const PRESC = { patient: "patient", status: "status" };

const SEVERITY_RANK = { Low: 0, Moderate: 1, High: 2, Urgent: 3 };

const countActivePrescriptions = async (userId) => {
  if (!Prescription || !Prescription.schema.path(PRESC.patient)) return null;

  const filter = { [PRESC.patient]: userId };
  if (Prescription.schema.path(PRESC.status)) {
    filter[PRESC.status] = /^active$/i;
  }

  return Prescription.countDocuments(filter);
};

// Recommendations are built only from this patient's real symptom-check history.
// (The "book an appointment" suggestion is added on the page, because only the
// page knows the patient's appointments.)
const buildRecommendations = (convos) => {
  const items = [];
  const latest = convos[0];
  if (!latest) return items;

  const severity = latest.analysis?.severity;
  const department = latest.analysis?.departments?.[0]?.name;

  if (severity) {
    items.push({
      title: `Latest assessment: ${severity}`,
      body: `From your consultation “${latest.title}”.${
        department ? ` Suggested department: ${department}.` : ""
      }`,
    });
  }

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weekCount = convos.filter(
    (c) => new Date(c.updatedAt).getTime() >= weekAgo,
  ).length;

  if (weekCount >= 3) {
    items.push({
      title: "Frequent symptom checks this week",
      body: `You ran ${weekCount} symptom checks in the last 7 days. If symptoms keep coming back, consider seeing a doctor.`,
    });
  }

  return items.slice(0, 3);
};

// -----------------------------------------------------------------------------
// GET /api/v1/dashboard/patient
// -----------------------------------------------------------------------------
const getPatientDashboard = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const [convos, prescriptionCount] = await Promise.all([
    Conversation.find({ user: userId })
      .select("title updatedAt analysis")
      .sort({ updatedAt: -1 })
      .limit(10)
      .lean(),
    countActivePrescriptions(userId),
  ]);

  // AI risk card: latest symptom-check severity compared with the one before it
  const scored = convos.filter(
    (c) => SEVERITY_RANK[c.analysis?.severity] !== undefined,
  );
  const [latestScored, previousScored] = scored;

  let aiRisk = null;
  if (latestScored) {
    let trend = null;
    if (previousScored) {
      const diff =
        SEVERITY_RANK[latestScored.analysis.severity] -
        SEVERITY_RANK[previousScored.analysis.severity];
      trend = diff < 0 ? "improved" : diff > 0 ? "worsened" : "same";
    }

    aiRisk = {
      severity: latestScored.analysis.severity,
      trend,
      date: latestScored.updatedAt,
      department: latestScored.analysis.departments?.[0]?.name || null,
    };
  }

  const u = req.user;
  const name =
    u.name ||
    u.fullName ||
    [u.firstName, u.lastName].filter(Boolean).join(" ") ||
    null;

  res.status(200).json({
    success: true,
    user: { name },
    stats: {
      aiRisk,
      activePrescriptions: prescriptionCount,
    },
    recommendations: buildRecommendations(convos),
  });
});

module.exports = { getPatientDashboard };
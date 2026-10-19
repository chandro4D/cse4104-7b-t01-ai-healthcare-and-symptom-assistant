const { writeAuditLog } = require("../utils/auditLogger");

function auditSensitiveAccess(recordType) {
  return async function sensitiveAccessLogger(req, res, next) {
    // The route should have authentication middleware before this one.
    const recordId =
      req.params.id || req.params.patientId || req.params.recordId || "";

    let recorded = false;

    const recordAccess = async (outcome) => {
      if (recorded) return;
      recorded = true;

      try {
        await writeAuditLog({
          req,
          action: "SENSITIVE_RECORD_ACCESS",
          targetType: recordType,
          targetId: recordId,
          outcome,
          metadata: { recordType },
        });
      } catch (error) {
        // Do not silently claim that an audit entry was written.
        // For a healthcare deployment, configure centralized alerting here.
        console.error("Sensitive-access audit write failed:", error.message);
      }
    };

    const originalJson = res.json.bind(res);

    res.json = function auditedJson(body) {
      const status = res.statusCode || 200;

      // Record successful reads only; failed/denied reads are handled
      // separately in the finish callback.
      if (status >= 200 && status < 300) {
        res.once("finish", () => {
          void recordAccess("success");
        });
      }

      return originalJson(body);
    };

    res.once("finish", () => {
      if (res.statusCode >= 400) {
        void recordAccess(res.statusCode === 403 ? "denied" : "failure");
      }
    });

    next();
  };
}

module.exports = auditSensitiveAccess;

const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const AuditLog = require("../models/AuditLog.model");

const getAuditLogs = asyncHandler(async (req, res) => {
  const {
    actor = "",
    action = "",
    target = "",
    outcome = "",
    from = "",
    to = "",
    page = "1",
    limit = "20",
  } = req.query;

  const currentPage = Math.max(1, Number.parseInt(page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 20));

  const filter = {};

  if (actor) {
    const actorText = String(actor).trim();

    if (mongoose.isValidObjectId(actorText)) {
      filter.$or = [
        { actorId: actorText },
        { actorLabel: { $regex: escapeRegex(actorText), $options: "i" } },
      ];
    } else {
      filter.actorLabel = {
        $regex: escapeRegex(actorText),
        $options: "i",
      };
    }
  }

  if (action) {
    filter.action = {
      $regex: escapeRegex(String(action).trim()),
      $options: "i",
    };
  }

  if (target) {
    const targetText = String(target).trim();

    filter.$and = [
      ...(filter.$and || []),
      {
        $or: [
          { targetType: { $regex: escapeRegex(targetText), $options: "i" } },
          { targetId: { $regex: escapeRegex(targetText), $options: "i" } },
        ],
      },
    ];
  }

  if (outcome && ["success", "failure", "denied"].includes(outcome)) {
    filter.outcome = outcome;
  }

  if (from || to) {
    filter.createdAt = {};

    if (from) {
      const start = new Date(`${from}T00:00:00.000Z`);
      if (Number.isNaN(start.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid from date.",
        });
      }
      filter.createdAt.$gte = start;
    }

    if (to) {
      const end = new Date(`${to}T23:59:59.999Z`);
      if (Number.isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid to date.",
        });
      }
      filter.createdAt.$lte = end;
    }

    if (
      filter.createdAt.$gte &&
      filter.createdAt.$lte &&
      filter.createdAt.$gte > filter.createdAt.$lte
    ) {
      return res.status(400).json({
        success: false,
        message: "'from' date must be before or equal to 'to' date.",
      });
    }
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .select(
        "actorId actorRole actorLabel action targetType targetId reason outcome requestId ipAddress userAgent metadata createdAt",
      )
      .sort({ createdAt: -1, _id: -1 })
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: logs,
    pagination: {
      page: currentPage,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
});

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = { getAuditLogs };

const User = require("../models/User.model");
const Doctor = require("../models/Doctor.model");
const Appointment = require("../models/Appointment.model");
const AuditLog = require("../models/AuditLog.model");

// Optional .env value, e.g. APP_TIMEZONE=Asia/Dhaka (defaults to UTC).
const TZ = process.env.APP_TIMEZONE || "UTC";
const TREND_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

// Date -> "YYYY-MM-DD" in the app time zone.
const dayKey = (d) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);

// GET /api/v1/admin-panel/dashboard   (admin only)
exports.getDashboard = async (req, res) => {
  try {
    const now = Date.now();
    const since = new Date(now - TREND_DAYS * DAY_MS);

    const [
      userAgg,
      pendingDoctors,
      statusAgg,
      todayAppointments,
      trendAgg,
      recentAppointments,
      recentAudit,
    ] = await Promise.all([
      User.aggregate([
        {
          $group: {
            _id: { role: "$role", suspended: { $eq: ["$isActive", false] } },
            count: { $sum: 1 },
          },
        },
      ]),
      Doctor.countDocuments({ verificationStatus: "Pending" }),
      Appointment.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Appointment.countDocuments({
        date: dayKey(new Date(now)),
        status: { $in: ["Pending", "Confirmed", "Completed"] },
      }),
      Appointment.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
                timezone: TZ,
              },
            },
            count: { $sum: 1 },
          },
        },
      ]),
      Appointment.find()
        .sort({ createdAt: -1 })
        .limit(6)
        .select("patientName doctorName specialty date time status createdAt")
        .lean(),
      AuditLog.find()
        .sort({ createdAt: -1 })
        .limit(8)
        .select("actor actorRole action targetType createdAt")
        .populate("actor", "name role")
        .lean(),
    ]);

    // ---- users ----
    const users = {
      patients: 0,
      doctors: 0,
      admins: 0,
      total: 0,
      active: 0,
      suspended: 0,
    };
    const roleKey = { patient: "patients", doctor: "doctors", admin: "admins" };
    for (const row of userAgg) {
      const { role, suspended } = row._id;
      if (roleKey[role]) users[roleKey[role]] += row.count;
      users.total += row.count;
      if (suspended) users.suspended += row.count;
      else users.active += row.count;
    }

    // ---- appointments ----
    const byStatus = { Pending: 0, Confirmed: 0, Completed: 0, Cancelled: 0 };
    let totalAppointments = 0;
    for (const row of statusAgg) {
      if (row._id in byStatus) byStatus[row._id] = row.count;
      totalAppointments += row.count;
    }

    // 30-day trend with empty days filled in
    const perDay = new Map(trendAgg.map((r) => [r._id, r.count]));
    const trend = [];
    for (let i = TREND_DAYS - 1; i >= 0; i--) {
      const key = dayKey(new Date(now - i * DAY_MS));
      trend.push({ date: key, count: perDay.get(key) || 0 });
    }

    return res.status(200).json({
      success: true,
      data: {
        generatedAt: new Date().toISOString(),
        users,
        doctors: { pendingVerification: pendingDoctors },
        appointments: {
          total: totalAppointments,
          today: todayAppointments,
          byStatus,
          trend,
          recent: recentAppointments,
        },
        audit: { recent: recentAudit },
      },
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load the dashboard.",
    });
  }
};

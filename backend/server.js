const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");

// Load environment variables first
dotenv.config();

// Database connection
const connectDB = require("./config/db");

// Import routes
const authRoutes = require("./routes/auth.routes");
const patientRoutes = require("./routes/patient.routes");
const doctorRoutes = require("./routes/doctor.routes");
const adminRoutes = require("./routes/admin.routes");
const aiRoutes = require("./routes/ai.routes");
const notificationRoutes = require("./routes/notification.routes");
const appointmentRoutes = require("./routes/appointment_routes");
const dashboardRoutes = require("./routes/Dashboard.routes");
const doctorPanelRoutes = require("./routes/doctorPanel.routes");

// Error handlers
const { errorHandler, notFound } = require("./middleware/error.middleware");

const app = express();

// --------------------------------------------------
// 1. Security middleware
// --------------------------------------------------
app.use(helmet());

// --------------------------------------------------
// 2. HTTP request logging
// --------------------------------------------------
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// --------------------------------------------------
// 3. Cookie parsing
// --------------------------------------------------
app.use(cookieParser());

// --------------------------------------------------
// 4. CORS configuration
// Supports local development and deployed frontend
// --------------------------------------------------

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://cse4104-7b-t01-ai-healthcare-and-sy.vercel.app",

  // Allow additional origins configured through environment variables.
  ...(process.env.CLIENT_URL || "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean),
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header,
      // such as server-to-server requests and Postman.
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.replace(/\/+$/, "");

      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      console.warn(`CORS blocked origin: ${origin}`);

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);

// --------------------------------------------------
// 5. Request body parsing
// --------------------------------------------------
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// --------------------------------------------------
// 6. Health check
// --------------------------------------------------
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "AI Healthcare API is running",
    version: "v1",
  });
});

// --------------------------------------------------
// 7. API routes
// --------------------------------------------------
app.use("/api/v1/auth", authRoutes);

app.use("/api/v1/patients", patientRoutes);

app.use("/api/v1/doctors", doctorRoutes);

app.use("/api/v1/appointments", appointmentRoutes);

app.use("/api/v1/admin", adminRoutes);

app.use("/api/v1/ai", aiRoutes);

app.use("/api/v1/notifications", notificationRoutes);

app.use("/api/v1/dashboard", dashboardRoutes);

app.use("/api/v1/doctor-panel", doctorPanelRoutes);

// --------------------------------------------------
// 8. 404 handler
// --------------------------------------------------
app.use(notFound);

// --------------------------------------------------
// 9. Centralized error handler
// Must remain last
// --------------------------------------------------
app.use(errorHandler);

// --------------------------------------------------
// 10. Start server after database connection
// --------------------------------------------------
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
      console.log("Allowed frontend origins:", allowedOrigins);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();

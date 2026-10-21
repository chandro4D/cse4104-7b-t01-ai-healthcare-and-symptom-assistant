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

// Security middleware
app.use(helmet());

// HTTP request logging
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// Cookie parsing
app.use(cookieParser());

// CORS configuration
const allowedOrigins = [process.env.CLIENT_URL || "http://localhost:5173"];

// Add additional frontend origins if needed.
// Example:
// allowedOrigins.push("https://your-frontend.vercel.app");

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header, such as server-to-server requests.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

// Request body parsing
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Health check
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "AI Healthcare API is running",
    version: "v1",
  });
});

// API routes
app.use("/api/v1/auth", authRoutes);

app.use("/api/v1/patients", patientRoutes);

app.use("/api/v1/doctors", doctorRoutes);

app.use("/api/v1/appointments", appointmentRoutes);

app.use("/api/v1/admin", adminRoutes);

app.use("/api/v1/ai", aiRoutes);

app.use("/api/v1/notifications", notificationRoutes);

app.use("/api/v1/dashboard", dashboardRoutes);

app.use("/api/v1/doctor-panel", doctorPanelRoutes);

// 404 handler must come after all routes
app.use(notFound);

// Centralized error handler must come last
app.use(errorHandler);

// Start server after database connection
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();

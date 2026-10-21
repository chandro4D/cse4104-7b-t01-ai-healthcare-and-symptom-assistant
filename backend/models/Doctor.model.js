const mongoose = require("mongoose");

const AVAILABILITY_VALUES = ["Available Today", "Available Tomorrow", "Busy"];

const STATUS_VALUES = ["Available", "Busy", "Offline"];

const SLOT_LENGTHS = [10, 15, 20, 30, 45, 60];

const weeklyDaySchema = new mongoose.Schema(
  {
    day: {
      type: Number,
      required: true,
      min: 0,
      max: 6,
    },
    enabled: {
      type: Boolean,
      default: false,
    },
    start: {
      type: String,
      default: "09:00",
    },
    end: {
      type: String,
      default: "17:00",
    },
  },
  { _id: false },
);

const doctorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    specialty: {
      type: String,
      required: true,
      trim: true,
    },

    experience: {
      type: Number,
      required: true,
      min: 0,
    },

    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    hospital: {
      type: String,
      required: true,
      trim: true,
      default: "Not set",
    },

    // Patient-facing availability label.
    availability: {
      type: String,
      enum: AVAILABILITY_VALUES,
      default: "Available Today",
      trim: true,
    },

    // Doctor's current operational status.
    status: {
      type: String,
      enum: STATUS_VALUES,
      default: "Available",
      trim: true,
    },

    image: {
      type: String,
      default: "",
    },

    bio: {
      type: String,
      default: "",
      maxlength: 1000,
    },

    consultationFee: {
      type: Number,
      default: 0,
      min: 0,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    verifiedAt: {
      type: Date,
      default: null,
    },

    rejectionReason: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },

    qualifications: {
      type: String,
      default: "",
      trim: true,
    },

    licenseNumber: {
      type: String,
      default: "",
      trim: true,
    },

    visitTypes: {
      type: [String],
      default: ["In-person"],
    },

    // Weekly booking schedule; never store this in availability.
    schedule: {
      slotMinutes: {
        type: Number,
        enum: SLOT_LENGTHS,
        default: 30,
      },
      weekly: {
        type: [weeklyDaySchema],
        default: () =>
          Array.from({ length: 7 }, (_, day) => ({
            day,
            enabled: day >= 1 && day <= 5,
            start: "09:00",
            end: "17:00",
          })),
      },
    },

    daysOff: {
      type: [String],
      default: [],
    },

    pendingChanges: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// A linked user can own only one doctor profile.
doctorSchema.index(
  { user: 1 },
  {
    unique: true,
    partialFilterExpression: {
      user: { $type: "objectId" },
    },
  },
);

module.exports = mongoose.model("Doctor", doctorSchema);
module.exports.AVAILABILITY_VALUES = AVAILABILITY_VALUES;
module.exports.STATUS_VALUES = STATUS_VALUES;
module.exports.SLOT_LENGTHS = SLOT_LENGTHS;

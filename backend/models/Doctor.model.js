const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema(
  {
    // User account linked to this doctor profile.
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
    },

    availability: {
      type: String,
      enum: ["Available Today", "Available Tomorrow", "Busy"],
      default: "Available Today",
    },

    image: {
      type: String,
      default: "",
    },

    bio: {
      type: String,
      default: "",
    },

    consultationFee: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Verification and access control.
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

    schedule: {
      slotMinutes: {
        type: Number,
        default: 30,
      },
      weekly: [
        {
          _id: false,
          day: {
            type: Number,
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
      ],
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

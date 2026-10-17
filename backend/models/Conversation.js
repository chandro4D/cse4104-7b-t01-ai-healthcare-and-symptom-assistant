const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["user", "ai"], required: true },
    text: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const conversationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, default: "New consultation" },
    messages: [messageSchema],
    analysis: {
      severity: {
        type: String,
        enum: ["Low", "Moderate", "High", "Urgent"],
        default: "Low",
      },
      conditions: [{ name: String, note: String, match: Number }],
      departments: [{ name: String, match: Number }],
    },
  },
  { timestamps: true },
);

conversationSchema.index({ user: 1, updatedAt: -1 });

module.exports = mongoose.model("Conversation", conversationSchema);

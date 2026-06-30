const asyncHandler = require("express-async-handler");
const AIChat = require("../models/AIChat.model");
const { v4: uuidv4 } = require("uuid");

// NOTE: Install uuid: npm install uuid
// For actual AI calls, you'll add OpenAI/Gemini API keys in .env later.
// This is the structure — AI integration comes in the next phase.

// ─── @desc    AI Symptom Checker
// ─── @route   POST /api/v1/ai/symptom-check
// ─── @access  Patient
const symptomCheck = asyncHandler(async (req, res) => {
  const { symptoms } = req.body;

  if (!symptoms || symptoms.length === 0) {
    res.status(400);
    throw new Error("Please provide symptoms for analysis.");
  }

  // TODO: Connect to OpenAI/Gemini API in AI integration phase
  // Placeholder response structure
  const result = {
    symptoms,
    possibleConditions: ["Placeholder - AI integration coming soon"],
    severity: "Medium",
    recommendedDepartment: "General Medicine",
    advice: "Please consult a doctor for proper diagnosis.",
    disclaimer:
      "This is AI-generated preliminary information only. Always consult a qualified doctor.",
  };

  res.status(200).json({
    success: true,
    message: "Symptom analysis complete.",
    data: result,
  });
});

// ─── @desc    AI Healthcare Chatbot
// ─── @route   POST /api/v1/ai/chat
// ─── @access  Private
const chatWithAI = asyncHandler(async (req, res) => {
  const { message, sessionId } = req.body;

  if (!message) {
    res.status(400);
    throw new Error("Message is required.");
  }

  const currentSessionId = sessionId || uuidv4();

  // TODO: Connect to OpenAI/Gemini API
  const aiResponse =
    "AI chatbot integration coming in the next phase. Please connect OpenAI API.";

  // Save to database
  let chatSession = await AIChat.findOne({
    userId: req.user._id,
    sessionId: currentSessionId,
  });

  if (chatSession) {
    chatSession.messages.push(
      { role: "user", content: message },
      { role: "assistant", content: aiResponse },
    );
    await chatSession.save();
  } else {
    chatSession = await AIChat.create({
      userId: req.user._id,
      sessionId: currentSessionId,
      messages: [
        { role: "user", content: message },
        { role: "assistant", content: aiResponse },
      ],
    });
  }

  res.status(200).json({
    success: true,
    data: {
      sessionId: currentSessionId,
      response: aiResponse,
    },
  });
});

module.exports = { symptomCheck, chatWithAI };

const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const { GoogleGenAI } = require("@google/genai");
const { v4: uuidv4 } = require("uuid");

const AIChat = require("../models/AIChat.model");
const Conversation = require("../models/Conversation");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const MODEL = "gemini-3.5-flash-lite";
const MAX_MESSAGE_LENGTH = 2000; // characters per user message
const MAX_MESSAGES_PER_CONVERSATION = 200;
const HISTORY_WINDOW = 20; // how many recent messages are sent to the AI

const NON_HEALTH_REPLY =
  "I am a healthcare symptom assistant and can only help with health-related questions, symptoms, medications, and doctor recommendations.";

// -----------------------------------------------------------------------------
// Health-related keyword validation
// -----------------------------------------------------------------------------
const healthKeywords = [
  // General symptoms
  "fever",
  "high fever",
  "low fever",
  "temperature",
  "chills",
  "shivering",
  "fatigue",
  "tired",
  "weakness",
  "exhaustion",
  "malaise",

  // Pain
  "pain",
  "ache",
  "headache",
  "migraine",
  "neck pain",
  "back pain",
  "shoulder pain",
  "arm pain",
  "leg pain",
  "knee pain",
  "joint pain",
  "muscle pain",
  "body pain",
  "chest pain",
  "abdominal pain",
  "stomach pain",
  "pelvic pain",
  "toothache",
  "ear pain",

  // Neurological
  "dizzy",
  "dizziness",
  "vertigo",
  "fainting",
  "fainted",
  "blackout",
  "numbness",
  "tingling",
  "seizure",
  "convulsion",
  "tremor",
  "shaking",
  "confusion",
  "memory loss",
  "difficulty speaking",
  "slurred speech",
  "blurred vision",
  "double vision",
  "vision loss",

  // Respiratory
  "cough",
  "dry cough",
  "wet cough",
  "breathing",
  "shortness of breath",
  "difficulty breathing",
  "wheezing",
  "asthma",
  "congestion",
  "runny nose",
  "stuffy nose",
  "sore throat",
  "throat pain",
  "sneezing",
  "sinus",
  "sinus pain",
  "phlegm",
  "mucus",

  // Gastrointestinal
  "nausea",
  "vomiting",
  "diarrhea",
  "constipation",
  "bloating",
  "indigestion",
  "heartburn",
  "acid reflux",
  "gas",
  "loss of appetite",
  "abdominal swelling",
  "blood in stool",
  "black stool",

  // Cardiovascular
  "chest",
  "heart",
  "palpitations",
  "rapid heartbeat",
  "slow heartbeat",
  "irregular heartbeat",
  "high blood pressure",
  "low blood pressure",
  "hypertension",
  "hypotension",
  "swelling",
  "leg swelling",
  "ankle swelling",
  "faint",
  "collapse",

  // Skin
  "skin",
  "rash",
  "itching",
  "itchy",
  "hives",
  "eczema",
  "psoriasis",
  "acne",
  "blisters",
  "ulcer",
  "wound",
  "cut",
  "burn",
  "bruise",
  "redness",
  "infection",
  "pus",
  "skin discoloration",

  // Urinary
  "urination",
  "frequent urination",
  "burning urination",
  "painful urination",
  "blood in urine",
  "urinary tract infection",
  "uti",
  "kidney pain",

  // Endocrine / metabolic
  "diabetes",
  "high sugar",
  "low sugar",
  "thyroid",
  "weight loss",
  "weight gain",
  "excessive thirst",
  "frequent hunger",
  "night sweats",

  // Infectious diseases
  "flu",
  "cold",
  "covid",
  "covid-19",
  "dengue",
  "malaria",
  "typhoid",
  "hepatitis",
  "tuberculosis",
  "tb",
  "viral infection",
  "bacterial infection",
  "fungal infection",

  // Women’s health
  "pregnancy",
  "pregnant",
  "missed period",
  "irregular period",
  "heavy bleeding",
  "vaginal bleeding",
  "vaginal discharge",
  "menstrual pain",
  "pcos",
  "ovarian pain",

  // Men’s health
  "testicular pain",
  "prostate",
  "erectile dysfunction",

  // Mental / psychological
  "anxiety",
  "anxious",
  "panic attack",
  "panic",
  "depression",
  "depressed",
  "stress",
  "stressed",
  "insomnia",
  "can't sleep",
  "sleep problem",
  "nightmare",
  "mood swings",
  "irritable",
  "hopeless",
  "worthless",
  "crying",
  "overthinking",
  "fear",
  "phobia",
  "ocd",
  "ptsd",
  "bipolar",
  "hallucination",
  "hearing voices",
  "paranoia",
  "suicidal",
  "self-harm",

  // Allergies
  "allergy",
  "allergic reaction",
  "swollen lips",
  "swollen tongue",
  "anaphylaxis",

  // Injury / emergency
  "fracture",
  "broken bone",
  "sprain",
  "strain",
  "dislocation",
  "head injury",
  "trauma",
  "accident",
  "bleeding",
  "severe bleeding",

  // Medical care
  "medicine",
  "medication",
  "tablet",
  "capsule",
  "antibiotic",
  "doctor",
  "hospital",
  "clinic",
  "appointment",
  "symptom",
  "diagnosis",
  "treatment",
  "prescription",
];

const isHealthRelated = (text) => {
  const lower = text.toLowerCase();

  if (healthKeywords.some((k) => lower.includes(k))) {
    return true;
  }

  return lower.split(/\s+/).length >= 3;
};

// -----------------------------------------------------------------------------
// AI system prompts
// -----------------------------------------------------------------------------
const SYSTEM_PROMPT = `
You are a professional healthcare symptom triage assistant.

Your responsibilities:

* Understand the user's symptoms.
* Ask follow-up questions when necessary.
* Recommend the most appropriate medical department.
* Assess urgency (Low, Moderate, High, Emergency).
* Provide safe home-care advice.
* Mention emergency warning signs.
* Never provide a confirmed diagnosis.
* Keep responses concise and medically responsible.
*If the symptoms suggest chest pain, difficulty breathing, stroke symptoms, severe bleeding, unconsciousness, or suicidal thoughts, classify urgency as Emergency and advise immediate emergency medical care.

Structure every response using these headings:

Assessment:
Recommended department:
Urgency:
Home care:
Emergency warning signs:

End every response with this disclaimer:
"This is preliminary AI-generated health information and is not a substitute for a licensed medical professional."
`;

// Used only by /symptom-check. Same rules as above, but the answer must be JSON
// so the page can show severity, possible conditions and departments.
const SYMPTOM_CHECK_PROMPT = `${SYSTEM_PROMPT}

OUTPUT FORMAT (strict):
Return ONLY one valid JSON object. No markdown fences and no text outside the JSON.
It must have exactly these keys:
{
  "reply": string,
  "severity": "Low" | "Moderate" | "High" | "Urgent",
  "conditions": [ { "name": string, "note": string, "match": number } ],
  "departments": [ { "name": string, "match": number } ]
}

Rules:
- "reply" is the full answer written for the patient, using the headings above (Assessment, Recommended department, Urgency, Home care, Emergency warning signs) and ending with the required disclaimer.
- "severity" must agree with the Urgency heading inside "reply". Use "Urgent" whenever you would say Emergency.
- "conditions": at most 3 possible conditions, most likely first. "note" is one short sentence. These are possibilities, not diagnoses.
- "departments": at most 2 departments, best match first.
- "match" is an integer from 0 to 100 showing how well the symptoms fit.
- Always give your best current estimate for severity, conditions and departments, even if your reply also asks a follow-up question.
`;

// -----------------------------------------------------------------------------
// Helpers for the structured symptom-check response
// -----------------------------------------------------------------------------
const SEVERITIES = ["Low", "Moderate", "High", "Urgent"];

const normalizeSeverity = (value) => {
  const v = String(value || "")
    .trim()
    .toLowerCase();
  if (v === "emergency" || v === "urgent" || v === "critical") return "Urgent";
  return SEVERITIES.find((s) => s.toLowerCase() === v) || null;
};

// If the model forgets the "severity" field, read it from the "Urgency:" heading.
// When nothing can be read, fall back to Moderate (safer than Low).
const severityFromText = (text) => {
  const match = String(text || "").match(
    /urgency\**:?\**\s*(low|moderate|high|emergency|urgent)/i,
  );
  return (match && normalizeSeverity(match[1])) || "Moderate";
};

const cleanText = (value, max) =>
  String(value ?? "")
    .trim()
    .slice(0, max);

const toPercent = (value) => {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
};

const parseSymptomResponse = (raw) => {
  const text = String(raw || "").trim();

  try {
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");
    const data = JSON.parse(cleaned);

    const reply = cleanText(data.reply, 8000);
    if (!reply) throw new Error("Empty reply");

    return {
      reply,
      analysis: {
        severity: normalizeSeverity(data.severity) || severityFromText(reply),
        conditions: (Array.isArray(data.conditions) ? data.conditions : [])
          .slice(0, 3)
          .map((c) => ({
            name: cleanText(c?.name, 80),
            note: cleanText(c?.note, 160),
            match: toPercent(c?.match),
          }))
          .filter((c) => c.name),
        departments: (Array.isArray(data.departments) ? data.departments : [])
          .slice(0, 2)
          .map((d) => ({
            name: cleanText(d?.name, 80),
            match: toPercent(d?.match),
          }))
          .filter((d) => d.name),
      },
    };
  } catch {
    // Model did not return valid JSON: keep its text, still show a severity.
    return {
      reply: text || "Sorry, I could not prepare an answer. Please try again.",
      analysis: {
        severity: severityFromText(text),
        conditions: [],
        departments: [],
      },
    };
  }
};

const buildGeminiContents = (messages) => {
  const recent = messages
    .slice(-HISTORY_WINDOW)
    .map((m) => ({ role: m.role === "ai" ? "model" : "user", text: m.text }));

  // Gemini expects the conversation to start with a user turn.
  while (recent.length && recent[0].role !== "user") recent.shift();

  return recent.map((m) => ({ role: m.role, parts: [{ text: m.text }] }));
};

// -----------------------------------------------------------------------------
// AI healthcare chatbot (unchanged)
// POST /api/v1/ai/chat
// -----------------------------------------------------------------------------
const chatWithAI = asyncHandler(async (req, res) => {
  const { message, sessionId } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({
      success: false,
      response: "Please enter a message.",
    });
  }

  // Reject non-health questions
  if (!isHealthRelated(message)) {
    return res.status(200).json({
      success: true,
      isHealthQuery: false,
      response: NON_HEALTH_REPLY,
    });
  }

  const currentSessionId = sessionId || uuidv4();

  // Get previous conversation
  let chatSession = await AIChat.findOne({
    userId: req.user._id,
    sessionId: currentSessionId,
  });

  const contents = [];

  if (chatSession) {
    chatSession.messages.forEach((msg) => {
      contents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      });
    });
  }

  contents.push({
    role: "user",
    parts: [{ text: message }],
  });

  let aiResponse = "";

  try {
    const result = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.2,
      },
    });

    aiResponse = result.text;
  } catch (error) {
    console.error("Gemini API error:", error.message);

    return res.status(500).json({
      success: false,
      response:
        "The AI service is temporarily unavailable. Please try again later.",
    });
  }

  // Save conversation
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
    sessionId: currentSessionId,
    response: aiResponse,
  });
});

// -----------------------------------------------------------------------------
// Symptom checker with saved history
// POST /api/v1/ai/symptom-check
// body: { conversationId?: string, message: string }
// -----------------------------------------------------------------------------
const symptomCheck = asyncHandler(async (req, res) => {
  const { conversationId, message } = req.body;
  const text = typeof message === "string" ? message.trim() : "";

  if (!text) {
    return res
      .status(400)
      .json({ success: false, message: "Please enter a message." });
  }

  if (text.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({
      success: false,
      message: `Message is too long (maximum ${MAX_MESSAGE_LENGTH} characters).`,
    });
  }

  // Reject non-health questions (nothing is saved for these)
  if (!isHealthRelated(text)) {
    return res.status(200).json({
      success: true,
      isHealthQuery: false,
      conversationId: conversationId || null,
      reply: NON_HEALTH_REPLY,
      analysis: null,
    });
  }

  // Load this user's conversation, or start a new one
  let convo;

  if (conversationId) {
    if (!mongoose.isValidObjectId(conversationId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid conversation id." });
    }

    convo = await Conversation.findOne({
      _id: conversationId,
      user: req.user._id,
    });

    if (!convo) {
      return res
        .status(404)
        .json({ success: false, message: "Conversation not found." });
    }

    if (convo.messages.length >= MAX_MESSAGES_PER_CONVERSATION) {
      return res.status(400).json({
        success: false,
        message: "This consultation is full. Please start a new consultation.",
      });
    }
  } else {
    convo = new Conversation({
      user: req.user._id,
      title: text.slice(0, 50),
    });
  }

  convo.messages.push({ role: "user", text });

  // Ask Gemini (history comes from the database, not from the browser)
  let parsed;

  try {
    const result = await ai.models.generateContent({
      model: MODEL,
      contents: buildGeminiContents(convo.messages),
      config: {
        systemInstruction: SYMPTOM_CHECK_PROMPT,
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    });

    parsed = parseSymptomResponse(result.text);
  } catch (error) {
    // Nothing has been saved yet, so a failed AI call leaves no half-saved chat.
    console.error("Gemini symptom-check error:", error.message);

    return res.status(503).json({
      success: false,
      message:
        "The symptom assistant is temporarily unavailable. Please try again in a moment.",
    });
  }

  convo.messages.push({ role: "ai", text: parsed.reply });
  convo.analysis = parsed.analysis;
  await convo.save();

  res.status(200).json({
    success: true,
    isHealthQuery: true,
    conversationId: convo._id,
    title: convo.title,
    reply: parsed.reply,
    analysis: convo.analysis,
    updatedAt: convo.updatedAt,
  });
});

// -----------------------------------------------------------------------------
// GET /api/v1/ai/conversations   (current user's history, newest first)
// -----------------------------------------------------------------------------
const listConversations = asyncHandler(async (req, res) => {
  const conversations = await Conversation.find({ user: req.user._id })
    .select("title updatedAt analysis.severity")
    .sort({ updatedAt: -1 })
    .limit(50)
    .lean();

  res.status(200).json({ success: true, conversations });
});

// -----------------------------------------------------------------------------
// GET /api/v1/ai/conversations/:id   (one full conversation, owner only)
// -----------------------------------------------------------------------------
const getConversation = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid conversation id." });
  }

  const conversation = await Conversation.findOne({
    _id: req.params.id,
    user: req.user._id,
  }).lean();

  if (!conversation) {
    return res
      .status(404)
      .json({ success: false, message: "Conversation not found." });
  }

  res.status(200).json({ success: true, conversation });
});

// -----------------------------------------------------------------------------
// DELETE /api/v1/ai/conversations/:id   (owner only)
// -----------------------------------------------------------------------------
const deleteConversation = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid conversation id." });
  }

  const result = await Conversation.deleteOne({
    _id: req.params.id,
    user: req.user._id,
  });

  if (result.deletedCount === 0) {
    return res
      .status(404)
      .json({ success: false, message: "Conversation not found." });
  }

  res.status(200).json({ success: true });
});

module.exports = {
  chatWithAI,
  symptomCheck,
  listConversations,
  getConversation,
  deleteConversation,
};

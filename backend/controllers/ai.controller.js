const asyncHandler = require("express-async-handler");
const AIChat = require("../models/AIChat.model");
const { GoogleGenAI } = require("@google/genai");
const { v4: uuidv4 } = require("uuid");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

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
// AI system prompt
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

// -----------------------------------------------------------------------------
// AI healthcare chatbot
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
      response:
        "I am a healthcare symptom assistant and can only help with health-related questions, symptoms, medications, and doctor recommendations.",
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
      model: "gemini-3.5-flash-lite",
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.2,
      },
    });

    aiResponse = result.text;
  } catch (error) {
    console.error("Gemini API error:", error);

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
// Optional symptom checker endpoint
// POST /api/v1/ai/symptom-check
// -----------------------------------------------------------------------------
const symptomCheck = asyncHandler(async (req, res) => {
  try {
    console.log("Request body:", req.body);

    const { symptoms } = req.body;

    const contents = symptoms.map((m) => ({
      role: m.role === "ai" ? "model" : "user",
      parts: [{ text: m.text }],
    }));

    console.log("Contents:", contents);

    const result = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.2,
      },
    });

    console.log("Gemini result:", result);

    return res.json({
      success: true,
      reply: result.text,
    });
  } catch (error) {
    console.error("FULL GEMINI ERROR:", error);
    return res.status(500).json({
      success: false,
      response: error.message,
    });
  }
});
module.exports = {
  chatWithAI,
  symptomCheck,
};

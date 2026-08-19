const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const systemPrompt = `
You are a healthcare symptom triage assistant.

Rules:
- Do not provide a confirmed diagnosis.
- Recommend the most appropriate medical department.
- Assess urgency: Low, Moderate, High, or Emergency.
- Provide brief home care advice.
- Mention emergency warning signs.
- Do not answer non-health-related questions.
- Return ONLY valid JSON.
-If symptoms suggest emergency, clearly instruct immediate emergency medical care.
-Never discourage seeking medical attention.
-If uncertain, recommend professional evaluation.
-If the user asks about programming, politics, finance, or general knowledge, politely refuse and redirect to health-related questions

Response format:
{
  "reply": "...",
  "severity": "Low",
  "conditions": [
    { "name": "Migraine", "match": 70 },
    { "name": "Tension headache", "match": 40 }
  ],
  "departments": [
    { "name": "General Medicine", "match": 85 }
  ]
}
`;

async function generateSymptomResponse(messages) {
  try {
    const contents = messages.map((m) => ({
      role: m.role === "ai" ? "model" : "user",
      parts: [{ text: m.text }],
    }));

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.2,
      },
    });

    return response.text;
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error("Unable to generate symptom analysis");
  }
}

module.exports = { generateSymptomResponse };

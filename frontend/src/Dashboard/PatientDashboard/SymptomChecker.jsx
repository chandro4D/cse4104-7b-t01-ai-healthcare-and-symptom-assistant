import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Send, Bell, ShieldAlert, Sparkles } from "lucide-react";
import axios from "axios";
import MedicalResponse from "./MedicalResponse";

// Demo Initial Messages
// const INITIAL_MESSAGES = [
//   {
//     role: "ai",
//     text: "Hello Rafiul. I can help you understand possible causes for your symptoms and suggest which department to consult. What are you experiencing today?",
//   },
//   {
//     role: "user",
//     text: "I've had a persistent headache for 3 days, mostly on the right side, and I feel a bit dizzy when I stand up quickly.",
//   },
//   {
//     role: "ai",
//     text: "Thanks for the detail. A few quick questions to refine this:",
//     chips: ["Fever present", "No fever", "Worse with light", "Blurred vision"],
//   },
//   {
//     role: "user",
//     text: "No fever, but it does feel worse in bright light.",
//   },
//   {
//     role: "ai",
//     text: "Based on the pattern — one-sided headache, light sensitivity, and dizziness on standing — this is consistent with a tension or migraine-type headache, possibly linked to mild dehydration or blood pressure changes. I've updated the analysis panel on the right. I'd recommend a General Medicine consultation if symptoms persist beyond 2 more days.",
//   },
// ];

const INITIAL_MESSAGES = [
  {
    role: "ai",
    text: "Hello! I’m your AI healthcare symptom assistant. Please describe your symptoms, how long you’ve had them, your age, and any fever or medical conditions.",
  },
];

const CONDITIONS = [
  {
    name: "Tension Headache",
    note: "Common, often stress or posture related",
    match: 68,
  },
  {
    name: "Migraine (without aura)",
    note: "Light sensitivity is a key indicator",
    match: 54,
  },
  {
    name: "Mild Orthostatic Hypotension",
    note: "Linked to dizziness on standing",
    match: 31,
  },
];

const DEPARTMENTS = [
  { name: "General Medicine", match: 87 },
  { name: "Neurology", match: 41 },
];

function severityColor(level) {
  if (level === "Low") return "text-emerald-600";
  if (level === "Moderate") return "text-amber-600";
  if (level === "High") return "text-orange-600";
  return "text-rose-600";
}

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
export default function SymptomChecker() {
  const [symptoms, setsymptoms] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);

  // const isHealthRelated = (text) => {
  //   return healthKeywords.some((keyword) =>
  //     text.toLowerCase().includes(keyword.toLowerCase()),
  //   );
  // };
  const isHealthRelated = (text) => {
    const lower = text.toLowerCase();

    if (healthKeywords.some((k) => lower.includes(k))) return true;

    // Minimum symptom-like sentence
    return lower.split(" ").length >= 3;
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [symptoms, isTyping]);

  const send = async (text) => {
    const trimmed = (text ?? input).trim();
    if (!trimmed) return;

    // Frontend validation
    if (!isHealthRelated(trimmed)) {
      setsymptoms((s) => [
        ...s,
        { role: "user", text: trimmed },
        {
          role: "ai",
          text: "I am a healthcare symptom assistant and can only help with health-related questions...",
        },
      ]);
      setInput("");
      return;
    }

    // Add user message immediately
    const updatedMessages = [...symptoms, { role: "user", text: trimmed }];

    setsymptoms(updatedMessages);
    setInput("");
    setIsTyping(true);

    try {
      const token = localStorage.getItem("token");

      const res = await axios.post(
        "http://localhost:5000/api/v1/ai/symptom-check",
        {
          symptoms: updatedMessages,
        },
        {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setsymptoms((s) => [
        ...s,
        {
          role: "ai",
          text: res.data.reply,
        },
      ]);
    } catch (error) {
      setsymptoms((s) => [
        ...s,
        {
          role: "ai",
          text: "Sorry, the symptom assistant is temporarily unavailable. Please try again in a moment.",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex h-full min-h-screen w-full bg-[#F5F2EA] font-sans text-stone-800">
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-stone-200 bg-white px-8 py-4">
          <div>
            <p className="text-xs font-semibold tracking-widest text-emerald-700">
              AI MODULE
            </p>
            <h1 className="text-xl font-bold text-stone-900">
              Symptom Checker
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-500">
              <ShieldAlert className="h-3.5 w-3.5" />
              NOT A DIAGNOSIS
            </span>
            <button className="grid h-9 w-9 place-items-center rounded-full border border-stone-200 text-stone-500 hover:bg-stone-50">
              <Bell className="h-4 w-4" />
            </button>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-emerald-700 text-sm font-semibold text-white">
              RI
            </div>
          </div>
        </header>

        {/* Body */}
        <div className="flex flex-1 gap-6 overflow-hidden p-6">
          {/* Chat panel */}
          <div className="flex h-[540px] flex-col rounded-2xl border border-stone-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-stone-100 px-6 py-4">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-emerald-700 text-white">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-stone-900">
                  Symptom Assistant
                </p>
                <p className="text-xs text-stone-400">
                  Powered by OpenAI · Trained on triage guidelines
                </p>
              </div>
            </div>

            <div
              ref={scrollRef}
              className="flex-1 space-y-4 overflow-y-auto px-6 py-2"
            >
              {symptoms.map((m, i) => (
                <ChatBubble key={i} msg={m} onChip={send} />
              ))}
              <AnimatePresence>{isTyping && <TypingBubble />}</AnimatePresence>
            </div>

            <div className="flex items-center gap-3 border-t border-stone-100 px-6 py-2">
              <button className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-stone-200 text-stone-500 hover:bg-stone-50">
                <Mic className="h-4 w-4" />
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Describe how you're feeling..."
                className="flex-1 rounded-full border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
              <button
                disabled={isTyping}
                onClick={() => send()}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-700 text-white transition hover:bg-emerald-800 active:scale-95"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Right analysis panel */}
          <div className="flex w-80 shrink-0 flex-col gap-5 overflow-y-auto">
            <SeverityCard level="Moderate" />
            <ConditionsCard />
            <DepartmentsCard />
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatBubble({ msg, onChip }) {
  const isAI = msg.role === "ai";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`flex items-start gap-3 ${isAI ? "" : "flex-row-reverse"}`}
    >
      <div
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold ${
          isAI ? "bg-emerald-700 text-white" : "bg-stone-200 text-stone-600"
        }`}
      >
        {isAI ? "AI" : "RI"}
      </div>
      <div className={`max-w-[80%] ${isAI ? "" : "flex flex-col items-end"}`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isAI ? "bg-stone-50 text-stone-700" : "bg-emerald-700 text-white"
          }`}
        >
          {isAI ? (
            /Assessment:|Recommended department:|Urgency:/i.test(
              msg.text.replace(/\*\*/g, ""),
            ) ? (
              <MedicalResponse text={msg.text} />
            ) : (
              msg.text
            )
          ) : (
            msg.text
          )}
        </div>
        {msg.chips && (
          <div className="mt-2 flex flex-wrap gap-2">
            {msg.chips.map((chip) => (
              <button
                key={chip}
                onClick={() => onChip(chip)}
                className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:border-emerald-600 hover:text-emerald-700"
              >
                {chip}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function TypingBubble() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex items-start gap-3"
    >
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-700 text-xs font-semibold text-white">
        AI
      </div>
      <div className="flex items-center gap-1 rounded-2xl bg-stone-50 px-4 py-3">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-stone-400"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </motion.div>
  );
}

function SeverityCard({ level }) {
  const position = { Low: "12%", Moderate: "45%", High: "70%", Urgent: "92%" }[
    level
  ];
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-bold text-stone-900">
        Severity Assessment
      </h3>
      <div className="relative mb-2 h-2 w-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500">
        <motion.div
          initial={{ left: "0%" }}
          animate={{ left: position }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute -top-1 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-white bg-stone-900 shadow"
        />
      </div>
      <div className="mb-3 flex justify-between text-[10px] font-medium uppercase tracking-wide text-stone-400">
        <span>Low</span>
        <span>Moderate</span>
        <span>High</span>
        <span>Urgent</span>
      </div>
      <p className="text-sm leading-relaxed text-stone-500">
        Current assessment:{" "}
        <span className={`font-semibold ${severityColor(level)}`}>{level}</span>{" "}
        — monitor for 48 hours. Seek urgent care if vision loss, slurred speech,
        or numbness occurs.
      </p>
    </div>
  );
}

function ConditionsCard() {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-bold text-stone-900">
        Possible Conditions
      </h3>
      <div className="space-y-4">
        {CONDITIONS.map((c, i) => (
          <div key={c.name}>
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-sm font-semibold text-stone-800">
                {c.name}
              </span>
              <span className="text-xs font-semibold text-emerald-700">
                {c.match}%
              </span>
            </div>
            <p className="mb-1.5 text-xs text-stone-400">{c.note}</p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${c.match}%` }}
                transition={{ duration: 0.9, delay: 0.15 * i, ease: "easeOut" }}
                className="h-full rounded-full bg-emerald-600"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DepartmentsCard() {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-bold text-stone-900">
        Recommended Departments
      </h3>
      <div className="space-y-3">
        {DEPARTMENTS.map((d) => (
          <div key={d.name} className="flex items-center justify-between">
            <span className="text-sm text-stone-700">{d.name}</span>
            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
              {d.match}% match
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

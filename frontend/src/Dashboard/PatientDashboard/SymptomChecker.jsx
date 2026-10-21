import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  Send,
  Bell,
  ShieldAlert,
  Sparkles,
  Plus,
  Trash2,
  MessageCircle,
  Activity,
  History,
} from "lucide-react";
import axios from "axios";
import MedicalResponse from "./MedicalResponse";

// Set VITE_API_URL in your .env for production, e.g. https://api.yoursite.com
const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/v1/ai`;

const INITIAL_MESSAGES = [
  {
    role: "ai",
    text: "Hello! I’m your AI healthcare symptom assistant. Please describe your symptoms, how long you’ve had them, your age, and any fever or medical conditions.",
  },
];

const SEVERITY_POSITION = {
  Low: "12%",
  Moderate: "45%",
  High: "70%",
  Urgent: "92%",
};

const SEVERITY_ADVICE = {
  Low: "Self-care is usually enough. See a doctor if symptoms last or get worse.",
  Moderate: "Consider seeing a doctor within a day or two.",
  High: "Please seek medical care soon, ideally today.",
};

// Panel height: fills the screen under the page header.
// Below xl the three panels are shown one at a time (see the tab bar),
// from xl up all three sit side by side exactly as before.
const PANEL_HEIGHT =
  "h-[calc(100dvh-14rem)] lg:h-[calc(100dvh-12rem)] xl:h-[calc(100vh-9rem)] min-h-[420px] xl:min-h-[480px]";

const PANELS = [
  { key: "chat", label: "Chat", Icon: MessageCircle },
  { key: "analysis", label: "Assessment", Icon: Activity },
  { key: "history", label: "History", Icon: History },
];

function severityColor(level) {
  if (level === "Low") return "text-emerald-600";
  if (level === "Moderate") return "text-amber-600";
  if (level === "High") return "text-orange-600";
  return "text-rose-600";
}

function severityDot(level) {
  if (level === "Low") return "bg-emerald-500";
  if (level === "Moderate") return "bg-amber-400";
  if (level === "High") return "bg-orange-500";
  if (level === "Urgent") return "bg-rose-500";
  return "bg-stone-300";
}

// Reads the logged-in user's name from localStorage ("user").
// If you keep the user in a context or Redux store, change this one function.
function getInitials() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const name = user.name || user.fullName || user.username || "";
    const letters = name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase();
    return letters || "U";
  } catch {
    return "U";
  }
}

const authConfig = () => ({
  withCredentials: true,
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

function errorText(err, fallback) {
  if (err?.response?.status === 401) {
    return "Your session has expired. Please log in again.";
  }
  return err?.response?.data?.message || fallback;
}

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SymptomChecker() {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState("");
  const [panel, setPanel] = useState("chat"); // used below xl only
  const scrollRef = useRef(null);

  const initials = getInitials();

  // Auto-scroll to the newest message
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isTyping, panel]);

  // Load this user's consultation history
  const loadConversations = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/conversations`, authConfig());
      setConversations(data.conversations || []);
    } catch (err) {
      setError(errorText(err, "Could not load your consultation history."));
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const newChat = () => {
    if (isTyping) return;
    setActiveId(null);
    setMessages(INITIAL_MESSAGES);
    setAnalysis(null);
    setInput("");
    setError("");
    setPanel("chat");
  };

  const openConversation = async (id) => {
    if (isTyping || chatLoading || id === activeId) {
      // Already open: just take the person back to the chat on small screens.
      if (id === activeId) setPanel("chat");
      return;
    }

    setChatLoading(true);
    setError("");
    setPanel("chat");

    try {
      const { data } = await axios.get(
        `${API}/conversations/${id}`,
        authConfig(),
      );
      const convo = data.conversation;

      setActiveId(convo._id);
      setMessages([...INITIAL_MESSAGES, ...convo.messages]);
      setAnalysis(convo.analysis || null);
    } catch (err) {
      setError(errorText(err, "Could not open this consultation."));
    } finally {
      setChatLoading(false);
    }
  };

  const deleteConversation = async (e, id) => {
    e.stopPropagation();
    if (isTyping) return;
    if (!window.confirm("Delete this consultation? This cannot be undone.")) {
      return;
    }

    try {
      await axios.delete(`${API}/conversations/${id}`, authConfig());
      setConversations((list) => list.filter((c) => c._id !== id));
      if (id === activeId) newChat();
    } catch (err) {
      setError(errorText(err, "Could not delete this consultation."));
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || isTyping || chatLoading) return;

    // Show the user's message immediately
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setError("");
    setIsTyping(true);

    try {
      const { data } = await axios.post(
        `${API}/symptom-check`,
        { conversationId: activeId, message: text },
        authConfig(),
      );

      if (data.conversationId) setActiveId(data.conversationId);
      setMessages((m) => [...m, { role: "ai", text: data.reply }]);
      if (data.analysis) setAnalysis(data.analysis);

      // Refresh the sidebar (new title / new order) for saved health chats
      if (data.isHealthQuery !== false) loadConversations();
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: "ai",
          text: errorText(
            err,
            "Sorry, the symptom assistant is temporarily unavailable. Please try again in a moment.",
          ),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex h-full min-h-screen w-full bg-[#F5F2EA] font-sans text-stone-800">
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex items-center justify-between gap-3 border-b border-stone-200 bg-white px-4 py-3 sm:px-6 sm:py-4 xl:px-8">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-widest text-emerald-700">
              AI MODULE
            </p>
            <h1 className="truncate text-lg font-bold text-stone-900 sm:text-xl">
              Symptom Checker
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <span className="flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-1.5 text-[10px] font-medium text-stone-500 sm:px-3 sm:text-xs">
              <ShieldAlert className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">NOT A DIAGNOSIS</span>
              <span className="sm:hidden">NOT A DIAGNOSIS</span>
            </span>
            <button
              aria-label="Notifications"
              className="grid h-9 w-9 place-items-center rounded-full border border-stone-200 text-stone-500 hover:bg-stone-50"
            >
              <Bell className="h-4 w-4" />
            </button>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-emerald-700 text-sm font-semibold text-white">
              {initials}
            </div>
          </div>
        </header>

        {/* Panel switcher (below xl only) */}
        <div className="px-3 pt-3 sm:px-4 xl:hidden">
          <div
            role="tablist"
            aria-label="Symptom checker sections"
            className="grid grid-cols-3 gap-1 rounded-full border border-stone-200 bg-white p-1 shadow-sm"
          >
            {PANELS.map(({ key, label, Icon }) => (
              <button
                key={key}
                role="tab"
                aria-selected={panel === key}
                onClick={() => setPanel(key)}
                className={`relative flex items-center justify-center gap-1.5 rounded-full px-2 py-2 text-xs font-semibold transition sm:text-sm ${
                  panel === key
                    ? "bg-emerald-700 text-white"
                    : "text-stone-500 hover:bg-stone-50"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                {key === "analysis" && analysis?.severity && (
                  <span
                    className={`h-2 w-2 rounded-full ring-2 ${
                      panel === key ? "ring-emerald-700" : "ring-white"
                    } ${severityDot(analysis.severity)}`}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 gap-4 p-3 sm:p-4 xl:gap-6 xl:overflow-hidden xl:p-6">
          {/* History sidebar */}
          <aside
            className={`${
              panel === "history" ? "flex" : "hidden"
            } xl:flex ${PANEL_HEIGHT} w-full shrink-0 flex-col rounded-2xl border border-stone-200 bg-white p-4 shadow-sm xl:w-64`}
          >
            <button
              onClick={newChat}
              disabled={isTyping}
              className="mb-3 flex items-center justify-center gap-2 rounded-full bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50 xl:py-2"
            >
              <Plus className="h-4 w-4" />
              New consultation
            </button>

            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-stone-400">
              Your consultations
            </p>

            <div className="flex-1 space-y-1 overflow-y-auto">
              {listLoading && (
                <p className="text-xs text-stone-400">Loading…</p>
              )}

              {!listLoading && conversations.length === 0 && (
                <p className="text-xs text-stone-400">
                  No past consultations yet.
                </p>
              )}

              {conversations.map((c) => (
                <div key={c._id} className="group relative">
                  <button
                    onClick={() => openConversation(c._id)}
                    disabled={isTyping || chatLoading}
                    className={`w-full rounded-lg px-3 py-2.5 pr-10 text-left transition hover:bg-stone-50 disabled:opacity-60 xl:py-2 xl:pr-9 ${
                      activeId === c._id ? "bg-emerald-50" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${severityDot(
                          c.analysis?.severity,
                        )}`}
                      />
                      <p
                        className={`truncate text-sm font-medium ${
                          activeId === c._id
                            ? "text-emerald-800"
                            : "text-stone-700"
                        }`}
                      >
                        {c.title}
                      </p>
                    </div>
                    <p className="mt-0.5 pl-4 text-[11px] text-stone-400">
                      {formatDate(c.updatedAt)}
                    </p>
                  </button>
                  {/* Always visible on touch screens, hover-only on xl */}
                  <button
                    aria-label="Delete consultation"
                    onClick={(e) => deleteConversation(e, c._id)}
                    className="absolute right-2 top-2 rounded p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-rose-600 focus:opacity-100 xl:p-1 xl:opacity-0 xl:group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4 xl:h-3.5 xl:w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </aside>

          {/* Chat panel */}
          <div
            className={`${
              panel === "chat" ? "flex" : "hidden"
            } xl:flex ${PANEL_HEIGHT} min-w-0 flex-1 flex-col rounded-2xl border border-stone-200 bg-white shadow-sm`}
          >
            <div className="flex items-center gap-3 border-b border-stone-100 px-4 py-3 sm:px-6 sm:py-4">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-700 text-white">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-stone-900">
                  Symptom Assistant
                </p>
                <p className="truncate text-xs text-stone-400">
                  Powered by Gemini AI
                  <span className="hidden sm:inline">
                    {" "}
                    · Your consultations are saved to your account
                  </span>
                </p>
              </div>

              {/* Quick severity link (below xl, once there is an assessment) */}
              {analysis?.severity && (
                <button
                  onClick={() => setPanel("analysis")}
                  className="flex shrink-0 items-center gap-1.5 rounded-full border border-stone-200 px-2.5 py-1 text-xs font-semibold hover:bg-stone-50 xl:hidden"
                  aria-label={`Severity ${analysis.severity}. View assessment`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${severityDot(
                      analysis.severity,
                    )}`}
                  />
                  <span className={severityColor(analysis.severity)}>
                    {analysis.severity}
                  </span>
                </button>
              )}
            </div>

            <div
              ref={scrollRef}
              className="flex-1 space-y-4 overflow-y-auto px-3 py-4 sm:px-6"
            >
              {chatLoading ? (
                <p className="text-sm text-stone-400">Loading consultation…</p>
              ) : (
                messages.map((m, i) => (
                  <ChatBubble key={m._id || i} msg={m} initials={initials} />
                ))
              )}
              <AnimatePresence>{isTyping && <TypingBubble />}</AnimatePresence>
            </div>

            {error && (
              <p
                role="alert"
                className="border-t border-rose-100 bg-rose-50 px-4 py-2 text-xs font-medium text-rose-700 sm:px-6"
              >
                {error}
              </p>
            )}

            <div className="flex items-center gap-2 border-t border-stone-100 px-3 py-3 sm:gap-3 sm:px-6">
              <button
                aria-label="Voice input"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-stone-200 text-stone-500 hover:bg-stone-50"
              >
                <Mic className="h-4 w-4" />
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                maxLength={2000}
                placeholder="Describe how you're feeling..."
                aria-label="Describe your symptoms"
                className="min-w-0 flex-1 rounded-full border border-stone-200 bg-stone-50 px-4 py-2.5 text-base outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 sm:text-sm"
              />
              <button
                aria-label="Send message"
                disabled={isTyping || chatLoading || !input.trim()}
                onClick={send}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-700 text-white transition hover:bg-emerald-800 active:scale-95 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Right analysis panel (real data from the latest AI answer) */}
          <div
            className={`${
              panel === "analysis" ? "grid md:grid-cols-2" : "hidden"
            } xl:flex xl:flex-col content-start gap-4 xl:gap-5 ${PANEL_HEIGHT} w-full shrink-0 overflow-y-auto xl:w-80`}
          >
            <div className="md:col-span-2 xl:col-span-1">
              <SeverityCard level={analysis?.severity} />
            </div>
            <ConditionsCard items={analysis?.conditions || []} />
            <DepartmentsCard items={analysis?.departments || []} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatBubble({ msg, initials }) {
  const isAI = msg.role === "ai";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`flex items-start gap-2 sm:gap-3 ${isAI ? "" : "flex-row-reverse"}`}
    >
      <div
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold ${
          isAI ? "bg-emerald-700 text-white" : "bg-stone-200 text-stone-600"
        }`}
      >
        {isAI ? "AI" : initials}
      </div>
      <div
        className={`min-w-0 max-w-[85%] sm:max-w-[80%] ${
          isAI ? "" : "flex flex-col items-end"
        }`}
      >
        <div
          className={`break-words rounded-2xl px-4 py-3 text-sm leading-relaxed ${
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
      className="flex items-start gap-2 sm:gap-3"
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
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-bold text-stone-900">
        Severity Assessment
      </h3>
      <div className="relative mb-2 h-2 w-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500">
        {level && (
          <motion.div
            initial={{ left: "0%" }}
            animate={{ left: SEVERITY_POSITION[level] ?? "0%" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute -top-1 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-white bg-stone-900 shadow"
          />
        )}
      </div>
      <div className="mb-3 flex justify-between text-[10px] font-medium uppercase tracking-wide text-stone-400">
        <span>Low</span>
        <span>Moderate</span>
        <span>High</span>
        <span>Urgent</span>
      </div>

      {level ? (
        <p className="text-sm leading-relaxed text-stone-500">
          Current assessment:{" "}
          <span className={`font-semibold ${severityColor(level)}`}>
            {level}
          </span>
          {SEVERITY_ADVICE[level] ? ` — ${SEVERITY_ADVICE[level]}` : ""}
        </p>
      ) : (
        <p className="text-sm text-stone-400">
          Describe your symptoms to see an assessment.
        </p>
      )}

      {level === "Urgent" && (
        <p className="mt-3 rounded-lg bg-rose-50 p-3 text-xs font-semibold leading-relaxed text-rose-700">
          This may be an emergency. Please contact emergency services or go to
          the nearest hospital now.
        </p>
      )}
    </div>
  );
}

function ConditionsCard({ items }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-bold text-stone-900">
        Possible Conditions
      </h3>
      {items.length === 0 ? (
        <p className="text-xs text-stone-400">No data yet.</p>
      ) : (
        <div className="space-y-4">
          {items.map((c, i) => (
            <div key={`${c.name}-${i}`}>
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold text-stone-800">
                  {c.name}
                </span>
                <span className="text-xs font-semibold text-emerald-700">
                  {c.match}%
                </span>
              </div>
              {c.note && (
                <p className="mb-1.5 text-xs text-stone-400">{c.note}</p>
              )}
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${c.match}%` }}
                  transition={{
                    duration: 0.9,
                    delay: 0.15 * i,
                    ease: "easeOut",
                  }}
                  className="h-full rounded-full bg-emerald-600"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DepartmentsCard({ items }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-bold text-stone-900">
        Recommended Departments
      </h3>
      {items.length === 0 ? (
        <p className="text-xs text-stone-400">No data yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((d, i) => (
            <div
              key={`${d.name}-${i}`}
              className="flex items-center justify-between gap-2"
            >
              <span className="text-sm text-stone-700">{d.name}</span>
              <span className="shrink-0 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                {d.match}% match
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

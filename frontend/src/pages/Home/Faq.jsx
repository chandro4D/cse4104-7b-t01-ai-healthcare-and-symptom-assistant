import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Plus,
  Bot,
  ShieldCheck,
  CalendarCheck,
  Siren,
  Pill,
  Wallet,
} from "lucide-react";

const faqs = [
  {
    q: "Can the AI diagnose my condition?",
    a: "No. The symptom checker gives guidance on possible causes and how urgent your situation may be. Only a licensed doctor can diagnose you, and we make it easy to book one.",
    Icon: Bot,
    tint: "bg-teal-50 text-teal-600",
    active: "bg-teal-600 text-white",
  },
  {
    q: "Is my health data safe?",
    a: "Your data is encrypted in transit and at rest. It is never shared with a doctor unless you choose to, and you can delete your history from your dashboard at any time.",
    Icon: ShieldCheck,
    tint: "bg-emerald-50 text-emerald-600",
    active: "bg-emerald-600 text-white",
  },
  {
    q: "How do I book an appointment?",
    a: "Pick a specialty or finish a symptom check, choose a doctor, then select a time slot. You'll get a confirmation and a reminder before the visit.",
    Icon: CalendarCheck,
    tint: "bg-sky-50 text-sky-600",
    active: "bg-sky-600 text-white",
  },
  {
    q: "What should I do in an emergency?",
    a: "Do not use this app. Call your local emergency number or go to the nearest hospital right away. If the checker detects warning signs, it will tell you to do the same.",
    Icon: Siren,
    tint: "bg-rose-50 text-rose-600",
    active: "bg-rose-600 text-white",
  },
  {
    q: "How do medicine reminders work?",
    a: "Add a medicine, its dose, and the times you take it. You'll get a reminder at each time, and you can mark doses as taken to track your routine.",
    Icon: Pill,
    tint: "bg-violet-50 text-violet-600",
    active: "bg-violet-600 text-white",
  },
  {
    q: "Does it cost anything to use?",
    a: "The symptom checker and reminders are free. Doctors set their own consultation fees, which you see before you confirm a booking.",
    Icon: Wallet,
    tint: "bg-amber-50 text-amber-600",
    active: "bg-amber-500 text-white",
  },
];

function FAQItem({ item, open, onToggle, id }) {
  const { Icon } = item;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-white transition-all duration-300 ${
        open
          ? "border-teal-300 shadow-[0_18px_40px_-20px_rgba(13,148,136,0.4)]"
          : "border-slate-200 hover:border-slate-300 hover:shadow-md"
      }`}
    >
      {/* accent bar */}
      <span
        className={`absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-emerald-400 to-teal-600 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      <h3>
        <button
          id={`faq-btn-${id}`}
          aria-expanded={open}
          aria-controls={`faq-panel-${id}`}
          onClick={onToggle}
          className="flex w-full items-center gap-4 px-4 py-4 text-left sm:px-6 sm:py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500"
        >
          <span
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl transition-colors duration-300 ${
              open ? item.active : item.tint
            }`}
          >
            <Icon size={20} />
          </span>

          <span
            className={`flex-1 text-sm sm:text-base font-semibold transition-colors ${
              open ? "text-teal-800" : "text-slate-900"
            }`}
          >
            {item.q}
          </span>

          <span
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border transition-all duration-300 ${
              open
                ? "rotate-45 border-teal-600 bg-teal-600 text-white"
                : "border-slate-300 text-slate-500"
            }`}
          >
            <Plus size={16} />
          </span>
        </button>
      </h3>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={`faq-panel-${id}`}
            role="region"
            aria-labelledby={`faq-btn-${id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <p className="px-4 pb-5 pl-4 sm:pl-[88px] sm:pr-16 sm:pb-6 text-sm sm:text-[15px] leading-7 text-slate-600">
              {item.a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FAQ() {
  const [openIndex, setOpenIndex] = useState(0);
  const reduce = useReducedMotion();

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.08 } },
  };
  const row = {
    hidden: reduce ? { opacity: 1 } : { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white py-16 md:py-24">
      <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-teal-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-emerald-200/30 blur-3xl" />

      <div className="relative mx-auto max-w-3xl px-4 sm:px-6">
        <div className="text-center">
          <h2 className="font-display text-3xl font-bold text-slate-900 sm:text-4xl md:text-5xl">
            Frequently asked questions
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm text-slate-500 sm:text-base">
            Quick answers about the symptom checker, appointments and your data.
          </p>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
          className="mt-10 space-y-3 md:mt-14"
        >
          {faqs.map((item, i) => (
            <motion.div key={item.q} variants={row}>
              <FAQItem
                id={i}
                item={item}
                open={openIndex === i}
                onToggle={() => setOpenIndex(openIndex === i ? -1 : i)}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

export default FAQ;

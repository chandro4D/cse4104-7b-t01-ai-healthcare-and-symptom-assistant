import { useEffect, useRef, useState } from "react";
import { Stethoscope, CalendarCheck, Pill } from "lucide-react";
import ServiceCard from "../../components/cards/ServiceCard";

const services = [
  {
    title: "AI Symptom Checker",
    desc: "Describe symptoms in plain language and get instant AI-powered guidance on next steps.",
    Icon: Stethoscope,
  },
  {
    title: "Book Appointment",
    desc: "Match with the right doctor and book a slot in seconds — no phone calls, no waiting.",
    Icon: CalendarCheck,
  },
  {
    title: "Medicine Reminder",
    desc: "Smart reminders keep your dosage schedule on track, every single day.",
    Icon: Pill,
  },
];

function Services() {
  const lineRef = useRef(null);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const el = lineRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setDrawn(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="relative overflow-hidden bg-slate-50 py-24">
      {/* soft ambient blobs */}
      <div className="pointer-events-none absolute -left-32 top-10 h-72 w-72 rounded-full bg-teal-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-10 h-72 w-72 rounded-full bg-blue-200/30 blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="text-center">
          <span className="text-sm font-semibold tracking-[0.2em] text-teal-600">
            AI-POWERED CARE
          </span>
          <h2 className="font-display mt-3 text-4xl font-bold text-slate-900 md:text-5xl">
            How <span className="text-teal-600">AiHealthcare</span> Works
          </h2>
          <p className="mt-4 text-slate-500 max-w-xl mx-auto">
            Three simple steps between you and better health decisions.
          </p>
        </div>

        <div className="relative mt-20 grid gap-10 md:grid-cols-3">
          {/* animated ECG connector line (desktop only) */}
          <svg
            ref={lineRef}
            className="pointer-events-none absolute left-0 top-8 hidden w-full md:block"
            height="40"
            viewBox="0 0 900 40"
            fill="none"
          >
            <path
              d="M0 20 H260 L280 5 L300 35 L320 20 H580 L600 5 L620 35 L640 20 H900"
              stroke="#0D9488"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="1400"
              strokeDashoffset={drawn ? 0 : 1400}
              style={{ transition: "stroke-dashoffset 1.8s ease-out" }}
            />
            {drawn && (
              <circle r="5" fill="#34D399">
                <animateMotion
                  dur="3.5s"
                  repeatCount="indefinite"
                  path="M0 20 H260 L280 5 L300 35 L320 20 H580 L600 5 L620 35 L640 20 H900"
                />
              </circle>
            )}
          </svg>

          {services.map((item, index) => (
            <ServiceCard
              key={item.title}
              step={String(index + 1).padStart(2, "0")}
              index={index}
              title={item.title}
              desc={item.desc}
              Icon={item.Icon}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default Services;

import { useEffect, useRef, useState } from "react";

function ServiceCard({ title, desc, Icon, step, index }) {
  const cardRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={cardRef}
      style={{ transitionDelay: visible ? `${index * 120}ms` : "0ms" }}
      className={`group relative rounded-2xl border border-slate-200 bg-white p-8
        shadow-sm transition-all duration-700 ease-out
        hover:-translate-y-2 hover:border-teal-300 hover:shadow-xl hover:shadow-teal-900/10
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
    >
      {/* Step marker */}
      <span className="absolute -top-4 left-8 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold tracking-wide text-white">
        STEP {step}
      </span>

      {/* Icon badge with heartbeat ring */}
      <div className="relative mb-6 flex h-16 w-16 items-center justify-center">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-0 group-hover:opacity-30" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-blue-600 shadow-md shadow-teal-900/20">
          <Icon className="h-7 w-7 text-white" strokeWidth={2} />
        </div>
      </div>

      <h3 className="font-display text-xl font-bold text-slate-900">{title}</h3>
      <p className="mt-2 text-slate-500 leading-relaxed">{desc}</p>
    </div>
  );
}

export default ServiceCard;

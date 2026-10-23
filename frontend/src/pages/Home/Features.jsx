import { motion, useReducedMotion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Stethoscope,
  HeartPulse,
  Brain,
  Baby,
  Bone,
  Eye,
  Ear,
  Smile,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";

// `doctors` counts are sample numbers: replace with real data from your API.
// Colors are written out in full so Tailwind can detect every class.
const specialties = [
  {
    name: "General Medicine",
    hint: "Fever, cold, everyday checkups",
    Icon: Stethoscope,
    doctors: 48,
    tint: "bg-teal-50 text-teal-600",
    hover: "group-hover:bg-teal-600",
  },
  {
    name: "Cardiology",
    hint: "Heart health and blood pressure",
    Icon: HeartPulse,
    doctors: 22,
    tint: "bg-rose-50 text-rose-600",
    hover: "group-hover:bg-rose-600",
  },
  {
    name: "Neurology",
    hint: "Headaches, nerves and sleep",
    Icon: Brain,
    doctors: 16,
    tint: "bg-violet-50 text-violet-600",
    hover: "group-hover:bg-violet-600",
  },
  {
    name: "Pediatrics",
    hint: "Gentle care for children",
    Icon: Baby,
    doctors: 31,
    tint: "bg-amber-50 text-amber-600",
    hover: "group-hover:bg-amber-500",
  },
  {
    name: "Orthopedics",
    hint: "Bones, joints and injuries",
    Icon: Bone,
    doctors: 19,
    tint: "bg-orange-50 text-orange-600",
    hover: "group-hover:bg-orange-500",
  },
  {
    name: "Ophthalmology",
    hint: "Eye exams and vision care",
    Icon: Eye,
    doctors: 14,
    tint: "bg-sky-50 text-sky-600",
    hover: "group-hover:bg-sky-600",
  },
  {
    name: "ENT",
    hint: "Ear, nose and throat",
    Icon: Ear,
    doctors: 17,
    tint: "bg-indigo-50 text-indigo-600",
    hover: "group-hover:bg-indigo-600",
  },
  {
    name: "Dentistry",
    hint: "Teeth, gums and smiles",
    Icon: Smile,
    doctors: 26,
    tint: "bg-emerald-50 text-emerald-600",
    hover: "group-hover:bg-emerald-600",
  },
];

function Specialties() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.07 } },
  };
  const item = {
    hidden: reduce ? { opacity: 1 } : { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
  };

  return (
    <section className="relative overflow-hidden bg-slate-50 py-16 md:py-24">
      {/* subtle dotted texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          maskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />
      <div className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
              Find the right doctor,{" "}
              <span className="text-teal-600">faster</span>
            </h2>
            <p className="mt-4 text-sm sm:text-base text-slate-500 max-w-xl leading-7">
              Browse by specialty and book a verified doctor in a few taps. Each
              profile shows experience, fees and open time slots.
            </p>
          </div>

          <button
            onClick={() => navigate("/doctors")}
            className="group inline-flex w-fit items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-teal-500 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
          >
            View all doctors
            <ArrowUpRight
              size={16}
              className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </button>
        </div>

        {/* Grid */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
          className="mt-10 md:mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-5"
        >
          {specialties.map(({ name, hint, Icon, doctors, tint, hover }) => (
            <motion.button
              key={name}
              variants={item}
              onClick={() =>
                navigate(`/doctors?specialty=${encodeURIComponent(name)}`)
              }
              className="group relative flex flex-col text-left rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-teal-300 hover:shadow-[0_18px_40px_-18px_rgba(13,148,136,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
            >
              <div className="flex items-start justify-between">
                <span
                  className={`grid h-14 w-14 place-items-center rounded-2xl transition-all duration-300 group-hover:text-white group-hover:scale-105 ${tint} ${hover}`}
                >
                  <Icon size={26} strokeWidth={1.8} />
                </span>

                <span className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-400 transition-all duration-300 group-hover:border-teal-600 group-hover:bg-teal-600 group-hover:text-white">
                  <ArrowUpRight
                    size={16}
                    className="transition-transform duration-300 group-hover:rotate-12"
                  />
                </span>
              </div>

              <h3 className="mt-6 text-lg font-bold text-slate-900">{name}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">{hint}</p>

              <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs sm:text-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:animate-none" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="font-medium text-slate-600">
                  {doctors} doctors available
                </span>
              </div>
            </motion.button>
          ))}

          {/* Featured tile: guided path for undecided users */}
          <motion.div
            variants={item}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-6 text-white sm:col-span-2 lg:col-span-1 flex flex-col justify-between min-h-[220px]"
          >
            <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-cyan-300/20 blur-2xl" />

            <div className="relative">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 backdrop-blur">
                <Sparkles size={22} />
              </span>
              <h3 className="mt-5 text-xl font-bold leading-snug">
                Not sure which specialist?
              </h3>
              <p className="mt-2 text-sm leading-6 text-emerald-50">
                Describe how you feel and our AI will point you to the right
                doctor.
              </p>
            </div>

            <button
              onClick={() => navigate("/dashboard/symptomChecker")}
              className="relative mt-6 inline-flex w-fit items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-teal-700 shadow-lg transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-teal-700"
            >
              Check my symptoms
              <ArrowUpRight size={16} />
            </button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

export default Specialties;

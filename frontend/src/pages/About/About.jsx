import { motion } from "framer-motion";

import { Target, Eye, ShieldCheck, Clock, Sparkles } from "lucide-react";
import {
  HiOutlineChatBubbleLeftRight,
  HiOutlineDocumentMagnifyingGlass,
  HiOutlineCalendarDays,
  HiOutlineChartBarSquare,
  HiOutlineSparkles,
  HiOutlineShieldCheck,
} from "react-icons/hi2";
import { FaHeartPulse, FaDroplet } from "react-icons/fa6";

import {
  FaHeartbeat,
  FaRobot,
  FaUserMd,
  FaHospital,
  FaShieldAlt,
  FaBrain,
  FaNotesMedical,
  FaCloudUploadAlt,
  FaArrowRight,
} from "react-icons/fa";

import hero from "../../assets/images/about.jpg";
import doctor from "../../assets/images/doctor.jpg";
import ai from "../../assets/images/ai.jpg";

// ---------- Mission / Vision data (was missing) ----------
const about = [
  {
    title: "Our Mission",
    Icon: Target,
    text: "We aim to make healthcare accessible, intelligent, affordable, and available to everyone by leveraging Artificial Intelligence and modern web technologies.",
  },
  {
    title: "Our Vision",
    Icon: Eye,
    text: "To become one of the world's most trusted AI healthcare ecosystems, where patients receive personalized, fast, and secure healthcare support anytime.",
  },
];

const highlights = [
  { label: "Secure & private", Icon: ShieldCheck },
  { label: "Available 24/7", Icon: Clock },
  { label: "AI-powered", Icon: Sparkles },
];

function HeartbeatLine() {
  return (
    <div className="relative h-24 w-full max-w-2xl mx-auto md:mx-0 overflow-hidden">
      <svg
        viewBox="0 0 600 100"
        className="w-full h-full"
        fill="none"
        preserveAspectRatio="none"
      >
        <motion.path
          d="M0 50 L110 50 L130 20 L150 80 L170 10 L190 90 L210 50 L260 50 L280 35 L300 65 L320 50 L600 50"
          stroke="#2DD4BF"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 2.2, ease: "easeInOut", delay: 0.3 }}
        />
      </svg>
      <motion.div
        className="absolute top-1/2 h-2.5 w-2.5 rounded-full bg-[#2DD4BF] shadow-[0_0_12px_3px_rgba(45,212,191,0.7)]"
        style={{ left: "53%", translateY: "-50%" }}
        animate={{ scale: [1, 1.6, 1], opacity: [1, 0.4, 1] }}
        transition={{
          duration: 1.4,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2.4,
        }}
      />
    </div>
  );
}

// ---------- Reusable fade-up wrapper ----------
const FadeUp = ({ children, delay = 0, className = "" }) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-80px" }}
    transition={{ duration: 0.6, delay, ease: "easeOut" }}
  >
    {children}
  </motion.div>
);

const features = [
  {
    icon: HiOutlineChatBubbleLeftRight,
    title: "AI Symptom Chat",
    desc: "Describe how you feel in plain language. The assistant asks the right follow-up questions and reasons through possible causes with you, not at you.",
  },
  {
    icon: HiOutlineDocumentMagnifyingGlass,
    title: "Prescription Reader",
    desc: "Snap a photo of a prescription and OCR extracts the medicine names, dosage, and schedule — no more squinting at doctor's handwriting.",
  },
  {
    icon: HiOutlineCalendarDays,
    title: "Appointment Booking",
    desc: "See doctor availability in real time and confirm a visit in a few taps, with reminders so nothing gets missed.",
  },
  {
    icon: FaDroplet,
    title: "ORS & Home-Care Guide",
    desc: "For mild dehydration and common home-care situations, get clear, guided instructions — including ORS preparation — while you decide next steps.",
  },
  {
    icon: HiOutlineChartBarSquare,
    title: "Health Records Dashboard",
    desc: "Every check-in, prescription, and appointment lives in one timeline, so your history is there when you or your doctor need it.",
  },
  {
    icon: HiOutlineSparkles,
    title: "Multi-Model AI Engine",
    desc: "Symptom analysis is backed by multiple AI models working together, cross-checked for more grounded, reliable guidance.",
  },
];

const steps = [
  {
    step: "01",
    title: "Tell the assistant what's wrong",
    desc: "Type your symptoms into the chat — fever, pain, duration, anything unusual you've noticed.",
  },
  {
    step: "02",
    title: "Get an instant severity read",
    desc: "The AI analyzes your input and returns a clear severity gauge with possible conditions to discuss with a doctor.",
  },
  {
    step: "03",
    title: "Upload what you already have",
    desc: "Add an existing prescription or lab report — OCR reads it into your record automatically.",
  },
  {
    step: "04",
    title: "Act on it",
    desc: "Book a doctor's appointment directly, or follow home-care guidance if it's something you can manage yourself.",
  },
];

const features_one = [
  {
    icon: <FaRobot size={40} />,
    title: "AI Symptom Checker",
    description:
      "Describe your symptoms and receive AI-powered preliminary health insights instantly.",
  },
  {
    icon: <FaUserMd size={40} />,
    title: "Doctor Appointment",
    description:
      "Book appointments with experienced doctors without waiting in long queues.",
  },
  {
    icon: <FaCloudUploadAlt size={40} />,
    title: "Prescription Upload",
    description:
      "Securely upload prescriptions and access them anytime from your account.",
  },
  {
    icon: <FaNotesMedical size={40} />,
    title: "Health Records",
    description:
      "Store all your medical history in one secure digital healthcare platform.",
  },
  {
    icon: <FaBrain size={40} />,
    title: "AI Assistant",
    description:
      "Chat with an intelligent healthcare assistant anytime for guidance and support.",
  },
  {
    icon: <FaShieldAlt size={40} />,
    title: "Secure Platform",
    description:
      "Advanced encryption keeps your personal and medical information protected.",
  },
];

const stats = [
  { number: "25K+", text: "Happy Patients" },
  { number: "200+", text: "Expert Doctors" },
  { number: "98%", text: "Patient Satisfaction" },
  { number: "24/7", text: "AI Assistance" },
];

function About() {
  return (
    <div>
      <div className="bg-white">
        {/* Hero */}

        <section className="relative overflow-hidden bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-700 text-white">
          <div className="absolute w-96 h-96 rounded-full bg-white/10 blur-3xl -top-20 -left-20"></div>
          <div className="absolute w-96 h-96 rounded-full bg-cyan-300/20 blur-3xl bottom-0 right-0"></div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-24 grid lg:grid-cols-2 items-center gap-12 lg:gap-16">
            <motion.div
              initial={{ opacity: 0, x: -80 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <span className="inline-block px-4 py-2 rounded-full bg-white/20 backdrop-blur text-sm">
                AI Powered Healthcare
              </span>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mt-8 leading-tight">
                Smarter Healthcare
                <br />
                Better Lives.
              </h1>

              <p className="mt-6 md:mt-8 text-base md:text-lg text-slate-100 leading-7 md:leading-8">
                Our AI Healthcare platform combines artificial intelligence,
                digital healthcare, secure medical records, symptom analysis,
                and online doctor appointments into one intelligent ecosystem.
              </p>

              <button className="mt-8 md:mt-10 bg-white text-sky-700 px-6 py-3 md:px-7 md:py-4 rounded-xl font-bold flex items-center gap-3 hover:scale-105 duration-300">
                Explore Platform
                <FaArrowRight />
              </button>
            </motion.div>

            <motion.img
              initial={{ opacity: 0, x: 80 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              src={hero}
              alt="AI healthcare platform"
              className="w-full rounded-3xl shadow-2xl"
            />
          </div>
        </section>

        {/* About */}

        <section className="max-w-7xl mx-auto py-16 md:py-24 px-4 sm:px-6 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <img
            src={ai}
            alt="Artificial intelligence in healthcare"
            className="w-full rounded-3xl shadow-xl"
          />

          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800">
              Revolutionizing Healthcare with Artificial Intelligence
            </h2>

            <p className="mt-6 text-gray-600 leading-7 md:leading-8">
              Our platform bridges patients and healthcare providers through
              AI-driven technology. Whether you need symptom analysis,
              appointment booking, prescription management, or intelligent
              medical assistance, everything is available in one secure place.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-10">
              <div className="p-6 rounded-2xl shadow bg-cyan-50">
                <FaHeartbeat size={40} className="text-cyan-600 mb-3" />
                <h3 className="font-bold">Patient First</h3>
              </div>

              <div className="p-6 rounded-2xl shadow bg-blue-50">
                <FaHospital size={40} className="text-blue-600 mb-3" />
                <h3 className="font-bold">Modern Healthcare</h3>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}

        <section className="bg-slate-50 py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <h2 className="text-center text-3xl md:text-4xl font-bold">
              Our Features
            </h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 mt-12 md:mt-16">
              {features_one.map((feature, index) => (
                <motion.div
                  whileHover={{ y: -10 }}
                  key={index}
                  className="bg-white rounded-3xl p-6 md:p-8 shadow hover:shadow-2xl duration-300"
                >
                  <div className="text-cyan-600 mb-5">{feature.icon}</div>

                  <h3 className="font-bold text-xl">{feature.title}</h3>

                  <p className="mt-4 text-gray-600">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Statistics */}

        {/* <section className="py-24 bg-gradient-to-r from-cyan-600 to-blue-700 text-white">
          <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-10 text-center">
            {stats.map((item, index) => (
              <div key={index}>
                <h2 className="text-5xl font-extrabold">{item.number}</h2>

                <p className="mt-3">{item.text}</p>
              </div>
            ))}
          </div>
        </section> */}

        {/* Mission */}

        <section className="relative overflow-hidden bg-gradient-to-br from-[#ECFDF5] via-white to-[#E0F7F4] py-16 md:py-24">
          {/* soft ambient blobs */}
          <div className="pointer-events-none absolute -left-24 top-0 h-64 w-64 rounded-full bg-emerald-300/30 blur-3xl" />
          <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />

          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-10">
            {/* Left: content */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.7 }}
            >
              <span className="text-xs font-semibold tracking-[0.2em] text-teal-600 sm:text-sm">
                ABOUT US
              </span>
              <h2 className="mt-3 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl md:text-5xl">
                Healthcare that is{" "}
                <span className="text-emerald-500">smarter</span>
                <br className="hidden sm:block" /> and within everyone&apos;s
                reach
              </h2>

              <div className="mt-8 space-y-5">
                {about.map(({ title, text, Icon }) => (
                  <div
                    key={title}
                    className="flex gap-4 rounded-2xl border border-emerald-100 bg-white p-5 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:p-6"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <Icon size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 sm:text-xl">
                        {title}
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-gray-600 sm:text-base">
                        {text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <ul className="mt-8 flex flex-wrap gap-3">
                {highlights.map(({ label, Icon }) => (
                  <li
                    key={label}
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-4 py-2 text-sm font-medium text-emerald-700 shadow-sm"
                  >
                    <Icon size={16} />
                    {label}
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Right: image */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.8 }}
              className="relative mx-auto w-full max-w-md lg:max-w-none"
            >
              {/* offset decorative frame */}
              <div className="absolute -bottom-4 -right-4 h-full w-full rounded-3xl border-2 border-emerald-300/60 sm:-bottom-6 sm:-right-6" />
              <div className="absolute -left-4 -top-4 h-24 w-24 rounded-full bg-emerald-200/60 blur-2xl sm:-left-6 sm:-top-6" />

              <img
                src={doctor}
                alt="Doctor providing AI-assisted healthcare"
                className="relative z-10 h-auto w-full rounded-3xl object-cover shadow-xl"
              />

              {/* floating badge */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute -bottom-6 left-4 z-20 flex items-center gap-3 rounded-2xl bg-white p-3 shadow-xl sm:left-[-24px] sm:p-4"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white sm:h-12 sm:w-12">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 sm:text-base">
                    Trusted Care
                  </p>
                  <p className="text-xs text-gray-500 sm:text-sm">
                    Secure &amp; personalized
                  </p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* CTA */}

        <section className="bg-cyan-700 py-16 md:py-20 text-white">
          <div className="max-w-5xl mx-auto text-center px-4 sm:px-6">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">
              Ready to Experience Smart Healthcare?
            </h2>

            <p className="mt-6 text-base md:text-lg">
              Join thousands of users who trust our AI-powered healthcare
              platform for appointments, symptom analysis, prescriptions, and
              personalized medical assistance.
            </p>

            <button className="mt-8 md:mt-10 bg-white text-cyan-700 px-8 py-3 md:px-10 md:py-4 rounded-xl font-bold hover:scale-105 duration-300">
              Book Appointment
            </button>
          </div>
        </section>
      </div>

      <div className="bg-[#0B1E1C] text-[#EAF6F3] font-body min-h-screen overflow-x-hidden">
        {/* ---------------- HERO ---------------- */}
        <section className="relative px-4 sm:px-6 md:px-12 pt-20 pb-16 md:pt-32 md:pb-28">
          {/* ambient glow */}
          <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-[#2DD4BF]/10 blur-[120px]" />
          <div className="pointer-events-none absolute top-20 right-0 h-72 w-72 rounded-full bg-[#F6A94A]/10 blur-[110px]" />

          <div className="relative max-w-5xl mx-auto text-center md:text-left">
            <FadeUp>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#2DD4BF]/25 bg-[#2DD4BF]/5 px-4 py-1.5 text-xs font-mono tracking-wider text-[#7FE3D6] uppercase">
                <FaHeartPulse className="text-sm" />
                AI Healthcare &amp; Symptom Assistant
              </span>
            </FadeUp>

            <FadeUp delay={0.1}>
              <h1 className="mt-6 font-display font-800 text-4xl sm:text-5xl md:text-6xl leading-[1.08] tracking-tight text-white">
                Healthcare that listens{" "}
                <span className="text-[#2DD4BF]">before</span> it advises.
              </h1>
            </FadeUp>

            <FadeUp delay={0.2}>
              <p className="mt-6 max-w-2xl mx-auto md:mx-0 text-base md:text-lg text-[#9FBAB5] leading-relaxed">
                We built this platform so that getting a first read on your
                health doesn&apos;t start with a waiting room. Chat with an AI
                about your symptoms, get your prescriptions read and organized
                automatically, and book a real doctor the moment you need one —
                all in one place.
              </p>
            </FadeUp>

            <FadeUp delay={0.3}>
              <HeartbeatLine />
            </FadeUp>

            <FadeUp
              delay={0.35}
              className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start mt-2"
            >
              <button className="rounded-xl bg-[#2DD4BF] px-7 py-3.5 font-display font-600 text-[#0B1E1C] hover:bg-[#5eeadb] transition-colors">
                Start a Symptom Check
              </button>
              <button className="rounded-xl border border-[#2DD4BF]/30 px-7 py-3.5 font-display font-600 text-[#EAF6F3] hover:bg-white/5 transition-colors">
                Book an Appointment
              </button>
            </FadeUp>
          </div>
        </section>

        {/* ---------------- MISSION ---------------- */}
        <section className="px-4 sm:px-6 md:px-12 py-16 border-t border-white/5">
          <div className="max-w-5xl mx-auto grid md:grid-cols-[1fr_1.4fr] gap-6 md:gap-10 items-start">
            <FadeUp>
              <h2 className="font-display font-700 text-2xl md:text-3xl text-white">
                Why we built this
              </h2>
            </FadeUp>
            <FadeUp delay={0.1}>
              <p className="text-[#9FBAB5] leading-relaxed text-base md:text-lg">
                Most people notice something is wrong long before they see a
                doctor — and that gap is where worry, guesswork, and delay live.
                Our goal is to close it. This assistant gives you a clear,
                judgment-free first read on your symptoms, keeps your
                prescriptions and history organized without extra effort, and
                makes the step from &quot;something feels off&quot; to
                &quot;I&apos;ve booked a doctor&quot; as short as possible.
              </p>
            </FadeUp>
          </div>
        </section>

        {/* ---------------- FEATURES ---------------- */}
        <section className="px-4 sm:px-6 md:px-12 py-16 md:py-20 border-t border-white/5">
          <div className="max-w-6xl mx-auto">
            <FadeUp className="max-w-2xl mb-10 md:mb-14">
              <span className="font-mono text-xs tracking-wider text-[#7FE3D6] uppercase">
                What&apos;s inside
              </span>
              <h2 className="mt-3 font-display font-700 text-3xl md:text-4xl text-white">
                One assistant, the whole first step of care.
              </h2>
            </FadeUp>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {features.map((f, i) => {
                const Icon = f.icon;
                return (
                  <FadeUp key={f.title} delay={0.05 * i}>
                    <div className="group h-full rounded-2xl border border-white/5 bg-[#0F2C29] p-6 hover:border-[#2DD4BF]/30 hover:bg-[#123430] transition-colors">
                      <div className="h-11 w-11 rounded-xl bg-[#2DD4BF]/10 flex items-center justify-center text-[#2DD4BF] text-xl group-hover:bg-[#2DD4BF]/15 transition-colors">
                        <Icon />
                      </div>
                      <h3 className="mt-5 font-display font-600 text-lg text-white">
                        {f.title}
                      </h3>
                      <p className="mt-2 text-sm text-[#93ACA7] leading-relaxed">
                        {f.desc}
                      </p>
                    </div>
                  </FadeUp>
                );
              })}
            </div>
          </div>
        </section>

        {/* ---------------- HOW IT WORKS ---------------- */}
        <section className="px-4 sm:px-6 md:px-12 py-16 md:py-20 border-t border-white/5 bg-[#0A1B19]">
          <div className="max-w-5xl mx-auto">
            <FadeUp className="max-w-2xl mb-10 md:mb-14">
              <span className="font-mono text-xs tracking-wider text-[#F6A94A] uppercase">
                How it works
              </span>
              <h2 className="mt-3 font-display font-700 text-3xl md:text-4xl text-white">
                From &quot;something&apos;s wrong&quot; to &quot;it&apos;s
                handled.&quot;
              </h2>
            </FadeUp>

            <div className="relative">
              <div className="hidden md:block absolute left-[27px] top-2 bottom-2 w-px bg-gradient-to-b from-[#2DD4BF]/40 via-[#2DD4BF]/10 to-transparent" />
              <div className="space-y-8 md:space-y-10">
                {steps.map((s, i) => (
                  <FadeUp key={s.step} delay={0.08 * i}>
                    <div className="flex gap-4 md:gap-6 items-start">
                      <div className="shrink-0 h-12 w-12 md:h-14 md:w-14 rounded-full border border-[#2DD4BF]/30 bg-[#0F2C29] flex items-center justify-center font-mono text-sm text-[#2DD4BF]">
                        {s.step}
                      </div>
                      <div className="pt-1 md:pt-2">
                        <h3 className="font-display font-600 text-lg text-white">
                          {s.title}
                        </h3>
                        <p className="mt-1.5 text-sm md:text-base text-[#93ACA7] leading-relaxed max-w-xl">
                          {s.desc}
                        </p>
                      </div>
                    </div>
                  </FadeUp>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- TRUST STRIP ---------------- */}
        <section className="px-4 sm:px-6 md:px-12 py-16 border-t border-white/5">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-6 md:gap-10 justify-between">
            <FadeUp className="flex items-start md:items-center gap-3">
              <HiOutlineShieldCheck className="text-2xl text-[#2DD4BF] shrink-0" />
              <p className="text-sm md:text-base text-[#9FBAB5]">
                Built as an academic project — this assistant supports your
                understanding of symptoms and care options, and always
                encourages consulting a licensed doctor for diagnosis and
                treatment.
              </p>
            </FadeUp>
          </div>
        </section>

        {/* ---------------- CTA ---------------- */}
        <section className="px-4 sm:px-6 md:px-12 py-20 md:py-24 border-t border-white/5 text-center">
          <FadeUp className="max-w-2xl mx-auto">
            <h2 className="font-display font-700 text-3xl md:text-4xl text-white">
              Your health, one conversation away.
            </h2>
            <p className="mt-4 text-[#9FBAB5]">
              No sign-up friction, no jargon — just tell us what&apos;s going
              on.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <button className="rounded-xl bg-[#2DD4BF] px-8 py-3.5 font-display font-600 text-[#0B1E1C] hover:bg-[#5eeadb] transition-colors">
                Try the Symptom Checker
              </button>
              <button className="rounded-xl border border-[#2DD4BF]/30 px-8 py-3.5 font-display font-600 text-[#EAF6F3] hover:bg-white/5 transition-colors">
                Learn About Our Team
              </button>
            </div>
          </FadeUp>
        </section>
      </div>
    </div>
  );
}

export default About;

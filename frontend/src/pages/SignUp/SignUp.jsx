import { useState } from "react";
import {
  User,
  Stethoscope,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Brain,
  HeartPulse,
  Wind,
  ShieldPlus,
  Check,
  Circle,
} from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { FaHeartbeat } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import doctor from "../../assets/images/doctor-illustration.png";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

// Admin accounts cannot be created from the public signup page
// (the backend only accepts patient / doctor). Use scripts/createAdmin.js.
const ROLES = [
  { key: "patient", label: "Patient", icon: User },
  { key: "doctor", label: "Doctor", icon: Stethoscope },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password rules shown live under the field.
const PASSWORD_RULES = [
  { id: "length", label: "8+ characters", test: (p) => p.length >= 8 },
  { id: "upper", label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { id: "lower", label: "One lowercase letter", test: (p) => /[a-z]/.test(p) },
  { id: "number", label: "One number", test: (p) => /\d/.test(p) },
];

// Returns an error message, or "" when the password is valid.
// (Backend requires: 8+ characters, a letter and a number.)
const validatePassword = (password) => {
  if (password.length < 8) return "Password should be at least 8 characters.";
  if (!/[A-Z]/.test(password))
    return "Password should have at least one uppercase letter.";
  if (!/[a-z]/.test(password))
    return "Password should have at least one lowercase letter.";
  if (!/\d/.test(password)) return "Password should have at least one number.";
  return "";
};

const inputBase =
  "w-full h-12 rounded-xl border border-gray-200 bg-white text-[15px] text-gray-800 placeholder:text-gray-400 outline-none transition focus:border-[#0F6E56] focus:ring-4 focus:ring-[#0F6E56]/15";

const FloatingCard = ({ icon: Icon, className = "" }) => (
  <div
    aria-hidden="true"
    className={`absolute w-[88px] h-[72px] rounded-xl bg-white/[0.05] border border-emerald-300/20 flex flex-col justify-center gap-1.5 px-3 backdrop-blur-sm ${className}`}
  >
    <Icon size={22} className="text-emerald-300" strokeWidth={1.75} />
    <div className="h-[3px] w-9 rounded-full bg-emerald-300/25" />
    <div className="h-[3px] w-6 rounded-full bg-emerald-300/25" />
  </div>
);

const SignUp = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState("patient");
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    // ── Client-side validation ──
    let error = "";

    if (cleanName.length < 2 || cleanName.length > 60) {
      error = "Name must be between 2 and 60 characters.";
    } else if (!EMAIL_REGEX.test(cleanEmail)) {
      error = "Please enter a valid email address.";
    } else {
      error = validatePassword(password);
    }

    if (error) {
      setRegisterError(error);

      Swal.fire({
        icon: "error",
        text: error,
        confirmButtonColor: "#0F6E56",
      });

      return;
    }

    setRegisterError("");

    try {
      setSubmitting(true);

      const res = await fetch(`${API_URL}/api/v1/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          password,
          role: selectedRole,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // express-validator style errors (if the backend sends them)
        const detail = Array.isArray(data.errors)
          ? data.errors.map((err) => err.msg || err.message).join("\n")
          : "";

        throw new Error(detail || data.message || "Registration failed");
      }

      await Swal.fire({
        icon: "success",
        title: "Account created!",
        text:
          data.message ||
          "Registration successful! Please check your email to verify your account.",
        confirmButtonColor: "#0F6E56",
      });

      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Registration error:", error);

      Swal.fire({
        icon: "error",
        title: "Registration Failed",
        text: error.message || "Something went wrong!",
        confirmButtonColor: "#0F6E56",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#E8EEEA] lg:p-6">
      <div className="mx-auto grid w-full max-w-6xl min-h-screen lg:min-h-[calc(100vh-3rem)] lg:grid-cols-2 overflow-hidden bg-[#F5F3EC] lg:rounded-3xl lg:shadow-xl lg:shadow-emerald-950/10">
        {/* ───────── Left panel — form ───────── */}
        <main className="relative flex items-center justify-center px-5 py-10 sm:px-10 sm:py-12 lg:px-12">
          {/* Decorative dot grid */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 h-32 w-32 sm:h-40 sm:w-40 opacity-60"
            style={{
              backgroundImage:
                "radial-gradient(circle, #d6d1c4 1px, transparent 1px)",
              backgroundSize: "14px 14px",
            }}
          />

          <div className="relative z-10 w-full max-w-[420px] motion-safe:animate-[fadeInUp_0.6s_ease-out]">
            {/* Brand mark */}
            <div className="mb-8 sm:mb-10 flex items-center gap-3">
              <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-teal-700 text-white shadow-lg shadow-teal-900/20">
                <FaHeartbeat size={22} />
              </div>
              <div>
                <p className="font-serif text-base font-bold leading-tight text-[#1a1a1a]">
                  AI Healthcare
                </p>
                <p className="text-xs leading-tight text-gray-500">
                  Symptom assistant
                </p>
              </div>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl font-bold leading-tight text-[#1a1a1a]">
              Create your account
            </h1>
            <p className="mt-2 mb-7 text-[15px] leading-relaxed text-gray-500">
              Access your dashboard, appointments, and AI health tools.
            </p>

            {/* Role selector */}
            <div
              role="radiogroup"
              aria-label="Account type"
              className="mb-6 flex rounded-xl border border-gray-200 bg-white p-1"
            >
              {ROLES.map(({ key, label, icon: Icon }) => {
                const active = selectedRole === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setSelectedRole(key)}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E56]/40 ${
                      active
                        ? "bg-[#0F6E56] text-white shadow-sm"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                    }`}
                  >
                    <Icon size={16} strokeWidth={2} />
                    {label}
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleRegister} className="space-y-5" noValidate>
              {/* Name */}
              <div>
                <label
                  htmlFor="signup-name"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  Full name
                </label>
                <div className="relative">
                  <User
                    size={17}
                    aria-hidden="true"
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    id="signup-name"
                    name="name"
                    type="text"
                    required
                    maxLength={60}
                    autoComplete="name"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`${inputBase} pl-11 pr-4`}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="signup-email"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  Email address
                </label>
                <div className="relative">
                  <Mail
                    size={17}
                    aria-hidden="true"
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    id="signup-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`${inputBase} pl-11 pr-4`}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="signup-password"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock
                    size={17}
                    aria-hidden="true"
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    id="signup-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-describedby="password-rules"
                    className={`${inputBase} pl-11 pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 transition hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E56]/40"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <ul
                  id="password-rules"
                  className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1.5 min-[400px]:grid-cols-2"
                >
                  {PASSWORD_RULES.map(({ id, label, test }) => {
                    const ok = test(password);
                    return (
                      <li
                        key={id}
                        className={`flex items-center gap-1.5 text-xs transition-colors ${
                          ok ? "text-[#0F6E56]" : "text-gray-400"
                        }`}
                      >
                        {ok ? (
                          <Check size={13} strokeWidth={3} aria-hidden="true" />
                        ) : (
                          <Circle size={13} aria-hidden="true" />
                        )}
                        {label}
                        <span className="sr-only">
                          {ok ? " (met)" : " (not met)"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {registerError && (
                <p
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                >
                  {registerError}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="h-12 w-full rounded-xl bg-[#0F6E56] text-[15px] font-semibold text-white shadow-sm shadow-emerald-900/20 transition hover:bg-[#0c5945] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0F6E56]/30 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Creating account..." : "Create account"}
              </button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs text-gray-400">Or continue with</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            <button
              type="button"
              className="flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gray-300/40"
            >
              <FcGoogle className="h-5 w-5" />
              Continue with Google
            </button>

            <p className="mt-8 text-center text-sm text-gray-500">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-semibold text-[#0F6E56] hover:underline"
              >
                Log in
              </Link>
            </p>

            <p className="mt-6 text-center text-xs leading-relaxed text-gray-400">
              AI guidance is preliminary and does not replace professional
              medical advice.
            </p>
          </div>
        </main>

        {/* ───────── Right panel — brand / AI showcase (desktop) ───────── */}
        <aside className="relative hidden overflow-hidden bg-gradient-to-br from-[#0C4A3C] to-[#062420] lg:flex">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
              backgroundSize: "28px 28px",
            }}
          />

          <div className="relative z-10 flex w-full flex-col justify-between gap-6 p-10 xl:p-14 motion-safe:animate-[fadeInUp_0.8s_ease-out_0.15s_both]">
            <figure>
              <p className="mb-4 text-sm font-medium text-emerald-300/80">
                AI-powered healthcare
              </p>
              <blockquote className="max-w-md font-serif text-2xl leading-[1.45] text-white xl:text-[26px]">
                <span className="text-emerald-400">&ldquo;</span>Describe how
                you feel — our AI suggests likely causes, severity, and the
                right department to consult, in under a minute.
                <span className="text-emerald-400">&rdquo;</span>
              </blockquote>
              <figcaption className="mt-4 text-xs text-emerald-300/60">
                Symptom checker for patients
              </figcaption>
            </figure>

            {/* Illustration with floating specialty cards */}
            <div className="relative flex min-h-[260px] flex-1 items-center justify-center">
              <FloatingCard
                icon={Brain}
                className="left-[2%] top-[10%] hidden xl:flex"
              />
              <FloatingCard
                icon={HeartPulse}
                className="right-[4%] top-[6%] hidden xl:flex"
              />
              <FloatingCard
                icon={Wind}
                className="bottom-[10%] left-[0%] hidden xl:flex"
              />
              <div
                aria-hidden="true"
                className="absolute bottom-[8%] right-[2%] hidden h-11 w-11 items-center justify-center rounded-lg border border-emerald-300/20 bg-white/[0.05] xl:flex"
              >
                <ShieldPlus
                  size={20}
                  className="text-emerald-300"
                  strokeWidth={1.75}
                />
              </div>

              <img
                src={doctor}
                alt="Illustration of a friendly doctor with arms crossed"
                className="relative z-10 h-auto max-h-[340px] w-full max-w-[280px] object-contain xl:max-w-[300px]"
              />
            </div>

            <div className="max-w-md rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm xl:p-6">
              <p className="mb-2 text-xs text-emerald-300/60">Sample result</p>
              <dl className="divide-y divide-white/10 text-sm">
                <div className="flex items-center justify-between py-2">
                  <dt className="text-emerald-200/70">AI confidence</dt>
                  <dd className="font-medium text-white">92.4%</dd>
                </div>
                <div className="flex items-center justify-between py-2">
                  <dt className="text-emerald-200/70">Suggested department</dt>
                  <dd className="font-medium text-white">General Medicine</dd>
                </div>
                <div className="flex items-center justify-between py-2">
                  <dt className="text-emerald-200/70">Severity level</dt>
                  <dd className="font-medium text-amber-300">Moderate</dd>
                </div>
              </dl>
            </div>
          </div>
        </aside>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default SignUp;

import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { FcGoogle } from "react-icons/fc";
import { FaHeartbeat } from "react-icons/fa";
import { MdHealthAndSafety } from "react-icons/md";
import {
  User,
  Stethoscope,
  ShieldCheck,
  Eye,
  EyeOff,
  Mail,
  Lock,
} from "lucide-react";
import doctor from "../../assets/images/hero.png";
import { getRoleHome } from "../../utils/auth";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const ROLES = [
  { key: "patient", label: "Patient", icon: User },
  { key: "doctor", label: "Doctor", icon: Stethoscope },
  { key: "admin", label: "Admin", icon: ShieldCheck },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputBase =
  "w-full h-12 rounded-xl border border-gray-200 bg-white text-[15px] text-gray-800 placeholder:text-gray-400 outline-none transition focus:border-[#0F6E56] focus:ring-4 focus:ring-[#0F6E56]/15";

const Login = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Page the visitor originally wanted (set by ProtectedRoute)
  const from = location.state?.from?.pathname;
  const redirectMessage = location.state?.message;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("patient");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const handleLogIn = async (e) => {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();

    // Client-side validation
    if (!EMAIL_REGEX.test(cleanEmail)) {
      setFormError("Please enter a valid email address.");
      return;
    }

    if (!password) {
      setFormError("Please enter your password.");
      return;
    }

    setFormError("");

    try {
      setSubmitting(true);

      const res = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: cleanEmail,
          password,
          role: selectedRole,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "Login failed");
      }

      if (!data.token || !data.user) {
        throw new Error("Login response was incomplete. Please try again.");
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      window.dispatchEvent(new Event("userUpdated"));

      Swal.fire({
        icon: "success",
        title: "Welcome back!",
        text: `Logged in as ${data.user.name}.`,
        timer: 1400,
        showConfirmButton: false,
      });

      // Go back to the page the visitor wanted, otherwise their own dashboard
      navigate(from && from !== "/login" ? from : getRoleHome(data.user.role), {
        replace: true,
      });
    } catch (error) {
      console.error("Login error:", error);

      Swal.fire({
        icon: "error",
        title: "Login Failed",
        text: error.message || "Something went wrong!",
        confirmButtonColor: "#0F6E56",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Forgot password: ask for the email and call the backend
  const handleForgotPassword = async () => {
    const result = await Swal.fire({
      title: "Reset your password",
      input: "email",
      inputLabel: "Enter the email linked to your account",
      inputPlaceholder: "you@example.com",
      inputValue: EMAIL_REGEX.test(email.trim()) ? email.trim() : "",
      showCancelButton: true,
      confirmButtonText: "Send reset link",
      confirmButtonColor: "#0F6E56",
      showLoaderOnConfirm: true,
      allowOutsideClick: () => !Swal.isLoading(),
      preConfirm: async (value) => {
        const resetEmail = (value || "").trim().toLowerCase();

        try {
          const res = await fetch(`${API_URL}/api/v1/auth/forgot-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: resetEmail }),
          });

          const data = await res.json().catch(() => ({}));

          if (!res.ok) {
            throw new Error(data.message || "Could not send reset email.");
          }

          return data;
        } catch (error) {
          Swal.showValidationMessage(error.message);
        }
      },
    });

    if (result.isConfirmed && result.value) {
      Swal.fire({
        icon: "success",
        title: "Check your inbox",
        text: result.value.message,
        confirmButtonColor: "#0F6E56",
      });
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
              Welcome back
            </h1>
            <p className="mt-2 mb-7 text-[15px] leading-relaxed text-gray-500">
              Sign in to access your dashboard, appointments, and AI health
              tools.
            </p>

            {/* Shown when a visitor was redirected from a protected page */}
            {redirectMessage && (
              <div
                role="status"
                className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
              >
                {redirectMessage}
              </div>
            )}

            {/* Role selector */}
            <div
              role="radiogroup"
              aria-label="Sign in as"
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
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E56]/40 sm:gap-2 ${
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

            <form onSubmit={handleLogIn} className="space-y-5" noValidate>
              {/* Email */}
              <div>
                <label
                  htmlFor="login-email"
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
                    id="login-email"
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
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <label
                    htmlFor="login-password"
                    className="text-sm font-medium text-gray-700"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="rounded text-sm font-medium text-[#0F6E56] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E56]/40"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock
                    size={17}
                    aria-hidden="true"
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${inputBase} pl-11 pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 transition hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E56]/40"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {formError && (
                <p
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                >
                  {formError}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="h-12 w-full rounded-xl bg-[#0F6E56] text-[15px] font-semibold text-white shadow-sm shadow-emerald-900/20 transition hover:bg-[#0c5945] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0F6E56]/30 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Signing in..." : "Sign in"}
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
              Don&apos;t have an account?{" "}
              <Link
                to="/signup"
                className="font-semibold text-[#0F6E56] hover:underline"
              >
                Create one
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
          <div
            aria-hidden="true"
            className="absolute -left-20 -top-20 h-[380px] w-[380px] rounded-full bg-teal-500/10 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-16 right-0 h-[300px] w-[300px] rounded-full bg-emerald-400/10 blur-3xl"
          />

          <div className="relative z-10 flex w-full flex-col justify-between gap-6 p-10 xl:p-14 motion-safe:animate-[fadeInUp_0.8s_ease-out_0.15s_both]">
            <div>
              <p className="mb-4 text-sm font-medium text-emerald-300/80">
                Preliminary AI guidance
              </p>

              <blockquote className="max-w-md font-serif text-2xl leading-[1.45] text-white xl:text-[26px]">
                <span className="text-emerald-400">&ldquo;</span>Describe how
                you feel — our AI suggests likely causes, severity, and the
                right department to consult, in under a minute.
                <span className="text-emerald-400">&rdquo;</span>
              </blockquote>

              <div className="mt-8 flex items-center gap-4">
                <MdHealthAndSafety
                  size={44}
                  aria-hidden="true"
                  className="shrink-0 text-teal-400"
                />
                <div>
                  <h2 className="font-semibold text-white">
                    AI symptom checker
                  </h2>
                  <p className="text-sm text-emerald-100/70">
                    Fast, accurate, and secure
                  </p>
                </div>
              </div>
            </div>

            <div className="flex min-h-[200px] flex-1 items-center justify-center">
              <img
                src={doctor}
                alt="Illustration of a friendly doctor with arms crossed"
                className="h-auto max-h-[340px] w-full max-w-[460px] object-contain"
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

export default Login;

import { useState } from "react";
import {
  User,
  Stethoscope,
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Brain,
  HeartPulse,
  Wind,
  ShieldPlus,
} from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { FaHeartbeat } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import doctor from "../../assets/images/doctor-illustration.png"; // Updated import path for the doctor illustration
// import { AuthContext } from "../../Provider/AuthProvider";
// import useAxiosPublic from "../../Hook/useAxiosPublic";
// import { useContext } from "react";
// import { Helmet } from "react-helmet-async";

const ROLES = [
  { key: "patient", label: "Patient", icon: User },
  { key: "doctor", label: "Doctor", icon: Stethoscope },
  { key: "admin", label: "Admin", icon: ShieldCheck },
];

const SignUp = () => {
  // const axiosPublic = useAxiosPublic();
  const [registerError, setRegisterError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState("patient");
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();

  // const { createUser, googleLogin, setUser, updateUserProfile } = useContext(AuthContext);

  const handleRoleChange = (role) => {
    setSelectedRole(role);
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    const form = e.target;

    const name = form.name.value;
    const email = form.email.value;
    const password = form.password.value;
    const role = selectedRole;

    const userInfo = {
      name,
      email,
      password,
      role,
    };
    console.log(userInfo);

    if (password.length < 6) {
      setRegisterError("Password should be at least 6 characters");
      Swal.fire({
        icon: "error",
        text: "Password should be at least 6 characters!",
      });
      return;
    } else if (!/[A-Z]/.test(password)) {
      setRegisterError(
        "Your password should have at least one upper case letter",
      );
      Swal.fire({
        icon: "error",
        text: "Your password should have at least one upper case letter!",
      });
      return;
    } else if (!/[a-z]/.test(password)) {
      setRegisterError(
        "Your password should have at least one lower case letter",
      );
      Swal.fire({
        icon: "error",
        text: "Your password should have at least one lower case letter!",
      });
      return;
    }
    setRegisterError("");

    try {
      setSubmitting(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL}/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userInfo),
      });

      const data = await res.json();
      console.log(data);

      Swal.fire({
        icon: "success",
        text: "Account Created successfully!",
      });

      navigate("/");
    } catch (error) {
      console.log(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen mx-[300px] flex bg-[#F5F3EC] relative overflow-hidden rounded-2xl">
      {/* Decorative dot grids on the light panel */}
      <div
        className="absolute top-0 left-0 w-40 h-40 opacity-60 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, #d6d1c4 1px, transparent 1px)",
          backgroundSize: "14px 14px",
        }}
      />
      <div
        className="absolute bottom-0 left-0 w-40 h-40 opacity-60 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, #d6d1c4 1px, transparent 1px)",
          backgroundSize: "14px 14px",
        }}
      />

      {/* Left panel — form */}
      <div className=" lg:w-1/2 flex items-center justify-center px-6 py-12 sm:px-10  relative z-10">
        <div className="w-full max-w-[400px] animate-[fadeInUp_0.6s_ease-out]">
          {/* Brand mark */}
          <div className="flex items-center gap-3 mb-10">
            <div className="bg-teal-700 text-white w-12 h-12 rounded-xl flex items-center justify-center shadow-lg">
              <FaHeartbeat size={24} />
            </div>
            <div>
              <p className="font-serif font-bold text-[16px] text-[#1a1a1a] leading-tight">
                AI Healthcare
              </p>
              <p className="font-mono text-[10px] tracking-widest text-gray-500 uppercase leading-tight">
                &amp; symptom assistant
              </p>
            </div>
          </div>

          <h1 className="text-[32px] font-bold text-[#1a1a1a] font-serif mb-2 leading-tight">
            Create your account
          </h1>
          <p className="text-gray-500 mb-8 text-[15px] leading-relaxed">
            Join AI Healthcare to access your dashboard, appointments, and AI
            health tools.
          </p>

          {/* Role tabs */}
          <div className="flex mb-6 bg-white border border-gray-200 rounded-lg p-1">
            {ROLES.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => handleRoleChange(key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium rounded-md transition-all duration-200 ${
                  selectedRole === key
                    ? "bg-white border border-gray-200 shadow-sm text-[#0F6E56]"
                    : "text-gray-400 hover:text-gray-600 border border-transparent"
                }`}
              >
                <Icon size={15} strokeWidth={2} />
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Your Name
              </label>
              <div className="relative">
                <User
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="Enter your full name"
                  className="w-full h-11 pl-11 pr-4 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 outline-none transition focus:border-[#0F6E56] focus:ring-2 focus:ring-[#0F6E56]/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="Enter your email address"
                  className="w-full h-11 pl-11 pr-4 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 outline-none transition focus:border-[#0F6E56] focus:ring-2 focus:ring-[#0F6E56]/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Create a strong password"
                  className="w-full h-11 pl-11 pr-11 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 outline-none transition focus:border-[#0F6E56] focus:ring-2 focus:ring-[#0F6E56]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="font-mono mt-1.5 text-[11px] tracking-wide text-gray-400">
                Minimum 6 characters, one uppercase and one lowercase letter.
              </p>
            </div>

            {registerError && (
              <p className="text-red-600 text-sm font-medium">
                {registerError}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 rounded-lg bg-[#0F6E56] text-white text-sm font-semibold transition hover:bg-[#0c5945] active:scale-[0.99] disabled:opacity-60"
            >
              {submitting ? "Creating account..." : "Register"}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="font-mono text-[10px] tracking-widest text-gray-400 uppercase">
              Or continue with
            </span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <button
            type="button"
            /* onClick={handleGoogleLogin} */
            className="w-full h-11 rounded-lg border border-gray-200 bg-white flex items-center justify-center gap-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            <FcGoogle className="w-5 h-5" />
            Continue with Google
          </button>

          <p className="text-center text-sm text-gray-500 mt-8">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-[#0F6E56] font-semibold hover:underline"
            >
              Login
            </Link>
          </p>
        </div>
      </div>

      {/* Right panel — brand / AI showcase */}
      <div className="hidden lg:flex w-1/2 relative bg-gradient-to-br from-[#0C4A3C] to-[#062420] overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05]">
          <div
            className="w-full h-full"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
              backgroundSize: "28px 28px",
            }}
          />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-14 w-full animate-[fadeInUp_0.8s_ease-out_0.15s_both]">
          <div>
            <p className="font-mono text-[11px] tracking-[0.2em] text-emerald-300/80 uppercase mb-4">
              AI-powered healthcare
            </p>

            <blockquote className="font-serif text-[26px] leading-[1.45] text-white max-w-md">
              <span className="text-emerald-400">&ldquo;</span>Describe how you
              feel — our AI suggests likely causes, severity, and the right
              department to consult, in under a minute.
              <span className="text-emerald-400">&rdquo;</span>
              <footer className="font-mono mt-4 text-[11px] tracking-[0.2em] text-emerald-300/60 uppercase not-italic">
                Patient &bull; Symptom checker module
              </footer>
            </blockquote>
          </div>

          {/* Illustration with floating specialty cards */}
          <div className="relative flex-1 flex items-center justify-center min-h-[300px] my-6">
            <div className="absolute left-[4%] top-[14%] w-[92px] h-[76px] rounded-xl bg-white/[0.04] border border-emerald-300/20 flex flex-col justify-center gap-1.5 px-3">
              <Brain
                size={22}
                className="text-emerald-300"
                strokeWidth={1.75}
              />
              <div className="h-[3px] w-9 rounded-full bg-emerald-300/25" />
              <div className="h-[3px] w-6 rounded-full bg-emerald-300/25" />
            </div>

            <div className="absolute right-[6%] top-[8%] w-[92px] h-[76px] rounded-xl bg-white/[0.04] border border-emerald-300/20 flex flex-col justify-center gap-1.5 px-3">
              <HeartPulse
                size={22}
                className="text-emerald-300"
                strokeWidth={1.75}
              />
              <div className="h-[3px] w-9 rounded-full bg-emerald-300/25" />
              <div className="h-[3px] w-6 rounded-full bg-emerald-300/25" />
            </div>

            <div className="absolute left-[2%] bottom-[14%] w-[92px] h-[76px] rounded-xl bg-white/[0.04] border border-emerald-300/20 flex flex-col justify-center gap-1.5 px-3">
              <Wind size={22} className="text-emerald-300" strokeWidth={1.75} />
              <div className="h-[3px] w-9 rounded-full bg-emerald-300/25" />
              <div className="h-[3px] w-6 rounded-full bg-emerald-300/25" />
            </div>

            <div className="absolute right-[4%] bottom-[10%] w-11 h-11 rounded-lg bg-white/[0.04] border border-emerald-300/20 flex items-center justify-center">
              <ShieldPlus
                size={20}
                className="text-emerald-300"
                strokeWidth={1.75}
              />
            </div>

            {/* Connector dots */}
            <div className="absolute left-[24%] top-[38%] w-1.5 h-1.5 rounded-full bg-emerald-300/50" />
            <div className="absolute right-[26%] top-[34%] w-1.5 h-1.5 rounded-full bg-emerald-300/50" />
            <div className="absolute left-[22%] bottom-[30%] w-1.5 h-1.5 rounded-full bg-emerald-300/50" />

            <img
              src={doctor}
              alt="Illustration of a friendly doctor with arms crossed"
              className="relative z-10 w-full max-w-[300px] h-auto object-contain"
            />
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 max-w-md">
            <div className="flex justify-between items-center py-1.5">
              <span className="font-mono text-[11px] tracking-widest text-emerald-300/60 uppercase">
                AI confidence
              </span>
              <span className="text-white font-medium">92.4%</span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="font-mono text-[11px] tracking-widest text-emerald-300/60 uppercase">
                Suggested department
              </span>
              <span className="text-white font-medium">General Medicine</span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="font-mono text-[11px] tracking-widest text-emerald-300/60 uppercase">
                Severity level
              </span>
              <span className="text-amber-300 font-medium">Moderate</span>
            </div>
          </div>
        </div>
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

import { FcGoogle } from "react-icons/fc";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { FaHeartbeat } from "react-icons/fa";
import { MdHealthAndSafety } from "react-icons/md";
import doctor from "../../assets/images/hero.png";
const Login = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const from = location.state?.from?.pathname || "/";

  
  

  const handleLogIn = async (e) => {
    e.preventDefault();

    const form = e.target;

    const email = form.email.value;
    const password = form.password.value;

    const userInfo = {
      email,
      password,
    };

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userInfo),
      });

      const data = await res.json();

      if (data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        Swal.fire({
          icon: "success",
          text: "Login Successfully!",
        });

        navigate(from, { replace: true });
      } else {
        Swal.fire({
          icon: "error",
          text: "Please provide correct email and password!",
        });
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="min-h-screen mx-[300px] my-[10px]  grid lg:grid-cols-2 bg-[#F8F7F3] rounded-2xl">
      {/* LEFT SIDE */}

      <div className="flex justify-center items-center pt-10 px-8 ">
        <div className=" ">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-teal-700 text-white w-12 h-12 rounded-xl flex items-center justify-center shadow-lg">
              <FaHeartbeat size={24} />
            </div>

            <div>
              <h1 className="font-bold text-2xl">AI Healthcare</h1>

              <p className="text-sm text-gray-500 tracking-widest uppercase">
                Symptom Assistant
              </p>
            </div>
          </div>

          <h2 className="text-5xl font-bold text-slate-900">Welcome Back</h2>

          <p className="text-gray-500 pt-3 leading-7">
            Sign in to access your dashboard, appointments and AI healthcare
            tools.
          </p>

          {/* Role */}

          <div className="mt-6 flex rounded-xl border overflow-hidden">
            <button className="flex-1 bg-white py-3 font-semibold shadow">
              Patient
            </button>

            <button className="flex-1 py-3 text-gray-500 hover:bg-gray-100 duration-300">
              Doctor
            </button>

            <button className="flex-1 py-3 text-gray-500 hover:bg-gray-100 duration-300">
              Admin
            </button>
          </div>

          {/* Form */}

          <form onSubmit={handleLogIn} className="space-y-6 mt-8">
            <div>
              <label className="font-semibold text-gray-700">
                Email Address
              </label>

              <input
                name="email"
                type="email"
                required
                placeholder="Enter your email"
                className="pl-6 input input-bordered  border-1 border-be-cyan-400 w-full mt-2 h-14 rounded-xl"
              />
            </div>

            <div>
              <div className="flex justify-between">
                <label className="font-semibold text-gray-700">Password</label>

                <button
                  type="button"
                  className="text-teal-700 text-sm hover:underline"
                >
                  Forgot Password?
                </button>
              </div>

              <input
                name="password"
                type="password"
                required
                placeholder="Enter your password"
                className="pl-6 input input-bordered border-1 border-be-cyan-400 w-full mt-2 h-14 rounded-xl"
              />

              <p className="text-xs text-gray-400 mt-2">
                Minimum 8 characters, one number and one symbol
              </p>
            </div>

            <button className="btn w-full h-14 rounded-xl text-lg bg-teal-700 hover:bg-teal-800 text-white border-none transition duration-300 hover:scale-[1.02]">
              Sign In
            </button>
          </form>

          <div className="divider text-gray-400 text-center text-sm mt-4">
            OR CONTINUE WITH
          </div>

          <button className="btn btn-outline flex items-center justify-center w-full h-10 rounded-xl bg-white hover:bg-gray-100 mt-4">
            <FcGoogle size={28} />
            Continue with Google
          </button>

          <p className="text-center mt-4 pb-4  text-gray-500">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="text-teal-700 font-semibold hover:underline"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>

      {/* RIGHT SIDE */}

      <div className="hidden lg:flex  bg-[#0C3736] text-white relative overflow-hidden">
        {/* Background */}

        <div className="absolute w-[450px] h-[450px]  bg-teal-600/10 blur-3xl"></div>

        <div className="absolute w-[300px] h-[300px]  bg-teal-400/10 blur-3xl bottom-10 left-10"></div>

        <div className="relative flex flex-col  h-full w-full pt-12 px-8">
          <div>
            <p className="uppercase tracking-[4px] text-lg font-medium text-teal-300">
              Preliminary AI Guidance
            </p>

            <h2 className="text-xl font-normal leading-relaxed mt-4">
              "Describe how you feel — our AI suggests likely causes, severity
              and the right department to consult in under a minute."
            </h2>

            <div className="mt-10 flex items-center gap-4">
              <MdHealthAndSafety
                size={45}
                className="text-teal-400 animate-pulse"
              />

              <div>
                <h3 className="font-semibold">AI Symptom Checker</h3>

                <p className="text-gray-300">Fast • Accurate • Secure</p>
              </div>
            </div>
            <img
              src={doctor}
              alt="Illustration of a friendly doctor with arms crossed"
              className="relative pt-8  w-[600px]  h-auto object-contain"
            />
          </div>

          {/* Bottom Card */}

          <div className="bg-white/10 backdrop-blur-xl border mt-10 border-white/10 rounded-3xl p-6 hover:scale-[1.02] duration-500">
            <div className="flex justify-between ">
              <span className="text-gray-300">AI Confidence</span>

              <span className="text-xl">92.4%</span>
            </div>

            <div className="flex justify-between mb-2 ">
              <span className="text-gray-300">Suggested Department</span>

              <span>General Medicine</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-300">Severity Level</span>

              <span className="text-orange-300">Moderate</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

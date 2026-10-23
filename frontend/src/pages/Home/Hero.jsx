import { motion } from "framer-motion";
import CountUpModule from "react-countup";
import { useNavigate } from "react-router-dom";

const CountUp = CountUpModule.default;
import { useInView } from "react-intersection-observer";

import {
  FaHeartbeat,
  FaRobot,
  FaUserMd,
  FaCalendarCheck,
} from "react-icons/fa";
import hero from "../../assets/images/hero.png";

function Hero() {
  const navigate = useNavigate();
  
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.3,
  });
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#ECFDF5] via-white to-[#E0F7F4]">
      {/* Background Blur */}
      <div className="absolute top-0 left-0 w-48 h-48 lg:w-72 lg:h-72 bg-emerald-300 rounded-full blur-[100px] lg:blur-[120px] opacity-30"></div>
      <div className="absolute bottom-0 right-0 w-64 h-64 lg:w-96 lg:h-96 bg-cyan-300 rounded-full blur-[100px] lg:blur-[150px] opacity-20"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-18 items-center">
          {/* Left Side */}
          <div className="pt-10 pb-4 sm:pt-12 lg:py-16">
            <motion.div
              initial={{ opacity: 0, x: -70 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center gap-2 bg-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-full shadow-md border border-emerald-100">
                <FaRobot className="text-emerald-500" />
                <span className="text-xs sm:text-sm font-semibold text-emerald-600">
                  AI Powered Healthcare
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl text-black font-extrabold leading-tight mt-5 lg:mt-7">
                Your Health
                <br />
                Guided By
                <span className="text-emerald-500 block">Intelligent AI</span>
              </h1>

              <p className="mt-5 lg:mt-7 text-gray-600 text-base sm:text-lg leading-7 sm:leading-8 max-w-xl">
                Experience the future of healthcare with our AI-powered medical
                assistant. Analyze symptoms, book appointments, connect with
                experienced doctors, and receive personalized health guidance
                all in one secure platform.
              </p>

              <div className="mt-8 lg:mt-10 flex flex-wrap gap-3 sm:gap-5">
                <button
                  onClick={() => navigate("/dashboard/symptomChecker")}
                  className="bg-emerald-500 hover:bg-emerald-600 transition-all duration-300 text-white px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base rounded-xl font-semibold shadow-lg hover:scale-105"
                >
                  Start Symptom Check
                </button>

                <button className="border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all duration-300 px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base rounded-xl font-semibold"
                onClick={() => navigate("/about")}
                >
                  Learn More
                </button>
              </div>

              {/* Statistics */}

              <div
                ref={ref}
                className="grid grid-cols-3 gap-3 md:gap-6 mt-10 lg:mt-14"
              >
                {/* Card 1 */}
                <div className="bg-white rounded-2xl p-2 md:p-3 h-20 md:h-24 shadow-lg text-center transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:scale-105">
                  <h2 className="text-xl sm:text-3xl md:text-4xl font-bold text-emerald-500">
                    {inView && (
                      <>
                        <CountUp end={10000} duration={3} separator="," />+
                      </>
                    )}
                  </h2>

                  <p className="text-gray-500 text-[11px] sm:text-xs md:text-sm mt-2 md:mt-3 font-medium">
                    Happy Patients
                  </p>
                </div>

                {/* Card 2 */}
                <div className="bg-white rounded-2xl p-2 md:p-3 h-20 md:h-24 shadow-lg text-center transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:scale-105">
                  <h2 className="text-xl sm:text-3xl md:text-4xl font-bold text-emerald-500">
                    {inView && (
                      <>
                        <CountUp end={250} duration={3} />+
                      </>
                    )}
                  </h2>

                  <p className="text-gray-500 text-[11px] sm:text-xs md:text-sm mt-2 md:mt-3 font-medium">
                    Doctors
                  </p>
                </div>

                {/* Card 3 */}
                <div className="bg-white rounded-2xl p-2 md:p-3 h-20 md:h-24 shadow-lg text-center transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:scale-105">
                  <h2 className="text-xl sm:text-3xl md:text-4xl font-bold text-emerald-500">
                    {inView && (
                      <>
                        <CountUp end={24} duration={3} />
                        /7
                      </>
                    )}
                  </h2>

                  <p className="text-gray-500 text-[11px] sm:text-xs md:text-sm mt-2 md:mt-3 font-medium">
                    AI Support
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Side */}

          <div className="lg:self-start pt-6 pb-14 sm:pb-20 lg:py-40">
            <motion.div
              initial={{ opacity: 0, x: 70 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1 }}
              className="relative flex justify-center"
            >
              {/* Animated Circle */}

              <motion.div
                animate={{
                  scale: [1, 1.08, 1],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 lg:top-auto lg:left-auto lg:translate-x-0 lg:translate-y-0 w-[260px] h-[260px] sm:w-[360px] sm:h-[360px] lg:w-[420px] lg:h-[420px] rounded-full bg-emerald-200 opacity-30"
              ></motion.div>

              {/* Hero Image */}

              <motion.img
                animate={{
                  y: [0, -12, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                }}
                src={hero}
                alt="AI Healthcare"
                className="relative z-10 w-full max-w-[260px] sm:max-w-sm lg:max-w-lg"
              />

              {/* Floating Card 1 */}

              <motion.div
                animate={{
                  y: [0, -12, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                }}
                className="absolute z-20 top-0 left-0 sm:left-4 lg:left-[-50px] bg-white p-2 sm:p-4 rounded-xl sm:rounded-2xl shadow-xl flex items-center gap-2 sm:gap-4 lg:mr-10"
              >
                <FaHeartbeat className="text-red-500 text-xl sm:text-3xl" />

                <div>
                  <h3 className="font-bold text-xs sm:text-base">Heart Rate</h3>

                  <p className="text-[11px] sm:text-sm text-gray-500">Normal</p>
                </div>
              </motion.div>

              {/* Floating Card 2 */}

              <motion.div
                animate={{
                  y: [0, -12, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                }}
                className="absolute z-20 bottom-0 left-0 sm:left-4 lg:left-auto lg:right-[470px] bg-white p-2 sm:p-4 rounded-xl sm:rounded-2xl shadow-xl flex items-center gap-2 sm:gap-4"
              >
                <FaCalendarCheck className="text-emerald-500 text-xl sm:text-3xl" />

                <div>
                  <h3 className="font-bold text-xs sm:text-base">
                    Appointment
                  </h3>

                  <p className="text-[11px] sm:text-sm text-gray-500">
                    Book Instantly
                  </p>
                </div>
              </motion.div>

              {/* Floating Card 3 */}

              <motion.div
                animate={{
                  x: [0, 8, 0],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                }}
                className="absolute z-20 bottom-0 right-0 sm:right-4 lg:bottom-auto lg:top-0 lg:-right-10 bg-white p-2 sm:p-4 rounded-xl sm:rounded-2xl shadow-xl flex items-center gap-2 sm:gap-4"
              >
                <FaUserMd className="text-cyan-500 text-xl sm:text-3xl" />

                <div>
                  <h3 className="font-bold text-xs sm:text-base">AI Doctor</h3>

                  <p className="text-[11px] sm:text-sm text-gray-500">
                    Online 24/7
                  </p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;

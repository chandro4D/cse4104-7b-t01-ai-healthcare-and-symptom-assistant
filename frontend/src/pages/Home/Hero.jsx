import { motion } from "framer-motion";
import CountUpModule from "react-countup";

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
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.3,
  });
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#ECFDF5] via-white to-[#E0F7F4]">
      {/* Background Blur */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-emerald-300 rounded-full blur-[120px] opacity-30"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-300 rounded-full blur-[150px] opacity-20"></div>

      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-20">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          {/* Left Side */}
          <motion.div
            initial={{ opacity: 0, x: -70 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-md border border-emerald-100">
              <FaRobot className="text-emerald-500" />
              <span className="text-sm font-semibold text-emerald-600">
                AI Powered Healthcare
              </span>
            </div>

            <h1 className="text-5xl lg:text-6xl font-extrabold leading-tight mt-7">
              Your Health
              <br />
              Guided by
              <span className="text-emerald-500 block">Intelligent AI</span>
            </h1>

            <p className="mt-7 text-gray-600 text-lg leading-8 max-w-xl">
              Experience the future of healthcare with our AI-powered medical
              assistant. Analyze symptoms, book appointments, connect with
              experienced doctors, and receive personalized health guidance— all
              in one secure platform.
            </p>

            <div className="mt-10 flex flex-wrap gap-5">
              <button className="bg-emerald-500 hover:bg-emerald-600 transition-all duration-300 text-white px-8 py-4 rounded-xl font-semibold shadow-lg hover:scale-105">
                Start Symptom Check
              </button>

              <button className="border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all duration-300 px-8 py-4 rounded-xl font-semibold">
                Learn More
              </button>
            </div>

            {/* Statistics */}

            <div
              ref={ref}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-14"
            >
              {/* Card 1 */}
              <div className="bg-white rounded-2xl p-8 shadow-lg text-center transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:scale-105">
                <h2 className="text-4xl font-bold text-emerald-500">
                  {inView && (
                    <>
                      <CountUp end={10000} duration={3} separator="," />+
                    </>
                  )}
                </h2>

                <p className="text-gray-500 text-sm mt-3 font-medium">
                  Happy Patients
                </p>
              </div>

              {/* Card 2 */}
              <div className="bg-white rounded-2xl p-8 shadow-lg text-center transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:scale-105">
                <h2 className="text-4xl font-bold text-emerald-500">
                  {inView && (
                    <>
                      <CountUp end={250} duration={3} />+
                    </>
                  )}
                </h2>

                <p className="text-gray-500 text-sm mt-3 font-medium">
                  Doctors
                </p>
              </div>

              {/* Card 3 */}
              <div className="bg-white rounded-2xl p-8 shadow-lg text-center transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:scale-105">
                <h2 className="text-4xl font-bold text-emerald-500">
                  {inView && (
                    <>
                      <CountUp end={24} duration={3} />
                      /7
                    </>
                  )}
                </h2>

                <p className="text-gray-500 text-sm mt-3 font-medium">
                  AI Support
                </p>
              </div>
            </div>
          </motion.div>

          {/* Right Side */}

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
              className="absolute w-[420px] h-[420px] rounded-full bg-emerald-200 opacity-30"
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
              className="relative z-10 w-full max-w-lg"
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
              className="absolute top-0 left-[-50px] bg-white p-4 rounded-2xl shadow-xl flex items-center gap-4 mr-10"
            >
              <FaHeartbeat className="text-red-500 text-3xl" />

              <div>
                <h3 className="font-bold">Heart Rate</h3>

                <p className="text-sm text-gray-500">Normal</p>
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
              className="absolute bottom-0  right-[470px]   bg-white p-4 rounded-2xl shadow-xl flex items-center gap-4"
            >
              <FaCalendarCheck className="text-emerald-500 text-3xl" />

              <div>
                <h3 className="font-bold">Appointment</h3>

                <p className="text-sm text-gray-500">Book Instantly</p>
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
              className="absolute top-0 -right-10 bg-white p-4 rounded-2xl shadow-xl flex items-center gap-4"
            >
              <FaUserMd className="text-cyan-500 text-3xl" />

              <div>
                <h3 className="font-bold">AI Doctor</h3>

                <p className="text-sm text-gray-500">Online 24/7</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default Hero;

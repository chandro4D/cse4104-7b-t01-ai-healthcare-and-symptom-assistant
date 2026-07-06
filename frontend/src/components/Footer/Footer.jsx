import { BsTwitterX } from "react-icons/bs";
import { FaFacebookSquare } from "react-icons/fa";
import { FaSquareInstagram } from "react-icons/fa6";
import { FaLinkedin } from "react-icons/fa";
import { Activity } from "lucide-react";
function Footer() {
  return (
    <footer className="bg-[#0a1f1a] text-gray-300 pt-14 pb-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand column */}
          <div>
            <div className="flex">
              <span className=" relative flex items-center mr-3 justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 shadow-sm">
                <Activity className="w-5 h-5 text-white" strokeWidth={2.5} />
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white animate-pulse" />
              </span>
              <h2 className="text-2xl font-bold text-white">AI Healthcare</h2>
            </div>

            <p className="mt-4 text-sm text-gray-400 leading-relaxed">
              Your AI Healthcare Companion — instant symptom insights, guidance,
              and support whenever you need it.
            </p>
            <div className="flex items-center gap-4 mt-5">
              <a
                href="#"
                aria-label="Twitter"
                className="text-gray-400 hover:text-emerald-400 transition-colors"
              >
                <BsTwitterX size={18} />
              </a>
              <a
                href="#"
                aria-label="LinkedIn"
                className="text-gray-400 hover:text-emerald-400 transition-colors"
              >
                <FaLinkedin size={18} />
              </a>
              <a
                href="#"
                aria-label="Facebook"
                className="text-gray-400 hover:text-emerald-400 transition-colors"
              >
                <FaFacebookSquare size={18} />
              </a>
              <a
                href="#"
                aria-label="Instagram"
                className="text-gray-400 hover:text-emerald-400 transition-colors"
              >
                <FaSquareInstagram size={18} />
              </a>
            </div>
          </div>

          {/* Platform */}
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wider uppercase">
              Platform
            </h3>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <a
                  href="#"
                  className="hover:text-emerald-400 transition-colors"
                >
                  Symptom Checker
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-emerald-400 transition-colors"
                >
                  AI Diagnosis Assistant
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-emerald-400 transition-colors"
                >
                  Health Records
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-emerald-400 transition-colors"
                >
                  Find a Doctor
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-emerald-400 transition-colors"
                >
                  Mobile App
                </a>
              </li>
            </ul>
          </div>

          {/* For Patients & Providers */}
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wider uppercase">
              For Patients &amp; Providers
            </h3>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <a
                  href="#"
                  className="hover:text-emerald-400 transition-colors"
                >
                  For Patients
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-emerald-400 transition-colors"
                >
                  For Providers
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-emerald-400 transition-colors"
                >
                  For Hospitals
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-emerald-400 transition-colors"
                >
                  API Access
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-emerald-400 transition-colors"
                >
                  Integrations
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wider uppercase">
              Company
            </h3>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <a
                  href="#"
                  className="hover:text-emerald-400 transition-colors"
                >
                  About Us
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-emerald-400 transition-colors"
                >
                  Careers
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-emerald-400 transition-colors"
                >
                  Blog
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-emerald-400 transition-colors"
                >
                  Contact
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="hover:text-emerald-400 transition-colors"
                >
                  Press
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500">
          <p>
            &copy; {new Date().getFullYear()} AI Healthcare & Symptom Assistant.
            All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-emerald-400 transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-emerald-400 transition-colors">
              Terms of Service
            </a>
            <a href="#" className="hover:text-emerald-400 transition-colors">
              HIPAA Compliance
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;

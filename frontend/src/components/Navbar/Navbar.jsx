import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Activity, LogOutIcon, UserIcon } from "lucide-react";
import Swal from "sweetalert2";

const NAV_LINKS = [
  { label: "Home", to: "/" },
  { label: "Doctors", to: "/doctors" },
  { label: "Appointments", to: "/appointments" },
  { label: "About", to: "/about" },
];

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false); // avatar dropdown
  const location = useLocation();
  const navigate = useNavigate();
  const menuRef = useRef(null);

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  });

  // keep in sync with login/logout anywhere in the app
  useEffect(() => {
    const syncUser = () => {
      try {
        setUser(JSON.parse(localStorage.getItem("user")));
      } catch {
        setUser(null);
      }
    };
    window.addEventListener("storage", syncUser);
    window.addEventListener("userUpdated", syncUser);
    return () => {
      window.removeEventListener("storage", syncUser);
      window.removeEventListener("userUpdated", syncUser);
    };
  }, []);

  // close mobile menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  // close avatar dropdown on outside click / Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    const handleEsc = (e) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  const handleLogout = async () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    window.dispatchEvent(new Event("userUpdated"));
    setUser(null);
    setMenuOpen(false);

    await Swal.fire({
      icon: "success",
      text: "Log Out Successfully!",
    });

    navigate("/login");
  };
  return (
    <nav className="sticky top-0 bg-white shadow-sm z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <span className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 shadow-sm">
              <Activity className="w-5 h-5 text-white" strokeWidth={2.5} />
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white animate-pulse" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-2xl font-bold text-slate-900 tracking-tight">
                AI<span className="text-emerald-600">Healthcare</span>
              </span>
              <span className="hidden sm:block text-sm text-slate-400 font-medium tracking-wide mt-0.5">
                & Symptom Assistant
              </span>
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`relative px-4 py-2 text-xl font-semibold rounded-lg transition-colors duration-200 ${
                    isActive
                      ? "text-emerald-700"
                      : "text-slate-600 hover:text-emerald-700 hover:bg-emerald-50"
                  }`}
                >
                  {link.label}
                  <span
                    className={`absolute left-4 right-4 -bottom-0.5 h-0.5 rounded-full bg-emerald-500 origin-left transition-transform duration-200 ${
                      isActive ? "scale-x-100" : "scale-x-0"
                    }`}
                  />
                </Link>
              );
            })}
          </div>

          {/* Right side: CTAs / avatar */}
          <div className="hidden md:flex items-center gap-4 shrink-0">
            {!user ? (
              <>
                <Link
                  to="/login"
                  className="text-xl font-semibold text-slate-600 hover:text-emerald-700 transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="flex items-center justify-center text-xl w-36 h-11 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm shadow-emerald-600/20 transition-colors"
                >
                  Get Started
                </Link>
              </>
            ) : (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((prev) => !prev)}
                  aria-haspopup="true"
                  aria-expanded={menuOpen}
                  className="btn btn-ghost btn-circle avatar transition-all hover:ring-2 hover:ring-emerald-400"
                >
                  <div className="w-9 h-9 overflow-hidden rounded-full ring ring-offset-1 ring-slate-200">
                    {user?.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user?.name || "User"}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-semibold text-white">
                        {user?.name ? (
                          user.name.charAt(0).toUpperCase()
                        ) : (
                          <UserIcon className="h-5 w-5" />
                        )}
                      </div>
                    )}
                  </div>
                </button>

                <ul
                  className={`absolute right-0 z-[999] mt-3 w-56 origin-top-right rounded-2xl border border-slate-100 bg-white p-2 shadow-xl
                    transition-all duration-150 ease-out
                    ${menuOpen ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"}`}
                >
                  <li className="mb-1 border-b border-slate-100 px-3 py-2 text-xs text-slate-400">
                    Signed in as
                    <span className="block truncate font-semibold text-slate-800">
                      {user?.name || user?.email}
                    </span>
                  </li>
                  <li>
                    <Link
                      to="/dashboard/settings"
                      onClick={() => setMenuOpen(false)}
                      className="block rounded-xl px-3 py-2 font-medium hover:bg-slate-50"
                    >
                      Update Profile
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/dashboard"
                      onClick={() => setMenuOpen(false)}
                      className="block rounded-xl px-3 py-2 font-medium hover:bg-slate-50"
                    >
                      Dashboard
                    </Link>
                  </li>
                  <li className="mt-1 border-t border-slate-100 pt-1">
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 font-semibold text-red-600 hover:bg-red-50"
                    >
                      <LogOutIcon className="h-4 w-4" />
                      Logout
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setIsMenuOpen((open) => !open)}
            className="md:hidden p-2 -mr-2 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`md:hidden overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out ${
          isMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="border-t border-slate-100 flex flex-col gap-1 px-4 py-2">
          {NAV_LINKS.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          <div className="flex flex-col gap-1 border-t border-slate-100 pt-2 mt-1">
            {!user ? (
              <>
                <Link
                  to="/login"
                  className="text-center text-sm font-medium text-slate-600 hover:text-emerald-700 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Log in
                </Link>
                <Link
                  to="/signup"
                  className="text-center text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-2.5 transition-colors"
                >
                  Get Started
                </Link>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 px-3 py-2">
                  <div className="w-8 h-8 overflow-hidden rounded-full ring ring-offset-1 ring-slate-200 shrink-0">
                    {user?.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user?.name || "User"}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-semibold text-white">
                        {user?.name ? (
                          user.name.charAt(0).toUpperCase()
                        ) : (
                          <UserIcon className="h-4 w-4" />
                        )}
                      </div>
                    )}
                  </div>
                  <span className="truncate text-sm font-semibold text-slate-800">
                    {user?.name || user?.email}
                  </span>
                </div>
                <Link
                  to="/dashboard/settings"
                  className="px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Update Profile
                </Link>
                <Link
                  to="/dashboard"
                  className="px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  <LogOutIcon className="h-4 w-4" />
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;

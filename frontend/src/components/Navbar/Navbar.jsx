import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Activity, LogOutIcon, UserIcon } from "lucide-react";
import Swal from "sweetalert2";
import { getRoleHome, normalizeRole } from "../../utils/auth";

const NAV_LINKS = [
  { label: "Home", to: "/" },
  { label: "Doctors", to: "/doctors" },
  { label: "Appointments", to: "/appointments", patientOnly: true },
  { label: "About", to: "/about" },
];

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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

  // Normalize the current user's role.
  const role = normalizeRole(user?.role);

  // Show Appointments only to patients.
  const visibleNavLinks = NAV_LINKS.filter(
    (link) => !link.patientOnly || role === "patient",
  );

  // Keep the Navbar synchronized with login/logout.
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

  // Close menus when the route changes.
  useEffect(() => {
    setIsMenuOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  // Close the avatar menu when clicking outside or pressing Escape.
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    const handleEsc = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  // Log out the current user.
  const handleLogout = async () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    window.dispatchEvent(new Event("userUpdated"));

    setUser(null);
    setMenuOpen(false);
    setIsMenuOpen(false);

    await Swal.fire({
      icon: "success",
      text: "Log Out Successfully!",
    });

    navigate("/login", { replace: true });
  };

  // Get the correct dashboard URL for the current role.
  const dashboardPath = getRoleHome(role);

  return (
    <nav className="sticky top-0 z-50 bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4 sm:h-20">
          {/* Logo */}
          <Link to="/" className="group flex shrink-0 items-center gap-2.5">
            <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 shadow-sm">
              <Activity className="h-5 w-5 text-white" strokeWidth={2.5} />

              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse rounded-full border-2 border-white bg-emerald-400" />
            </span>

            <span className="flex flex-col leading-none">
              <span className="text-2xl font-bold tracking-tight text-slate-900">
                AI
                <span className="text-emerald-600">Healthcare</span>
              </span>

              <span className="mt-0.5 hidden text-sm font-medium tracking-wide text-slate-400 sm:block">
                & Symptom Assistant
              </span>
            </span>
          </Link>

          {/* Desktop navigation */}
          <div className="hidden items-center gap-1 md:flex">
            {visibleNavLinks.map((link) => {
              const isActive = location.pathname === link.to;

              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`relative rounded-lg px-4 py-2 text-xl font-semibold transition-colors duration-200 ${
                    isActive
                      ? "text-emerald-700"
                      : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
                  }`}
                >
                  {link.label}

                  <span
                    className={`absolute -bottom-0.5 left-4 right-4 h-0.5 origin-left rounded-full bg-emerald-500 transition-transform duration-200 ${
                      isActive ? "scale-x-100" : "scale-x-0"
                    }`}
                  />
                </Link>
              );
            })}
          </div>

          {/* Desktop login/signup or user avatar */}
          <div className="hidden shrink-0 items-center gap-4 md:flex">
            {!user ? (
              <>
                <Link
                  to="/login"
                  className="text-xl font-semibold text-slate-600 transition-colors hover:text-emerald-700"
                >
                  Login
                </Link>

                <Link
                  to="/signup"
                  className="flex h-11 w-36 items-center justify-center rounded-lg bg-emerald-600 text-xl font-semibold text-white shadow-sm shadow-emerald-600/20 transition-colors hover:bg-emerald-700"
                >
                  Get Started
                </Link>
              </>
            ) : (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((prev) => !prev)}
                  aria-haspopup="true"
                  aria-expanded={menuOpen}
                  aria-label="Open user menu"
                  className="btn btn-ghost btn-circle avatar transition-all hover:ring-2 hover:ring-emerald-400"
                >
                  <div className="h-9 w-9 overflow-hidden rounded-full ring ring-offset-1 ring-slate-200">
                    {user?.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user?.name || "User"}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
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
                  className={`absolute right-0 z-[999] mt-3 w-56 origin-top-right rounded-2xl border border-slate-100 bg-white p-2 shadow-xl transition-all duration-150 ease-out ${
                    menuOpen
                      ? "pointer-events-auto scale-100 opacity-100"
                      : "pointer-events-none scale-95 opacity-0"
                  }`}
                >
                  <li className="mb-1 border-b border-slate-100 px-3 py-2 text-xs text-slate-400">
                    Signed in as
                    <span className="block truncate font-semibold text-slate-800">
                      {user?.name || user?.email}
                    </span>
                  </li>

                  <li>
                    <Link
                      to={dashboardPath}
                      onClick={() => setMenuOpen(false)}
                      className="block rounded-xl px-3 py-2 font-medium hover:bg-slate-50"
                    >
                      Dashboard
                    </Link>
                  </li>

                  <li className="mt-1 border-t border-slate-100 pt-1">
                    <button
                      type="button"
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

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            className="-mr-2 rounded-lg p-2 text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 md:hidden"
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile navigation */}
      <div
        className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out md:hidden ${
          isMenuOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="flex flex-col gap-1 border-t border-slate-100 px-4 py-2">
          {visibleNavLinks.map((link) => {
            const isActive = location.pathname === link.to;

            return (
              <Link
                key={link.to}
                to={link.to}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          <div className="mt-1 flex flex-col gap-1 border-t border-slate-100 pt-2">
            {!user ? (
              <>
                <Link
                  to="/login"
                  className="rounded-lg px-3 py-2.5 text-center text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-emerald-700"
                >
                  Log in
                </Link>

                <Link
                  to="/signup"
                  className="rounded-lg bg-emerald-600 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                >
                  Get Started
                </Link>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 px-3 py-2">
                  <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full ring ring-offset-1 ring-slate-200">
                    {user?.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user?.name || "User"}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
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
                  to={dashboardPath}
                  onClick={() => setIsMenuOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Dashboard
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
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

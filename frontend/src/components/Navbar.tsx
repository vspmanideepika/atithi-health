import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo.png";

export const Navbar = () => {
    const { user, isAuthenticated, logout } = useAuth();

    const getDashboardPath = () => {
        if (!user) return "/";
        switch (user.role) {
            case "PATIENT":
                return "/patient-dashboard";
            case "ATTENDANT":
                return "/attendant-dashboard";
            case "HOSPITAL_ADMIN":
                return "/hospital-dashboard";
            case "ADMIN":
                return "/admin-dashboard";
            default:
                return "/";
        }
    };

    const getProfilePath = () => {
        if (!user) return "/";
        switch (user.role) {
            case "PATIENT":
                return "/profile";
            case "ATTENDANT":
                return "/attendant-profile";
            case "HOSPITAL_ADMIN":
                return "/hospital-admin-profile";
            case "ADMIN":
                return "/profile";
            default:
                return "/";
        }
    };

    const homePath = isAuthenticated ? getDashboardPath() : "/";

    const profilePath = isAuthenticated ? getProfilePath() : "/";

    return (
        <nav className="navbar">
            <div style={{ display: "flex", alignItems: "center" }}>
                <Link to={homePath}>
                    <img src={logo} alt="Atithi Health Logo" style={{ height: "75px", display: "block" }} />
                </Link>
            </div>

            <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
                <Link to={homePath} className="nav-links">
                    Home
                </Link>

                {isAuthenticated ? (
                    <>
                        <span className="nav-links">
                            Welcome, {user?.name}
                        </span>
                        {user?.role === "PATIENT" && (
                            <Link to="/patient-bookings" className="nav-links">
                                Bookings
                            </Link>
                        )}
                        {user?.role === "HOSPITAL_ADMIN" && (
                            <Link to="/hospital-bookings" className="nav-links">
                                Bookings
                            </Link>
                        )}
                        <Link to={profilePath} className="nav-links">
                            Profile
                        </Link>
                        <button onClick={logout} className="btn-secondary">
                            Logout
                        </button>
                    </>
                ) : (
                    <>
                        <Link to="/login" className="nav-links">
                            Login
                        </Link>
                    </>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
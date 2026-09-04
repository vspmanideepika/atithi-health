import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const Home: React.FC = () => {
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();

    const handleExplore = () => {
        if (isAuthenticated && user) {
            if (user.role === "PATIENT") navigate("/patient-dashboard");
            else if (user.role === "ATTENDANT") navigate("/attendant-dashboard");
            else if (user.role === "HOSPITAL_ADMIN") navigate("/hospital-dashboard");
            else if (user.role === "ADMIN") navigate("/admin-dashboard");
            else navigate("/");
        } else {
            navigate("/login");
        }
    };

    return (
        <div className="home-container">
            <div className="hero-banner">
                <span className="hero-tagline">
                    ✈️ Atithi Health Portal
                </span>
                <h1 className="hero-title">
                    World-Class Clinical Care, Bridged with Compassion
                </h1>
                <p className="hero-description">
                    Connecting international patients with leading healthcare institutions in India.
                    Match with certified coordinators who manage local stays, coordinate surgery schedules, and
                    translate medical documents for complete peace of mind.
                </p>
            </div>

            <div className="card-grid">
                <div className="card">
                    <div className="card-body">
                        <div>
                            <h5 className="card-title">Explore Medical Packages</h5>
                            <h6 className="card-subtitle mb-2 text-body-secondary">
                                Explore and Book from trusted hospitals and care providers
                            </h6>
                            <p className="card-text">
                                Search care packages, book specialized treatments, and access translated medical reports.
                            </p>
                        </div>
                        <button className="btn-primary card-btn" onClick={handleExplore}>
                            Explore Packages
                        </button>
                    </div>
                </div>
                <div className="card">
                    <div className="card-body">
                        <div>
                            <h5 className="card-title">Register Your Hospital</h5>
                            <h6 className="card-subtitle mb-2 text-body-secondary">
                                Register Your Hospital And Its Care Packages
                            </h6>
                            <p className="card-text">
                                Become a listed partner and cater to international patients seamlessly.
                            </p>
                        </div>
                        <button className="btn-primary card-btn" onClick={() => navigate("/onboard-hospital")}>
                            Partner with Us
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;
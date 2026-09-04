import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth, User } from "../../context/AuthContext";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const Profile: React.FC = () => {
    const { token, user, updateUser, logout } = useAuth();
    const navigate = useNavigate();

    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [profileData, setProfileData] = useState<User | null>(null);

    const [editForm, setEditForm] = useState({
        name: "",
        phone: "",
        nationality: "",
        passportNumber: "",
        languagesSpoken: "",
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!token) {
                setIsLoading(false);
                return;
            }

            try {
                const response = await axios.get(`${API_BASE_URL}/api/user/profile`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (response.data.success && response.data.user) {
                    const fetchedUser = response.data.user;
                    setProfileData(fetchedUser);
                    updateUser(fetchedUser);

                    setEditForm({
                        name: fetchedUser.name || "",
                        phone: fetchedUser.phone || "",
                        nationality: fetchedUser.nationality || "",
                        passportNumber: fetchedUser.passportNumber || "",
                        languagesSpoken: fetchedUser.languagesSpoken ? fetchedUser.languagesSpoken.join(", ") : "",
                    });
                }
            } catch (err: unknown) {
                console.error("Error fetching profile:", err);
                setMessage({
                    type: "error",
                    text: axios.isAxiosError(err) && err.response?.data?.message
                        ? err.response.data.message
                        : "Failed to load profile. Please refresh the page.",
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, [token]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setEditForm((prev) => ({
            ...prev,
            [name]: value,
        }));

        if (errors[name]) {
            setErrors((prev) => ({
                ...prev,
                [name]: "",
            }));
        }
    };

    const validateForm = () => {
        const formErrors: Record<string, string> = {};
        if (!editForm.name.trim()) {
            formErrors.name = "Full Name is required";
        }
        return formErrors;
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const validationErrors = validateForm();

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setIsSubmitting(true);
        setMessage(null);

        const languagesArray = editForm.languagesSpoken
            .split(",")
            .map((lang) => lang.trim())
            .filter((lang) => lang.length > 0);

        try {
            const response = await axios.put(
                `${API_BASE_URL}/api/user/profile`,
                {
                    name: editForm.name,
                    phone: editForm.phone || null,
                    nationality: editForm.nationality || null,
                    passportNumber: editForm.passportNumber || null,
                    languagesSpoken: languagesArray.length > 0 ? languagesArray : null,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (response.data.success && response.data.user) {
                const updatedUser = response.data.user;
                setProfileData(updatedUser);
                updateUser(updatedUser);
                setIsEditing(false);
                setMessage({
                    type: "success",
                    text: "Profile updated successfully!",
                });
                setTimeout(() => {
                    window.location.reload();
                }, 100);
            }
        } catch (err: unknown) {
            console.error("Error updating profile:", err);
            setMessage({
                type: "error",
                text: axios.isAxiosError(err) && err.response?.data?.message
                    ? err.response.data.message
                    : "Failed to update profile. Please try again.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        if (profileData) {
            setEditForm({
                name: profileData.name || "",
                phone: profileData.phone || "",
                nationality: profileData.nationality || "",
                passportNumber: profileData.passportNumber || "",
                languagesSpoken: profileData.languagesSpoken ? profileData.languagesSpoken.join(", ") : "",
            });
        }
        setErrors({});
        setIsEditing(false);
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return "N/A";
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
            });
        } catch (e) {
            return dateStr;
        }
    };

    const formatRole = (roleName?: string) => {
        if (!roleName) return "";
        return roleName.replace("_", " ");
    };

    const getRoleBadgeClass = (roleName?: string) => {
        if (!roleName) return "badge-patient";
        switch (roleName.toUpperCase()) {
            case "PATIENT":
                return "badge-patient";
            case "ATTENDANT":
                return "badge-attendant";
            case "HOSPITAL_ADMIN":
                return "badge-hospital-admin";
            case "ADMIN":
                return "badge-admin";
            default:
                return "badge-patient";
        }
    };

    const redirectToDashboard = () => {
        if (!user) return;
        switch (user.role) {
            case "PATIENT":
                navigate("/patient-dashboard");
                break;
            case "ATTENDANT":
                navigate("/attendant-dashboard");
                break;
            case "HOSPITAL_ADMIN":
                navigate("/hospital-dashboard");
                break;
            case "ADMIN":
                navigate("/admin-dashboard");
                break;
            default:
                navigate("/");
        }
    };

    if (isLoading) {
        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh", fontFamily: "Poppins, sans-serif" }}>
                <div style={{ textAlign: "center" }}>
                    <div style={{ border: "4px solid #f3f3f3", borderTop: "4px solid var(--primary-color)", borderRadius: "50%", width: "40px", height: "40px", animation: "spin 1s linear infinite", margin: "0 auto 10px" }} />
                    <p style={{ color: "var(--text-muted)", fontSize: "16px" }}>Loading Profile...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div style={{ textAlign: "center", padding: "50px", fontFamily: "Poppins, sans-serif" }}>
                <h2>Access Denied</h2>
                <p>Please log in to view this page.</p>
                <button className="btn-primary" onClick={() => navigate("/login")}>Go to Login</button>
            </div>
        );
    }

    const currentProfile = profileData || user;
    const nameInitial = currentProfile.name ? currentProfile.name.charAt(0) : "?";

    return (
        <div className="profile-layout">
            {/* Sidebar Profile Card */}
            <div className="profile-sidebar">
                <div className="profile-card">
                    <div className="profile-avatar-circle">{nameInitial}</div>
                    <h3 className="profile-name">{currentProfile.name}</h3>
                    <p className="profile-email">{currentProfile.email}</p>
                    <span className={`badge ${getRoleBadgeClass(currentProfile.role)}`}>
                        {formatRole(currentProfile.role)}
                    </span>

                    <div className="profile-meta-info">
                        <div className="meta-row">
                            <span className="meta-label">Joined</span>
                            <span className="meta-value">{formatDate((currentProfile as { createdAt?: string }).createdAt)}</span>
                        </div>
                        {currentProfile.hospital && (
                            <div className="meta-row">
                                <span className="meta-label">Hospital</span>
                                <span className="meta-value">{currentProfile.hospital.name}</span>
                            </div>
                        )}
                        {currentProfile.program && (
                            <div className="meta-row">
                                <span className="meta-label">Specialty</span>
                                <span className="meta-value">{currentProfile.program.name}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <button className="btn-primary" onClick={redirectToDashboard} style={{ width: "100%" }}>
                        Go to Dashboard
                    </button>
                    <button className="btn-secondary" onClick={logout} style={{ width: "100%" }}>
                        Log Out
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="profile-details-card">
                <div className="profile-card-title">
                    <span>Account Details</span>
                    {!isEditing && (
                        <button className="profile-edit-btn" onClick={() => setIsEditing(true)}>
                            Edit Profile
                        </button>
                    )}
                </div>

                {message && (
                    <div className={message.type === "success" ? "success-message" : "general-error"}>
                        {message.text}
                    </div>
                )}

                {!isEditing ? (
                    <div className="profile-details-grid">
                        <div className="profile-detail-item">
                            <span className="detail-label">Full Name</span>
                            <div className="detail-value">{currentProfile.name}</div>
                        </div>

                        <div className="profile-detail-item">
                            <span className="detail-label">Email Address</span>
                            <div className="detail-value">{currentProfile.email}</div>
                        </div>

                        <div className="profile-detail-item">
                            <span className="detail-label">Phone Number</span>
                            <div className="detail-value">{currentProfile.phone || "Not Provided"}</div>
                        </div>

                        <div className="profile-detail-item">
                            <span className="detail-label">Nationality</span>
                            <div className="detail-value">{currentProfile.nationality || "Not Provided"}</div>
                        </div>

                        <div className="profile-detail-item">
                            <span className="detail-label">Passport Number</span>
                            <div className="detail-value">{currentProfile.passportNumber || "Not Provided"}</div>
                        </div>

                        <div className="profile-detail-item" style={{ gridColumn: "1 / -1" }}>
                            <span className="detail-label">Languages Spoken</span>
                            <div className="detail-value" style={{ border: "none", padding: 0, backgroundColor: "transparent" }}>
                                {currentProfile.languagesSpoken && currentProfile.languagesSpoken.length > 0 ? (
                                    <div className="detail-tags">
                                        {currentProfile.languagesSpoken.map((lang, index) => (
                                            <span key={index} className="detail-tag">{lang}</span>
                                        ))}
                                    </div>
                                ) : (
                                    <span style={{ color: "var(--text-muted)", fontStyle: "italic", fontSize: "0.95rem" }}>None specified</span>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSave} className="booking-form">
                        <div className="profile-details-grid">
                            <div className="input-group">
                                <label htmlFor="name">Full Name *</label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={editForm.name}
                                    onChange={handleInputChange}
                                    className={`booking-input ${errors.name ? "error" : ""}`}
                                />
                                {errors.name && <span className="error-text">{errors.name}</span>}
                            </div>

                            <div className="input-group">
                                <label htmlFor="phone">Phone Number</label>
                                <input
                                    type="text"
                                    id="phone"
                                    name="phone"
                                    value={editForm.phone}
                                    onChange={handleInputChange}
                                    placeholder="+1-234-567-8900"
                                    className="booking-input"
                                />
                            </div>

                            <div className="input-group">
                                <label htmlFor="nationality">Nationality</label>
                                <input
                                    type="text"
                                    id="nationality"
                                    name="nationality"
                                    value={editForm.nationality}
                                    onChange={handleInputChange}
                                    placeholder="e.g. Canadian"
                                    className="booking-input"
                                />
                            </div>

                            <div className="input-group">
                                <label htmlFor="passportNumber">Passport Number</label>
                                <input
                                    type="text"
                                    id="passportNumber"
                                    name="passportNumber"
                                    value={editForm.passportNumber}
                                    onChange={handleInputChange}
                                    placeholder="Passport or Govt ID ID"
                                    className="booking-input"
                                />
                            </div>

                            <div className="input-group" style={{ gridColumn: "1 / -1" }}>
                                <label htmlFor="languagesSpoken">Languages Spoken (comma separated)</label>
                                <input
                                    type="text"
                                    id="languagesSpoken"
                                    name="languagesSpoken"
                                    value={editForm.languagesSpoken}
                                    onChange={handleInputChange}
                                    placeholder="e.g. English, French, Spanish"
                                    className="booking-input"
                                />
                                <span style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                                    Separate each language with a comma.
                                </span>
                            </div>
                        </div>

                        <div className="profile-action-buttons">
                            <button type="submit" className="btn-primary" disabled={isSubmitting}>
                                {isSubmitting ? "Saving..." : "Save Changes"}
                            </button>
                            <button type="button" className="btn-secondary" onClick={handleCancel} disabled={isSubmitting}>
                                Cancel
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* Spinner Keyframes */}
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default Profile;
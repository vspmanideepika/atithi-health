import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";

interface BookingBreakdown {
    pending: number;
    confirmed: number;
    completed: number;
    cancelled: number;
}

interface PlatformAnalytics {
    totalHospitals: number;
    totalPackages: number;
    totalPrograms: number;
    totalAttendants: number;
    bookingVolume: {
        total: number;
        pending: number;
        confirmed: number;
        completed: number;
        cancelled: number;
        activeBookedSlots: number;
        capacityUtilizationPercentage: number;
    };
    satisfactionScore: {
        averageRating: number | null;
        totalReviews: number;
        ratingDistribution: Record<number, number>;
    };
}

interface HospitalAuditItem {
    id: string;
    name: string;
    location: string;
    createdAt: string;
    admin: {
        id: string;
        name: string;
        email: string;
        phone: string;
    } | null;
    programsCount: number;
    packagesCount: number;
    attendantsCount: number;
    totalBookings: number;
    bookingBreakdown: BookingBreakdown;
    completedBookings: number;
    completionRate: number;
    averageRating: number | null;
    totalReviews: number;
}

interface InspectionProgram {
    id: string;
    name: string;
    description: string;
    createdAt: string;
}

interface InspectionPackage {
    id: string;
    title: string;
    description: string;
    programName: string;
    maxGroupCapacity: number;
    status: string;
    arrivalDate: string;
    mediaUrl: string | null;
    bookingsCount: number;
}

interface InspectionCoordinator {
    id: string;
    name: string;
    email: string;
    phone: string;
    languagesSpoken: string[];
}

interface InspectionReview {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    patientName: string;
    tripTitle: string;
}

interface HospitalInspectionDetails {
    id: string;
    name: string;
    location: string;
    createdAt: string;
    admin: {
        id: string;
        name: string;
        email: string;
        phone: string;
    } | null;
    performance: {
        totalBookings: number;
        pending: number;
        confirmed: number;
        completed: number;
        cancelled: number;
        completionRate: number;
        averageRating: number | null;
        totalReviews: number;
    };
    programs: InspectionProgram[];
    packages: InspectionPackage[];
    attendants: InspectionCoordinator[];
    reviews: InspectionReview[];
}

export const SystemAdminDashboard: React.FC = () => {
    const { user, token } = useAuth();

    const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
    const [hospitals, setHospitals] = useState<HospitalAuditItem[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Modal state
    const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null);
    const [inspectionData, setInspectionData] = useState<HospitalInspectionDetails | null>(null);
    const [isModalLoading, setIsModalLoading] = useState<boolean>(false);
    const [activeModalTab, setActiveModalTab] = useState<"programs" | "packages" | "coordinators" | "reviews">("programs");

    const fetchDashboardData = async () => {
        setIsLoading(true);
        setErrorMessage(null);
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };

            const [analyticsRes, hospitalsRes] = await Promise.all([
                axios.get("http://localhost:5000/api/admin/analytics", config),
                axios.get("http://localhost:5000/api/admin/hospitals", config),
            ]);

            if (analyticsRes.data.success) {
                setAnalytics(analyticsRes.data.analytics);
            }
            if (hospitalsRes.data.success) {
                setHospitals(hospitalsRes.data.hospitals);
            }
        } catch (err: any) {
            console.error("Failed to load admin dashboard data:", err);
            setErrorMessage(err.response?.data?.message || "Failed to load platform analytics. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, [token]);

    const handleInspectHospital = async (hospitalId: string) => {
        setSelectedHospitalId(hospitalId);
        setIsModalLoading(true);
        setActiveModalTab("programs");
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };
            const res = await axios.get(`http://localhost:5000/api/admin/hospitals/${hospitalId}`, config);
            if (res.data.success) {
                setInspectionData(res.data.hospitalDetails);
            }
        } catch (err) {
            console.error("Failed to load hospital inspection details:", err);
        } finally {
            setIsModalLoading(false);
        }
    };

    const handleCloseModal = () => {
        setSelectedHospitalId(null);
        setInspectionData(null);
    };

    const renderRatingStars = (rating: number) => {
        const fullStars = Math.floor(rating);
        const hasHalf = rating % 1 >= 0.5;
        const stars = [];

        for (let i = 0; i < fullStars; i++) {
            stars.push(<span key={`full-${i}`} className="star-gold">★</span>);
        }
        if (hasHalf) {
            stars.push(<span key="half" className="star-gold">★</span>);
        }
        const remaining = 5 - stars.length;
        for (let i = 0; i < remaining; i++) {
            stars.push(<span key={`empty-${i}`} style={{ color: "#cbd5e1" }}>★</span>);
        }
        return stars;
    };

    return (
        <div style={{ maxWidth: "1100px", margin: "40px auto", padding: "0 20px" }}>
            {/* Clean Standard Header Row (matching Hospital Admin Portal) */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #e2e8f0", paddingBottom: "20px", marginBottom: "25px", flexWrap: "wrap", gap: "15px" }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: "28px", color: "#0A4EA3", fontWeight: 700 }}>Admin Portal</h1>
                    <p style={{ margin: "5px 0 0", color: "#64748b", fontSize: "15px" }}>
                        Platform metrics, partner hospital directory, and clinical quality audits
                    </p>
                </div>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <span className="badge badge-admin" style={{ fontSize: "13px", padding: "6px 14px" }}>
                        Admin: {user?.name}
                    </span>
                    <button
                        onClick={fetchDashboardData}
                        className="profile-edit-btn"
                        style={{ padding: "8px 16px", fontSize: "14px", backgroundColor: "#0284c7" }}
                    >
                        🔄 Refresh Stats
                    </button>
                </div>
            </div>

            {errorMessage && (
                <div className="general-error" style={{ marginBottom: "24px" }}>
                    {errorMessage}
                </div>
            )}

            {isLoading && !analytics ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: "#64748b" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "12px" }}>⏳</div>
                    <h3>Loading Platform Analytics & Partner Audit Grid...</h3>
                </div>
            ) : (
                <>
                    {/* SECTION 1: Global Platform Analytics (KPI Overview Cards) */}
                    <div className="section-heading-container">
                        <div>
                            <h2 className="section-title">
                                <span>📊</span> Global Platform Analytics
                            </h2>
                            <p className="section-subtitle">
                                Macro-level metrics across all onboarded medical institutions and patient journeys
                            </p>
                        </div>
                    </div>

                    <div className="kpi-grid">
                        {/* 1. Total Onboarded Hospitals */}
                        <div className="kpi-card hospitals">
                            <div>
                                <div className="kpi-header">
                                    <h3 className="kpi-title">Onboarded Hospitals</h3>
                                    <div className="kpi-icon-box hospitals">🏥</div>
                                </div>
                                <div className="kpi-value-row">
                                    <span className="kpi-number">{analytics?.totalHospitals || 0}</span>
                                    <span className="kpi-unit">Institutions</span>
                                </div>
                                <p className="kpi-description">
                                    Count of all registered medical institutions in India providing care.
                                </p>
                            </div>
                            <div className="kpi-footer">
                                <div style={{ fontSize: "0.82rem", color: "#0369a1", fontWeight: 600 }}>
                                    ✓ {analytics?.totalPrograms || 0} Active Specialty Departments
                                </div>
                            </div>
                        </div>

                        {/* 2. Global Package Listings */}
                        <div className="kpi-card packages">
                            <div>
                                <div className="kpi-header">
                                    <h3 className="kpi-title">Global Packages</h3>
                                    <div className="kpi-icon-box packages">📦</div>
                                </div>
                                <div className="kpi-value-row">
                                    <span className="kpi-number">{analytics?.totalPackages || 0}</span>
                                    <span className="kpi-unit">Care Plans</span>
                                </div>
                                <p className="kpi-description">
                                    Total care packages listed across all specialty departments.
                                </p>
                            </div>
                            <div className="kpi-footer">
                                <div style={{ fontSize: "0.82rem", color: "#059669", fontWeight: 600 }}>
                                    ✓ {analytics?.totalAttendants || 0} Registered Coordinators
                                </div>
                            </div>
                        </div>

                        {/* 3. Total Booking Volume */}
                        <div className="kpi-card bookings">
                            <div>
                                <div className="kpi-header">
                                    <h3 className="kpi-title">Booking Volume</h3>
                                    <div className="kpi-icon-box bookings">📋</div>
                                </div>
                                <div className="kpi-value-row">
                                    <span className="kpi-number">{analytics?.bookingVolume.total || 0}</span>
                                    <span className="kpi-unit">Reservations</span>
                                </div>
                                <p className="kpi-description">
                                    Total reservations broken down by patient booking status.
                                </p>
                                <div className="status-chip-list">
                                    <span className="status-chip pending">
                                        Pending: {analytics?.bookingVolume.pending || 0}
                                    </span>
                                    <span className="status-chip confirmed">
                                        Confirmed: {analytics?.bookingVolume.confirmed || 0}
                                    </span>
                                    <span className="status-chip completed">
                                        Completed: {analytics?.bookingVolume.completed || 0}
                                    </span>
                                    <span className="status-chip cancelled">
                                        Cancelled: {analytics?.bookingVolume.cancelled || 0}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 4. Platform Satisfaction Score */}
                        <div className="kpi-card satisfaction">
                            <div>
                                <div className="kpi-header">
                                    <h3 className="kpi-title">Satisfaction Score</h3>
                                    <div className="kpi-icon-box satisfaction">⭐</div>
                                </div>
                                <div className="kpi-value-row">
                                    <span className="kpi-number">
                                        {analytics?.satisfactionScore.averageRating ? analytics.satisfactionScore.averageRating.toFixed(1) : "—"}
                                    </span>
                                    <span className="kpi-unit">/ 5.0</span>
                                </div>
                                <p className="kpi-description">
                                    Overall average rating computed across all patient clinical reviews.
                                </p>
                                <div className="star-rating-summary">
                                    {analytics?.satisfactionScore.averageRating ? (
                                        <>
                                            <div>{renderRatingStars(analytics.satisfactionScore.averageRating)}</div>
                                            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#b45309" }}>
                                                ({analytics.satisfactionScore.averageRating} / 5)
                                            </span>
                                        </>
                                    ) : (
                                        <span style={{ fontSize: "0.85rem", color: "#64748b" }}>No clinical reviews yet</span>
                                    )}
                                </div>
                            </div>
                            <div className="kpi-footer">
                                <div style={{ fontSize: "0.82rem", color: "#b45309", fontWeight: 600 }}>
                                    📝 Based on {analytics?.satisfactionScore.totalReviews || 0} Verified Reviews
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: Partner Hospital Audit & Performance Grid */}
                    <div className="section-heading-container" style={{ marginTop: "20px" }}>
                        <div>
                            <h2 className="section-title">
                                <span>🏥</span> Partner Hospital Audit & Performance Grid
                            </h2>
                            <p className="section-subtitle">
                                Comprehensive institutional directory with performance benchmarks, completion rates & quality audit records
                            </p>
                        </div>
                    </div>

                    {hospitals.length === 0 ? (
                        <div style={{ backgroundColor: "#ffffff", padding: "40px", borderRadius: "12px", textAlign: "center", border: "1px solid #e2e8f0" }}>
                            <h3>No partner hospitals registered yet</h3>
                            <p style={{ color: "#64748b" }}>Registered medical institutions will appear here.</p>
                        </div>
                    ) : (
                        <div className="audit-grid">
                            {hospitals.map((hospital) => (
                                <div key={hospital.id} className="audit-card">
                                    <div>
                                        {/* Card Header */}
                                        <div className="audit-card-header">
                                            <div className="hospital-badge-top">
                                            </div>
                                            <h3 className="audit-hospital-name">{hospital.name}</h3>
                                            <p className="audit-hospital-location">
                                                <span>📌</span> {hospital.location}
                                            </p>
                                        </div>

                                        {/* Registered Administrator */}
                                        <div className="admin-rep-box">
                                            <div className="admin-rep-label">Registered Administrator</div>
                                            {hospital.admin ? (
                                                <>
                                                    <div className="admin-rep-name">👤 {hospital.admin.name}</div>
                                                    <div className="admin-rep-email">✉️ {hospital.admin.email}</div>
                                                    {hospital.admin.phone && hospital.admin.phone !== "Not specified" && (
                                                        <div className="admin-rep-email">📞 {hospital.admin.phone}</div>
                                                    )}
                                                </>
                                            ) : (
                                                <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>No administrator registered</div>
                                            )}
                                        </div>

                                        {/* Metrics Row */}
                                        <div className="audit-metrics-row">
                                            <div className="audit-metric-box">
                                                <div className="audit-metric-num">{hospital.programsCount}</div>
                                                <div className="audit-metric-label">Departments</div>
                                            </div>
                                            <div className="audit-metric-box">
                                                <div className="audit-metric-num">{hospital.packagesCount}</div>
                                                <div className="audit-metric-label">Packages</div>
                                            </div>
                                            <div className="audit-metric-box">
                                                <div className="audit-metric-num">{hospital.totalBookings}</div>
                                                <div className="audit-metric-label">Bookings</div>
                                            </div>
                                        </div>

                                        {/* Completion Rate Bar */}
                                        <div className="completion-rate-bar-container">
                                            <div className="completion-rate-header">
                                                <span>Trip Completion Rate</span>
                                                <span style={{ color: "#059669", fontWeight: 700 }}>
                                                    {hospital.completionRate}% ({hospital.completedBookings}/{hospital.totalBookings})
                                                </span>
                                            </div>
                                            <div className="completion-rate-bar">
                                                <div
                                                    className="completion-rate-fill"
                                                    style={{ width: `${hospital.completionRate}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Inspect Hospital Action */}
                                    <button
                                        onClick={() => handleInspectHospital(hospital.id)}
                                        className="btn-inspect-hospital"
                                    >
                                        <span>🔍</span> Inspect Hospital
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* SECTION 3: "Inspect Hospital" Modal */}
            {selectedHospitalId && (
                <div className="modal-overlay" onClick={handleCloseModal}>
                    <div className="modal-content-card" onClick={(e) => e.stopPropagation()}>
                        {/* Clean Modal Header */}
                        <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "flex-start", backgroundColor: "#ffffff", borderTopLeftRadius: "16px", borderTopRightRadius: "16px" }}>
                            <div>
                                <span style={{ fontSize: "0.8rem", color: "#0A4EA3", fontWeight: 700, textTransform: "uppercase" }}>
                                    Institutional Dossier & Quality Audit
                                </span>
                                <h2 style={{ margin: "4px 0 0", fontSize: "22px", color: "#0f172a", fontWeight: 700 }}>
                                    🏥 {inspectionData?.name || "Hospital Inspection"}
                                </h2>
                                <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "14px" }}>
                                    📍 {inspectionData?.location} • Registered On: {inspectionData ? new Date(inspectionData.createdAt).toLocaleDateString() : ""}
                                </p>
                            </div>
                            <button onClick={handleCloseModal} style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: "#64748b", padding: "4px 8px" }} title="Close modal">
                                ✕
                            </button>
                        </div>

                        {/* Modal Tab Navigation */}
                        <div className="modal-tabs-bar">
                            <button
                                className={`modal-tab-button ${activeModalTab === "programs" ? "active" : ""}`}
                                onClick={() => setActiveModalTab("programs")}
                            >
                                🩺 Specialty Programs ({inspectionData?.programs.length || 0})
                            </button>
                            <button
                                className={`modal-tab-button ${activeModalTab === "packages" ? "active" : ""}`}
                                onClick={() => setActiveModalTab("packages")}
                            >
                                📦 Care Packages ({inspectionData?.packages.length || 0})
                            </button>
                            <button
                                className={`modal-tab-button ${activeModalTab === "coordinators" ? "active" : ""}`}
                                onClick={() => setActiveModalTab("coordinators")}
                            >
                                👥 Coordinators ({inspectionData?.attendants.length || 0})
                            </button>
                            <button
                                className={`modal-tab-button ${activeModalTab === "reviews" ? "active" : ""}`}
                                onClick={() => setActiveModalTab("reviews")}
                            >
                                ⭐ Patient Reviews ({inspectionData?.reviews.length || 0})
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="modal-body-content">
                            {isModalLoading ? (
                                <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b" }}>
                                    <div style={{ fontSize: "1.8rem", marginBottom: "8px" }}>⏳</div>
                                    <p>Loading institutional audit details...</p>
                                </div>
                            ) : inspectionData ? (
                                <>
                                    {/* High level summary strip */}
                                    <div className="inspect-summary-banner">
                                        <div className="inspect-summary-item">
                                            <span className="inspect-summary-label">Administrator</span>
                                            <span className="inspect-summary-val" style={{ fontSize: "1rem" }}>
                                                {inspectionData.admin ? inspectionData.admin.name : "N/A"}
                                            </span>
                                            <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                                                {inspectionData.admin?.email}
                                            </span>
                                        </div>
                                        <div className="inspect-summary-item">
                                            <span className="inspect-summary-label">Total Reservations</span>
                                            <span className="inspect-summary-val">
                                                {inspectionData.performance.totalBookings} Bookings
                                            </span>
                                            <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                                                {inspectionData.performance.confirmed} Confirmed • {inspectionData.performance.completed} Completed
                                            </span>
                                        </div>
                                        <div className="inspect-summary-item">
                                            <span className="inspect-summary-label">Completion Rate</span>
                                            <span className="inspect-summary-val" style={{ color: "#059669" }}>
                                                {inspectionData.performance.completionRate}%
                                            </span>
                                            <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                                                {inspectionData.performance.completed} Successful Trips
                                            </span>
                                        </div>
                                        <div className="inspect-summary-item">
                                            <span className="inspect-summary-label">Patient Rating</span>
                                            <span className="inspect-summary-val" style={{ color: "#d97706" }}>
                                                {inspectionData.performance.averageRating ? `⭐ ${inspectionData.performance.averageRating} / 5` : "No ratings"}
                                            </span>
                                            <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                                                {inspectionData.performance.totalReviews} Reviews
                                            </span>
                                        </div>
                                    </div>

                                    {/* TAB 1: Programs */}
                                    {activeModalTab === "programs" && (
                                        <div>
                                            <h4 style={{ margin: "0 0 16px 0", fontSize: "1.1rem", color: "#0f172a" }}>
                                                Active Specialty Departments ({inspectionData.programs.length})
                                            </h4>
                                            {inspectionData.programs.length === 0 ? (
                                                <div style={{ padding: "20px", backgroundColor: "#f8fafc", borderRadius: "8px", textAlign: "center", color: "#64748b" }}>
                                                    No specialty programs configured for this hospital yet.
                                                </div>
                                            ) : (
                                                <div className="inspect-items-grid">
                                                    {inspectionData.programs.map((prog) => (
                                                        <div key={prog.id} className="inspect-card-item">
                                                            <h5 className="inspect-card-title">🩺 {prog.name}</h5>
                                                            <p className="inspect-card-desc">{prog.description}</p>
                                                            <div className="inspect-card-meta">
                                                                <span>Department ID: {prog.id.substring(0, 8)}...</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* TAB 2: Care Packages */}
                                    {activeModalTab === "packages" && (
                                        <div>
                                            <h4 style={{ margin: "0 0 16px 0", fontSize: "1.1rem", color: "#0f172a" }}>
                                                Listed Care Packages & Surgical Trips ({inspectionData.packages.length})
                                            </h4>
                                            {inspectionData.packages.length === 0 ? (
                                                <div style={{ padding: "20px", backgroundColor: "#f8fafc", borderRadius: "8px", textAlign: "center", color: "#64748b" }}>
                                                    No care packages listed for this hospital yet.
                                                </div>
                                            ) : (
                                                <div className="inspect-items-grid">
                                                    {inspectionData.packages.map((pkg) => (
                                                        <div key={pkg.id} className="inspect-card-item">
                                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                                                                <h5 className="inspect-card-title">📦 {pkg.title}</h5>
                                                                <span className="status-chip confirmed" style={{ fontSize: "0.72rem" }}>
                                                                    {pkg.status}
                                                                </span>
                                                            </div>
                                                            <p className="inspect-card-desc">{pkg.description}</p>
                                                            <div className="inspect-card-meta">
                                                                <span>🩺 Department: <strong>{pkg.programName}</strong></span>
                                                                <span>👥 Max Intake: <strong>{pkg.maxGroupCapacity} patients</strong></span>
                                                                <span>📅 Intake Date: <strong>{new Date(pkg.arrivalDate).toLocaleDateString()}</strong></span>
                                                                <span>📋 Bookings: <strong>{pkg.bookingsCount}</strong></span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* TAB 3: Coordinators / Attendants */}
                                    {activeModalTab === "coordinators" && (
                                        <div>
                                            <h4 style={{ margin: "0 0 16px 0", fontSize: "1.1rem", color: "#0f172a" }}>
                                                Registered Medical Coordinators (Attendants) ({inspectionData.attendants.length})
                                            </h4>
                                            {inspectionData.attendants.length === 0 ? (
                                                <div style={{ padding: "20px", backgroundColor: "#f8fafc", borderRadius: "8px", textAlign: "center", color: "#64748b" }}>
                                                    No medical coordinators (attendants) registered for this hospital yet.
                                                </div>
                                            ) : (
                                                <div className="inspect-items-grid">
                                                    {inspectionData.attendants.map((att) => (
                                                        <div key={att.id} className="inspect-card-item">
                                                            <h5 className="inspect-card-title">👤 {att.name}</h5>
                                                            <p style={{ margin: "0 0 6px 0", fontSize: "0.88rem", color: "#475569" }}>
                                                                ✉️ {att.email} {att.phone && att.phone !== "Not specified" && `• 📞 ${att.phone}`}
                                                            </p>
                                                            <div style={{ marginTop: "10px" }}>
                                                                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                                                                    Languages Spoken:
                                                                </span>
                                                                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
                                                                    {att.languagesSpoken.map((lang, idx) => (
                                                                        <span key={idx} className="detail-tag" style={{ fontSize: "0.78rem" }}>
                                                                            🗣️ {lang}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* TAB 4: Patient Reviews */}
                                    {activeModalTab === "reviews" && (
                                        <div>
                                            <h4 style={{ margin: "0 0 16px 0", fontSize: "1.1rem", color: "#0f172a" }}>
                                                Patient Clinical Reviews & Quality Feedback ({inspectionData.reviews.length})
                                            </h4>
                                            {inspectionData.reviews.length === 0 ? (
                                                <div style={{ padding: "20px", backgroundColor: "#f8fafc", borderRadius: "8px", textAlign: "center", color: "#64748b" }}>
                                                    No clinical reviews submitted for this hospital yet.
                                                </div>
                                            ) : (
                                                <div>
                                                    {inspectionData.reviews.map((rev) => (
                                                        <div key={rev.id} className="review-item-card">
                                                            <div className="review-header-line">
                                                                <div>
                                                                    <strong style={{ color: "#0f172a" }}>{rev.patientName}</strong>
                                                                    <span style={{ color: "#64748b", fontSize: "0.85rem", marginLeft: "8px" }}>
                                                                        Trip: {rev.tripTitle}
                                                                    </span>
                                                                </div>
                                                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                                                    <div>{renderRatingStars(rev.rating)}</div>
                                                                    <span style={{ fontWeight: 700, color: "#d97706", fontSize: "0.9rem" }}>
                                                                        {rev.rating}/5
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <p className="review-comment-text">
                                                                "{rev.comment || "Patient left a rating without additional written comments."}"
                                                            </p>
                                                            <div style={{ marginTop: "6px", fontSize: "0.78rem", color: "#94a3b8", textAlign: "right" }}>
                                                                Reviewed on {new Date(rev.createdAt).toLocaleDateString()}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SystemAdminDashboard;

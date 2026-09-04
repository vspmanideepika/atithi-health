import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface Program {
    id: string;
    name: string;
    description: string;
}

interface MedicalTrip {
    id: string;
    title: string;
    description: string;
    maxGroupCapacity: number;
    status: 'PLANNED' | 'ONGOING' | 'COMPLETED';
    arrivalDate: string;
    mediaUrl: string | null;
    averageRating?: number | null;
    reviewCount?: number;
}

export const ProgramTrips = () => {
    const { programId } = useParams<{ programId: string }>();
    const { token } = useAuth();

    const [program, setProgram] = useState<Program | null>(null);
    const [trips, setTrips] = useState<MedicalTrip[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const fetchProgramDetails = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/programs/${programId}`);
            if (res.data && res.data.success) {
                setProgram(res.data.program);
            }
        } catch (err) {
            console.error('Error fetching program details:', err);
            setError('Failed to fetch department/program details.');
        }
    };

    const fetchTrips = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/trips?programId=${programId}`);
            if (res.data && res.data.success) {
                setTrips(res.data.medicalTrips);
            }
        } catch (err) {
            console.error('Error fetching trips:', err);
            setError('Failed to load medical trip packages.');
        }
    };

    const loadData = async () => {
        setLoading(true);
        setError(null);
        await Promise.all([fetchProgramDetails(), fetchTrips()]);
        setLoading(false);
    };

    useEffect(() => {
        if (programId) {
            loadData();
        }
    }, [programId]);

    const handleDeleteTrip = async (id: string, title: string) => {
        setSuccessMessage(null);
        if (!window.confirm(`Are you sure you want to delete the medical trip package "${title}"?`)) {
            return;
        }

        try {
            const authToken = token || localStorage.getItem('token');
            const res = await axios.delete(`${API_BASE_URL}/api/trips/${id}`, {
                headers: {
                    Authorization: `Bearer ${authToken}`
                }
            });

            if (res.data && res.data.success) {
                setSuccessMessage('Medical trip package deleted successfully.');
                fetchTrips();
            }
        } catch (err) {
            console.error('Error deleting trip:', err);
            setError('Failed to delete medical trip package.');
        }
    };

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'PLANNED':
                return 'badge-patient'; // Blue/sky
            case 'ONGOING':
                return 'badge-attendant'; // Green
            case 'COMPLETED':
                return 'badge-admin'; // Orange/amber
            default:
                return '';
        }
    };

    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (e) {
            return dateString;
        }
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '50px', color: '#64748b' }}>
                <h3>Loading Medical Trip Packages...</h3>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 20px' }}>
            {/* Header & Back Button */}
            <div style={{ marginBottom: '20px' }}>
                <Link to="/hospital-dashboard" style={{ textDecoration: 'none', color: '#0284c7', fontWeight: 600, fontSize: '15px' }}>
                    ← Back to Dashboard
                </Link>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '20px', marginBottom: '25px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '28px', color: '#0A4EA3', fontWeight: 700 }}>
                        {program?.name || 'Department'} Trip Packages
                    </h1>
                    <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: '15px' }}>
                        {program?.description || 'Manage scheduled travel and care packages.'}
                    </p>
                </div>
                <Link to={`/program-trips/${programId}/add`} style={{ textDecoration: 'none' }}>
                    <button className="profile-edit-btn">
                        + Add Medical Trip
                    </button>
                </Link>
            </div>

            {/* Notifications */}
            {successMessage && (
                <div className="success-message" style={{ padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '15px' }}>
                    ✓ {successMessage}
                </div>
            )}
            {error && (
                <div className="general-error" style={{ padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '15px' }}>
                    ⚠️ {error}
                </div>
            )}

            {/* List of Trip Packages */}
            {trips.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
                    <p style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: 500 }}>No medical trip packages registered for this department.</p>
                    <Link to={`/program-trips/${programId}/add`} style={{ textDecoration: 'none' }}>
                        <button className="profile-edit-btn">
                            Create First Package
                        </button>
                    </Link>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px' }}>
                    {trips.map((trip) => (
                        <div
                            key={trip.id}
                            className="profile-details-card"
                            style={{
                                padding: '24px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                height: '100%',
                                alignSelf: 'stretch',
                                boxSizing: 'border-box'
                            }}
                        >
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '10px', marginBottom: '12px' }}>
                                    <div>
                                        <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>{trip.title}</h3>
                                        {trip.averageRating ? (
                                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#b45309', backgroundColor: '#fef3c7', padding: '2px 8px', borderRadius: '12px' }}>
                                                ⭐ {trip.averageRating} ({trip.reviewCount || 0} {(trip.reviewCount === 1) ? 'review' : 'reviews'})
                                            </span>
                                        ) : (
                                            <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748b' }}>
                                                ⭐ No reviews yet
                                            </span>
                                        )}
                                    </div>
                                    <span className={`badge ${getStatusBadgeClass(trip.status)}`} style={{ fontSize: '11px', padding: '3px 8px', whiteSpace: 'nowrap' }}>
                                        {trip.status}
                                    </span>
                                </div>

                                <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#475569', lineHeight: '1.5' }}>
                                    {trip.description}
                                </p>

                                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', marginBottom: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                                        <span style={{ color: '#64748b' }}>Arrival Date:</span>
                                        <span style={{ fontWeight: 600, color: '#1e293b' }}>{formatDate(trip.arrivalDate)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                                        <span style={{ color: '#64748b' }}>Capacity Limit:</span>
                                        <span style={{ fontWeight: 600, color: '#1e293b' }}>{trip.maxGroupCapacity} patient groups</span>
                                    </div>
                                    {trip.mediaUrl && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                            <span style={{ color: '#64748b' }}>Media:</span>
                                            <a href={trip.mediaUrl.startsWith('/') ? `${API_BASE_URL}${trip.mediaUrl}` : trip.mediaUrl} target="_blank" rel="noreferrer" style={{ color: '#0284c7', fontWeight: 600, textDecoration: 'none' }}>
                                                View Attachment
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                                <Link to={`/program-trips/${programId}/edit/${trip.id}`} style={{ flex: 1, textDecoration: 'none' }}>
                                    <button className="profile-edit-btn" style={{ width: '100%', backgroundColor: '#0284c7' }}>
                                        Edit
                                    </button>
                                </Link>
                                <button
                                    className="profile-edit-btn"
                                    style={{ flex: 1, backgroundColor: '#ef4444' }}
                                    onClick={() => handleDeleteTrip(trip.id, trip.title)}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ProgramTrips;

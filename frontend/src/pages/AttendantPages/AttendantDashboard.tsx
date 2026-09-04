import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface Translation {
    id: string;
    originalLanguage: string;
    translatedLanguage: string;
    dischargeSummaryTranslationUrl: string;
    createdAt: string;
}

interface Booking {
    id: string;
    hospitalName: string;
    surgeryDate: string;
    groupSize: number;
    requestedLanguage: string;
    status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
    patientHistoryUrl: string | null;
    createdAt: string;
    patient: {
        id: string;
        name: string;
        email: string;
        phone: string | null;
    } | null;
    trip: {
        id: string;
        title: string;
    } | null;
    translations: Translation[];
}

export const AttendantDashboard = () => {
    const { user, token } = useAuth();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Translation form state per booking card
    const [uploadingBookingId, setUploadingBookingId] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [originalLang, setOriginalLang] = useState('English');
    const [translatedLang, setTranslatedLang] = useState('');
    const [submitLoading, setSubmitLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'CONFIRMED' | 'COMPLETED'>('ALL');

    const fetchBookings = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get(`${API_BASE_URL}/api/bookings`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            if (res.data && res.data.success) {
                setBookings(res.data.bookings);
            }
        } catch (err: any) {
            console.error('Error fetching coordinator bookings:', err);
            setError(err.response?.data?.message || 'Failed to load bookings from the server.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) {
            fetchBookings();
        }
    }, [token]);

    const handleCompleteBooking = async (bookingId: string) => {
        if (!window.confirm('Are you sure this medical trip is complete? This will unlock patient reviews.')) {
            return;
        }

        try {
            const res = await axios.put(`${API_BASE_URL}/api/bookings/${bookingId}/complete`, {}, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            if (res.data && res.data.success) {
                alert('Booking successfully marked as Completed.');
                fetchBookings();
            }
        } catch (err: any) {
            console.error('Error completing booking:', err);
            alert(err.response?.data?.message || 'Failed to complete booking.');
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleUploadTranslation = async (e: React.FormEvent, bookingId: string, defaultOrigLang: string) => {
        e.preventDefault();
        if (!selectedFile) {
            alert('Please select a PDF document to upload.');
            return;
        }
        if (!translatedLang.trim()) {
            alert('Please specify the translated language.');
            return;
        }

        setSubmitLoading(true);
        try {
            const formData = new FormData();
            formData.append('file', selectedFile);

            const uploadRes = await axios.post(`${API_BASE_URL}/api/upload`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (!uploadRes.data.success || !uploadRes.data.url) {
                throw new Error('File upload failed.');
            }

            const fileUrl = uploadRes.data.url;

            // Step 2: Create Translation Log
            const logRes = await axios.post(`${API_BASE_URL}/api/translations`, {
                bookingId,
                originalLanguage: originalLang || defaultOrigLang || 'English',
                translatedLanguage: translatedLang.trim(),
                dischargeSummaryTranslationUrl: fileUrl
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (logRes.data && logRes.data.success) {
                alert('Translation summary uploaded and logged successfully!');
                setSelectedFile(null);
                setTranslatedLang('');
                setUploadingBookingId(null);
                fetchBookings();
            }
        } catch (err: any) {
            console.error('Translation upload error:', err);
            alert(err.response?.data?.message || 'Error occurred while saving translation log.');
        } finally {
            setSubmitLoading(false);
        }
    };

    const getStatusBadgeStyle = (status: string) => {
        switch (status) {
            case 'CONFIRMED':
                return { backgroundColor: '#e0f2fe', color: '#0369a1' };
            case 'COMPLETED':
                return { backgroundColor: '#dcfce7', color: '#15803d' };
            case 'CANCELLED':
                return { backgroundColor: '#fee2e2', color: '#b91c1c' };
            default:
                return { backgroundColor: '#f1f5f9', color: '#475569' };
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

    const filteredBookings = bookings.filter(b => {
        if (statusFilter === 'ALL') return true;
        return b.status === statusFilter;
    });

    return (
        <div className="booking-container" style={{ maxWidth: '950px', margin: '40px auto', padding: '30px', fontFamily: 'Poppins, sans-serif' }}>
            {/* Header section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '20px', marginBottom: '25px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '28px', color: 'var(--primary-color)' }}>Attendant Portal</h1>
                </div>
            </div>

            {/* Coordinator Intro Section */}
            <div style={{ backgroundColor: '#f8fafc', padding: '25px', borderRadius: '12px', borderLeft: '4px solid var(--primary-color)', marginBottom: '30px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
                <h2 style={{ margin: '0 0 8px', fontSize: '20px', color: '#1e293b' }}>Welcome, {user?.name}!</h2>
                <p style={{ margin: '0 0 15px', color: '#475569', fontSize: '14px' }}>
                    You are logged in as a registered medical coordinator. Below is your schedule of assigned incoming patient bookings.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', backgroundColor: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div>
                        <strong style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hospital</strong>
                        <div style={{ fontSize: '15px', fontWeight: '600', color: '#1e293b', marginTop: '4px' }}>
                            {user?.hospital?.name || 'Unassigned Hospital'}
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '25px', gap: '20px' }}>
                <button
                    onClick={() => setStatusFilter('ALL')}
                    style={{
                        padding: '10px 16px',
                        border: 'none',
                        background: 'none',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        color: statusFilter === 'ALL' ? 'var(--primary-color)' : '#64748b',
                        borderBottom: statusFilter === 'ALL' ? '3px solid var(--primary-color)' : '3px solid transparent',
                        marginBottom: '-2px',
                        transition: 'all 0.2s'
                    }}
                >
                    All Assigned ({bookings.length})
                </button>
                <button
                    onClick={() => setStatusFilter('CONFIRMED')}
                    style={{
                        padding: '10px 16px',
                        border: 'none',
                        background: 'none',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        color: statusFilter === 'CONFIRMED' ? 'var(--primary-color)' : '#64748b',
                        borderBottom: statusFilter === 'CONFIRMED' ? '3px solid var(--primary-color)' : '3px solid transparent',
                        marginBottom: '-2px',
                        transition: 'all 0.2s'
                    }}
                >
                    Confirmed Stays ({bookings.filter(b => b.status === 'CONFIRMED').length})
                </button>
                <button
                    onClick={() => setStatusFilter('COMPLETED')}
                    style={{
                        padding: '10px 16px',
                        border: 'none',
                        background: 'none',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        color: statusFilter === 'COMPLETED' ? 'var(--primary-color)' : '#64748b',
                        borderBottom: statusFilter === 'COMPLETED' ? '3px solid var(--primary-color)' : '3px solid transparent',
                        marginBottom: '-2px',
                        transition: 'all 0.2s'
                    }}
                >
                    Completed Trips ({bookings.filter(b => b.status === 'COMPLETED').length})
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div className="general-error" style={{ marginBottom: '20px' }}>
                    {error}
                </div>
            )}

            {/* Listings section */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{ border: '3px solid #f3f3f3', borderTop: '3px solid var(--primary-color)', borderRadius: '50%', width: '30px', height: '30px', animation: 'spin 1s linear infinite', margin: '0 auto 10px' }} />
                    <p style={{ color: '#64748b' }}>Loading schedules...</p>
                </div>
            ) : filteredBookings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                    <p style={{ color: '#64748b', fontSize: '15px', margin: 0 }}>No bookings found for the selected filter.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '25px' }}>
                    {filteredBookings.map((booking) => (
                        <div
                            key={booking.id}
                            className="profile-details-card"
                            style={{
                                padding: '24px',
                                display: 'grid',
                                gridTemplateColumns: '1fr',
                                gap: '20px',
                                border: '1px solid #e2e8f0',
                                borderRadius: '12px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                                position: 'relative',
                                backgroundColor: '#ffffff'
                            }}
                        >
                            {/* Card Top: Header & Badges */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '12px' }}>
                                <div>
                                    <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', fontWeight: 600 }}>Assigned Intakes</span>
                                    <h3 style={{ margin: '4px 0 6px 0', fontSize: '19px', fontWeight: 700, color: '#0f172a' }}>
                                        {booking.trip?.title || 'Trip Package'}
                                    </h3>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '11px', fontWeight: 600 }}>
                                        <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: '#f1f5f9', color: '#475569' }}>
                                            🏥 {booking.hospitalName}
                                        </span>
                                    </div>
                                </div>

                                <span style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    textTransform: 'uppercase',
                                    ...getStatusBadgeStyle(booking.status)
                                }}>
                                    {booking.status}
                                </span>
                            </div>

                            {/* Card Body: Details Grid */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                gap: '15px',
                                borderTop: '1px solid #f1f5f9',
                                paddingTop: '15px'
                            }}>
                                <div>
                                    <span style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '2px' }}>Intake Date</span>
                                    <strong style={{ fontSize: '14px', color: '#1e293b' }}>{formatDate(booking.surgeryDate)}</strong>
                                </div>

                                <div>
                                    <span style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '2px' }}>Companion Group Size</span>
                                    <strong style={{ fontSize: '14px', color: '#1e293b' }}>(1 Patient + {booking.groupSize - 1} Companions)</strong>
                                </div>

                                <div>
                                    <span style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '2px' }}>Requested Language</span>
                                    <strong style={{ fontSize: '14px', color: '#1e293b' }}>{booking.requestedLanguage}</strong>
                                </div>

                                <div>
                                    <span style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '2px' }}>Patient Details</span>
                                    {booking.patient ? (
                                        <div style={{ fontSize: '13px', color: '#1e293b', marginTop: '2px' }}>
                                            <strong>{booking.patient.name}</strong> <br />
                                            <span style={{ color: '#64748b' }}>✉️ {booking.patient.email}</span> <br />
                                            {booking.patient.phone && <span style={{ color: '#64748b' }}>📞 {booking.patient.phone}</span>}
                                        </div>
                                    ) : (
                                        <span style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>Anonymous Patient</span>
                                    )}
                                </div>
                            </div>

                            {/* Patient Diagnostic Inspector */}
                            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '15px' }}>
                                <span style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '6px', fontWeight: 600 }}>Patient Diagnostic Inspector</span>
                                {booking.patientHistoryUrl ? (
                                    <a
                                        href={`${API_BASE_URL}${booking.patientHistoryUrl}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            padding: '8px 14px',
                                            backgroundColor: '#f0fdf4',
                                            color: '#16a34a',
                                            borderRadius: '6px',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            textDecoration: 'none',
                                            border: '1px solid #bbf7d0',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        📄 Download Patient Medical History PDF
                                    </a>
                                ) : (
                                    <span style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic' }}>
                                        No diagnostic history PDF uploaded by the patient yet.
                                    </span>
                                )}
                            </div>

                            {/* Uploaded Translation Summaries Log List */}
                            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '15px' }}>
                                <span style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '8px', fontWeight: 600 }}>Translation Summaries Logs</span>
                                {booking.translations && booking.translations.length > 0 ? (
                                    <div style={{ display: 'grid', gap: '8px' }}>
                                        {booking.translations.map((trans) => (
                                            <div
                                                key={trans.id}
                                                style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    padding: '10px 14px',
                                                    backgroundColor: '#f8fafc',
                                                    border: '1px solid #e2e8f0',
                                                    borderRadius: '6px',
                                                    fontSize: '13px'
                                                }}
                                            >
                                                <div>
                                                    <strong>{trans.originalLanguage} ➡️ {trans.translatedLanguage}</strong>
                                                    <span style={{ display: 'block', fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                                        Logged on {formatDate(trans.createdAt)}
                                                    </span>
                                                </div>
                                                <a
                                                    href={`${API_BASE_URL}${trans.dischargeSummaryTranslationUrl}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        color: 'var(--primary-color)',
                                                        textDecoration: 'none',
                                                        fontWeight: 600
                                                    }}
                                                >
                                                    Download Translated PDF
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <span style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic' }}>
                                        No translations uploaded yet.
                                    </span>
                                )}
                            </div>

                            {/* Translation Upload Panel */}
                            {booking.status === 'CONFIRMED' && (
                                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '15px' }}>
                                    {uploadingBookingId !== booking.id ? (
                                        <button
                                            onClick={() => {
                                                setUploadingBookingId(booking.id);
                                                setOriginalLang('English');
                                                setTranslatedLang(booking.requestedLanguage || '');
                                            }}
                                            className="btn-secondary"
                                            style={{ margin: 0, padding: '8px 14px', fontSize: '13px' }}
                                        >
                                            ➕ Upload New Translated Discharge Summary
                                        </button>
                                    ) : (
                                        <form
                                            onSubmit={(e) => handleUploadTranslation(e, booking.id, booking.requestedLanguage)}
                                            style={{
                                                backgroundColor: '#f8fafc',
                                                padding: '16px',
                                                borderRadius: '8px',
                                                border: '1px solid #e2e8f0',
                                                display: 'grid',
                                                gap: '12px',
                                                maxWidth: '500px'
                                            }}
                                        >
                                            <h4 style={{ margin: 0, fontSize: '14px', color: '#1e293b' }}>Upload Translation Summary</h4>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                                <div>
                                                    <label htmlFor="originalLang" style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Original Language</label>
                                                    <input
                                                        type="text"
                                                        id="originalLang"
                                                        value={originalLang}
                                                        onChange={(e) => setOriginalLang(e.target.value)}
                                                        placeholder="e.g. English"
                                                        style={{ width: '100%', padding: '6px 10px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label htmlFor="translatedLang" style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Translated Language</label>
                                                    <input
                                                        type="text"
                                                        id="translatedLang"
                                                        value={translatedLang}
                                                        onChange={(e) => setTranslatedLang(e.target.value)}
                                                        placeholder="e.g. Arabic, Swahili"
                                                        style={{ width: '100%', padding: '6px 10px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label htmlFor="file" style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Select Translated Summary PDF *</label>
                                                <input
                                                    type="file"
                                                    id="file"
                                                    accept=".pdf"
                                                    onChange={handleFileChange}
                                                    style={{ fontSize: '12px' }}
                                                    required
                                                />
                                            </div>

                                            <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                                                <button
                                                    type="submit"
                                                    className="btn-primary"
                                                    style={{ margin: 0, padding: '6px 12px', fontSize: '12px' }}
                                                    disabled={submitLoading}
                                                >
                                                    {submitLoading ? 'Uploading...' : 'Submit Translation'}
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn-secondary"
                                                    style={{ margin: 0, padding: '6px 12px', fontSize: '12px', borderColor: '#cbd5e1' }}
                                                    onClick={() => {
                                                        setUploadingBookingId(null);
                                                        setSelectedFile(null);
                                                    }}
                                                    disabled={submitLoading}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                </div>
                            )}

                            {/* Trip Completion action buttons */}
                            {booking.status === 'CONFIRMED' && (
                                <div style={{
                                    borderTop: '1px solid #f1f5f9',
                                    paddingTop: '15px',
                                    display: 'flex',
                                    justifyContent: 'flex-end'
                                }}>
                                    <button
                                        onClick={() => handleCompleteBooking(booking.id)}
                                        className="btn-primary"
                                        style={{
                                            margin: 0,
                                            padding: '8px 16px',
                                            fontSize: '13px',
                                            backgroundColor: '#16a34a',
                                            borderColor: '#16a34a',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ✓ Mark Trip Completed
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Keyframe animation style block */}
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default AttendantDashboard;

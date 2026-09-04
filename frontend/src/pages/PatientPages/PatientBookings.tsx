import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface Booking {
    id: string;
    hospitalName: string;
    surgeryDate: string;
    groupSize: number;
    requestedLanguage: string;
    status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
    patientHistoryUrl: string | null;
    createdAt: string;
    trip: {
        id: string;
        title: string;
        hospital: { id: string; name: string } | null;
        program: { id: string; name: string } | null;
    } | null;
    attendant: {
        id: string;
        name: string;
        email: string;
    } | null;
    translations?: {
        id: string;
        originalLanguage: string;
        translatedLanguage: string;
        dischargeSummaryTranslationUrl: string;
        createdAt: string;
    }[];
    clinicalReview?: {
        id: string;
        rating: number;
        comment: string | null;
        createdAt: string;
    }[];
}

export const PatientBookings = () => {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Health Locker states
    const [uploadingHistoryBookingId, setUploadingHistoryBookingId] = useState<string | null>(null);
    const [historyFile, setHistoryFile] = useState<File | null>(null);
    const [historyUploading, setHistoryUploading] = useState(false);

    // Clinical Review states
    const [reviewingBookingId, setReviewingBookingId] = useState<string | null>(null);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [reviewUploading, setReviewUploading] = useState(false);

    const fetchBookings = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const params: Record<string, string> = {};
            if (statusFilter !== 'ALL') {
                params.status = statusFilter;
            }

            const res = await axios.get(`${API_BASE_URL}/api/bookings`, {
                headers: {
                    Authorization: `Bearer ${token}`
                },
                params
            });

            if (res.data && res.data.success) {
                setBookings(res.data.bookings);
            } else {
                setError('Failed to fetch bookings.');
            }
        } catch (err: any) {
            console.error('Error fetching bookings:', err);
            setError(err.response?.data?.message || 'Error loading bookings from the server.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBookings();
    }, [statusFilter]);

    const handleCancelBooking = async (bookingId: string) => {
        if (!window.confirm('Are you sure you want to cancel this booking? This will restore the trip capacity slot.')) {
            return;
        }
        setActionLoading(bookingId);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.put(`${API_BASE_URL}/api/bookings/${bookingId}/cancel`, {}, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            if (res.data && res.data.success) {
                fetchBookings();
            } else {
                alert(res.data.message || 'Failed to cancel booking.');
            }
        } catch (err: any) {
            console.error('Error cancelling booking:', err);
            alert(err.response?.data?.message || 'Error communicating with the server.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleUploadHistory = async (e: React.FormEvent, bookingId: string) => {
        e.preventDefault();
        if (!historyFile) {
            alert('Please select a PDF document to upload.');
            return;
        }
        setHistoryUploading(true);
        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('file', historyFile);

            // Step 1: Upload PDF
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

            // Step 2: Attach to Booking
            const linkRes = await axios.put(`${API_BASE_URL}/api/bookings/${bookingId}/medical-history`, {
                patientHistoryUrl: fileUrl
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (linkRes.data && linkRes.data.success) {
                alert('Medical history diagnostic PDF uploaded successfully!');
                setHistoryFile(null);
                setUploadingHistoryBookingId(null);
                fetchBookings();
            }
        } catch (err: any) {
            console.error('History upload error:', err);
            alert(err.response?.data?.message || 'Failed to upload medical history.');
        } finally {
            setHistoryUploading(false);
        }
    };

    const handleUploadReview = async (e: React.FormEvent, bookingId: string) => {
        e.preventDefault();
        setReviewUploading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_BASE_URL}/api/bookings/${bookingId}/review`, {
                rating,
                comment: comment.trim()
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (res.data && res.data.success) {
                alert('Clinical review submitted successfully!');
                setReviewingBookingId(null);
                setComment('');
                fetchBookings();
            }
        } catch (err: any) {
            console.error('Review submit error:', err);
            alert(err.response?.data?.message || 'Failed to submit clinical review.');
        } finally {
            setReviewUploading(false);
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

    const getStatusBadgeStyle = (status: string) => {
        switch (status) {
            case 'PENDING':
                return { backgroundColor: '#fef3c7', color: '#d97706' }; // Yellow/Amber
            case 'CONFIRMED':
                return { backgroundColor: '#dcfce7', color: '#15803d' }; // Green
            case 'CANCELLED':
                return { backgroundColor: '#fee2e2', color: '#b91c1c' }; // Red
            case 'COMPLETED':
                return { backgroundColor: '#dbeafe', color: '#1d4ed8' }; // Blue
            default:
                return { backgroundColor: '#f1f5f9', color: '#475569' };
        }
    };

    return (
        <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 20px' }}>
            {/* Header section */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '2px solid #e2e8f0',
                paddingBottom: '20px',
                marginBottom: '25px'
            }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '28px', color: '#0A4EA3', fontWeight: 700 }}>
                        My Care Bookings
                    </h1>
                    <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: '15px' }}>
                        Track status and details of your registered medical travel bookings.
                    </p>
                </div>
            </div>

            {/* Status Filter Tabs */}
            <div style={{
                display: 'flex',
                gap: '10px',
                marginBottom: '25px',
                borderBottom: '1px solid #f1f5f9',
                paddingBottom: '12px',
                flexWrap: 'wrap'
            }}>
                {['ALL', 'PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        style={{
                            padding: '6px 16px',
                            borderRadius: '20px',
                            border: statusFilter === status ? '1px solid #0A4EA3' : '1px solid #e2e8f0',
                            backgroundColor: statusFilter === status ? '#0A4EA3' : '#ffffff',
                            color: statusFilter === status ? '#ffffff' : '#64748b',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                    >
                        {status}
                    </button>
                ))}
            </div>

            {/* Content states */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '50px', color: '#64748b' }}>
                    <div style={{
                        width: '32px',
                        height: '32px',
                        border: '3px solid #e2e8f0',
                        borderTop: '3px solid #0A4EA3',
                        borderRadius: '50%',
                        margin: '0 auto 15px',
                        animation: 'spin 1s linear infinite'
                    }}></div>
                    <h3>Loading bookings list...</h3>
                </div>
            ) : error ? (
                <div className="general-error" style={{ padding: '16px', borderRadius: '12px', marginBottom: '30px' }}>
                    ⚠️ {error}
                </div>
            ) : bookings.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '60px 20px',
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    border: '1px dashed #cbd5e1',
                    color: '#64748b'
                }}>
                    <p style={{ margin: '0 0 10px 0', fontSize: '18px', fontWeight: 600, color: '#334155' }}>No bookings found</p>
                    <p style={{ margin: '0', fontSize: '14px' }}>There are no {statusFilter !== 'ALL' ? statusFilter.toLowerCase() : ''} bookings registered currently.</p>
                </div>
            ) : (
                /* Booking Cards List */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {bookings.map((booking) => (
                        <div
                            key={booking.id}
                            className="profile-details-card"
                            style={{
                                padding: '24px',
                                display: 'grid',
                                gridTemplateColumns: '1fr',
                                gap: '20px',
                                border: '1px solid #f1f5f9',
                                position: 'relative'
                            }}
                        >
                            {/* Card Top: Header & Badges */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '12px' }}>
                                <div>
                                    <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                                        {booking.trip?.title || 'Trip Package'}
                                    </h3>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '11px', fontWeight: 600 }}>
                                        <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: '#f1f5f9', color: '#475569' }}>
                                            🏥 {booking.hospitalName}
                                        </span>
                                        {booking.trip?.program && (
                                            <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: '#e0f2fe', color: '#0369a1' }}>
                                                🩺 {booking.trip.program.name}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Status Badge */}
                                <span style={{
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    padding: '4px 12px',
                                    borderRadius: '6px',
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
                                    <span style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '2px' }}>Scheduled Date</span>
                                    <strong style={{ fontSize: '14px', color: '#1e293b' }}>{formatDate(booking.surgeryDate)}</strong>
                                </div>

                                <div>
                                    <span style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '2px' }}>Companion Group Size</span>
                                    <strong style={{ fontSize: '14px', color: '#1e293b' }}>(1 Patient + {booking.groupSize - 1} Companions)</strong>
                                </div>

                                <div>
                                    <span style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '2px' }}>Preferred Language</span>
                                    <strong style={{ fontSize: '14px', color: '#1e293b' }}>{booking.requestedLanguage}</strong>
                                </div>

                                <div>
                                    <span style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '2px' }}>Submission Date</span>
                                    <strong style={{ fontSize: '14px', color: '#1e293b' }}>{formatDate(booking.createdAt)}</strong>
                                </div>
                            </div>

                            {/* Card Bottom: Coordinator info */}
                            <div style={{
                                borderTop: '1px solid #f1f5f9',
                                paddingTop: '15px',
                                display: 'grid',
                                gridTemplateColumns: '1fr',
                                gap: '15px',
                                backgroundColor: '#f8fafc',
                                padding: '12px 16px',
                                borderRadius: '8px'
                            }}>
                                <div>
                                    <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Assigned Attendant</span>
                                    {booking.attendant ? (
                                        <div style={{ fontSize: '13px', color: '#1e293b' }}>
                                            <strong>Name:</strong> {booking.attendant.name} <br />
                                            <strong>Email:</strong> {booking.attendant.email}
                                        </div>
                                    ) : (
                                        <span style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic' }}>
                                            Attendant coordinator will be assigned upon booking approval.
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Health Locker Section (Only for CONFIRMED or COMPLETED) */}
                            {(booking.status === 'CONFIRMED' || booking.status === 'COMPLETED') && (
                                <div style={{
                                    borderTop: '1px dashed #e2e8f0',
                                    paddingTop: '15px',
                                    display: 'grid',
                                    gap: '15px'
                                }}>
                                    <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--primary-color)', fontWeight: 600 }}>🔒 Patient Health Locker</h4>
                                    
                                    {/* Medical History upload/display */}
                                    <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Diagnostic History PDF</span>
                                        {booking.patientHistoryUrl ? (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginTop: '6px' }}>
                                                <a
                                                    href={`${API_BASE_URL}${booking.patientHistoryUrl}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{ color: '#16a34a', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}
                                                >
                                                    📄 Download Uploaded Medical History
                                                </a>
                                                {booking.status === 'CONFIRMED' && (
                                                    <button
                                                        onClick={() => setUploadingHistoryBookingId(booking.id)}
                                                        className="profile-edit-btn"
                                                        style={{ fontSize: '11px', padding: '2px 8px' }}
                                                    >
                                                        Update PDF
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <div>
                                                <span style={{ display: 'block', fontSize: '13px', color: '#64748b', fontStyle: 'italic', marginBottom: '6px' }}>
                                                    No medical history PDF uploaded yet.
                                                </span>
                                                {booking.status === 'CONFIRMED' && uploadingHistoryBookingId !== booking.id && (
                                                    <button
                                                        onClick={() => setUploadingHistoryBookingId(booking.id)}
                                                        className="btn-secondary"
                                                        style={{ margin: 0, padding: '4px 10px', fontSize: '11px' }}
                                                    >
                                                        Upload Diagnostic History
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {/* Upload Form Overlay */}
                                        {booking.status === 'CONFIRMED' && uploadingHistoryBookingId === booking.id && (
                                            <form onSubmit={(e) => handleUploadHistory(e, booking.id)} style={{ display: 'grid', gap: '8px', marginTop: '10px' }}>
                                                <input
                                                    type="file"
                                                    accept=".pdf"
                                                    onChange={(e) => {
                                                        if (e.target.files && e.target.files[0]) {
                                                            setHistoryFile(e.target.files[0]);
                                                        }
                                                    }}
                                                    style={{ fontSize: '12px' }}
                                                    required
                                                />
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button
                                                        type="submit"
                                                        className="btn-primary"
                                                        style={{ margin: 0, padding: '4px 10px', fontSize: '11px' }}
                                                        disabled={historyUploading}
                                                    >
                                                        {historyUploading ? 'Uploading...' : 'Save PDF'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn-secondary"
                                                        style={{ margin: 0, padding: '4px 10px', fontSize: '11px' }}
                                                        onClick={() => {
                                                            setUploadingHistoryBookingId(null);
                                                            setHistoryFile(null);
                                                        }}
                                                        disabled={historyUploading}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </form>
                                        )}
                                    </div>

                                    {/* Translation Summaries Logs downloads */}
                                    <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Translated Discharge Summaries</span>
                                        {booking.translations && booking.translations.length > 0 ? (
                                            <div style={{ display: 'grid', gap: '8px', marginTop: '6px' }}>
                                                {booking.translations.map((trans) => (
                                                    <div
                                                        key={trans.id}
                                                        style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            padding: '6px 10px',
                                                            backgroundColor: '#ffffff',
                                                            border: '1px solid #e2e8f0',
                                                            borderRadius: '4px',
                                                            fontSize: '12px'
                                                        }}
                                                    >
                                                        <span>
                                                            <strong>Translation ({trans.translatedLanguage})</strong>
                                                        </span>
                                                        <a
                                                            href={`${API_BASE_URL}${trans.dischargeSummaryTranslationUrl}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            style={{ color: 'var(--primary-color)', textDecoration: 'none', fontWeight: 600 }}
                                                        >
                                                            Download PDF
                                                        </a>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <span style={{ display: 'block', fontSize: '13px', color: '#64748b', fontStyle: 'italic', marginTop: '4px' }}>
                                                No translated summaries generated by your coordinator yet.
                                            </span>
                                        )}
                                    </div>

                                    {/* Clinical Review Panel (Only for COMPLETED) */}
                                    {booking.status === 'COMPLETED' && (
                                        <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                            <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Clinical Review & Feedback</span>
                                            {booking.clinicalReview && booking.clinicalReview.length > 0 ? (
                                                <div style={{ marginTop: '6px', fontSize: '13px' }}>
                                                    <div style={{ display: 'flex', gap: '4px', color: '#eab308', fontSize: '16px', marginBottom: '4px' }}>
                                                        {Array.from({ length: 5 }).map((_, i) => (
                                                            <span key={i}>
                                                                {i < booking.clinicalReview![0].rating ? '★' : '☆'}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <div style={{ fontStyle: 'italic', color: '#334155' }}>
                                                        "{booking.clinicalReview[0].comment || 'No review comment provided.'}"
                                                    </div>
                                                    <span style={{ display: 'block', fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                                                        Submitted on {formatDate(booking.clinicalReview[0].createdAt)}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div>
                                                    {reviewingBookingId !== booking.id ? (
                                                        <div>
                                                            <span style={{ display: 'block', fontSize: '13px', color: '#64748b', fontStyle: 'italic', marginBottom: '6px' }}>
                                                                You have not submitted a review for this trip yet.
                                                            </span>
                                                            <button
                                                                onClick={() => {
                                                                    setReviewingBookingId(booking.id);
                                                                    setRating(5);
                                                                    setComment('');
                                                                }}
                                                                className="btn-primary"
                                                                style={{ margin: 0, padding: '4px 10px', fontSize: '11px' }}
                                                            >
                                                                Write Clinical Review
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <form onSubmit={(e) => handleUploadReview(e, booking.id)} style={{ display: 'grid', gap: '8px', marginTop: '10px', maxWidth: '400px' }}>
                                                            <div>
                                                                <label style={{ display: 'block', fontSize: '12px', color: '#475569', marginBottom: '4px' }}>Rating *</label>
                                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                                    {[1, 2, 3, 4, 5].map((val) => (
                                                                        <button
                                                                            key={val}
                                                                            type="button"
                                                                            onClick={() => setRating(val)}
                                                                            style={{
                                                                                border: 'none',
                                                                                background: 'none',
                                                                                fontSize: '22px',
                                                                                cursor: 'pointer',
                                                                                color: val <= rating ? '#eab308' : '#cbd5e1',
                                                                                padding: 0
                                                                            }}
                                                                        >
                                                                            ★
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <label htmlFor="comment" style={{ display: 'block', fontSize: '12px', color: '#475569', marginBottom: '4px' }}>Comments / Feedback</label>
                                                                <textarea
                                                                    id="comment"
                                                                    value={comment}
                                                                    onChange={(e) => setComment(e.target.value)}
                                                                    placeholder="Describe your treatment experience, stay, and coordinator support..."
                                                                    rows={3}
                                                                    style={{
                                                                        width: '100%',
                                                                        padding: '8px',
                                                                        fontSize: '12px',
                                                                        borderRadius: '4px',
                                                                        border: '1px solid #cbd5e1',
                                                                        resize: 'vertical',
                                                                        fontFamily: 'inherit'
                                                                    }}
                                                                />
                                                            </div>
                                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                                <button
                                                                    type="submit"
                                                                    className="btn-primary"
                                                                    style={{ margin: 0, padding: '4px 10px', fontSize: '11px' }}
                                                                    disabled={reviewUploading}
                                                                >
                                                                    {reviewUploading ? 'Submitting...' : 'Submit Review'}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="btn-secondary"
                                                                    style={{ margin: 0, padding: '4px 10px', fontSize: '11px' }}
                                                                    onClick={() => {
                                                                        setReviewingBookingId(null);
                                                                        setComment('');
                                                                    }}
                                                                    disabled={reviewUploading}
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        </form>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Actions block */}
                            {(booking.status === 'PENDING' || booking.status === 'CONFIRMED') && (
                                <div style={{
                                    borderTop: '1px solid #f1f5f9',
                                    paddingTop: '15px',
                                    display: 'flex',
                                    justifyContent: 'flex-end'
                                }}>
                                    <button
                                        onClick={() => handleCancelBooking(booking.id)}
                                        disabled={actionLoading === booking.id}
                                        className="btn-secondary"
                                        style={{
                                            margin: 0,
                                            padding: '8px 16px',
                                            fontSize: '13px',
                                            borderColor: '#ef4444',
                                            color: '#ef4444',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Cancel Booking
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PatientBookings;

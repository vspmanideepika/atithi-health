import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
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
    patient: {
        id: string;
        name: string;
        email: string;
        phone: string | null;
    } | null;
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
    clinicalReview?: {
        id: string;
        rating: number;
        comment: string | null;
        createdAt: string;
    }[];
}

interface Attendant {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    languagesSpoken: string[];
}

export const HospitalBookings = () => {
    const { user } = useAuth();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('ALL');

    // Coordinator assignment states
    const [availableAttendants, setAvailableAttendants] = useState<Attendant[]>([]);
    const [selectedBookingForAssign, setSelectedBookingForAssign] = useState<Booking | null>(null);
    const [selectedAttendantId, setSelectedAttendantId] = useState<string>('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

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

    const fetchAvailableAttendants = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_BASE_URL}/api/bookings/available-attendants`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            if (res.data && res.data.success) {
                setAvailableAttendants(res.data.attendants);
                if (res.data.attendants.length > 0) {
                    setSelectedAttendantId(res.data.attendants[0].id);
                } else {
                    setSelectedAttendantId('');
                }
            }
        } catch (err: any) {
            console.error('Error fetching available coordinators:', err);
        }
    };

    useEffect(() => {
        fetchBookings();
    }, [statusFilter]);

    const handleOpenAssignModal = (booking: Booking) => {
        setSelectedBookingForAssign(booking);
        setActionError(null);
        fetchAvailableAttendants();
    };

    const handleCloseAssignModal = () => {
        setSelectedBookingForAssign(null);
        setSelectedAttendantId('');
        setActionError(null);
    };

    const handleAssignAttendantConfirm = async () => {
        if (!selectedBookingForAssign || !selectedAttendantId) return;
        setActionLoading(selectedBookingForAssign.id);
        setActionError(null);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.put(`${API_BASE_URL}/api/bookings/${selectedBookingForAssign.id}/status`, {
                status: 'CONFIRMED',
                attendantId: selectedAttendantId
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            if (res.data && res.data.success) {
                handleCloseAssignModal();
                fetchBookings();
            } else {
                setActionError(res.data.message || 'Failed to assign attendant.');
            }
        } catch (err: any) {
            console.error('Error assigning attendant:', err);
            setActionError(err.response?.data?.message || 'Error communicating with the server.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleCancelBooking = async (bookingId: string) => {
        if (!window.confirm('Are you sure you want to cancel this booking? This will restore the trip capacity slot.')) {
            return;
        }
        setActionLoading(bookingId);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.put(`${API_BASE_URL}/api/bookings/${bookingId}/status`, {
                status: 'CANCELLED'
            }, {
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
                        Hospital Bookings Portal
                    </h1>
                    <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: '15px' }}>
                        Monitor pending and scheduled bookings for {user?.hospital?.name || 'your hospital'}.
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
                                    <strong style={{ fontSize: '14px', color: '#1e293b' }}>{booking.groupSize} people</strong>
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

                            {/* Card Bottom: Patient & Attendant info */}
                            <div style={{
                                borderTop: '1px solid #f1f5f9',
                                paddingTop: '15px',
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                                gap: '15px',
                                backgroundColor: '#f8fafc',
                                padding: '12px 16px',
                                borderRadius: '8px'
                            }}>
                                {booking.patient && (
                                    <div>
                                        <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Patient Details</span>
                                        <div style={{ fontSize: '13px', color: '#1e293b' }}>
                                            <strong>Name:</strong> {booking.patient.name} <br />
                                            <strong>Email:</strong> {booking.patient.email} <br />
                                            {booking.patient.phone && <><strong>Phone:</strong> {booking.patient.phone}</>}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Assigned Attendant</span>
                                    {booking.attendant ? (
                                        <div style={{ fontSize: '13px', color: '#1e293b' }}>
                                            <strong>Name:</strong> {booking.attendant.name} <br />
                                            <strong>Email:</strong> {booking.attendant.email}
                                        </div>
                                    ) : (
                                        <span style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic' }}>
                                            No attendant assigned yet.
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Card Review Section (for COMPLETED bookings) */}
                            {booking.clinicalReview && booking.clinicalReview.length > 0 && (
                                <div style={{
                                    borderTop: '1px solid #fef3c7',
                                    backgroundColor: '#fffbeb',
                                    padding: '14px 16px',
                                    borderRadius: '8px',
                                    border: '1px solid #fef3c7'
                                }}>
                                    <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#b45309', textTransform: 'uppercase', marginBottom: '6px' }}>
                                        ⭐ Patient Clinical Review & Feedback
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '15px', fontWeight: 700, color: '#d97706' }}>
                                            {'⭐'.repeat(booking.clinicalReview[0].rating)} ({booking.clinicalReview[0].rating} / 5 Stars)
                                        </span>
                                    </div>
                                    {booking.clinicalReview[0].comment ? (
                                        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#92400e', fontStyle: 'italic', lineHeight: '1.4' }}>
                                            "{booking.clinicalReview[0].comment}"
                                        </p>
                                    ) : (
                                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#b45309', fontStyle: 'italic' }}>
                                            (Patient provided a {booking.clinicalReview[0].rating}-star rating without additional comments)
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Card Actions Panel */}
                            {(booking.status === 'PENDING' || booking.status === 'CONFIRMED') && (
                                <div style={{
                                    borderTop: '1px solid #f1f5f9',
                                    paddingTop: '15px',
                                    display: 'flex',
                                    gap: '12px',
                                    justifyContent: 'flex-end'
                                }}>
                                    {booking.status === 'PENDING' && (
                                        <button
                                            onClick={() => handleOpenAssignModal(booking)}
                                            disabled={actionLoading === booking.id}
                                            className="btn-primary"
                                            style={{
                                                margin: 0,
                                                padding: '8px 16px',
                                                fontSize: '13px',
                                                backgroundColor: '#0A4EA3',
                                                borderColor: '#0A4EA3',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Assign Attendant
                                        </button>
                                    )}
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

            {/* Assign Attendant Modal */}
            {selectedBookingForAssign && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000,
                    backdropFilter: 'blur(4px)'
                }}>
                    <div className="profile-details-card" style={{
                        maxWidth: '500px',
                        width: '90%',
                        padding: '30px',
                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                        position: 'relative'
                    }}>
                        {/* Close button */}
                        <button
                            onClick={handleCloseAssignModal}
                            style={{
                                position: 'absolute',
                                top: '15px',
                                right: '15px',
                                background: 'none',
                                border: 'none',
                                fontSize: '24px',
                                color: '#64748b',
                                cursor: 'pointer',
                                lineHeight: 1
                            }}
                        >
                            &times;
                        </button>

                        <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 700, color: '#0A4EA3' }}>
                            Confirm & Assign Attendant
                        </h2>
                        <p style={{ margin: '0 0 20px 0', color: '#64748b', fontSize: '14px' }}>
                            Choose an available coordinator for patient <strong>{selectedBookingForAssign.patient?.name}</strong>.
                            <br />
                            <span style={{ fontSize: '12px', color: '#0A4EA3', fontWeight: 600, display: 'block', marginTop: '6px' }}>
                                Requested Language(s): {selectedBookingForAssign.requestedLanguage}
                            </span>
                        </p>

                        {actionError && (
                            <div className="general-error" style={{ marginBottom: '15px', padding: '10px 12px', borderRadius: '8px', fontSize: '13px' }}>
                                ⚠️ {actionError}
                            </div>
                        )}

                        <div className="input-group" style={{ marginBottom: '25px' }}>
                            <label htmlFor="modal-attendant-select" style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '14px', color: '#1e293b' }}>
                                Available Coordinators
                            </label>
                            {availableAttendants.length === 0 ? (
                                <div style={{
                                    padding: '12px',
                                    borderRadius: '8px',
                                    backgroundColor: '#fee2e2',
                                    color: '#b91c1c',
                                    fontSize: '13px',
                                    fontWeight: 600
                                }}>
                                    ⚠️ No available attendants found. Registered coordinators are currently busy or unassigned.
                                </div>
                            ) : (
                                <select
                                    id="modal-attendant-select"
                                    value={selectedAttendantId}
                                    onChange={(e) => setSelectedAttendantId(e.target.value)}
                                    className="booking-input"
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        border: '1px solid #cbd5e1',
                                        backgroundColor: '#ffffff'
                                    }}
                                >
                                    {availableAttendants.map((attendant) => (
                                        <option key={attendant.id} value={attendant.id}>
                                            {attendant.name} ({attendant.languagesSpoken && attendant.languagesSpoken.length > 0 ? attendant.languagesSpoken.join(', ') : 'No languages listed'})
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                type="button"
                                onClick={handleCloseAssignModal}
                                style={{
                                    flex: 1,
                                    padding: '10px 0',
                                    borderRadius: '8px',
                                    border: '1px solid #cbd5e1',
                                    backgroundColor: '#ffffff',
                                    color: '#64748b',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleAssignAttendantConfirm}
                                disabled={availableAttendants.length === 0 || actionLoading !== null}
                                style={{
                                    flex: 1,
                                    padding: '10px 0',
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor: '#0A4EA3',
                                    color: '#ffffff',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    opacity: (availableAttendants.length === 0 || actionLoading !== null) ? 0.6 : 1
                                }}
                            >
                                {actionLoading ? 'Assigning...' : 'Confirm Booking'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HospitalBookings;

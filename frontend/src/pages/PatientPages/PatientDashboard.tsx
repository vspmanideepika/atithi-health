import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
    hospital: {
        id: string;
        name: string;
        location: string;
    } | null;
    program: {
        id: string;
        name: string;
    } | null;
}

export const PatientDashboard = () => {
    const { user, token } = useAuth();
    const navigate = useNavigate();

    // Booking modal states
    const [selectedTrip, setSelectedTrip] = useState<MedicalTrip | null>(null);
    const [surgeryDate, setSurgeryDate] = useState('');
    const [groupSize, setGroupSize] = useState(1);
    const [requestedLanguage, setRequestedLanguage] = useState('English');
    const [bookingSubmitError, setBookingSubmitError] = useState<string | null>(null);
    const [bookingSubmitting, setBookingSubmitting] = useState(false);

    const [hospitalQuery, setHospitalQuery] = useState('');
    const [programQuery, setProgramQuery] = useState('');
    const [startDateQuery, setStartDateQuery] = useState('');
    const [endDateQuery, setEndDateQuery] = useState('');
    const [locationQuery, setLocationQuery] = useState('');

    const [hospitalInput, setHospitalInput] = useState('');
    const [programInput, setProgramInput] = useState('');
    const [startDateInput, setStartDateInput] = useState('');
    const [endDateInput, setEndDateInput] = useState('');
    const [locationInput, setLocationInput] = useState('');

    const [trips, setTrips] = useState<MedicalTrip[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTrips = async () => {
        setLoading(true);
        setError(null);

        try {
            const params: Record<string, string> = {
                status: 'PLANNED'
            };
            if (hospitalQuery.trim()) params.hospitalName = hospitalQuery.trim();
            if (programQuery.trim()) params.programName = programQuery.trim();
            if (startDateQuery.trim()) params.startDate = startDateQuery.trim();
            if (endDateQuery.trim()) params.endDate = endDateQuery.trim();
            if (locationQuery.trim()) params.location = locationQuery.trim();

            const authToken = token || localStorage.getItem('token');
            const headers: Record<string, string> = authToken ? { Authorization: `Bearer ${authToken}` } : {};

            const [tripsRes, bookingsRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/api/trips`, { params, headers }),
                authToken
                    ? axios.get(`${API_BASE_URL}/api/bookings`, { headers }).catch((err) => {
                          console.error('Error fetching bookings to filter active trips:', err);
                          return { data: { success: false, bookings: [] } };
                      })
                    : Promise.resolve({ data: { success: false, bookings: [] } })
            ]);

            if (tripsRes.data && tripsRes.data.success) {
                let fetchedTrips: MedicalTrip[] = tripsRes.data.medicalTrips;

                if (bookingsRes.data && bookingsRes.data.success && Array.isArray(bookingsRes.data.bookings)) {
                    const activeBookedTripIds = new Set(
                        bookingsRes.data.bookings
                            .filter((b: any) => (b.status === 'PENDING' || b.status === 'CONFIRMED') && b.trip?.id)
                            .map((b: any) => b.trip.id)
                    );
                    fetchedTrips = fetchedTrips.filter((trip) => !activeBookedTripIds.has(trip.id));
                }

                setTrips(fetchedTrips);
            } else {
                setError('Failed to fetch medical packages.');
            }
        } catch (err: any) {
            console.error('Error fetching packages:', err);
            setError(err.response?.data?.message || 'Error loading packages. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTrips();
    }, [hospitalQuery, programQuery, startDateQuery, endDateQuery, locationQuery, token]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setHospitalQuery(hospitalInput);
        setProgramQuery(programInput);
        setStartDateQuery(startDateInput);
        setEndDateQuery(endDateInput);
        setLocationQuery(locationInput);
    };

    const handleReset = () => {
        setHospitalInput('');
        setProgramInput('');
        setStartDateInput('');
        setEndDateInput('');
        setLocationInput('');
        setHospitalQuery('');
        setProgramQuery('');
        setStartDateQuery('');
        setEndDateQuery('');
        setLocationQuery('');
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

    const handleBookPackage = (trip: MedicalTrip) => {
        setSelectedTrip(trip);

        let initialDate = '';
        if (trip.arrivalDate) {
            try {
                initialDate = new Date(trip.arrivalDate).toISOString().split('T')[0];
            } catch (e) {
                console.error('Error formatting arrival date:', e);
            }
        }

        setSurgeryDate(initialDate);
        setGroupSize(1);
        setRequestedLanguage('');
        setBookingSubmitError(null);
    };

    const handleCloseModal = () => {
        setSelectedTrip(null);
    };

    const handleBookingSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTrip) return;

        if (!surgeryDate) {
            setBookingSubmitError('Please select a target surgery/arrival date.');
            return;
        }

        if (groupSize <= 0 || groupSize > 4) {
            setBookingSubmitError('Companion group size must be between 1 and 4 people.');
            return;
        }

        if (!requestedLanguage.trim()) {
            setBookingSubmitError('Please specify at least one preferred language.');
            return;
        }

        if (requestedLanguage.length > 50) {
            setBookingSubmitError('Preferred language text must be 50 characters or less.');
            return;
        }

        setBookingSubmitting(true);
        setBookingSubmitError(null);

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_BASE_URL}/api/bookings`, {
                tripId: selectedTrip.id,
                surgeryDate,
                groupSize,
                requestedLanguage
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (res.data && res.data.success) {
                setSelectedTrip(null);
                navigate('/patient-bookings');
            } else {
                setBookingSubmitError(res.data?.message || 'Failed to submit booking.');
            }
        } catch (err: any) {
            console.error('Error submitting booking:', err);
            setBookingSubmitError(err.response?.data?.message || 'Error processing booking request.');
        } finally {
            setBookingSubmitting(false);
        }
    };

    let minDateStr = '';
    let maxDateStr = '';
    if (selectedTrip && selectedTrip.arrivalDate) {
        try {
            const arrival = new Date(selectedTrip.arrivalDate);

            const minDate = new Date(arrival);
            minDate.setDate(arrival.getDate() - 2);
            minDateStr = minDate.toISOString().split('T')[0];

            const maxDate = new Date(arrival);
            maxDate.setDate(arrival.getDate() + 1);
            maxDateStr = maxDate.toISOString().split('T')[0];
        } catch (e) {
            console.error('Error calculating date constraints:', e);
        }
    }

    return (
        <div style={{ maxWidth: '1100px', margin: '40px auto', padding: '0 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '20px', marginBottom: '25px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '28px', color: '#0A4EA3', fontWeight: 700 }}>Patient Portal</h1>
                    <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: '15px' }}>
                        Welcome back, <strong style={{ color: '#1e293b' }}>{user?.name || 'Patient'}</strong>. Browse packages and schedule your care.
                    </p>
                </div>
            </div>
            <form onSubmit={handleSearch} style={{
                backgroundColor: '#ffffff',
                padding: '24px',
                borderRadius: '16px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
                border: '1px solid #f1f5f9',
                marginBottom: '35px'
            }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>Search Medical Trip Packages</h3>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '16px',
                    alignItems: 'end'
                }}>
                    <div className="input-group" style={{ margin: 0 }}>
                        <label htmlFor="search-hospital" style={{ fontWeight: 600, fontSize: '13px', color: '#475569', marginBottom: '6px', display: 'block' }}>Hospital Name</label>
                        <input
                            type="text"
                            id="search-hospital"
                            placeholder="e.g. City General Hospital"
                            value={hospitalInput}
                            onChange={(e) => setHospitalInput(e.target.value)}
                            className="booking-input"
                            style={{ margin: 0, height: '42px', boxSizing: 'border-box' }}
                        />
                    </div>

                    <div className="input-group" style={{ margin: 0 }}>
                        <label htmlFor="search-program" style={{ fontWeight: 600, fontSize: '13px', color: '#475569', marginBottom: '6px', display: 'block' }}>Department / Program</label>
                        <input
                            type="text"
                            id="search-program"
                            placeholder="e.g. Cardiology"
                            value={programInput}
                            onChange={(e) => setProgramInput(e.target.value)}
                            className="booking-input"
                            style={{ margin: 0, height: '42px', boxSizing: 'border-box' }}
                        />
                    </div>

                    <div className="input-group" style={{ margin: 0 }}>
                        <label htmlFor="search-location" style={{ fontWeight: 600, fontSize: '13px', color: '#475569', marginBottom: '6px', display: 'block' }}>Location</label>
                        <input
                            type="text"
                            id="search-location"
                            placeholder="e.g. Hyderabad"
                            value={locationInput}
                            onChange={(e) => setLocationInput(e.target.value)}
                            className="booking-input"
                            style={{ margin: 0, height: '42px', boxSizing: 'border-box' }}
                        />
                    </div>

                    <div className="input-group" style={{ margin: 0 }}>
                        <label htmlFor="search-start-date" style={{ fontWeight: 600, fontSize: '13px', color: '#475569', marginBottom: '6px', display: 'block' }}>Arrival Date (From)</label>
                        <input
                            type="date"
                            id="search-start-date"
                            value={startDateInput}
                            onChange={(e) => setStartDateInput(e.target.value)}
                            className="booking-input"
                            style={{ margin: 0, height: '42px', boxSizing: 'border-box' }}
                        />
                    </div>

                    <div className="input-group" style={{ margin: 0 }}>
                        <label htmlFor="search-end-date" style={{ fontWeight: 600, fontSize: '13px', color: '#475569', marginBottom: '6px', display: 'block' }}>Arrival Date (To)</label>
                        <input
                            type="date"
                            id="search-end-date"
                            value={endDateInput}
                            min={startDateInput || undefined}
                            onChange={(e) => setEndDateInput(e.target.value)}
                            className="booking-input"
                            style={{ margin: 0, height: '42px', boxSizing: 'border-box' }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button type="submit" className="booking-button" style={{ margin: 0, height: '42px', flex: 2, padding: '0 15px', fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            Search
                        </button>
                        <button type="button" onClick={handleReset} style={{
                            margin: 0,
                            height: '42px',
                            flex: 1,
                            backgroundColor: '#f1f5f9',
                            color: '#475569',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 600,
                            transition: 'all 0.2s',
                        }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                        >
                            Reset
                        </button>
                    </div>
                </div>
            </form>

            <h2 style={{
                fontSize: '22px',
                fontWeight: 700,
                color: '#0A4EA3',
                marginBottom: '20px',
                borderBottom: '2px solid #f1f5f9',
                paddingBottom: '10px'
            }}>
                Explore Packages
            </h2>

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
                    <h3>Loading Trip Packages...</h3>
                </div>
            ) : error ? (
                <div className="general-error" style={{ padding: '16px', borderRadius: '12px', marginBottom: '30px' }}>
                    ⚠️ {error}
                </div>
            ) : trips.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '60px 20px',
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    border: '1px dashed #cbd5e1',
                    color: '#64748b'
                }}>
                    <p style={{ margin: '0 0 10px 0', fontSize: '18px', fontWeight: 600, color: '#334155' }}>No packages found</p>
                    <p style={{ margin: '0 0 20px 0', fontSize: '14px' }}>Try broadening your search or clearing the filters.</p>
                    <button onClick={handleReset} className="profile-edit-btn" style={{ float: 'none', margin: '0 auto' }}>
                        Clear Filters
                    </button>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '24px'
                }}>
                    {trips.map((trip) => (
                        <div
                            key={trip.id}
                            className="profile-details-card"
                            style={{
                                padding: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden',
                                height: '100%',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                border: '1px solid #f1f5f9'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.transform = 'translateY(-4px)';
                                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            <div style={{
                                width: '100%',
                                height: '180px',
                                overflow: 'hidden',
                                position: 'relative'
                            }}>
                                {trip.mediaUrl ? (
                                    <img
                                        src={trip.mediaUrl.startsWith('/') ? `${API_BASE_URL}${trip.mediaUrl}` : trip.mediaUrl}
                                        alt={trip.title}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover'
                                        }}
                                    />
                                ) : (
                                    <div style={{
                                        width: '100%',
                                        height: '100%',
                                        background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#0284c7'
                                    }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '48px', height: '48px' }}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h18v18H3V3z" />
                                        </svg>
                                    </div>
                                )}
                            </div>

                            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                                <div>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                                        {trip.hospital && (
                                            <span style={{
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                padding: '3px 8px',
                                                borderRadius: '20px',
                                                backgroundColor: '#e0f2fe',
                                                color: '#0369a1'
                                            }}>
                                                🏥 {trip.hospital.name}
                                            </span>
                                        )}
                                        {trip.program && (
                                            <span style={{
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                padding: '3px 8px',
                                                borderRadius: '20px',
                                                backgroundColor: '#f0fdf4',
                                                color: '#166534'
                                            }}>
                                                🩺 {trip.program.name}
                                            </span>
                                        )}
                                        {trip.averageRating ? (
                                            <span style={{
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                padding: '3px 8px',
                                                borderRadius: '20px',
                                                backgroundColor: '#fef3c7',
                                                color: '#b45309'
                                            }}>
                                                ⭐ {trip.averageRating} ({trip.reviewCount || 0} {(trip.reviewCount === 1) ? 'review' : 'reviews'})
                                            </span>
                                        ) : (
                                            <span style={{
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                padding: '3px 8px',
                                                borderRadius: '20px',
                                                backgroundColor: '#f1f5f9',
                                                color: '#64748b'
                                            }}>
                                                ⭐ New Package
                                            </span>
                                        )}
                                    </div>

                                    <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 700, color: '#0f172a', lineHeight: '1.4' }}>
                                        {trip.title}
                                    </h3>
                                    <p style={{
                                        margin: '0 0 16px 0',
                                        fontSize: '14px',
                                        color: '#475569',
                                        lineHeight: '1.5',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 3,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        height: '63px'
                                    }}>
                                        {trip.description}
                                    </p>
                                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', marginBottom: '20px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                                            <span style={{ color: '#64748b' }}>Expected Arrival:</span>
                                            <span style={{ fontWeight: 600, color: '#1e293b' }}>{formatDate(trip.arrivalDate)}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                            <span style={{ color: '#64748b' }}>Slots left:</span>
                                            <span style={{ fontWeight: 600, color: '#1e293b' }}>{trip.maxGroupCapacity} patient groups</span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleBookPackage(trip)}
                                    className="booking-button"
                                    style={{
                                        margin: 0,
                                        width: '100%',
                                        padding: '10px 0',
                                        fontWeight: 600,
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: '16px', height: '16px' }}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12.75 3.03v.568c0 .334.148.65.405.864l4.038 3.348a.75.75 0 010 1.15l-4.038 3.348a.98 1.01 0 01-.405.864v.566c0 .521-.538.903-1.01.69a6.002 6.002 0 01-3.232-3.232c-.213-.472.169-1.01.69-1.01h.568c.334 0 .65-.148.864-.405l3.348-4.038a.75.75 0 011.15 0l3.348 4.038c.257.257.257.67 0 .927" />
                                    </svg>
                                    Book Trip Package
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Booking Form Modal */}
            {selectedTrip && (
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
                        position: 'relative',
                        maxHeight: '90vh',
                        overflowY: 'auto'
                    }}>
                        {/* Close Button */}
                        <button
                            onClick={handleCloseModal}
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
                            Book Medical Package
                        </h2>
                        <p style={{ margin: '0 0 20px 0', color: '#64748b', fontSize: '14px' }}>
                            Confirm details for: <strong>{selectedTrip.title}</strong>
                        </p>

                        {bookingSubmitError && (
                            <div className="general-error" style={{ marginBottom: '15px', padding: '10px 12px', borderRadius: '8px', fontSize: '13px' }}>
                                ⚠️ {bookingSubmitError}
                            </div>
                        )}

                        <form onSubmit={handleBookingSubmit} className="booking-form">
                            <div className="input-group">
                                <label htmlFor="modal-surgery-date">Target Surgery / Arrival Date</label>
                                <input
                                    type="date"
                                    id="modal-surgery-date"
                                    min={minDateStr}
                                    max={maxDateStr}
                                    value={surgeryDate}
                                    onChange={(e) => setSurgeryDate(e.target.value)}
                                    className="booking-input"
                                    required
                                />
                                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                                    Allowed range is 2 days before or day after the expected arrival date: {minDateStr ? formatDate(minDateStr) : ''} to {maxDateStr ? formatDate(maxDateStr) : ''}
                                </span>
                            </div>

                            <div className="input-group">
                                <label htmlFor="modal-group-size">Companion Group Size (including patient)</label>
                                <input
                                    type="number"
                                    id="modal-group-size"
                                    min="1"
                                    max={4}
                                    value={groupSize}
                                    onChange={(e) => setGroupSize(parseInt(e.target.value) || 1)}
                                    className="booking-input"
                                    required
                                />
                                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                                    Maximum allowed group size is 4 people. Remaining intake slots: {selectedTrip.maxGroupCapacity} groups.
                                </span>
                            </div>

                            <div className="input-group">
                                <label htmlFor="modal-language">Preferred Language(s) for Coordinator</label>
                                <input
                                    type="text"
                                    id="modal-language"
                                    placeholder="e.g. English, Spanish, Arabic"
                                    value={requestedLanguage}
                                    onChange={(e) => setRequestedLanguage(e.target.value)}
                                    maxLength={50}
                                    className="booking-input"
                                    required
                                />
                                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                                    Specify 2-3 preferred languages for coordination (max 50 characters).
                                </span>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '25px' }}>
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    style={{
                                        flex: 1,
                                        padding: '10px 0',
                                        backgroundColor: '#f1f5f9',
                                        color: '#475569',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                        fontSize: '14px'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={bookingSubmitting}
                                    className="booking-button"
                                    style={{ flex: 1, margin: 0, padding: '10px 0', fontWeight: 600 }}
                                >
                                    {bookingSubmitting ? 'Submitting...' : 'Confirm Booking'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PatientDashboard;

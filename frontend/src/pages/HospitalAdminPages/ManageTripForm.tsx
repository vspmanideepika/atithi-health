import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const ManageTripForm = () => {
    const { programId, tripId } = useParams<{ programId: string; tripId?: string }>();
    const navigate = useNavigate();
    const { token } = useAuth();
    const isEditMode = !!tripId;

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        max_group_capacity: 3,
        status: 'PLANNED',
        arrival_date: '',
        media_url: '',
    });

    const [loading, setLoading] = useState(isEditMode);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [generalError, setGeneralError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTripDetails = async () => {
            if (!isEditMode || !tripId) return;

            try {
                const res = await axios.get(`${API_BASE_URL}/api/trips/${tripId}`);
                if (res.data && res.data.success) {
                    const trip = res.data.medicalTrip;
                    // Format arrival date for input type="date" (YYYY-MM-DD)
                    let formattedDate = '';
                    if (trip.arrivalDate) {
                        formattedDate = new Date(trip.arrivalDate).toISOString().split('T')[0];
                    }

                    setFormData({
                        title: trip.title || '',
                        description: trip.description || '',
                        max_group_capacity: trip.maxGroupCapacity || 3,
                        status: trip.status || 'PLANNED',
                        arrival_date: formattedDate,
                        media_url: trip.mediaUrl || '',
                    });
                } else {
                    setGeneralError('Failed to load trip package details.');
                }
            } catch (err) {
                console.error('Error fetching trip details:', err);
                setGeneralError('Error fetching trip details from the server.');
            } finally {
                setLoading(false);
            }
        };

        fetchTripDetails();
    }, [isEditMode, tripId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: name === 'max_group_capacity' ? parseInt(value) || 0 : value,
        }));

        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset errors
        setUploadError(null);

        // Simple validation
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            setUploadError('Only JPG, JPEG, PNG, and WEBP image files are allowed.');
            return;
        }

        // Limit to 10MB
        if (file.size > 10 * 1024 * 1024) {
            setUploadError('File is too large. Maximum size is 10MB.');
            return;
        }

        setIsUploading(true);
        const uploadData = new FormData();
        uploadData.append('file', file);

        try {
            const authToken = token || localStorage.getItem('token');
            const res = await axios.post(`${API_BASE_URL}/api/upload`, uploadData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${authToken}`,
                },
            });

            if (res.data && res.data.success) {
                setFormData((prev) => ({
                    ...prev,
                    media_url: res.data.url,
                }));
            } else {
                setUploadError(res.data?.message || 'Failed to upload image.');
            }
        } catch (err: any) {
            console.error('Image upload error:', err);
            setUploadError(err.response?.data?.message || 'Error uploading file. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemoveImage = () => {
        setFormData((prev) => ({
            ...prev,
            media_url: '',
        }));
        setUploadError(null);
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.title.trim()) {
            newErrors.title = 'Title is required.';
        }

        if (!formData.description.trim()) {
            newErrors.description = 'Description is required.';
        }

        if (!formData.arrival_date) {
            newErrors.arrival_date = 'Arrival date is required.';
        }

        if (formData.max_group_capacity <= 0) {
            newErrors.max_group_capacity = 'Max group capacity must be at least 1.';
        }

        return newErrors;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setGeneralError(null);

        const formErrors = validateForm();
        if (Object.keys(formErrors).length > 0) {
            setErrors(formErrors);
            return;
        }

        setIsSubmitting(true);
        try {
            const authToken = token || localStorage.getItem('token');
            const headers = {
                Authorization: `Bearer ${authToken}`,
                'Content-Type': 'application/json',
            };

            if (isEditMode) {
                // Update
                const res = await axios.put(
                    `${API_BASE_URL}/api/trips/${tripId}`,
                    formData,
                    { headers }
                );
                if (res.data && res.data.success) {
                    navigate(`/program-trips/${programId}`);
                }
            } else {
                // Create
                const res = await axios.post(
                    `${API_BASE_URL}/api/trips`,
                    {
                        ...formData,
                        program_id: programId,
                    },
                    { headers }
                );
                if (res.data && res.data.success) {
                    navigate(`/program-trips/${programId}`);
                }
            }
        } catch (err: any) {
            console.error('Error submitting form:', err);
            if (err.response?.data?.message) {
                setGeneralError(err.response.data.message);
            } else {
                setGeneralError('Failed to save medical trip package.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '50px', color: '#64748b' }}>
                <h3>Loading Trip Form...</h3>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '600px', margin: '40px auto', padding: '0 20px' }}>
            <div style={{ marginBottom: '20px' }}>
                <Link to={`/program-trips/${programId}`} style={{ textDecoration: 'none', color: '#0284c7', fontWeight: 600, fontSize: '15px' }}>
                    ← Back to Packages
                </Link>
            </div>

            <div className="profile-details-card" style={{ padding: '30px' }}>
                <h2 style={{ margin: '0 0 20px 0', fontSize: '22px', fontWeight: 700, color: '#0A4EA3', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px' }}>
                    {isEditMode ? 'Edit Medical Trip' : 'Register Medical Trip'}
                </h2>

                {generalError && <div className="general-error" style={{ marginBottom: '20px' }}>{generalError}</div>}

                <form onSubmit={handleSubmit} className="booking-form">
                    <div className="input-group">
                        <label htmlFor="title">Trip Title</label>
                        <input
                            type="text"
                            id="title"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            placeholder="e.g. Heart Valve Bypass Package - Sept 2026"
                            className={`booking-input ${errors.title ? 'error' : ''}`}
                        />
                        {errors.title && <span className="error-text">{errors.title}</span>}
                    </div>

                    <div className="input-group">
                        <label htmlFor="description">Package Description</label>
                        <textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Describe travel itinerary, treatment details, hospital stay length..."
                            className={`booking-input ${errors.description ? 'error' : ''}`}
                            style={{ minHeight: '100px', fontFamily: 'inherit' }}
                        />
                        {errors.description && <span className="error-text">{errors.description}</span>}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div className="input-group">
                            <label htmlFor="max_group_capacity">Max Group Capacity</label>
                            <input
                                type="number"
                                id="max_group_capacity"
                                name="max_group_capacity"
                                min="1"
                                value={formData.max_group_capacity}
                                onChange={handleChange}
                                className={`booking-input ${errors.max_group_capacity ? 'error' : ''}`}
                            />
                            {errors.max_group_capacity && <span className="error-text">{errors.max_group_capacity}</span>}
                        </div>

                        <div className="input-group">
                            <label htmlFor="status">Trip Status</label>
                            <select
                                id="status"
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="booking-input"
                            >
                                <option value="PLANNED">PLANNED</option>
                                <option value="ONGOING">ONGOING</option>
                                <option value="COMPLETED">COMPLETED</option>
                            </select>
                        </div>
                    </div>

                    <div className="input-group">
                        <label htmlFor="arrival_date">Expected Arrival Date</label>
                        <input
                            type="date"
                            id="arrival_date"
                            name="arrival_date"
                            value={formData.arrival_date}
                            onChange={handleChange}
                            className={`booking-input ${errors.arrival_date ? 'error' : ''}`}
                        />
                        {errors.arrival_date && <span className="error-text">{errors.arrival_date}</span>}
                    </div>

                    <div className="input-group">
                        <style>{`
                            @keyframes spin {
                                0% { transform: rotate(0deg); }
                                100% { transform: rotate(360deg); }
                            }
                        `}</style>
                        <label htmlFor="media_url" style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#475569' }}>
                            Package Image (Optional)
                        </label>

                        {formData.media_url ? (
                            <div style={{
                                position: 'relative',
                                border: '1px solid #e2e8f0',
                                borderRadius: '12px',
                                padding: '12px',
                                backgroundColor: '#f8fafc',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '10px'
                            }}>
                                <img
                                    src={formData.media_url.startsWith('/') ? `${API_BASE_URL}${formData.media_url}` : formData.media_url}
                                    alt="Trip Package"
                                    style={{
                                        maxWidth: '100%',
                                        maxHeight: '200px',
                                        borderRadius: '8px',
                                        objectFit: 'cover',
                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={handleRemoveImage}
                                    style={{
                                        padding: '6px 14px',
                                        backgroundColor: '#ef4444',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        transition: 'background-color 0.2s',
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
                                >
                                    Remove Image
                                </button>
                            </div>
                        ) : (
                            <div style={{
                                border: '2px dashed #cbd5e1',
                                borderRadius: '12px',
                                padding: '24px',
                                textAlign: 'center',
                                backgroundColor: isUploading ? '#f8fafc' : '#ffffff',
                                transition: 'all 0.2s ease-in-out',
                                cursor: isUploading ? 'not-allowed' : 'pointer',
                                position: 'relative'
                            }}
                                onMouseOver={(e) => {
                                    if (!isUploading) {
                                        e.currentTarget.style.borderColor = '#0284c7';
                                        e.currentTarget.style.backgroundColor = '#f0f9ff';
                                    }
                                }}
                                onMouseOut={(e) => {
                                    if (!isUploading) {
                                        e.currentTarget.style.borderColor = '#cbd5e1';
                                        e.currentTarget.style.backgroundColor = '#ffffff';
                                    }
                                }}
                            >
                                <input
                                    type="file"
                                    id="media_upload"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    disabled={isUploading}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: '100%',
                                        opacity: 0,
                                        cursor: isUploading ? 'not-allowed' : 'pointer'
                                    }}
                                />
                                {isUploading ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                        <div style={{
                                            width: '24px',
                                            height: '24px',
                                            border: '3px solid #e2e8f0',
                                            borderTop: '3px solid #0284c7',
                                            borderRadius: '50%',
                                            animation: 'spin 1s linear infinite'
                                        }}></div>
                                        <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>Uploading image...</span>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '36px', height: '36px', color: '#94a3b8', marginBottom: '4px' }}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.9 2.9m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                                        </svg>
                                        <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: 600 }}>Click to upload an image</span>
                                        <span style={{ fontSize: '12px', color: '#64748b' }}>PNG, JPG, JPEG, or WEBP up to 10MB</span>
                                    </div>
                                )}
                            </div>
                        )}
                        {uploadError && (
                            <span className="error-text" style={{ display: 'block', marginTop: '6px', color: '#ef4444', fontSize: '13px' }}>
                                {uploadError}
                            </span>
                        )}

                        <input
                            type="hidden"
                            id="media_url"
                            name="media_url"
                            value={formData.media_url}
                        />
                    </div>

                    <button type="submit" className="booking-button" disabled={isSubmitting} style={{ marginTop: '20px' }}>
                        {isSubmitting ? 'Saving...' : 'Save Package'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ManageTripForm;

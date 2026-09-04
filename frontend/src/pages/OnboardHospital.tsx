import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const OnboardHospital = () => {
    const [formData, setFormData] = useState({
        name: '',
        location: '',
        programsInput: 'Cardiology, Orthopedics, Oncology',
        repName: '',
        repEmail: '',
        repPassword: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        if (errors[name]) {
            setErrors({ ...errors, [name]: '' });
        }
    };

    const validateForm = () => {
        let formErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            formErrors.name = 'Hospital name is required';
        }
        if (!formData.location.trim()) {
            formErrors.location = 'Location is required';
        }
        if (!formData.repName.trim()) {
            formErrors.repName = 'Representative name is required';
        }
        if (!formData.repEmail.trim()) {
            formErrors.repEmail = 'Representative email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.repEmail)) {
            formErrors.repEmail = 'Please enter a valid email address';
        }
        if (!formData.repPassword) {
            formErrors.repPassword = 'Administrator password is required';
        } else if (formData.repPassword.length < 6) {
            formErrors.repPassword = 'Password must be at least 6 characters';
        }

        return formErrors;
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const validationErrors = validateForm();

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setIsSubmitting(true);
        setErrors({});
        setSuccessMessage(null);

        // Convert programs input to array
        const programsArray = formData.programsInput
            ? formData.programsInput.split(',').map((p) => p.trim()).filter((p) => p.length > 0)
            : [];

        try {
            await axios.post(`${API_BASE_URL}/api/hospitals`, {
                name: formData.name,
                location: formData.location,
                programs: programsArray,
                repName: formData.repName,
                repEmail: formData.repEmail,
                repPassword: formData.repPassword,
            });

            setSuccessMessage('Hospital and Administrator account onboarded successfully! You can now log in using your representative email.');
            setFormData({
                name: '',
                location: '',
                programsInput: 'Cardiology, Orthopedics, Oncology',
                repName: '',
                repEmail: '',
                repPassword: '',
            });
        } catch (error: unknown) {
            if (axios.isAxiosError(error) && error.response?.data?.message) {
                setErrors({ general: error.response.data.message });
            } else {
                setErrors({ general: 'Onboarding failed. Please try again.' });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="booking-container" style={{ maxWidth: '600px', margin: '40px auto' }}>
            <h2>Onboard New Hospital</h2>
            <p style={{ color: '#475569', fontSize: '14px', marginBottom: '25px', textAlign: 'center' }}>
                Become a medical tourism partner. Register your hospital facility and create your primary Hospital Administrator account.
            </p>

            {successMessage && (
                <div className="success-message" style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '12px', borderRadius: '6px', marginBottom: '15px' }}>
                    {successMessage}
                </div>
            )}

            {errors.general && (
                <div className="general-error">{errors.general}</div>
            )}

            <form onSubmit={handleSubmit} className="booking-form">

                <h3 style={{ color: 'var(--primary-color)', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '15px' }}>
                    Hospital Details
                </h3>

                <div className="input-group">
                    <label htmlFor="name">Hospital Name</label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className={`booking-input ${errors.name ? 'error' : ''}`}
                        placeholder="e.g. Apollo Hospital Delhi"
                    />
                    {errors.name && <span className="error-text">{errors.name}</span>}
                </div>

                <div className="input-group">
                    <label htmlFor="location">City & Country</label>
                    <input
                        type="text"
                        id="location"
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        className={`booking-input ${errors.location ? 'error' : ''}`}
                        placeholder="e.g. New Delhi, India"
                    />
                    {errors.location && <span className="error-text">{errors.location}</span>}
                </div>

                <div className="input-group">
                    <label htmlFor="programsInput">Specialty Programs (Comma separated)</label>
                    <textarea
                        id="programsInput"
                        name="programsInput"
                        value={formData.programsInput}
                        onChange={handleChange}
                        className="booking-input"
                        rows={3}
                        style={{ fontFamily: 'inherit', resize: 'vertical' }}
                    />
                </div>

                <h3 style={{ color: 'var(--primary-color)', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginTop: '25px', marginBottom: '15px' }}>
                    Hospital Administrator Account
                </h3>

                <div className="input-group">
                    <label htmlFor="repName">Full Name</label>
                    <input
                        type="text"
                        id="repName"
                        name="repName"
                        value={formData.repName}
                        onChange={handleChange}
                        className={`booking-input ${errors.repName ? 'error' : ''}`}
                        placeholder="Representative name"
                    />
                    {errors.repName && <span className="error-text">{errors.repName}</span>}
                </div>

                <div className="input-group">
                    <label htmlFor="repEmail">Email Address</label>
                    <input
                        type="email"
                        id="repEmail"
                        name="repEmail"
                        value={formData.repEmail}
                        onChange={handleChange}
                        className={`booking-input ${errors.repEmail ? 'error' : ''}`}
                        placeholder="rep@hospital.com"
                    />
                    {errors.repEmail && <span className="error-text">{errors.repEmail}</span>}
                </div>

                <div className="input-group">
                    <label htmlFor="repPassword">Login Password</label>
                    <input
                        type="password"
                        id="repPassword"
                        name="repPassword"
                        value={formData.repPassword}
                        onChange={handleChange}
                        className={`booking-input ${errors.repPassword ? 'error' : ''}`}
                        placeholder="Password for administrator login"
                    />
                    {errors.repPassword && <span className="error-text">{errors.repPassword}</span>}
                </div>

                <button type="submit" className="booking-button" disabled={isSubmitting} style={{ marginTop: '20px' }}>
                    {isSubmitting ? 'Onboarding...' : 'Onboard Hospital & Admin'}
                </button>
            </form>

            <p className="link-text" style={{ marginTop: '20px' }}>
                <Link to="/">Back to Home</Link> | <Link to="/login">Go to Login</Link>
            </p>
        </div>
    );
};

export default OnboardHospital;

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Register = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));

        if (errors[name]) {
            setErrors({
                ...errors,
                [name]: '',
            });
        }
    };

    const validateForm = () => {
        let formErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            formErrors.name = 'Name is required';
        }

        if (!formData.email) {
            formErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            formErrors.email = 'Please enter a valid email address';
        }

        if (!formData.password) {
            formErrors.password = 'Password is required';
        } else if (formData.password.length < 6) {
            formErrors.password = 'Password must be at least 6 characters';
        }

        if (formData.password !== formData.confirmPassword) {
            formErrors.confirmPassword = 'Passwords do not match';
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

        try {
            await axios.post(`${API_BASE_URL}/api/auth/register`, {
                name: formData.name,
                email: formData.email,
                password: formData.password,
            });
            navigate('/login', { state: { registered: true } });
        } catch (error: unknown) {
            if (axios.isAxiosError(error) && error.response?.data?.message) {
                setErrors({ general: error.response.data.message });
            } else {
                setErrors({ general: 'Registration failed. Please try again.' });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="booking-container">
            <h2>Create an Account</h2>
            <p style={{ color: '#475569', fontSize: '14px', marginBottom: '20px', textAlign: 'center' }}>
                Join Atithi Health as a patient to explore specialized care packages and coordinate your medical travel.
            </p>

            {errors.general && (
                <div className="general-error">{errors.general}</div>
            )}

            <form onSubmit={handleSubmit} className="booking-form">

                <div className="input-group">
                    <label htmlFor="name">Full Name</label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className={`booking-input ${errors.name ? 'error' : ''}`}
                        placeholder="John Doe"
                    />
                    {errors.name && <span className="error-text">{errors.name}</span>}
                </div>

                <div className="input-group">
                    <label htmlFor="email">Email</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className={`booking-input ${errors.email ? 'error' : ''}`}
                        placeholder="john.doe@example.com"
                    />
                    {errors.email && <span className="error-text">{errors.email}</span>}
                </div>

                <div className="input-group">
                    <label htmlFor="password">Password</label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className={`booking-input ${errors.password ? 'error' : ''}`}
                        placeholder="Min 6 characters"
                    />
                    {errors.password && <span className="error-text">{errors.password}</span>}
                </div>

                <div className="input-group">
                    <label htmlFor="confirmPassword">Confirm Password</label>
                    <input
                        type="password"
                        id="confirmPassword"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className={`booking-input ${errors.confirmPassword ? 'error' : ''}`}
                        placeholder="Confirm password"
                    />
                    {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
                </div>

                <button type="submit" className="booking-button" disabled={isSubmitting}>
                    {isSubmitting ? 'Registering...' : 'Register'}
                </button>
            </form>

            <p className="link-text">
                Already have an account? <Link to="/login">Login here</Link>
            </p>
        </div>
    );
};

export default Register;

import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, user, isAuthenticated } = useAuth();

    useEffect(() => {
        if (isAuthenticated && user) {
            if (user.role === 'PATIENT') {
                navigate('/patient-dashboard', { replace: true });
            } else if (user.role === 'ATTENDANT') {
                navigate('/attendant-dashboard', { replace: true });
            } else if (user.role === 'HOSPITAL_ADMIN') {
                navigate('/hospital-dashboard', { replace: true });
            } else if (user.role === 'ADMIN') {
                navigate('/admin-dashboard', { replace: true });
            }
        }
    }, [isAuthenticated, user, navigate]);

    const justRegistered = (location.state as { registered?: boolean })?.registered;

    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;

        setFormData({
            ...formData,
            [name]: value,
        });

        if (errors[name]) {
            setErrors({
                ...errors,
                [name]: '',
            });
        }
    };

    const validateForm = () => {
        let formErrors: Record<string, string> = {};

        if (!formData.email) {
            formErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            formErrors.email = 'Please enter a valid email address';
        }

        if (!formData.password) {
            formErrors.password = 'Password is required';
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
            const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
                email: formData.email,
                password: formData.password,
            });

            const { token, user } = response.data;

            login(token, user);

            // Redirect based on user role
            if (user.role === 'PATIENT') {
                navigate('/patient-dashboard');
            } else if (user.role === 'ATTENDANT') {
                navigate('/attendant-dashboard');
            } else if (user.role === 'HOSPITAL_ADMIN') {
                navigate('/hospital-dashboard');
            } else if (user.role === 'ADMIN') {
                navigate('/admin-dashboard');
            } else {
                navigate('/');
            }
        } catch (error: unknown) {
            if (axios.isAxiosError(error) && error.response?.data?.message) {
                setErrors({ general: error.response.data.message });
            } else {
                setErrors({ general: 'Login failed. Please try again.' });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="booking-container">
            <h2>Login to Your Account</h2>

            {justRegistered && (
                <div className="success-message">
                    Registration successful! Please log in with your credentials.
                </div>
            )}

            {errors.general && (
                <div className="general-error">{errors.general}</div>
            )}

            <form onSubmit={handleSubmit} className="booking-form">

                <div className="input-group">
                    <label htmlFor="email">Email</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className={`booking-input ${errors.email ? 'error' : ''}`}
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
                    />
                    {errors.password && <span className="error-text">{errors.password}</span>}
                </div>

                <button type="submit" className="booking-button" disabled={isSubmitting}>
                    {isSubmitting ? 'Logging in...' : 'Login'}
                </button>
            </form>

            <p className="link-text">
                Don't have an account? <Link to="/register">Register here</Link>
            </p>
        </div>
    );
};

export default Login;
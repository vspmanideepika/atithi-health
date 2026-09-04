import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface Program {
    id: string;
    name: string;
    description: string;
    hospital: {
        id: string;
        name: string;
    };
}

interface Attendant {
    id: string;
    name: string;
    email: string;
}

export const HospitalAdminDashboard = () => {
    const { user, token } = useAuth();
    const [programs, setPrograms] = useState<Program[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const [attendants, setAttendants] = useState<Attendant[]>([]);
    const [attendantsLoading, setAttendantsLoading] = useState(true);
    const [attendantsError, setAttendantsError] = useState<string | null>(null);

    const [newProgramName, setNewProgramName] = useState('');
    const [newProgramDesc, setNewProgramDesc] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [addError, setAddError] = useState<string | null>(null);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [editError, setEditError] = useState<string | null>(null);

    const hospitalId = user?.hospital?.id;

    const fetchPrograms = async () => {
        if (!hospitalId) {
            setLoading(false);
            return;
        }

        try {
            setError(null);
            const res = await axios.get(`${API_BASE_URL}/api/programs?hospitalId=${hospitalId}`);
            if (res.data && res.data.success) {
                setPrograms(res.data.programs);
            } else {
                setError('Failed to load programs.');
            }
        } catch (err: any) {
            console.error('Error fetching programs:', err);
            setError('Could not connect to the server to fetch programs.');
        } finally {
            setLoading(false);
        }
    };

    const fetchAttendants = async () => {
        if (!hospitalId) {
            setAttendantsLoading(false);
            return;
        }

        try {
            setAttendantsError(null);
            const authToken = token || localStorage.getItem('token');
            const res = await axios.get(`${API_BASE_URL}/api/hospitals/attendants`, {
                headers: {
                    Authorization: `Bearer ${authToken}`
                }
            });
            if (res.data && res.data.success) {
                setAttendants(res.data.attendants);
            } else {
                setAttendantsError('Failed to load Attendants.');
            }
        } catch (err: any) {
            console.error('Error fetching Attendants:', err);
            setAttendantsError('Could not fetch Attendants from the server.');
        } finally {
            setAttendantsLoading(false);
        }
    };

    useEffect(() => {
        fetchPrograms();
        fetchAttendants();
    }, [hospitalId]);

    // Add program handler
    const handleAddProgram = async (e: React.FormEvent) => {
        e.preventDefault();
        setAddError(null);
        setSuccessMessage(null);

        if (!newProgramName.trim()) {
            setAddError('Program/Department name is required.');
            return;
        }

        try {
            const authToken = token || localStorage.getItem('token');
            const res = await axios.post(
                `${API_BASE_URL}/api/programs`,
                {
                    name: newProgramName.trim(),
                    description: newProgramDesc.trim(),
                },
                {
                    headers: {
                        Authorization: `Bearer ${authToken}`,
                    },
                }
            );

            if (res.data && res.data.success) {
                setSuccessMessage('Program registered successfully.');
                setNewProgramName('');
                setNewProgramDesc('');
                setIsAdding(false);
                fetchPrograms();
            }
        } catch (err: any) {
            console.error('Error adding program:', err);
            if (err.response?.data?.message) {
                setAddError(err.response.data.message);
            } else {
                setAddError('Failed to register program. Please try again.');
            }
        }
    };

    // Trigger edit mode
    const startEditing = (program: Program) => {
        setEditingId(program.id);
        setEditName(program.name);
        setEditDesc(program.description || '');
        setEditError(null);
        setSuccessMessage(null);
    };

    // Save edited program
    const handleSaveEdit = async (id: string) => {
        setEditError(null);
        if (!editName.trim()) {
            setEditError('Program name cannot be empty.');
            return;
        }

        try {
            const authToken = token || localStorage.getItem('token');
            const res = await axios.put(
                `${API_BASE_URL}/api/programs/${id}`,
                {
                    name: editName.trim(),
                    description: editDesc.trim(),
                },
                {
                    headers: {
                        Authorization: `Bearer ${authToken}`,
                    },
                }
            );

            if (res.data && res.data.success) {
                setSuccessMessage('Program updated successfully.');
                setEditingId(null);
                fetchPrograms();
            }
        } catch (err: any) {
            console.error('Error updating program:', err);
            if (err.response?.data?.message) {
                setEditError(err.response.data.message);
            } else {
                setEditError('Failed to update program.');
            }
        }
    };

    // Delete program handler
    const handleDeleteProgram = async (id: string, name: string) => {
        setSuccessMessage(null);
        if (!window.confirm(`Are you sure you want to delete the "${name}" program? This action will cascade delete any trips linked to it.`)) {
            return;
        }

        try {
            const authToken = token || localStorage.getItem('token');
            const res = await axios.delete(`${API_BASE_URL}/api/programs/${id}`, {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            });

            if (res.data && res.data.success) {
                setSuccessMessage('Program deleted successfully.');
                fetchPrograms();
            }
        } catch (err: any) {
            console.error('Error deleting program:', err);
            setError('Failed to delete the program.');
        }
    };

    return (
        <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 20px' }}>
            {/* Upper Dashboard Header Row */}
            <div style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '20px', marginBottom: '25px' }}>
                <h1 style={{ margin: 0, fontSize: '28px', color: '#0A4EA3', fontWeight: 700 }}>Hospital Admin Portal</h1>
                <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: '15px' }}>
                    Manage programs, staff, and care packages for {user?.hospital?.name || 'Your Hospital'}
                </p>
            </div>

            {/* Quick Stats / Info Header */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <div className="profile-details-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '5px', alignSelf: 'stretch', justifyContent: 'space-between' }}>
                    <div>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Facility Info</span>
                        <strong style={{ fontSize: '18px', color: '#0f172a' }}>{user?.hospital?.name || 'Unassigned'}</strong>
                    </div>
                    <span style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}></span>
                </div>
                <div className="profile-details-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '5px', alignSelf: 'stretch', justifyContent: 'space-between' }}>
                    <div>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Specialty Departments</span>
                        <strong style={{ fontSize: '28px', color: '#00A88F', fontWeight: 700 }}>{programs.length}</strong>
                    </div>
                    <span style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>Active Programs</span>
                </div>
                <div className="profile-details-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '5px', alignSelf: 'stretch', justifyContent: 'space-between' }}>
                    <div>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Attendants</span>
                        <strong style={{ fontSize: '28px', color: '#0284c7', fontWeight: 700 }}>{attendants.length}</strong>
                    </div>
                    <span style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>Registered Attendants</span>
                </div>
            </div>

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

            <div className="profile-details-card" style={{ padding: '30px', marginBottom: '40px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f1f5f9', paddingBottom: '12px', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0A4EA3' }}>Specialty Programs & Departments</h2>
                    {!isAdding && (
                        <button
                            className="profile-edit-btn"
                            style={{ padding: '6px 12px', fontSize: '14px' }}
                            onClick={() => {
                                setIsAdding(true);
                                setAddError(null);
                                setSuccessMessage(null);
                            }}
                        >
                            + Add New Department
                        </button>
                    )}
                </div>

                {isAdding && (
                    <form onSubmit={handleAddProgram} style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', marginBottom: '25px' }}>
                        <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>Add Specialty Department</h3>
                        {addError && <div className="general-error" style={{ marginBottom: '15px' }}>{addError}</div>}
                        <div className="input-group" style={{ marginBottom: '15px' }}>
                            <label htmlFor="progName" style={{ fontSize: '14px', fontWeight: 600, color: '#475569', marginBottom: '5px' }}>Department Name</label>
                            <input
                                type="text"
                                id="progName"
                                placeholder="e.g. Cardiology, Oncology, Orthopedics"
                                value={newProgramName}
                                onChange={(e) => setNewProgramName(e.target.value)}
                                className="booking-input"
                                style={{ width: '100%', boxSizing: 'border-box' }}
                            />
                        </div>
                        <div className="input-group" style={{ marginBottom: '15px' }}>
                            <label htmlFor="progDesc" style={{ fontSize: '14px', fontWeight: 600, color: '#475569', marginBottom: '5px' }}>Description</label>
                            <textarea
                                id="progDesc"
                                placeholder="Describe the care services provided by this department..."
                                value={newProgramDesc}
                                onChange={(e) => setNewProgramDesc(e.target.value)}
                                className="booking-input"
                                style={{ width: '100%', boxSizing: 'border-box', minHeight: '80px', fontFamily: 'inherit' }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                            <button type="submit" className="profile-edit-btn" style={{ padding: '8px 16px', fontSize: '14px' }}>
                                Register Department
                            </button>
                            <button
                                type="button"
                                className="profile-edit-btn"
                                style={{ backgroundColor: '#64748b', padding: '8px 16px', fontSize: '14px' }}
                                onClick={() => {
                                    setIsAdding(false);
                                    setNewProgramName('');
                                    setNewProgramDesc('');
                                    setAddError(null);
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                )}

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                        Loading departments...
                    </div>
                ) : programs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
                        <p style={{ margin: '0 0 10px 0', fontWeight: 500 }}>No specialty departments registered yet.</p>
                        <p style={{ margin: 0, fontSize: '14px' }}>Click the "+ Add New Department" button above to register your hospital's specialty programs.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                        {programs.map((prog) => (
                            <div
                                key={prog.id}
                                style={{
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    padding: '20px',
                                    backgroundColor: editingId === prog.id ? '#f8fafc' : '#ffffff',
                                    transition: 'box-shadow 0.2s ease',
                                    boxShadow: editingId === prog.id ? 'none' : '0 2px 4px rgba(0,0,0,0.02)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    height: '100%',
                                    boxSizing: 'border-box',
                                    alignSelf: 'stretch'
                                }}
                            >
                                {editingId === prog.id ? (
                                    <div>
                                        <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>Edit Department</h3>
                                        {editError && <div className="general-error" style={{ marginBottom: '15px' }}>{editError}</div>}
                                        <div className="input-group" style={{ marginBottom: '12px' }}>
                                            <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>Department Name</label>
                                            <input
                                                type="text"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                className="booking-input"
                                                style={{ width: '100%', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div className="input-group" style={{ marginBottom: '15px' }}>
                                            <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>Description</label>
                                            <textarea
                                                value={editDesc}
                                                onChange={(e) => setEditDesc(e.target.value)}
                                                className="booking-input"
                                                style={{ width: '100%', boxSizing: 'border-box', minHeight: '70px', fontFamily: 'inherit' }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button
                                                type="button"
                                                className="profile-edit-btn"
                                                style={{ padding: '6px 12px', fontSize: '13px' }}
                                                onClick={() => handleSaveEdit(prog.id)}
                                            >
                                                Save Changes
                                            </button>
                                            <button
                                                type="button"
                                                className="profile-edit-btn"
                                                style={{ backgroundColor: '#64748b', padding: '6px 12px', fontSize: '13px' }}
                                                onClick={() => {
                                                    setEditingId(null);
                                                    setEditError(null);
                                                }}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', gap: '15px' }}>
                                        <div>
                                            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>{prog.name}</h3>
                                            <p style={{ margin: 0, fontSize: '14px', color: '#475569', lineHeight: '1.5' }}>
                                                {prog.description || 'No description provided.'}
                                            </p>
                                        </div>
                                        <div>
                                            <Link to={`/program-trips/${prog.id}`} style={{ textDecoration: 'none' }}>
                                                <button className="profile-edit-btn" style={{ width: '100%', boxSizing: 'border-box', backgroundColor: '#00A88F' }}>
                                                    Show Medical Trip Packages
                                                </button>
                                            </Link>
                                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                                <button
                                                    className="profile-edit-btn"
                                                    style={{ flex: 1, backgroundColor: '#0284c7', padding: '6px 12px', fontSize: '13px' }}
                                                    onClick={() => startEditing(prog)}
                                                >
                                                    Edit Program
                                                </button>
                                                <button
                                                    className="profile-edit-btn"
                                                    style={{ flex: 1, backgroundColor: '#ef4444', padding: '6px 12px', fontSize: '13px' }}
                                                    onClick={() => handleDeleteProgram(prog.id, prog.name)}
                                                >
                                                    Delete Program
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="profile-details-card" style={{ padding: '30px', marginBottom: '40px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f1f5f9', paddingBottom: '12px', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0A4EA3' }}>Attendants</h2>
                    <Link to="/attendant-register" style={{ textDecoration: 'none' }}>
                        <button className="profile-edit-btn" style={{ padding: '6px 12px', fontSize: '14px' }}>
                            + Register Attendant
                        </button>
                    </Link>
                </div>

                {attendantsError && (
                    <div className="general-error" style={{ padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '15px' }}>
                        ⚠️ {attendantsError}
                    </div>
                )}

                {attendantsLoading ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                        Loading attendants...
                    </div>
                ) : attendants.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
                        <p style={{ margin: '0 0 10px 0', fontWeight: 500 }}>No attendants registered yet.</p>
                        <p style={{ margin: 0, fontSize: '14px' }}>Click the "+ Register Attendant" button above to add staff members who will coordinate with the patients.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                        {attendants.map((att) => (
                            <div
                                key={att.id}
                                style={{
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    padding: '15px 20px',
                                    backgroundColor: '#ffffff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '15px',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                }}
                            >
                                <div style={{
                                    width: '45px',
                                    height: '45px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #0284c7, #00c0a3)',
                                    color: '#ffffff',
                                    fontSize: '18px',
                                    fontWeight: '700',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    textTransform: 'uppercase'
                                }}>
                                    {att.name ? att.name.charAt(0) : 'C'}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <strong style={{ fontSize: '16px', color: '#0f172a', display: 'block' }}>{att.name}</strong>
                                    <span style={{ fontSize: '13px', color: '#64748b', wordBreak: 'break-all' }}>{att.email}</span>
                                    <div style={{ marginTop: '6px' }}>
                                        <span className="badge badge-attendant" style={{ fontSize: '10px', padding: '2px 8px' }}>
                                            Attendant
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default HospitalAdminDashboard;

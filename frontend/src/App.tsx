import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/PatientPages/PatientProfile";
import Navbar from "./components/Navbar";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import OnboardHospital from "./pages/OnboardHospital";
import PatientDashboard from "./pages/PatientPages/PatientDashboard";
import AttendantDashboard from "./pages/AttendantPages/AttendantDashboard";
import HospitalAdminDashboard from "./pages/HospitalAdminPages/HospitalAdminDashboard";
import SystemAdminDashboard from "./pages/SystemAdminPages/SystemAdminDashboard";
import AttendantRegister from "./pages/HospitalAdminPages/AttendantRegister";
import HospitalAdminProfile from "./pages/HospitalAdminPages/HospitalAdminProfile";
import AttendantProfile from "./pages/AttendantPages/AttendantProfile";
import ProgramTrips from "./pages/HospitalAdminPages/ProgramTrips";
import ManageTripForm from "./pages/HospitalAdminPages/ManageTripForm";
import PatientBookings from "./pages/PatientPages/PatientBookings";
import HospitalBookings from "./pages/HospitalAdminPages/HospitalBookings";

const App: React.FC = () => {
    return (
        <AuthProvider>
            <Router>
                <Navbar />
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/onboard-hospital" element={<OnboardHospital />} />

                    <Route element={<ProtectedRoute />}>
                        <Route path="/profile" element={<Profile />} />
                    </Route>

                    <Route element={<ProtectedRoute allowedRoles={["PATIENT"]} />}>
                        <Route path="/patient-dashboard" element={<PatientDashboard />} />
                        <Route path="/patient-bookings" element={<PatientBookings />} />
                    </Route>
                    <Route element={<ProtectedRoute allowedRoles={["ATTENDANT"]} />}>
                        <Route path="/attendant-dashboard" element={<AttendantDashboard />} />
                        <Route path="/attendant-profile" element={<AttendantProfile />} />
                    </Route>
                    <Route element={<ProtectedRoute allowedRoles={["HOSPITAL_ADMIN"]} />}>
                        <Route path="/hospital-dashboard" element={<HospitalAdminDashboard />} />
                        <Route path="/hospital-bookings" element={<HospitalBookings />} />
                        <Route path="/attendant-register" element={<AttendantRegister />} />
                        <Route path="/hospital-admin-profile" element={<HospitalAdminProfile />} />
                        <Route path="/program-trips/:programId" element={<ProgramTrips />} />
                        <Route path="/program-trips/:programId/add" element={<ManageTripForm />} />
                        <Route path="/program-trips/:programId/edit/:tripId" element={<ManageTripForm />} />
                    </Route>
                    <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
                        <Route path="/admin-dashboard" element={<SystemAdminDashboard />} />
                    </Route>

                    <Route path="*" element={<NotFound />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
};

export default App;
import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import { LoginForm } from './features/auth/components/LoginForm';
import { RegisterClinic } from './features/auth/components/RegisterClinic';
import { ForgotPassword } from './features/auth/components/ForgotPassword';
import { ResetPassword } from './features/auth/components/ResetPassword';
import { SidebarLayout } from './layouts/SidebarLayout';
import { PatientProfileLayout } from './layouts/PatientProfileLayout';
import { PatientDirectory } from './features/patients/components/PatientDirectory';
import { PlatformLayout } from './layouts/PlatformLayout';
import { PlatformDashboard } from './features/platform/components/PlatformDashboard';
import { ClinicManagement } from './features/platform/components/ClinicManagement';
import { PlatformSettings } from './features/platform/components/PlatformSettings';

import { AppointmentsHub } from './features/appointments/components/AppointmentsHub';
import { EmergencyDispatchDesk } from './features/emergency/components/EmergencyDispatchDesk';
import { BloodBankMatrix } from './features/blood-bank/components/BloodBankMatrix';
import { FacilitiesPage } from './features/facilities/components/FacilitiesPage';
import { AdminDashboard } from './features/dashboard/components/AdminDashboard';
import { ProfileSettings } from './features/settings/components/ProfileSettings';
import { ClinicSettings } from './features/settings/components/ClinicSettings';
import { Reports } from './features/reports/components/Reports';
import { ReportViewer } from './features/reports/components/ReportViewer';
import { SettingsHub } from './features/settings/components/SettingsHub';
import { AccessDenied } from './components/AccessDenied';
import { LoadingScreen } from './components/LoadingScreen';
import { Toaster } from './components/Toaster';
import type { UserRole } from './types';

// Route wrapper to require authentication
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// Route wrapper to authorize based on role
const RoleRoute: React.FC<{ allowedRoles: UserRole[]; children: React.ReactNode }> = ({ allowedRoles, children }) => {
  const { user } = useAuthStore();

  if (!user || !allowedRoles.includes(user.role as UserRole)) {
    if (user) {
      return <Navigate to="/access-denied" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: 'red', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8, margin: 20 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 'bold' }}>Render Error Caught</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11, marginTop: 10 }}>
            {this.state.error?.toString()}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

// Patient Dashboard (lightweight portal)
const PatientDashboard: React.FC = () => {
  const { user } = useAuthStore();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Welcome, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="text-sm text-slate-500 font-medium mt-1">Your health portal — view appointments, reports & profile</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { title: 'My Appointments', desc: 'View upcoming and past appointments', icon: '📅', href: '/patient/appointments' },
          { title: 'My Profile', desc: 'Update personal & medical information', icon: '👤', href: '/patient/profile' },
          { title: 'My Reports', desc: 'View lab results and diagnostic reports', icon: '📋', href: '/patient/reports' },
          { title: 'Book Appointment', desc: 'Schedule a new consultation', icon: '➕', href: '/patient/appointments' },
          { title: 'Emergency', desc: 'Request emergency assistance', icon: '🚨', href: '/patient/emergency' },
          { title: 'Nearby Facilities', desc: 'Find hospitals, labs & pharmacies', icon: '🏥', href: '/patient/facilities' },
        ].map(item => (
          <a key={item.title} href={item.href} className="block p-5 rounded-2xl border border-slate-200 bg-white hover:shadow-lg hover:-translate-y-0.5 transition-all">
            <span className="text-3xl">{item.icon}</span>
            <p className="text-sm font-bold text-slate-900 mt-3">{item.title}</p>
            <p className="text-xs text-slate-500 font-medium mt-1">{item.desc}</p>
          </a>
        ))}
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  const { user, isAuthenticated, isLoading, initializeAuth } = useAuthStore();

  React.useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const getHomeRedirect = () => {
    if (!isAuthenticated || !user) return '/login';
    const homePaths: Record<string, string> = {
      'SuperAdmin': '/platform/dashboard',
      'Super Admin': '/platform/dashboard',
      'ClinicAdmin': '/admin/dashboard',
      'Physician': '/physician/dashboard',
      'Receptionist': '/receptionist/dashboard',
      'BloodBankManager': '/admin/blood-bank',
      'AmbulanceDriver': '/admin/emergency',
      'LabTechnician': '/admin/reports',
      'Patient': '/patient/dashboard',
      // Legacy
      'Doctor': '/admin/dashboard',
      'Other Doctor': '/physician/dashboard',
      'Dental Assistant': '/receptionist/dashboard',
    };
    return homePaths[user.role] || '/login';
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <Toaster />
      <ErrorBoundary>
        <Routes>
        {/* Auth & Utility Routes */}
        <Route path="/login" element={isAuthenticated ? <Navigate to={getHomeRedirect()} replace /> : <LoginForm />} />
        <Route path="/platform/login" element={<Navigate to="/login" replace />} />
        <Route path="/register-clinic" element={<RegisterClinic />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/access-denied" element={<AccessDenied />} />

        {/* Global Authenticated Routes */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <SidebarLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={
            <div className="max-w-7xl mx-auto py-6">
              <ProfileSettings />
            </div>
          } />
        </Route>

        {/* Platform SuperAdmin Portal */}
        <Route
          path="/platform"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['SuperAdmin']}>
                <PlatformLayout />
              </RoleRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<PlatformDashboard />} />
          <Route path="clinics" element={<ClinicManagement />} />
          <Route path="settings" element={<PlatformSettings />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Route>

        {/* Organization Admin Portal (formerly ClinicAdmin) */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['ClinicAdmin', 'BloodBankManager', 'AmbulanceDriver', 'LabTechnician']}>
                <SidebarLayout />
              </RoleRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="patients" element={<PatientDirectory />} />
          <Route path="patients/:id" element={<PatientProfileLayout />} />
          <Route path="appointments" element={<AppointmentsHub />} />
          <Route path="emergency" element={<EmergencyDispatchDesk />} />
          <Route path="blood-bank" element={<BloodBankMatrix />} />
          <Route path="facilities" element={<FacilitiesPage />} />
          <Route path="reports" element={<Reports />} />
          <Route path="reports/patient/:patientId" element={<ReportViewer />} />
          <Route path="settings" element={<SettingsHub />}>
            <Route path="profile" element={<ProfileSettings />} />
            <Route path="clinic" element={<ClinicSettings />} />
          </Route>
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Route>

        {/* Physician Portal */}
        <Route
          path="/physician"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['Physician']}>
                <SidebarLayout />
              </RoleRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="patients" element={<PatientDirectory />} />
          <Route path="patients/:id" element={<PatientProfileLayout />} />
          <Route path="appointments" element={<AppointmentsHub />} />
          <Route path="emergency" element={<EmergencyDispatchDesk />} />
          <Route path="blood-bank" element={<BloodBankMatrix />} />
          <Route path="reports" element={<Reports />} />
          <Route path="reports/patient/:patientId" element={<ReportViewer />} />
          <Route path="settings" element={
            <div className="max-w-7xl mx-auto py-6">
              <ProfileSettings />
            </div>
          } />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Route>

        {/* Receptionist Portal */}
        <Route
          path="/receptionist"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['Receptionist']}>
                <SidebarLayout />
              </RoleRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="patients" element={<PatientDirectory />} />
          <Route path="patients/:id" element={<PatientProfileLayout />} />
          <Route path="appointments" element={<AppointmentsHub />} />
          <Route path="emergency" element={<EmergencyDispatchDesk />} />
          <Route path="settings" element={
            <div className="max-w-7xl mx-auto py-6">
              <ProfileSettings />
            </div>
          } />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Route>

        {/* Patient Portal */}
        <Route
          path="/patient"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['Patient']}>
                <SidebarLayout />
              </RoleRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<PatientDashboard />} />
          <Route path="appointments" element={<AppointmentsHub />} />
          <Route path="emergency" element={<EmergencyDispatchDesk />} />
          <Route path="facilities" element={<FacilitiesPage />} />
          <Route path="reports" element={<Reports />} />
          <Route path="profile" element={
            <div className="max-w-7xl mx-auto py-6">
              <ProfileSettings />
            </div>
          } />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Route>

        {/* Legacy route redirects */}
        <Route path="/doctor/*" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/other-doctor/*" element={<Navigate to="/physician/dashboard" replace />} />
        <Route path="/assistant/*" element={<Navigate to="/receptionist/dashboard" replace />} />

        {/* Fallback */}
        <Route path="/" element={<Navigate to={getHomeRedirect()} replace />} />
        <Route path="*" element={<Navigate to={getHomeRedirect()} replace />} />
      </Routes>
      </ErrorBoundary>
    </>
  );
};

export default App;

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
import { ProfileSettings } from './features/settings/components/ProfileSettings';
import { ClinicSettings } from './features/settings/components/ClinicSettings';
import { Reports } from './features/reports/components/Reports';
import { ReportViewer } from './features/reports/components/ReportViewer';
import { SettingsHub } from './features/settings/components/SettingsHub';
import { AccessDenied } from './components/AccessDenied';
import { LoadingScreen } from './components/LoadingScreen';
import { Toaster } from './components/Toaster';
import type { UserRole } from './types';

// Placeholder components for new modules (Phase 1+)
const PlaceholderPage: React.FC<{ title: string }> = ({ title }) => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="text-center space-y-3">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center">
        <span className="text-2xl">🚧</span>
      </div>
      <h2 className="text-xl font-black text-slate-900">{title}</h2>
      <p className="text-sm text-slate-500 font-medium">This module is under development.</p>
    </div>
  </div>
);

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
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 9, marginTop: 10, color: '#4b5563' }}>
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

export const App: React.FC = () => {
  const { user, isAuthenticated, isLoading, initializeAuth } = useAuthStore();

  React.useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Determine root landing page redirect based on active session
  const getHomeRedirect = () => {
    if (!isAuthenticated || !user) return '/login';
    const homePaths: Record<string, string> = {
      'SuperAdmin': '/platform/dashboard',
      'Super Admin': '/platform/dashboard',
      'ClinicAdmin': '/admin/dashboard',
      'Dentist': '/admin/dashboard',
      'Physician': '/physician/dashboard',
      'Other Dentist': '/physician/dashboard',
      'Receptionist': '/receptionist/dashboard',
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

        {/* ClinicAdmin Portal */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['ClinicAdmin']}>
                <SidebarLayout />
              </RoleRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<PlaceholderPage title="Dashboard" />} />
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
          <Route path="dashboard" element={<PlaceholderPage title="Dashboard" />} />
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
          <Route path="dashboard" element={<AppointmentsHub />} />
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

        {/* Legacy route redirects for backward compatibility */}
        <Route path="/dentist/*" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/other-dentist/*" element={<Navigate to="/physician/dashboard" replace />} />
        <Route path="/assistant/*" element={<Navigate to="/receptionist/dashboard" replace />} />

        {/* Fallback Redirections */}
        <Route path="/" element={<Navigate to={getHomeRedirect()} replace />} />
        <Route path="*" element={<Navigate to={getHomeRedirect()} replace />} />
      </Routes>
      </ErrorBoundary>
    </>
  );
};

export default App;

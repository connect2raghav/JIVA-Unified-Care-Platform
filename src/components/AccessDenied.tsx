import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthStore } from '@/store/useAuthStore';
import type { UserRole } from '@/types';

export const AccessDenied: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const handleReturnHome = () => {
    if (!user) {
      navigate('/login');
      return;
    }
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
    navigate(homePaths[user.role] || '/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg border-none shadow-xl bg-white rounded-3xl overflow-hidden p-6 md:p-10 text-center space-y-6">
        <CardContent className="p-0 space-y-6">
          {/* Security Alert Header Icon */}
          <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 text-red-800 flex items-center justify-center mx-auto shadow-sm shadow-red-900/5">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-red-850 bg-red-50 border border-red-100 px-3 py-1 rounded-xl font-black uppercase tracking-wider">
              Security Violation
            </span>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-tight mt-2.5">
              Access Denied
            </h2>
            <p className="text-xs text-slate-500 font-semibold max-w-md mx-auto leading-relaxed mt-2">
              Your clinical role profile does not possess the permissions necessary to view this platform module.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-2">
            <button
              onClick={() => navigate(-1)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-655 hover:bg-slate-50 bg-transparent transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Go Back</span>
            </button>
            <button
              onClick={handleReturnHome}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-red-800 text-white font-bold text-xs shadow hover:bg-red-950 transition"
            >
              <Home className="w-4 h-4" />
              <span>Return to Dashboard</span>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccessDenied;

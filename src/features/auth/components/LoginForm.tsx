import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabaseClient';
import {
  HeartPulse,
  Lock,
  ShieldAlert,
  Eye,
  EyeOff,
  Stethoscope,
  Users,
  Building2,
  Droplets,
  Truck,
  FlaskConical,
  User,
  Crown,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import type { UserRole } from '@/types/domain';

// ─── Demo Account Profiles ──────────────────────────────────────
const DEMO_ACCOUNTS: {
  role: UserRole;
  label: string;
  name: string;
  email: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  description: string;
  homePath: string;
}[] = [
  {
    role: 'ClinicAdmin',
    label: 'Hospital Admin',
    name: 'Dr. Ananya Mehta',
    email: 'admin@jivahospital.in',
    icon: Building2,
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100',
    description: 'Full access — patients, appointments, emergency, blood bank, facilities, reports & settings',
    homePath: '/admin/dashboard',
  },
  {
    role: 'Physician',
    label: 'Physician',
    name: 'Dr. Rajesh Kapoor',
    email: 'dr.kapoor@jivahospital.in',
    icon: Stethoscope,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
    description: 'View patients, appointments, emergency dispatch, blood bank & reports',
    homePath: '/physician/dashboard',
  },
  {
    role: 'Receptionist',
    label: 'Receptionist',
    name: 'Priya Deshmukh',
    email: 'priya@jivahospital.in',
    icon: Users,
    color: 'text-purple-700',
    bgColor: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
    description: 'Patient directory, appointment booking, emergency intake & check-in',
    homePath: '/receptionist/dashboard',
  },
  {
    role: 'BloodBankManager',
    label: 'Blood Bank',
    name: 'Suresh Patil',
    email: 'blood@jivahospital.in',
    icon: Droplets,
    color: 'text-rose-700',
    bgColor: 'bg-rose-50 border-rose-200 hover:bg-rose-100',
    description: 'Manage blood inventory, donor records, requests & cross-match',
    homePath: '/admin/blood-bank',
  },
  {
    role: 'AmbulanceDriver',
    label: 'Ambulance Driver',
    name: 'Ramesh S.',
    email: 'driver@jivahospital.in',
    icon: Truck,
    color: 'text-amber-700',
    bgColor: 'bg-amber-50 border-amber-200 hover:bg-amber-100',
    description: 'View dispatch requests, pickup locations & patient details',
    homePath: '/admin/emergency',
  },
  {
    role: 'Patient',
    label: 'Patient',
    name: 'Aditi Sharma',
    email: 'aditi@example.com',
    icon: User,
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100',
    description: 'View profile, appointments, reports & book new appointments',
    homePath: '/patient/dashboard',
  },
];

export const LoginForm: React.FC = () => {
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showLoginForm, setShowLoginForm] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email || !password) {
      setErrorMsg('Please enter your email and password.');
      return;
    }

    const res = await login(email, password, false);
    if (res.success) {
      const updatedUser = useAuthStore.getState().user;
      if (updatedUser) {
        const homePaths: Record<string, string> = {
          SuperAdmin: '/platform/dashboard',
          'Super Admin': '/platform/dashboard',
          ClinicAdmin: '/admin/dashboard',
          Physician: '/physician/dashboard',
          Receptionist: '/receptionist/dashboard',
        };
        navigate(homePaths[updatedUser.role] || '/admin/dashboard');
      }
    } else {
      setErrorMsg(res.error || 'Login failed. Please check your credentials.');
    }
  };

  const handleDemoLogin = (account: typeof DEMO_ACCOUNTS[0]) => {
    const demoUser = {
      id: `demo-${account.role.toLowerCase()}`,
      email: account.email,
      name: account.name,
      role: account.role,
      clinic_id: '00000000-0000-0000-0000-000000000001',
      clinicId: '00000000-0000-0000-0000-000000000001',
      is_active: true,
      isActive: true,
      custom_permissions: [],
      customPermissions: [],
      createdAt: new Date().toISOString(),
      orgType: account.role === 'BloodBankManager' ? 'Blood Bank' : account.role === 'AmbulanceDriver' ? 'Ambulance Service' : 'Hospital',
    };
    localStorage.setItem('jiva_demo_user', JSON.stringify(demoUser));
    window.location.href = account.homePath;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        {/* Branding Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center text-white shadow-lg shadow-emerald-800/30">
              <HeartPulse className="w-7 h-7" />
            </div>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            JIVA
          </h1>
          <p className="text-sm text-slate-500 font-semibold mt-1">
            Unified Care Platform — Appointment, Emergency & Blood Bank Coordination
          </p>
        </div>

        {!showLoginForm ? (
          <>
            {/* Demo Login Cards */}
            <div className="bg-white rounded-3xl shadow-xl border border-slate-200/80 p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    Quick Demo Access
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Select a role to explore the platform instantly — no credentials needed
                  </p>
                </div>
                <button
                  onClick={() => setShowLoginForm(true)}
                  className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-600 transition-colors"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Staff Login
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {DEMO_ACCOUNTS.map((account) => (
                  <button
                    key={account.role}
                    onClick={() => handleDemoLogin(account)}
                    className={`flex items-start gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-200 group ${account.bgColor}`}
                  >
                    <div className={`w-11 h-11 rounded-xl bg-white/80 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform`}>
                      <account.icon className={`w-5 h-5 ${account.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-black ${account.color}`}>{account.label}</p>
                        <ArrowRight className={`w-3.5 h-3.5 ${account.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
                      </div>
                      <p className="text-xs font-bold text-slate-700 mt-0.5">{account.name}</p>
                      <p className="text-[10px] text-slate-500 font-medium mt-1 leading-relaxed line-clamp-2">
                        {account.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Mobile Staff Login */}
              <div className="md:hidden mt-4">
                <button
                  onClick={() => setShowLoginForm(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-600 transition-colors"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Sign in with credentials
                </button>
              </div>
            </div>

            {/* Platform Info */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: '🏥', label: 'Multi-Org Support', desc: 'Hospitals, labs & pharmacies' },
                { icon: '🚑', label: 'Emergency Dispatch', desc: 'Real-time ambulance tracking' },
                { icon: '🩸', label: 'Blood Bank', desc: '8 groups × components matrix' },
                { icon: '🔒', label: 'Data Privacy', desc: 'Role-based access control' },
              ].map(feature => (
                <div key={feature.label} className="bg-white/80 rounded-2xl border border-slate-100 p-4 text-center">
                  <span className="text-2xl">{feature.icon}</span>
                  <p className="text-xs font-bold text-slate-900 mt-2">{feature.label}</p>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">{feature.desc}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          /* Traditional Login Form */
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200/80 p-6 md:p-8 max-w-md mx-auto">
            <button
              onClick={() => setShowLoginForm(false)}
              className="text-xs font-bold text-slate-500 hover:text-slate-700 mb-4 flex items-center gap-1 transition-colors"
            >
              ← Back to demo access
            </button>

            <h2 className="text-lg font-black text-slate-900 mb-1">Staff Sign In</h2>
            <p className="text-xs text-slate-500 font-medium mb-6">Enter your organization credentials</p>

            <form onSubmit={handleLogin} className="space-y-4">
              {errorMsg && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-bold">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-bold text-slate-700">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  autoFocus
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 rounded-xl border-slate-200 bg-slate-50 focus:bg-white font-semibold text-sm"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-bold text-slate-700">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-11 rounded-xl border-slate-200 bg-slate-50 focus:bg-white font-semibold text-sm"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex justify-end pt-1">
                  <Link to="/forgot-password" className="text-xs font-bold text-emerald-700 hover:text-emerald-900 transition-colors">
                    Forgot password?
                  </Link>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-lg transition-all text-sm cursor-pointer border-none"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing In...</span>
                  </div>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            <div className="text-center pt-6">
              <span className="text-sm text-slate-500 font-medium">New organization? </span>
              <Link to="/register-clinic" className="text-sm font-bold text-emerald-700 hover:text-emerald-900 transition-colors">
                Register here →
              </Link>
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-[10px] text-slate-400 font-medium mt-8">
          JIVA — Unified Care Platform • Built for FIT-FEST 2026 Hackathon • Secure & HIPAA-aware
        </p>
      </div>
    </div>
  );
};

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
  Building2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

type LoginMode = 'ADMIN' | 'TEAM';

export const LoginForm: React.FC = () => {
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loginMode, setLoginMode] = useState<LoginMode>('ADMIN');
  const [clinicCode, setClinicCode] = useState('');
  const navigate = useNavigate();

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email || !password) {
      setErrorMsg('Please enter your email and password.');
      return;
    }

    // For team mode, clinic code is mandatory
    if (loginMode === 'TEAM' && !clinicCode.trim()) {
      setErrorMsg('Please enter your clinic code to proceed.');
      return;
    }

    // If team mode, validate the clinic code exists
    if (loginMode === 'TEAM') {
      const { data: clinic, error: clinicErr } = await supabase
        .from('clinics')
        .select('id, clinic_code')
        .eq('clinic_code', clinicCode.trim().toUpperCase())
        .single();

      if (clinicErr || !clinic) {
        setErrorMsg('Invalid clinic code. Please check with your clinic administrator.');
        return;
      }
    }

    const res = await login(email, password, rememberMe);

    if (res.success) {
      const updatedUser = useAuthStore.getState().user;
      if (updatedUser) {
        // Enforce role/mode consistency
        const adminRoles = ['ClinicAdmin', 'Dentist', 'SuperAdmin', 'Super Admin'];
        if (loginMode === 'ADMIN' && !adminRoles.includes(updatedUser.role)) {
          setErrorMsg('Access denied: This login is reserved for clinic administrators. Use the "Care Team" tab instead.');
          useAuthStore.getState().logout();
          return;
        }
        if (loginMode === 'TEAM' && adminRoles.includes(updatedUser.role)) {
          setErrorMsg('As the clinic administrator, please use the "Clinic Admin" tab to log in.');
          useAuthStore.getState().logout();
          return;
        }

        navigate(homePaths[updatedUser.role] || '/login');
      }
    } else {
      setErrorMsg(res.error || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl h-[780px] md:h-[720px] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row">

        {/* Left Side: Branding (Hidden on mobile) */}
        <div className="hidden md:flex flex-col items-center justify-center bg-slate-900 text-white p-12 w-1/2 relative overflow-hidden h-full">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>

          <div className="relative z-10 flex flex-col items-center text-center space-y-6">
            <div className="w-24 h-24 rounded-full bg-emerald-700 flex items-center justify-center text-white shadow-lg shadow-emerald-900/30">
              <HeartPulse className="w-12 h-12" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight mb-3">Welcome back</h1>
              <p className="text-slate-300 font-medium text-lg max-w-sm">
                Sign in to your JIVA Unified Care dashboard
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="p-6 md:p-12 w-full md:w-1/2 flex flex-col justify-center h-full overflow-y-auto overflow-x-hidden">
          {/* Mobile Header */}
          <div className="md:hidden text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-emerald-700 flex items-center justify-center text-white mx-auto shadow-md mb-4">
              <HeartPulse className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Welcome back</h1>
            <p className="text-slate-500 font-medium text-sm">Sign in to your dashboard</p>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl text-sm font-bold text-slate-600 mb-8">
            <button
              type="button"
              onClick={() => { setLoginMode('ADMIN'); setErrorMsg(''); }}
              className={`flex-1 py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${loginMode === 'ADMIN'
                  ? 'bg-white text-emerald-800 shadow-sm border border-slate-200/50 font-extrabold'
                  : 'hover:text-slate-800'
                }`}
            >
              <Stethoscope className="w-4 h-4" />
              Clinic Admin
            </button>
            <button
              type="button"
              onClick={() => { setLoginMode('TEAM'); setErrorMsg(''); }}
              className={`flex-1 py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${loginMode === 'TEAM'
                  ? 'bg-white text-emerald-800 shadow-sm border border-slate-200/50 font-extrabold'
                  : 'hover:text-slate-800'
                }`}
            >
              <Users className="w-4 h-4" />
              Care Team
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Error Alert */}
            {errorMsg && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-bold shadow-sm">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Clinic Code */}
            {loginMode === 'TEAM' && (
              <div className="space-y-2">
                <Label htmlFor="clinic-code" className="text-sm font-bold text-slate-700">
                  Clinic Code <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <Input
                    id="clinic-code"
                    autoFocus
                    placeholder="e.g. JIV-8985"
                    value={clinicCode}
                    onChange={(e) => setClinicCode(e.target.value.toUpperCase())}
                    className="pl-10 h-11 rounded-xl border-slate-200 bg-slate-50 focus:bg-white font-bold text-sm uppercase tracking-wider"
                    disabled={isLoading}
                  />
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  Ask your clinic administrator for this code.
                </p>
              </div>
            )}

            {/* Email Input */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-bold text-slate-700">Email Address</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  autoFocus={loginMode === 'ADMIN'}
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 rounded-xl border-slate-200 bg-slate-50 focus:bg-white font-semibold text-sm"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-bold text-slate-700">Password</Label>
              </div>
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
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
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

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-lg transition-all text-sm mt-4 cursor-pointer border-none"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Signing In...</span>
                </div>
              ) : (
                'Sign In'
              )}
            </Button>

            {/* Register Link */}
            <div className="text-center pt-6">
              <span className="text-sm text-slate-500 font-medium">Don't have a clinic yet? </span>
              <Link to="/register-clinic" className="text-sm text-emerald-700 font-bold hover:text-emerald-800 transition-colors">
                Register your clinic
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

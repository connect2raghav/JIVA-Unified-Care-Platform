import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, ArrowLeft, User, Mail, Phone, MapPin, CheckCircle2, ShieldAlert, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/useAuthStore';

export const RegisterClinic: React.FC = () => {
  const [clinicName, setClinicName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!clinicName.trim() || !ownerName.trim() || !email.trim() || !password.trim() || !city.trim() || !state.trim()) {
      setErrorMsg('Organization name, owner name, email, password, city, and state are required.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Sign up user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
      });

      if (authError) throw authError;
      
      const userId = authData.user?.id;
      if (!userId) throw new Error("Failed to create user account.");

      // 2. Create the Clinic/Organization
      const { data: clinic, error: clinicError } = await supabase.from('clinics').insert([{
        name: clinicName.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        address: `${address.trim()}, ${city.trim()}, ${state.trim()} ${zipCode.trim()}`,
        is_active: true,
      }]).select('id').single();

      if (clinicError) throw clinicError;

      // 3. Create the User Profile
      const { error: profileError } = await supabase.from('users').insert([{
        id: userId,
        email: email.trim(),
        name: ownerName.trim(),
        role: 'ClinicAdmin',
        clinic_id: clinic.id,
        is_active: true,
      }]);

      if (profileError) throw profileError;

      // 4. Login the newly created user
      const { login } = useAuthStore.getState();
      const loginRes = await login(email.trim(), password.trim(), false);
      
      if (loginRes.success) {
        navigate('/admin/dashboard');
      } else {
        navigate('/login');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit registration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl border-none shadow-xl bg-white rounded-3xl overflow-hidden p-4 md:p-8 relative">
        <Link 
          to="/login"
          className="absolute top-6 left-6 md:top-8 md:left-8 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          title="Back to Login"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <CardHeader className="text-center pb-8 space-y-3 pt-12 md:pt-4">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mx-auto">
            <Building2 className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl font-black text-slate-900">
              Register Organization
            </CardTitle>
            <CardDescription className="text-sm font-medium text-slate-500">
              Join JIVA to manage your hospital, blood bank, or clinic
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {errorMsg && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-bold animate-in fade-in slide-in-from-top-2">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <User className="w-4 h-4 text-emerald-600" />
                  Admin Account Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ownerName" className="text-xs font-bold text-slate-700">Full Name *</Label>
                    <Input
                      id="ownerName"
                      placeholder="e.g. Dr. Jane Doe"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      className="h-11 rounded-xl bg-slate-50 border-slate-200 text-sm font-semibold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-bold text-slate-700">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11 rounded-xl bg-slate-50 border-slate-200 text-sm font-semibold"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="password" className="text-xs font-bold text-slate-700">Password *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="Create a strong password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-11 pl-10 rounded-xl bg-slate-50 border-slate-200 text-sm font-semibold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2 mt-8">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  Organization Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="clinicName" className="text-xs font-bold text-slate-700">Organization Name *</Label>
                    <Input
                      id="clinicName"
                      placeholder="e.g. Apollo Hospital"
                      value={clinicName}
                      onChange={(e) => setClinicName(e.target.value)}
                      className="h-11 rounded-xl bg-slate-50 border-slate-200 text-sm font-semibold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-xs font-bold text-slate-700">Phone Number</Label>
                    <Input
                      id="phone"
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-11 rounded-xl bg-slate-50 border-slate-200 text-sm font-semibold"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2 mt-8">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  Location
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address" className="text-xs font-bold text-slate-700">Street Address</Label>
                    <Input
                      id="address"
                      placeholder="123 Health Ave"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="h-11 rounded-xl bg-slate-50 border-slate-200 text-sm font-semibold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-xs font-bold text-slate-700">City *</Label>
                    <Input
                      id="city"
                      placeholder="Bangalore"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="h-11 rounded-xl bg-slate-50 border-slate-200 text-sm font-semibold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state" className="text-xs font-bold text-slate-700">State *</Label>
                    <Input
                      id="state"
                      placeholder="Karnataka"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="h-11 rounded-xl bg-slate-50 border-slate-200 text-sm font-semibold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zipCode" className="text-xs font-bold text-slate-700">Postal / Zip Code</Label>
                    <Input
                      id="zipCode"
                      placeholder="560001"
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      className="h-11 rounded-xl bg-slate-50 border-slate-200 text-sm font-semibold"
                    />
                  </div>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-lg transition-all text-sm mt-8 border-none"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating Account...</span>
                </div>
              ) : (
                'Register Organization'
              )}
            </Button>

            <p className="text-center text-[11px] font-medium text-slate-500 mt-6">
              By registering, you agree to our <a href="#" className="text-emerald-700 hover:underline">Terms of Service</a> and <a href="#" className="text-emerald-700 hover:underline">Privacy Policy</a>.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

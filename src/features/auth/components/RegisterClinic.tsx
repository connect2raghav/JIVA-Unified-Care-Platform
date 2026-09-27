import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Building2, ArrowLeft, User, Mail, Phone, MapPin, CheckCircle2, ShieldAlert } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export const RegisterClinic: React.FC = () => {
  const [clinicName, setClinicName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!clinicName.trim() || !ownerName.trim() || !ownerEmail.trim() || !email.trim() || !licenseNumber.trim() || !city.trim() || !state.trim() || !zipCode.trim()) {
      setErrorMsg('Clinic name, owner name, owner email, clinic email, license number, city, state, and zip code are required.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('clinic_registrations').insert([{
        clinic_name: clinicName.trim(),
        owner_name: ownerName.trim(),
        owner_email: ownerEmail.trim(),
        owner_phone: ownerPhone.trim() || null,
        email: email.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        license_number: licenseNumber.trim(),
        specialty: specialty.trim() || null,
        city: city.trim(),
        state: state.trim(),
        zip_code: zipCode.trim(),
        status: 'Pending',
      }]);

      if (error) throw error;
      setIsSubmitted(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit registration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-none shadow-xl bg-white rounded-3xl overflow-hidden p-4 md:p-8">
          <CardHeader className="text-center pb-6 space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-xl font-black text-slate-900">
                Registration Submitted
              </CardTitle>
              <CardDescription className="text-sm text-slate-500 leading-relaxed">
                Your clinic registration request for <strong className="text-slate-700">{clinicName}</strong> has been submitted successfully. Our platform administrator will review your request and reach out to <strong className="text-slate-700">{email}</strong> with your credentials and clinic code.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="text-center">
            <Link to="/login">
              <Button className="bg-red-800 hover:bg-red-900 text-white font-bold rounded-xl h-11 px-8 cursor-pointer">
                Return to Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg border-none shadow-xl bg-white rounded-3xl overflow-hidden p-4 md:p-8 relative">
        <Link 
          to="/login"
          className="absolute top-6 left-6 md:top-8 md:left-8 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          title="Back to Login"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        <CardHeader className="text-center pb-5 space-y-3 mt-4">
          <div className="w-12 h-12 rounded-2xl bg-red-800 flex items-center justify-center text-white mx-auto shadow-md shadow-red-800/20">
            <Building2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-none">
              Register Your Clinic
            </CardTitle>
            <CardDescription className="text-xs font-semibold text-slate-400 mt-2">
              Submit your clinic details. Our admin team will review and set up your workspace.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="px-0 md:px-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-bold">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Clinic Name */}
            <div className="space-y-1.5">
              <Label htmlFor="clinic-name" className="text-xs font-extrabold text-slate-500">
                Clinic Name <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                <Input
                  id="clinic-name"
                  autoFocus
                  placeholder="e.g. Smile Dental Clinic"
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  className="pl-10 h-10.5 rounded-xl border-slate-200 bg-white font-semibold text-sm"
                  required
                />
              </div>
            </div>

            {/* Owner Name */}
            <div className="space-y-1.5">
              <Label htmlFor="owner-name" className="text-xs font-extrabold text-slate-500">
                Owner Dentist Name <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <User className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                <Input
                  id="owner-name"
                  placeholder="e.g. Dr. Prasad Patil"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="pl-10 h-10.5 rounded-xl border-slate-200 bg-white font-semibold text-sm"
                  required
                />
              </div>
            </div>

            {/* Owner Email & Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="owner-email" className="text-xs font-extrabold text-slate-500">
                  Owner Email <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                  <Input
                    id="owner-email"
                    type="email"
                    placeholder="dr.patil@example.com"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    className="pl-10 h-10.5 rounded-xl border-slate-200 bg-white font-semibold text-sm"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="owner-phone" className="text-xs font-extrabold text-slate-500">
                  Owner Mobile
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                  <Input
                    id="owner-phone"
                    placeholder="9876543210"
                    value={ownerPhone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val.length <= 10) setOwnerPhone(val);
                    }}
                    className="pl-10 h-10.5 rounded-xl border-slate-200 bg-white font-semibold text-sm"
                    maxLength={10}
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="reg-email" className="text-xs font-extrabold text-slate-500">
                Email Address <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                <Input
                  id="reg-email"
                  type="email"
                  placeholder="e.g. clinic@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-10.5 rounded-xl border-slate-200 bg-white font-semibold text-sm"
                  required
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="reg-phone" className="text-xs font-extrabold text-slate-500">
                Phone Number
              </Label>
              <div className="relative flex items-center">
                <div className="absolute left-3 font-bold text-slate-500 text-sm flex items-center gap-1 border-r border-slate-200 pr-2 h-5">
                  <span className="text-[10px] text-slate-400">IN</span>
                  <span>+91</span>
                </div>
                <Input
                  id="reg-phone"
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val.length <= 10) setPhone(val);
                  }}
                  className="pl-[4.5rem] h-10.5 rounded-xl border-slate-200 bg-white font-semibold text-sm"
                  maxLength={10}
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <Label htmlFor="reg-address" className="text-xs font-extrabold text-slate-500">
                Clinic Address
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                <Input
                  id="reg-address"
                  placeholder="e.g. 123 Main Street"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="pl-10 h-10.5 rounded-xl border-slate-200 bg-white font-semibold text-sm"
                />
              </div>
            </div>

            {/* City, State, Zip */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="reg-city" className="text-xs font-extrabold text-slate-500">
                  City <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="reg-city"
                  placeholder="Pune"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="h-10.5 rounded-xl border-slate-200 bg-white font-semibold text-sm"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-state" className="text-xs font-extrabold text-slate-500">
                  State <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="reg-state"
                  placeholder="MH"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="h-10.5 rounded-xl border-slate-200 bg-white font-semibold text-sm"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-zip" className="text-xs font-extrabold text-slate-500">
                  Zip <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="reg-zip"
                  placeholder="411001"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  className="h-10.5 rounded-xl border-slate-200 bg-white font-semibold text-sm"
                  required
                />
              </div>
            </div>

            {/* License Number & Specialty */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="reg-license" className="text-xs font-extrabold text-slate-500">
                  License No. <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="reg-license"
                  placeholder="e.g. DCI-12345"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  className="h-10.5 rounded-xl border-slate-200 bg-white font-semibold text-sm"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-specialty" className="text-xs font-extrabold text-slate-500">
                  Specialty
                </Label>
                <select
                  id="reg-specialty"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  className="w-full h-10.5 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 transition-all"
                >
                  <option value="">General Dentistry</option>
                  <option value="Orthodontics">Orthodontics</option>
                  <option value="Periodontics">Periodontics</option>
                  <option value="Endodontics">Endodontics</option>
                  <option value="Pediatric">Pediatric Dentistry</option>
                  <option value="Prosthodontics">Prosthodontics</option>
                  <option value="Oral Surgery">Oral Surgery</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 bg-red-800 hover:bg-red-950 text-white font-bold rounded-xl shadow-md shadow-red-900/10 transition-all text-sm mt-2 cursor-pointer"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Submitting...</span>
                </div>
              ) : (
                'Submit Registration'
              )}
            </Button>

            <div className="text-center pt-2">
              <Link to="/login" className="text-xs text-red-600 font-bold hover:text-red-800 transition-colors">
                ← Back to Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

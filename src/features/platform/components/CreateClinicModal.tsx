import React, { useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  User, 
  Lock, 
  X, 
  ChevronRight, 
  ChevronLeft,
  CheckCircle2
} from 'lucide-react';

interface CreateClinicModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateClinicModal: React.FC<CreateClinicModalProps> = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [clinicName, setClinicName] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [clinicPhone, setClinicPhone] = useState('');
  const [clinicEmail, setClinicEmail] = useState('');

  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    let createdClinicId: string | null = null;
    
    try {
      // 1. Create Clinic
      const clinicId = uuidv4();
      const { error: clinicError } = await supabase.from('clinics').insert([{
        id: clinicId,
        name: clinicName,
        address: clinicAddress,
        phone: clinicPhone,
        email: clinicEmail,
        is_active: true
      }]);

      if (clinicError) throw new Error(clinicError.message);
      createdClinicId = clinicId;

      // 2. Create Owner Auth User via RPC
      const userId = uuidv4();
      const { error: profileError } = await supabase.rpc('create_user_admin', {
        p_id: userId,
        p_email: ownerEmail,
        p_password: ownerPassword,
        p_name: ownerName,
        p_role: 'Dentist',
        p_phone: '',
        p_clinic_id: clinicId
      });

      if (profileError) throw new Error(profileError.message);

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to create clinic and owner.');
      // Rollback clinic creation if it succeeded but user creation failed
      if (createdClinicId) {
        await supabase.from('clinics').delete().eq('id', createdClinicId);
      }
    } finally {
      setLoading(false);
    }
  };

  const isStep1Valid = clinicName.trim() !== '' && clinicEmail.trim() !== '';
  const isStep2Valid = ownerName.trim() !== '' && ownerEmail.trim() !== '' && ownerPassword.trim() !== '';

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Register New Clinic</h2>
              <p className="text-xs text-gray-500 font-medium mt-0.5">Setup tenant and administrator</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper */}
        <div className="px-6 pt-6 pb-2">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-gray-100 -z-10"></div>
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1/2 h-0.5 bg-indigo-600 -z-10 transition-all duration-300" style={{ width: step === 1 ? '0%' : '100%' }}></div>
            
            <div className="flex flex-col items-center gap-2 bg-white px-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${step >= 1 ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-gray-100 text-gray-400'}`}>
                1
              </div>
              <span className={`text-xs font-semibold ${step >= 1 ? 'text-indigo-900' : 'text-gray-400'}`}>Clinic Details</span>
            </div>

            <div className="flex flex-col items-center gap-2 bg-white px-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${step >= 2 ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-gray-100 text-gray-400'}`}>
                2
              </div>
              <span className={`text-xs font-semibold ${step >= 2 ? 'text-indigo-900' : 'text-gray-400'}`}>Owner Account</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-6 p-4 bg-red-50/50 border border-red-100 text-red-600 text-sm rounded-xl flex items-start gap-3 animate-in slide-in-from-top-2">
              <X className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block mb-1">Registration Failed</span>
                {error}
              </div>
            </div>
          )}

          <div className="transition-all duration-300 relative">
            {step === 1 && (
              <div className="space-y-4 animate-in slide-in-from-left-4 fade-in">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Clinic Name <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="e.g. Smile Dental Care" 
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                      value={clinicName} 
                      onChange={e => setClinicName(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Email Address <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                      type="email" 
                      placeholder="contact@smiledental.com" 
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                      value={clinicEmail} 
                      onChange={e => setClinicEmail(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                      type="tel" 
                      placeholder="+1 (555) 000-0000" 
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                      value={clinicPhone} 
                      onChange={e => setClinicPhone(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Physical Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <textarea 
                      placeholder="Full street address..." 
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none min-h-[80px] resize-none"
                      value={clinicAddress} 
                      onChange={e => setClinicAddress(e.target.value)} 
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-in slide-in-from-right-4 fade-in">
                <div className="bg-indigo-50/50 rounded-xl p-4 mb-2 border border-indigo-50">
                  <h4 className="text-sm font-semibold text-indigo-900 mb-1">Administrator Setup</h4>
                  <p className="text-xs text-indigo-700/70 leading-relaxed">
                    This user will be created as the initial 'Dentist' and owner of <strong>{clinicName || 'the clinic'}</strong>. They will use these credentials to log in.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Owner Full Name <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Dr. John Doe" 
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                      value={ownerName} 
                      onChange={e => setOwnerName(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Owner Login Email <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                      type="email" 
                      placeholder="dr.doe@smiledental.com" 
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                      value={ownerEmail} 
                      onChange={e => setOwnerEmail(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Temporary Password <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                      type="password" 
                      placeholder="••••••••" 
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                      value={ownerPassword} 
                      onChange={e => setOwnerPassword(e.target.value)} 
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          {step === 1 ? (
            <button 
              onClick={onClose} 
              className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
          ) : (
            <button 
              onClick={() => { setError(''); setStep(1); }} 
              className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          )}

          {step === 1 ? (
            <button 
              onClick={() => { setError(''); setStep(2); }} 
              disabled={!isStep1Valid}
              className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-all focus:ring-4 focus:ring-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm shadow-indigo-600/20"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button 
              onClick={handleCreate} 
              disabled={loading || !isStep2Valid} 
              className="px-6 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 transition-all focus:ring-4 focus:ring-emerald-500/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm shadow-emerald-600/20"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Register Clinic
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useNotificationStore } from '@/store/useNotificationStore';
import { receptionService } from '@/services/receptionService';
import type { Patient } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Check, 
  UserPlus, 
  User, 
  Phone, 
  Calendar, 
  Mail, 
  MapPin, 
  ShieldAlert, 
  Activity, 
  UserCheck, 
  PhoneCall, 
  FileText,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (patient: Patient) => void;
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { addToast } = useNotificationStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showMore, setShowMore] = useState(false);

  // Mandatory fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Female');

  // Optional fields
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [allergiesText, setAllergiesText] = useState('');
  const [medAlertsText, setMedAlertsText] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [assignedDentistName, setAssignedDentistName] = useState('');
  const [assignedDentistId, setAssignedDentistId] = useState('');
  const [notes, setNotes] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !phone || !age || !gender) {
      addToast({ type: 'warning', title: 'Missing Fields', message: 'Provide patient name, phone, age and gender.' });
      return;
    }

    setIsLoading(true);

    // Estimate Date of birth based on age
    const currentYear = new Date().getFullYear();
    const dobYear = currentYear - parseInt(age);
    const dob = `${dobYear}-01-01`;

    const allergies = allergiesText 
      ? allergiesText.split(',').map((a) => a.trim()).filter(Boolean)
      : [];
    const medicalHistory = medAlertsText
      ? medAlertsText.split(',').map((h) => h.trim()).filter(Boolean)
      : [];

    const newPatientData = {
      name,
      email,
      phone,
      dateOfBirth: dob,
      gender,
      bloodType: 'O+', // default
      allergies,
      medicalHistory,
      emergencyContact: {
        name: emergencyName,
        phone: emergencyPhone,
        relationship: 'Emergency Contact',
      },
      assignedDentistId,
      assignedDentistName,
      notes,
    };

    const res = await receptionService.registerPatient(newPatientData);
    setIsLoading(false);

    if (res.success && res.data) {
      addToast({
        type: 'success',
        title: 'Patient Registered',
        message: `${res.data.name} was successfully registered inside clinic files.`
      });

      // Clear form
      setName('');
      setPhone('');
      setAge('');
      setGender('Female');
      setEmail('');
      setAddress('');
      setAllergiesText('');
      setMedAlertsText('');
      setEmergencyName('');
      setEmergencyPhone('');
      setAssignedDentistName('');
      setAssignedDentistId('');
      setNotes('');

      if (onSuccess) onSuccess(res.data);
      onClose();
    } else {
      addToast({
        type: 'error',
        title: 'Registration Blocked',
        message: res.error || 'Failed to complete registration.'
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="max-w-4xl rounded-[24px] p-0 bg-white border border-slate-100 overflow-hidden shadow-2xl md:max-w-4xl dark:bg-slate-950 dark:border-slate-900 animate-in fade-in-50 zoom-in-95 duration-200">
        <form onSubmit={handleRegister} className="flex flex-col h-full max-h-[90vh]">
          {/* Header section with rich aesthetic accent gradient */}
          <div className="relative p-6 md:p-8 bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-950/50 border-b border-slate-100 dark:border-slate-900">
            <DialogHeader className="flex flex-row items-center gap-4 text-left space-y-0">
              <div className="p-3 bg-red-50 text-red-800 rounded-2xl dark:bg-red-950/40 dark:text-red-400 shrink-0 shadow-sm border border-red-100/50 dark:border-red-900/30">
                <UserPlus className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-50 leading-snug">
                  Register Patient Record
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 font-medium dark:text-slate-400">
                  Register patient file in 30 seconds. Clinical notes and charts will be completed by the doctor later.
                </DialogDescription>
              </div>
            </DialogHeader>
          </div>

          {/* Form scrollable content */}
          <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1">
            
            {/* Required Fields Section */}
            <div className="bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-900 rounded-2xl p-5 space-y-5">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800/80">
                <User className="w-4 h-4 text-red-800 dark:text-red-400" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Required Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="reg-name" className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Patient Full Name <span className="text-red-805 dark:text-red-400">*</span>
                  </Label>
                  <div className="relative group">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 transition-colors group-focus-within:text-red-800 dark:group-focus-within:text-red-400" />
                    <Input
                      autoFocus
                      id="reg-name"
                      placeholder="e.g. Priyanka Patil"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10 h-11 rounded-xl border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-red-800/20 focus-visible:border-red-800 transition-all font-medium text-slate-800 dark:text-slate-200 text-sm"
                      required
                    />
                  </div>
                </div>

                {/* Mobile Number */}
                <div className="space-y-1.5">
                  <Label htmlFor="reg-phone" className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Mobile Number <span className="text-red-805 dark:text-red-400">*</span>
                  </Label>
                  <div className="relative group flex items-center">
                    <div className="absolute left-3 font-bold text-slate-500 text-sm flex items-center gap-1 border-r border-slate-200 dark:border-slate-700 pr-2 h-5">
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
                      className="pl-[4.5rem] h-11 rounded-xl border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-red-800/20 focus-visible:border-red-800 transition-all font-medium text-slate-800 dark:text-slate-200 text-sm"
                      required
                      maxLength={10}
                    />
                  </div>
                </div>

                {/* Age */}
                <div className="space-y-1.5">
                  <Label htmlFor="reg-age" className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Age <span className="text-red-805 dark:text-red-400">*</span>
                  </Label>
                  <div className="relative group">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 transition-colors group-focus-within:text-red-800 dark:group-focus-within:text-red-400" />
                    <Input
                      id="reg-age"
                      type="number"
                      placeholder="e.g. 35"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      onKeyDown={(e) => {
                        if (['e', 'E', '+', '-'].includes(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      className="pl-10 h-11 rounded-xl border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-red-800/20 focus-visible:border-red-800 transition-all font-medium text-slate-800 dark:text-slate-200 text-sm"
                      required
                      min={0}
                      max={120}
                    />
                  </div>
                </div>

                {/* Gender Custom Buttons */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Gender <span className="text-red-850 dark:text-red-400">*</span>
                  </Label>
                  <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/50 dark:border-slate-700/50 h-11">
                    {(['Female', 'Male', 'Other'] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGender(g)}
                        className={cn(
                          "h-full px-2 text-xs font-bold rounded-lg transition-all cursor-pointer text-center",
                          gender === g
                            ? "bg-white text-red-800 dark:bg-slate-900 dark:text-red-400 shadow-sm"
                            : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-800/40"
                        )}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* View More Toggle */}
            <div className="flex justify-center">
              <button 
                type="button" 
                onClick={() => setShowMore(!showMore)} 
                className="text-xs font-bold text-red-800 dark:text-red-400 hover:text-red-950 dark:hover:text-red-300 transition-colors flex items-center gap-1.5 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-full border border-red-100 dark:border-red-900/30"
              >
                {showMore ? 'View Less' : 'View more details'} 
                {showMore ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
              </button>
            </div>

            {showMore && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start animate-in fade-in slide-in-from-top-4 duration-300">
                {/* Left Column: Additional Profile Card */}
                <div className="bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-900 rounded-2xl p-5 space-y-5">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800/80">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Additional Contact Details</h3>
                  </div>

                  <div className="space-y-4">
                    {/* Email */}
                    <div className="space-y-1.5">
                      <Label htmlFor="reg-email" className="text-xs font-bold text-slate-500 dark:text-slate-400">Email Address (Optional)</Label>
                      <div className="relative group">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 transition-colors group-focus-within:text-red-800 dark:group-focus-within:text-red-400" />
                        <Input
                          id="reg-email"
                          type="email"
                          placeholder="name@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10 h-11 rounded-xl border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-red-800/20 focus-visible:border-red-800 transition-all font-medium text-slate-800 dark:text-slate-200 text-sm"
                        />
                      </div>
                    </div>

                    {/* Address */}
                    <div className="space-y-1.5">
                      <Label htmlFor="reg-addr" className="text-xs font-bold text-slate-500 dark:text-slate-400">Address (Optional)</Label>
                      <div className="relative group">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 transition-colors group-focus-within:text-red-800 dark:group-focus-within:text-red-400" />
                        <Input
                          id="reg-addr"
                          placeholder="Street address details..."
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          className="pl-10 h-11 rounded-xl border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-red-800/20 focus-visible:border-red-800 transition-all font-medium text-slate-800 dark:text-slate-200 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

              {/* Right Column: Medical Safety & Contact Card */}
              <div className="bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-900 rounded-2xl p-5 space-y-5">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800/80">
                  <Activity className="w-4 h-4 text-red-800 dark:text-red-400" />
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Medical & Emergency Safety</h3>
                </div>

                <div className="space-y-4">
                  {/* Allergies */}
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-allergies" className="text-xs font-bold text-slate-500 dark:text-slate-400">Allergies (Comma separated)</Label>
                    <div className="relative group">
                      <ShieldAlert className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 transition-colors group-focus-within:text-red-800 dark:group-focus-within:text-red-400" />
                      <Input
                        id="reg-allergies"
                        placeholder="e.g. Penicillin, Latex"
                        value={allergiesText}
                        onChange={(e) => setAllergiesText(e.target.value)}
                        className="pl-10 h-11 rounded-xl border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-red-800/20 focus-visible:border-red-800 transition-all font-medium text-slate-800 dark:text-slate-200 text-sm"
                      />
                    </div>
                  </div>

                  {/* Medical Alerts */}
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-med" className="text-xs font-bold text-slate-500 dark:text-slate-400">Medical Alerts (Comma separated)</Label>
                    <div className="relative group">
                      <Activity className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 transition-colors group-focus-within:text-red-800 dark:group-focus-within:text-red-400" />
                      <Input
                        id="reg-med"
                        placeholder="e.g. Diabetes, Hypertension"
                        value={medAlertsText}
                        onChange={(e) => setMedAlertsText(e.target.value)}
                        className="pl-10 h-11 rounded-xl border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-red-800/20 focus-visible:border-red-800 transition-all font-medium text-slate-800 dark:text-slate-200 text-sm"
                      />
                    </div>
                  </div>

                  {/* Emergency Contact Name & Phone side-by-side */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Emergency Contact Name */}
                    <div className="space-y-1.5">
                      <Label htmlFor="reg-emg-name" className="text-xs font-bold text-slate-500 dark:text-slate-400">Emergency Contact Name</Label>
                      <div className="relative group">
                        <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 transition-colors group-focus-within:text-red-800 dark:group-focus-within:text-red-400" />
                        <Input
                          id="reg-emg-name"
                          placeholder="Spouse or parent name"
                          value={emergencyName}
                          onChange={(e) => setEmergencyName(e.target.value)}
                          className="pl-10 h-11 rounded-xl border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-red-800/20 focus-visible:border-red-800 transition-all font-medium text-slate-800 dark:text-slate-200 text-sm"
                        />
                      </div>
                    </div>

                    {/* Emergency Phone */}
                    <div className="space-y-1.5">
                      <Label htmlFor="reg-emg-phone" className="text-xs font-bold text-slate-500 dark:text-slate-400">Emergency Phone</Label>
                      <div className="relative group">
                        <PhoneCall className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 transition-colors group-focus-within:text-red-800 dark:group-focus-within:text-red-400" />
                        <Input
                          id="reg-emg-phone"
                          placeholder="Contact number"
                          value={emergencyPhone}
                          onChange={(e) => setEmergencyPhone(e.target.value)}
                          className="pl-10 h-11 rounded-xl border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-red-800/20 focus-visible:border-red-800 transition-all font-medium text-slate-800 dark:text-slate-200 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Assigned Dentist side-by-side */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Assigned Dentist Name */}
                    <div className="space-y-1.5">
                      <Label htmlFor="reg-dentist-name" className="text-xs font-bold text-slate-500 dark:text-slate-400">Assigned Dentist Name</Label>
                      <div className="relative group">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 transition-colors group-focus-within:text-red-800 dark:group-focus-within:text-red-400" />
                        <Input
                          id="reg-dentist-name"
                          placeholder="Dr. Name"
                          value={assignedDentistName}
                          onChange={(e) => setAssignedDentistName(e.target.value)}
                          className="pl-10 h-11 rounded-xl border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-red-800/20 focus-visible:border-red-800 transition-all font-medium text-slate-800 dark:text-slate-200 text-sm"
                        />
                      </div>
                    </div>

                    {/* Assigned Dentist ID */}
                    <div className="space-y-1.5">
                      <Label htmlFor="reg-dentist-id" className="text-xs font-bold text-slate-500 dark:text-slate-400">Assigned Dentist ID</Label>
                      <div className="relative group">
                        <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 transition-colors group-focus-within:text-red-800 dark:group-focus-within:text-red-400" />
                        <Input
                          id="reg-dentist-id"
                          placeholder="ID (optional)"
                          value={assignedDentistId}
                          onChange={(e) => setAssignedDentistId(e.target.value)}
                          className="pl-10 h-11 rounded-xl border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-red-800/20 focus-visible:border-red-800 transition-all font-medium text-slate-800 dark:text-slate-200 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Intake Notes (New Textarea!) */}
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-notes" className="text-xs font-bold text-slate-500 dark:text-slate-400">Intake Notes (Optional)</Label>
                    <div className="relative group">
                      <FileText className="absolute left-3 top-3 size-4 text-slate-400 transition-colors group-focus-within:text-red-800 dark:group-focus-within:text-red-400" />
                      <textarea
                        id="reg-notes"
                        placeholder="Any initial clinic intake notes, references..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full min-h-[90px] text-sm pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800 transition-all text-slate-800 dark:text-slate-200 font-medium leading-relaxed resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              </div>
            )}
          </div>

          {/* Dialog Footer with elegant borders and premium buttons */}
          <div className="p-6 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-900 flex justify-end items-center gap-3">
            <DialogFooter className="flex flex-row gap-3 sm:space-x-0 w-full sm:w-auto">
              <Button
                type="button"
                variant="ghost"
                disabled={isLoading}
                onClick={onClose}
                className="flex-1 sm:flex-initial h-11 rounded-xl border border-slate-200 dark:border-slate-800 font-bold text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all px-6 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 sm:flex-initial h-11 rounded-xl bg-red-800 hover:bg-red-900 text-white font-bold text-xs px-6 shadow-md shadow-red-800/10 active:scale-[0.98] transition-all cursor-pointer"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-1.5">
                    <Check className="w-4 h-4" />
                    <span>Register Patient</span>
                  </div>
                )}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RegistrationModal;

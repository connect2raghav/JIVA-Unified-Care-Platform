import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useAuthStore } from '@/store/useAuthStore';
import { receptionService } from '@/services/receptionService';
import type { Patient } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar, Search, UserPlus, Check, Sparkles, User, Clock, Stethoscope, Building2 } from 'lucide-react';

const APPOINTMENT_TYPES = [
  'Consultation',
  'Cleaning',
  'Root Canal',
  'Extraction',
  'Implant',
  'Crown',
  'Bridge',
  'Orthodontics',
  'Follow-up'
];

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultMode?: 'EXISTING' | 'NEW';
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultMode = 'EXISTING',
}) => {
  const { addToast } = useNotificationStore();
  const { user: currentUser } = useAuthStore();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  // Booking Tab: 'EXISTING' | 'NEW'
  const [patientMode, setPatientMode] = useState<'EXISTING' | 'NEW'>('EXISTING');
  
  // Data lists
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<{ id: string; name: string }[]>([]);
  const [hospitals, setHospitals] = useState<{ id: string; name: string }[]>([]);

  // Selection states
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  
  // Inline registration fields
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [newPatientAge, setNewPatientAge] = useState('');
  const [newPatientEmail, setNewPatientEmail] = useState('');
  const [newPatientGender, setNewPatientGender] = useState('Female');

  // Booking parameters
  const [selectedHospitalId, setSelectedHospitalId] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [apptType, setApptType] = useState('Consultation');
  const [apptDate, setApptDate] = useState('');
  const [apptTime, setApptTime] = useState('');
  const [notes, setNotes] = useState('');
  
  const [searchIndex, setSearchIndex] = useState(-1);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Refs for keyboard navigation
  const doctorRef = React.useRef<HTMLSelectElement>(null);
  const typeRef = React.useRef<HTMLSelectElement>(null);
  const dateRef = React.useRef<HTMLInputElement>(null);
  const timeRef = React.useRef<HTMLInputElement>(null);
  const notesRef = React.useRef<HTMLInputElement>(null);
  const submitBtnRef = React.useRef<HTMLButtonElement>(null);
  
  // Filter patients list on search input
  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
    p.phone.includes(patientSearch)
  );
  
  useEffect(() => setSearchIndex(-1), [patientSearch]);

  useEffect(() => {
    if (isOpen) {
      setPatientMode(defaultMode);
      loadLookupData();
      
      const now = new Date();
      setApptDate(now.toISOString().split('T')[0]);
      setApptTime(now.toTimeString().slice(0, 5));
    }
  }, [isOpen, defaultMode]);

  const loadLookupData = async () => {
    // Load patients list
    const patientList = await receptionService.getAllPatientsList();
    setPatients(patientList);
    if (patientList.length > 0) {
      setSelectedPatientId(patientList[0].id);
    }

    // Load hospitals list
    try {
      const { supabase } = await import('@/lib/supabaseClient');
      const { data, error } = await supabase.from('clinics').select('id, name').eq('is_active', true);
      if (!error && data) {
        setHospitals(data);
        if (currentUser && currentUser.clinic_id) {
          setSelectedHospitalId(currentUser.clinic_id);
        } else if (data.length > 0) {
          setSelectedHospitalId(data[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to fetch hospitals', e);
    }
  };

  useEffect(() => {
    const fetchDocs = async () => {
      if (!selectedHospitalId) return;
      try {
        const { supabase } = await import('@/lib/supabaseClient');
        const { data: roleData } = await supabase.from('roles').select('id').in('name', ['Physician', 'Doctor', 'Other Doctor']);
        const roleIds = roleData?.map(r => r.id) || [];
        
        const { data, error } = await supabase
          .from('users')
          .select('id, name')
          .eq('clinic_id', selectedHospitalId)
          .in('role_id', roleIds)
          .eq('is_active', true);
        
        if (!error && data) {
          setDoctors(data);
          
          if (currentUser && currentUser.clinic_id === selectedHospitalId && ['Physician', 'Doctor'].includes(currentUser.role)) {
            const isSelf = data.some(d => d.id === currentUser.id);
            if (isSelf) setSelectedDoctorId(currentUser.id);
            else if (data.length > 0) setSelectedDoctorId(data[0].id);
          } else if (data.length > 0) {
            setSelectedDoctorId(data[0].id);
          } else {
            setSelectedDoctorId('');
          }
        }
      } catch (e) {
        console.error('Failed to fetch doctors', e);
      }
    };
    fetchDocs();
  }, [selectedHospitalId, currentUser]);

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDoctorId || !apptDate || !apptTime) {
      addToast({ type: 'warning', title: 'Missing details', message: 'Provide doctor selection, schedule date and time slot.' });
      return;
    }

    setIsLoading(true);
    let patientId = selectedPatientId;
    let patientName = '';

    // Step 1: Handle inline new patient registration
    if (patientMode === 'NEW') {
      if (!newPatientName || !newPatientPhone || !newPatientAge) {
        addToast({ type: 'warning', title: 'Missing profile fields', message: 'Input name, phone and age for patient registration.' });
        setIsLoading(false);
        return;
      }

      // Estimate Date of birth based on age
      const currentYear = new Date().getFullYear();
      const dobYear = currentYear - parseInt(newPatientAge);
      const dob = `${dobYear}-01-01`;

      const regResult = await receptionService.registerPatient({
        name: newPatientName,
        phone: newPatientPhone,
        email: newPatientEmail,
        dateOfBirth: dob,
        gender: newPatientGender,
        allergies: [],
        medicalHistory: [],
        emergencyContact: { name: '', phone: '', relationship: '' },
      });

      if (regResult.success && regResult.data) {
        patientId = regResult.data.id;
        patientName = regResult.data.name;
      } else {
        addToast({ type: 'error', title: 'Registration Failed', message: regResult.error || 'Duplicate patient details.' });
        setIsLoading(false);
        return;
      }
    } else {
      const match = patients.find(p => p.id === patientId);
      patientName = match ? match.name : 'Registered Patient';
    }

    // Step 2: Book appointment slot
    const doctor = doctors.find(d => d.id === selectedDoctorId);
    const doctorName = doctor ? doctor.name : 'Dr. Prasad Patil';
    const localDate = new Date(`${apptDate}T${apptTime}`);
    const dateTimeStr = localDate.toISOString();

    const apptResult = await receptionService.bookAppointment({
      clinicId: selectedHospitalId,
      patientId,
      patientName,
      physicianId: selectedDoctorId,
      physicianName: doctorName,
      dateTime: dateTimeStr,
      durationMinutes: 30, // Default duration
      status: 'Scheduled',
      reason: apptType,
      notes
    } as any);
    setIsLoading(false);

    if (apptResult.success) {
      addToast({
        type: 'success',
        title: 'Appointment Scheduled',
        message: `Booked slot for ${patientName} with ${doctorName} on ${apptDate}.`
      });

      // Clear forms
      setNewPatientName('');
      setNewPatientPhone('');
      setNewPatientAge('');
      setApptDate(new Date().toISOString().split('T')[0]);
      setApptTime(new Date().toTimeString().slice(0, 5));
      setNotes('');
      setPatientSearch('');
      
      if (onSuccess) onSuccess();

      // Conditional logic: Receptionist keeps it open. Doctors auto-close and redirect if for today.
      if (currentUser?.role === 'Receptionist') {
        // Just reset mode to existing to be ready for next patient
        setPatientMode('EXISTING');
      } else {
        onClose();
        // Check if the appointment is today, redirect them to queue
        const today = new Date().toISOString().split('T')[0];
        if (apptDate === today) {
          const rolePrefix = window.location.pathname.split('/')[1] || 'doctor';
          navigate(`/${rolePrefix}/appointments`);
        }
      }
    } else {
      addToast({ type: 'error', title: 'Booking Failed', message: apptResult.error || 'Failed to register appointment slot.' });
    }
  };

  const handlePatientSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const maxIndex = Math.min(filteredPatients.length, 5) - 1;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSearchIndex(prev => (prev < maxIndex ? prev + 1 : prev));
      setShowSearchDropdown(true);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSearchIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (searchIndex >= 0 && searchIndex <= maxIndex) {
        setSelectedPatientId(filteredPatients[searchIndex].id);
        setPatientSearch(filteredPatients[searchIndex].name);
      } else if (filteredPatients.length > 0) {
        setSelectedPatientId(filteredPatients[0].id);
        setPatientSearch(filteredPatients[0].name);
      }
      setShowSearchDropdown(false);
      doctorRef.current?.focus();
    }
  };

  const handleGlobalEnterKey = (e: React.KeyboardEvent<HTMLFormElement>) => {
    // If pressing enter on a field, prevent submit and move to next logical field
    if (e.key === 'Enter') {
      const target = e.target as HTMLElement;
      if (target === submitBtnRef.current) {
        return; // Let it submit
      }
      
      e.preventDefault();
      
      if (target === doctorRef.current) {
        submitBtnRef.current?.focus();
      } else if (target === typeRef.current) {
        dateRef.current?.focus();
      } else if (target === dateRef.current) {
        timeRef.current?.focus();
      } else if (target === timeRef.current) {
        submitBtnRef.current?.focus();
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="w-[95vw] max-w-2xl sm:max-w-2xl rounded-xl p-0 bg-white border border-slate-200 shadow-xl overflow-y-auto max-h-[90vh] gap-0">
        
        {/* Clean Professional Header */}
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-red-700" />
              Book Appointment
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Schedule clinical visits or register a new patient inline.
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleBookAppointment} onKeyDown={handleGlobalEnterKey} className="p-6 space-y-6">
          
          {/* Segmented Control for Patient Mode */}
          <div className="flex bg-slate-100 p-1 rounded-lg text-sm font-medium text-slate-600">
            <button
              type="button"
              onClick={() => setPatientMode('EXISTING')}
              className={`flex-1 py-1.5 rounded-md transition-all flex items-center justify-center gap-2 ${
                patientMode === 'EXISTING' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' : 'hover:text-slate-800'
              }`}
            >
              <User className="w-4 h-4" />
              Existing Patient
            </button>
            <button
              type="button"
              onClick={() => setPatientMode('NEW')}
              className={`flex-1 py-1.5 rounded-md transition-all flex items-center justify-center gap-2 ${
                patientMode === 'NEW' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' : 'hover:text-slate-800'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              New Patient
            </button>
          </div>

          {/* Mode Form Details */}
          {patientMode === 'EXISTING' ? (
            <div className="space-y-4 relative">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500">Find Patient <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <Input
                    autoFocus
                    placeholder="Search patients by name or phone..."
                    value={patientSearch}
                    onChange={(e) => {
                      setPatientSearch(e.target.value);
                      setShowSearchDropdown(true);
                      if (e.target.value === '') {
                        setSelectedPatientId(patients.length > 0 ? patients[0].id : '');
                      }
                    }}
                    onFocus={() => setShowSearchDropdown(true)}
                    onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                    onKeyDown={handlePatientSearchKeyDown}
                    className="pl-9 h-9 rounded-lg border-slate-200 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                  {showSearchDropdown && patientSearch.trim().length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-lg overflow-hidden z-50">
                      {filteredPatients.slice(0, 5).map((pat, idx) => (
                        <div
                          key={pat.id}
                          onMouseDown={() => {
                            setSelectedPatientId(pat.id);
                            setPatientSearch(pat.name);
                            setShowSearchDropdown(false);
                            doctorRef.current?.focus();
                          }}
                          className={`px-4 py-2 cursor-pointer transition text-sm ${searchIndex === idx ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
                        >
                          <p className="font-semibold text-slate-800">{pat.name}</p>
                          <p className="text-[10px] text-slate-400">{pat.phone}</p>
                        </div>
                      ))}
                      {filteredPatients.length === 0 && (
                        <div className="px-4 py-3 text-xs text-slate-500 text-center">No patients found.</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {selectedPatientId && !patientSearch && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-900">{patients.find(p => p.id === selectedPatientId)?.name}</p>
                    <p className="text-[10px] text-slate-500">{patients.find(p => p.id === selectedPatientId)?.phone}</p>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <Check className="w-3 h-3" />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border border-slate-200 bg-slate-50 p-4 rounded-lg">
              <div className="md:col-span-full flex items-center gap-2 text-slate-700 font-semibold pb-2 border-b border-slate-200">
                <Sparkles className="w-4 h-4 text-slate-400" />
                <span className="text-sm">Patient Registration</span>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500">Full Name <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="e.g. Priyanka Patil"
                  value={newPatientName}
                  onChange={(e) => setNewPatientName(e.target.value)}
                  className="h-9 rounded-lg border-slate-200 text-sm bg-white"
                  required={patientMode === 'NEW'}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500">Mobile Number <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="9876543210"
                  value={newPatientPhone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val.length <= 10) setNewPatientPhone(val);
                  }}
                  className="h-9 rounded-lg border-slate-200 text-sm bg-white"
                  required={patientMode === 'NEW'}
                  maxLength={10}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500">Age <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  placeholder="e.g. 35"
                  value={newPatientAge}
                  onChange={(e) => setNewPatientAge(e.target.value)}
                  onKeyDown={(e) => {
                    if (['e', 'E', '+', '-'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  className="h-9 rounded-lg border-slate-200 text-sm bg-white"
                  required={patientMode === 'NEW'}
                  min={0}
                  max={120}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500">Gender <span className="text-red-500">*</span></Label>
                <select
                  value={newPatientGender}
                  onChange={(e) => setNewPatientGender(e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-200 px-3 bg-white text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all"
                  required={patientMode === 'NEW'}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500">Email Address (Optional)</Label>
                <Input
                  type="email"
                  placeholder="e.g. name@example.com"
                  value={newPatientEmail}
                  onChange={(e) => setNewPatientEmail(e.target.value)}
                  className="h-9 rounded-lg border-slate-200 text-sm bg-white"
                />
              </div>
            </div>
          )}

          {/* Booking Settings Form Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
            
            <div className="sm:col-span-2 text-sm font-semibold text-slate-700 flex items-center gap-2 pb-2 border-b border-slate-100 mt-2">
              <Clock className="w-4 h-4 text-slate-400" /> Appointment Details
            </div>

            {/* Hospital/Clinic Select */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-semibold text-slate-500">Hospital / Clinic <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  className="w-full h-9 rounded-lg border border-slate-200 pl-8 pr-3 bg-white text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all"
                  value={selectedHospitalId}
                  onChange={(e) => setSelectedHospitalId(e.target.value)}
                >
                  <option value="" disabled>Select a facility...</option>
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Doctor Select */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500">Attending Doctor <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Stethoscope className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  ref={doctorRef}
                  className="w-full h-9 rounded-lg border border-slate-200 pl-8 pr-3 bg-white text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all"
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  disabled={!selectedHospitalId || doctors.length === 0}
                >
                  {doctors.length === 0 ? (
                    <option value="" disabled>No doctors available</option>
                  ) : (
                    doctors.map((doc) => (
                      <option key={doc.id} value={doc.id}>{doc.name}</option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Appointment Type */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500">Treatment Type <span className="text-red-500">*</span></Label>
              <select
                ref={typeRef}
                className="w-full h-9 rounded-lg border border-slate-200 px-3 bg-white text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all"
                value={apptType}
                onChange={(e) => setApptType(e.target.value)}
              >
                {APPOINTMENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Date Slot */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500">Schedule Date <span className="text-red-500">*</span></Label>
              <Input
                ref={dateRef}
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={apptDate}
                onChange={(e) => setApptDate(e.target.value)}
                className="h-9 rounded-lg border-slate-200 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                required
              />
            </div>

            {/* Time Slot */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500">Time Slot <span className="text-red-500">*</span></Label>
              <Input
                ref={timeRef}
                type="time"
                value={apptTime}
                onChange={(e) => setApptTime(e.target.value)}
                className="h-9 rounded-lg border-slate-200 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                required
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5 sm:col-span-2 mt-2">
              <Label className="text-xs font-semibold text-slate-500">Booking Notes (Optional)</Label>
              <Input
                ref={notesRef}
                placeholder="Chief complaint, specific requests, or scheduling remarks..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-9 rounded-lg border-slate-200 text-sm"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={onClose}
              className="h-9 rounded-lg text-sm font-medium border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            >
              Cancel
            </Button>
            <Button
              ref={submitBtnRef}
              type="submit"
              disabled={isLoading}
              className="h-9 rounded-lg bg-red-700 hover:bg-red-800 text-white text-sm font-medium px-6 shadow-sm"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Booking...</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4" />
                  <span>Confirm Booking</span>
                </div>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BookingModal;

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNotificationStore } from '@/store/useNotificationStore';
import { adminService } from '@/services/adminService';
import type { ClinicSettings as IClinicSettings } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  CalendarRange, 
  PhoneCall, 
  Check, 
  Plus, 
  X, 
  Upload,
  Trash
} from 'lucide-react';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Zod Schema matching requirements
const settingsSchema = z.object({
  name: z.string().min(2, 'Clinic Name must be at least 2 characters.'),
  address: z.string().min(5, 'Address is too short.'),
  phone: z.string().min(5, 'Invalid phone number format.'),
  email: z.string().email('Invalid email address format.'),
  openingTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be HH:MM format.'),
  closingTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be HH:MM format.'),
  appointmentDuration: z.number().min(5).max(180),
  emergencyContact: z.string().min(5, 'Emergency contact is too short.'),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export const ClinicSettings: React.FC = () => {
  const { addToast } = useNotificationStore();
  const [originalSettings, setOriginalSettings] = useState<IClinicSettings | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Custom states for arrays
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [holidays, setHolidays] = useState<string[]>([]);
  const [newHoliday, setNewHoliday] = useState('');
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
  });

  useEffect(() => {
    const fetchSettings = async () => {
      const data = await adminService.getClinicSettings();
      setOriginalSettings(data);
      setSelectedDays(data.workingDays);
      setHolidays(data.holidays);
      setLogoPreview(data.logoUrl || '');
      
      reset({
        name: data.name,
        address: data.address,
        phone: data.phone,
        email: data.email,
        openingTime: data.openingTime,
        closingTime: data.closingTime,
        appointmentDuration: data.appointmentDuration,
        emergencyContact: data.emergencyContact,
      });
    };

    fetchSettings();
  }, [reset]);

  const handleDayToggle = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleAddHoliday = () => {
    if (!newHoliday) return;
    if (holidays.includes(newHoliday)) {
      addToast({ type: 'warning', title: 'Holiday exists', message: 'This date is already listed.' });
      return;
    }
    setHolidays([...holidays, newHoliday]);
    setNewHoliday('');
  };

  const handleRemoveHoliday = (date: string) => {
    setHolidays(holidays.filter(h => h !== date));
  };

  const onSubmit = async (values: SettingsFormValues) => {
    if (!originalSettings) return;

    if (selectedDays.length === 0) {
      addToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Please select at least one working day for the clinic schedule.'
      });
      return;
    }

    const updatedSettings: IClinicSettings = {
      ...originalSettings,
      name: values.name,
      address: values.address,
      phone: values.phone,
      email: values.email,
      openingTime: values.openingTime,
      closingTime: values.closingTime,
      appointmentDuration: values.appointmentDuration,
      emergencyContact: values.emergencyContact,
      workingDays: selectedDays,
      holidays: holidays,
      logoUrl: logoPreview
    };

    await adminService.updateClinicSettings(updatedSettings);
    
    // Log setting adjustment
    await adminService.logActivity('Settings Saved', `Modified clinic configurations.`);

    addToast({
      type: 'success',
      title: 'Practice Configuration Saved',
      message: 'Clinic details and timing patterns were modified successfully.'
    });
    
    setIsEditing(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    const result = await adminService.uploadLogo(file);
    setIsUploadingLogo(false);

    if (result.success && result.url) {
      setLogoPreview(result.url);
      addToast({
        type: 'success',
        title: 'Logo Uploaded',
        message: 'Clinic logo has been securely uploaded.'
      });
    } else {
      addToast({
        type: 'error',
        title: 'Upload Failed',
        message: result.error || 'Failed to process image.'
      });
    }
  };

  if (!originalSettings) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[40vh] gap-3">
        <div className="w-8 h-8 border-3 border-red-200 border-t-red-800 rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-slate-400">Loading clinic settings panel...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-2">
            <Building2 className="w-6 h-6 text-red-805" />
            <span>Practice Settings</span>
          </h2>
          <p className="text-xs text-slate-400 font-semibold mt-1">
            Configure clinic hours, contact guidelines, and default schedules parameters.
          </p>
        </div>
        <div>
          {!isEditing ? (
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsEditing(true)} 
              className="h-9 px-4 rounded-xl border-slate-200 hover:bg-slate-50 text-xs font-bold shadow-sm bg-white"
            >
              Edit Details
            </Button>
          ) : (
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => {
                setIsEditing(false);
                if (originalSettings) {
                  reset({
                    name: originalSettings.name,
                    address: originalSettings.address,
                    phone: originalSettings.phone,
                    email: originalSettings.email,
                    openingTime: originalSettings.openingTime,
                    closingTime: originalSettings.closingTime,
                    appointmentDuration: originalSettings.appointmentDuration,
                    emergencyContact: originalSettings.emergencyContact,
                  });
                  setSelectedDays(originalSettings.workingDays);
                  setHolidays(originalSettings.holidays);
                  setLogoPreview(originalSettings.logoUrl || '');
                }
              }} 
              className="h-9 px-4 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-900 bg-white border border-slate-200"
            >
              Cancel
            </Button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Grid: Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-none shadow-sm bg-white rounded-2xl p-6 md:p-8">
              <CardHeader className="p-0 pb-4 mb-4 border-b border-slate-100">
                <CardTitle className="text-sm font-extrabold text-slate-800">Clinic Profile</CardTitle>
                <CardDescription className="text-[10px] text-slate-400 font-semibold">General location details.</CardDescription>
              </CardHeader>
              
              <CardContent className="p-0 space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="space-y-1">
                    <Label htmlFor="name" className="text-xs font-extrabold text-slate-500">Practice Name</Label>
                    <Input
                      id="name"
                      type="text"
                      disabled={!isEditing}
                      className="h-10.5 rounded-xl border-slate-200 disabled:opacity-70"
                      {...register('name')}
                    />
                    {errors.name && <p className="text-[10px] text-rose-700 font-bold">{errors.name.message}</p>}
                  </div>

                  {/* Clinic Code */}
                  <div className="space-y-1">
                    <Label htmlFor="clinicCode" className="text-xs font-extrabold text-slate-500">Clinic Code (Read-only)</Label>
                    <Input
                      id="clinicCode"
                      type="text"
                      value={originalSettings?.clinicCode || 'Pending'}
                      className="h-10.5 rounded-xl border-slate-200 bg-slate-50 text-slate-500 font-bold"
                      readOnly
                      disabled
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-1">
                    <Label htmlFor="phone" className="text-xs font-extrabold text-slate-500">Clinic Telephone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <Input
                        id="phone"
                        type="text"
                        disabled={!isEditing}
                        className="pl-10 h-10.5 rounded-xl border-slate-200 disabled:opacity-70"
                        {...register('phone')}
                      />
                    </div>
                    {errors.phone && <p className="text-[10px] text-rose-700 font-bold">{errors.phone.message}</p>}
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <Label htmlFor="email" className="text-xs font-extrabold text-slate-500">Practice Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <Input
                        id="email"
                        type="email"
                        disabled={!isEditing}
                        className="pl-10 h-10.5 rounded-xl border-slate-200 disabled:opacity-70"
                        {...register('email')}
                      />
                    </div>
                    {errors.email && <p className="text-[10px] text-rose-700 font-bold">{errors.email.message}</p>}
                  </div>

                  {/* Address */}
                  <div className="space-y-1 md:col-span-2">
                    <Label htmlFor="address" className="text-xs font-extrabold text-slate-500">Street Address</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <Input
                        id="address"
                        type="text"
                        disabled={!isEditing}
                        className="pl-10 h-10.5 rounded-xl border-slate-200 disabled:opacity-70"
                        {...register('address')}
                      />
                    </div>
                    {errors.address && <p className="text-[10px] text-rose-700 font-bold">{errors.address.message}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Operating Times Card */}
            <Card className="border-none shadow-sm bg-white rounded-2xl p-6 md:p-8">
              <CardHeader className="p-0 pb-4 mb-4 border-b border-slate-100">
                <CardTitle className="text-sm font-extrabold text-slate-800">Operational Hours & Scheduler</CardTitle>
                <CardDescription className="text-[10px] text-slate-400 font-semibold">Define clinical shift guidelines.</CardDescription>
              </CardHeader>
              
              <CardContent className="p-0 space-y-5 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Open Time */}
                  <div className="space-y-1">
                    <Label htmlFor="openingTime" className="text-xs font-extrabold text-slate-500">Opening Hour (24h)</Label>
                    <div className="relative">
                      <Clock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <Input
                        id="openingTime"
                        type="text"
                        placeholder="e.g. 08:00"
                        disabled={!isEditing}
                        className="pl-10 h-10.5 rounded-xl border-slate-200 disabled:opacity-70"
                        {...register('openingTime')}
                      />
                    </div>
                    {errors.openingTime && <p className="text-[10px] text-rose-700 font-bold">{errors.openingTime.message}</p>}
                  </div>

                  {/* Close Time */}
                  <div className="space-y-1">
                    <Label htmlFor="closingTime" className="text-xs font-extrabold text-slate-500">Closing Hour (24h)</Label>
                    <div className="relative">
                      <Clock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <Input
                        id="closingTime"
                        type="text"
                        placeholder="e.g. 17:00"
                        disabled={!isEditing}
                        className="pl-10 h-10.5 rounded-xl border-slate-200 disabled:opacity-70"
                        {...register('closingTime')}
                      />
                    </div>
                    {errors.closingTime && <p className="text-[10px] text-rose-700 font-bold">{errors.closingTime.message}</p>}
                  </div>

                  {/* Default Duration */}
                  <div className="space-y-1">
                    <Label htmlFor="duration" className="text-xs font-extrabold text-slate-500">Appointment Duration (mins)</Label>
                    <select
                      id="duration"
                      disabled={!isEditing}
                      className="w-full h-10.5 rounded-xl border border-slate-200 px-3 bg-white font-semibold text-slate-800 text-xs disabled:opacity-70"
                      onChange={(e) => setValue('appointmentDuration', parseInt(e.target.value))}
                      defaultValue={originalSettings.appointmentDuration}
                    >
                      <option value={15}>15 Minutes Slot</option>
                      <option value={30}>30 Minutes Slot</option>
                      <option value={45}>45 Minutes Slot</option>
                      <option value={60}>60 Minutes Slot</option>
                    </select>
                  </div>
                </div>

                {/* Weekdays Toggle selection */}
                <div className="space-y-2">
                  <Label className="text-xs font-extrabold text-slate-500">Practice Days</Label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {WEEKDAYS.map((day) => {
                      const isSelected = selectedDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          disabled={!isEditing}
                          onClick={() => handleDayToggle(day)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition ${
                            isSelected 
                              ? 'bg-red-50 border-red-200 text-red-808' 
                              : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
                          } ${!isEditing ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Card: Logo Upload & Holidays / Emergency contacts */}
          <div className="space-y-6">
            {/* Branding Logo Simulator */}
            <Card className="border-none shadow-sm bg-white rounded-2xl p-6">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                <Building2 className="w-4 h-4 text-red-808 font-bold" />
                <h3 className="text-sm font-extrabold text-slate-800">Clinic Branding</h3>
              </div>
              
              <div className="flex flex-col items-center justify-center p-4 border border-dashed border-slate-200 rounded-xl gap-3">
                {logoPreview ? (
                  <img 
                    src={logoPreview} 
                    alt="Clinic Logo" 
                    className="w-16 h-16 rounded-xl object-cover border border-slate-100" 
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                    <Building2 className="w-8 h-8" />
                  </div>
                )}
                
                <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
                  <Label
                    htmlFor="logo-upload"
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-655 transition ${!isEditing ? 'opacity-70 cursor-not-allowed' : 'hover:bg-slate-50 cursor-pointer'}`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingLogo ? 'Uploading...' : 'Upload Image'}</span>
                  </Label>
                  
                  {logoPreview && isEditing && (
                    <button
                      type="button"
                      onClick={() => setLogoPreview('')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rose-200 bg-rose-50 rounded-lg text-xs font-bold text-rose-700 transition hover:bg-rose-100 cursor-pointer"
                    >
                      <Trash className="w-3.5 h-3.5" />
                      <span>Remove Image</span>
                    </button>
                  )}
                </div>
                <Input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  disabled={!isEditing || isUploadingLogo}
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </div>
            </Card>

            {/* Emergency & Holidays Panel */}
            <Card className="border-none shadow-sm bg-white rounded-2xl p-6 text-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <CalendarRange className="w-4 h-4 text-red-808 font-bold" />
                <h3 className="text-sm font-extrabold text-slate-800">Practice Overrides</h3>
              </div>

              {/* Emergency Contact */}
              <div className="space-y-1">
                <Label htmlFor="emergency" className="text-xs font-extrabold text-slate-500">Emergency Support Line</Label>
                <div className="relative">
                  <PhoneCall className="absolute left-3.5 top-3 w-4 h-4 text-rose-800 shrink-0" />
                  <Input
                    id="emergency"
                    type="text"
                    disabled={!isEditing}
                    className="pl-10 h-10.5 rounded-xl border-slate-200 font-bold text-rose-900 bg-rose-50/20 disabled:opacity-70"
                    {...register('emergencyContact')}
                  />
                </div>
                {errors.emergencyContact && <p className="text-[10px] text-rose-700 font-bold">{errors.emergencyContact.message}</p>}
              </div>

              {/* Holidays Dynamic Listing */}
              <div className="space-y-2 pt-2">
                <Label className="text-xs font-extrabold text-slate-500">Clinic Holidays</Label>
                
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={newHoliday}
                    disabled={!isEditing}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewHoliday(e.target.value)}
                    className="h-10 rounded-xl border-slate-200 text-xs font-semibold disabled:opacity-70"
                  />
                  <Button
                    type="button"
                    disabled={!isEditing}
                    onClick={handleAddHoliday}
                    className="h-10 w-10 p-0 bg-slate-800 hover:bg-slate-900 text-white rounded-xl shrink-0 disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-1.5 pt-2 max-h-[150px] overflow-y-auto pr-1">
                  {holidays.length > 0 ? (
                    holidays.map((date) => (
                      <div 
                        key={date}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs font-semibold text-slate-700"
                      >
                        <span>{new Date(date).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                        <button
                          type="button"
                          disabled={!isEditing}
                          onClick={() => handleRemoveHoliday(date)}
                          className="text-slate-400 hover:text-rose-800 transition disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-405 italic py-1 font-semibold">No holidays added.</p>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Form Submission Button */}
        {isEditing && (
          <div className="flex justify-end p-4 border-t border-slate-200 mt-6 bg-white rounded-2xl shadow-sm border border-slate-200">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-11 bg-red-800 hover:bg-red-950 text-white font-bold rounded-xl shadow-md gap-1.5 text-xs px-6"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Saving Configurations...</span>
                </div>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Practice Settings</span>
                </>
              )}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
};

export default ClinicSettings;

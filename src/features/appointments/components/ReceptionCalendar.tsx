import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { receptionService } from '@/services/receptionService';
import type { Appointment, Patient, User } from '@/types';
import { BookingModal } from './BookingModal';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format, parseISO } from 'date-fns';
import { 
  CalendarDays, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  AlertTriangle,
  Settings2,
  Calendar,
  X,
  Play,
  Zap
} from 'lucide-react';

const STATUS_COLORS: Record<Appointment['status'], string> = {
  'Scheduled': 'border-indigo-150 bg-indigo-50/30 text-indigo-800',
  'Checked-In': 'border-blue-150 bg-blue-50 text-blue-800 animate-pulse',
  'Waiting': 'border-amber-200 bg-amber-50 text-amber-800',
  'In Treatment': 'border-purple-250 bg-purple-50 text-purple-800',
  'Completed': 'border-emerald-150 bg-emerald-50 text-emerald-800',
  'Cancelled': 'border-slate-200 bg-slate-50 text-slate-400',
  'No Show': 'border-rose-150 bg-rose-50 text-rose-800',
  'No-Show': 'border-rose-150 bg-rose-50 text-rose-800'
};

export const ReceptionCalendar: React.FC = () => {
  const { addToast } = useNotificationStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  
  // View mode: 'DAY' | 'WEEK' | 'MONTH'
  const [viewMode, setViewMode] = useState<'DAY' | 'WEEK' | 'MONTH'>('DAY');
  const [isBookOpen, setIsBookOpen] = useState(false);

  // Edit / Reschedule Modal state
  const [rescheduleAppt, setRescheduleAppt] = useState<Appointment | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newDentistId, setNewDentistId] = useState('');
  const [dentists, setDentists] = useState<any[]>([]);

  // Delete/Cancel Modal state
  const [cancelAppt, setCancelAppt] = useState<Appointment | null>(null);

  useEffect(() => {
    loadAppointments();
    loadDentists();

    const interval = setInterval(() => {
      loadAppointments();
    }, 15000);

    return () => clearInterval(interval);
  }, [user?.clinic_id]);

  const loadDentists = async () => {
    try {
      const { supabase } = await import('@/lib/supabaseClient');
      let query = supabase.from('users').select('*');
      if (user && user.clinic_id && user.role !== 'Super Admin') {
        query = query.eq('clinic_id', user.clinic_id);
      }
      const { data, error } = await query;
      if (!error && data) {
        const filtered = data.filter((u: any) => 
          (u.role === 'Dentist' || u.role === 'Other Dentist') && u.is_active !== false
        );
        setDentists(filtered);
      }
    } catch (e) {
      console.error('Failed to fetch dentists', e);
    }
  };

  const loadAppointments = async () => {
    const data = await receptionService.getAllAppointments();
    setAppointments(data);
  };

  const handleNavigateDate = (direction: 'PREV' | 'NEXT') => {
    const current = new Date(selectedDate);
    if (viewMode === 'DAY') {
      current.setDate(current.getDate() + (direction === 'NEXT' ? 1 : -1));
    } else if (viewMode === 'WEEK') {
      current.setDate(current.getDate() + (direction === 'NEXT' ? 7 : -7));
    } else {
      current.setMonth(current.getMonth() + (direction === 'NEXT' ? 1 : -1));
    }
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  /*
  const handleUpdateStatus = async (id: string, status: Appointment['status']) => {
    const res = await receptionService.updateAppointment(id, { status });
    if (res.success) {
      addToast({
        type: 'success',
        title: 'Status Updated',
        message: `Appointment status is now updated to ${status}.`
      });
      loadAppointments();
    } else {
      addToast({ type: 'error', title: 'Update Failed', message: res.error });
    }
  };
  */

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleAppt || !newDate || !newTime) return;

    const formattedDateTime = `${newDate}T${newTime}:00`;
    const res = await receptionService.updateAppointment(rescheduleAppt.id, {
      dateTime: formattedDateTime,
      notes: newNotes,
      dentistId: newDentistId
    });

    if (res.success) {
      addToast({
        type: 'success',
        title: 'Appointment Updated',
        message: `Successfully updated appointment for ${rescheduleAppt.patientName}.`
      });
      setRescheduleAppt(null);
      loadAppointments();
    } else {
      addToast({ type: 'error', title: 'Reschedule Failed', message: res.error });
    }
  };

  const handleCancelSubmit = async () => {
    if (!cancelAppt) return;
    const res = await receptionService.deleteAppointment(cancelAppt.id);
    
    if (res.success) {
      addToast({
        type: 'success',
        title: 'Appointment Cancelled',
        message: `Appointment for ${cancelAppt.patientName} has been cancelled.`
      });
      setCancelAppt(null);
      loadAppointments();
    } else {
      addToast({ type: 'error', title: 'Cancel Failed', message: res.error });
    }
  };

  const getFilteredAppointments = () => {
    const target = new Date(selectedDate);
    let filtered = [];
    
    if (viewMode === 'DAY') {
      const dateStr = target.toISOString().split('T')[0];
      filtered = appointments.filter(a => a.dateTime.startsWith(dateStr));
    } else if (viewMode === 'WEEK') {
      // Find start of week (Sunday)
      const day = target.getDay();
      const diff = target.getDate() - day;
      const startOfWeek = new Date(target.setDate(diff));
      const endOfWeek = new Date(target.setDate(diff + 6));
      
      const startStr = startOfWeek.toISOString().split('T')[0];
      const endStr = endOfWeek.toISOString().split('T')[0];
      
      filtered = appointments.filter(a => {
        const d = a.dateTime.split('T')[0];
        return d >= startStr && d <= endStr;
      });
    } else {
      // MONTH
      const yearStr = String(target.getFullYear());
      const monthStr = String(target.getMonth() + 1).padStart(2, '0');
      const matchPrefix = `${yearStr}-${monthStr}`;
      
      filtered = appointments.filter(a => a.dateTime.startsWith(matchPrefix));
    }
    
    // Do not show cancelled appointments in the calendar
    return filtered.filter(a => a.status !== 'Cancelled');
  };

  const displayedAppts = getFilteredAppointments().sort((a, b) => {
    // Current user's appointments come first
    const aIsUser = a.dentistId === user?.id || a.dentistName === user?.name;
    const bIsUser = b.dentistId === user?.id || b.dentistName === user?.name;
    if (aIsUser && !bIsUser) return -1;
    if (!aIsUser && bIsUser) return 1;
    // Then sort chronologically
    return a.dateTime.localeCompare(b.dateTime);
  });

  const formatHeaderLabel = () => {
    const d = new Date(selectedDate);
    if (viewMode === 'DAY') {
      return d.toLocaleDateString(undefined, { dateStyle: 'full' });
    }
    if (viewMode === 'WEEK') {
      const day = d.getDay();
      const diff = d.getDate() - day;
      const start = new Date(d.setDate(diff));
      const end = new Date(d.setDate(diff + 6));
      return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString(undefined, { dateStyle: 'medium' })}`;
    }
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
  };

  const openRescheduleModal = (appt: Appointment) => {
    setRescheduleAppt(appt);
    setNewDate(appt.dateTime.split('T')[0]);
    setNewTime(appt.dateTime.split('T')[1].slice(0, 5));
    setNewNotes(appt.notes || '');
    setNewDentistId(appt.dentistId || '');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title + Book Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-red-805" />
            <span>Clinic Scheduler Board</span>
          </h2>
          <p className="text-xs text-slate-400 font-semibold mt-1">
            Book slots, check-in waiting patients, and move daily schedules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsBookOpen(true)}
            className="h-11 bg-red-800 hover:bg-red-950 text-white font-bold rounded-xl shadow-md gap-1.5 text-xs px-5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Book Appointment Slot</span>
            <span className="sm:hidden">Book</span>
          </Button>
        </div>
      </div>

      {/* Control Ribbon */}
      <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden p-4">
        <CardContent className="p-0 flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Day / Week / Month tab selections */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-500 gap-1 w-full md:w-fit select-none shrink-0">
            <button
              onClick={() => setViewMode('DAY')}
              className={`px-4 py-2 rounded-lg transition ${
                viewMode === 'DAY' ? 'bg-white text-slate-805 shadow-sm' : 'hover:text-slate-700'
              }`}
            >
              Day List
            </button>
            <button
              onClick={() => setViewMode('WEEK')}
              className={`px-4 py-2 rounded-lg transition ${
                viewMode === 'WEEK' ? 'bg-white text-slate-805 shadow-sm' : 'hover:text-slate-700'
              }`}
            >
              Week View
            </button>
            <button
              onClick={() => setViewMode('MONTH')}
              className={`px-4 py-2 rounded-lg transition ${
                viewMode === 'MONTH' ? 'bg-white text-slate-805 shadow-sm' : 'hover:text-slate-700'
              }`}
            >
              Month View
            </button>
          </div>

          {/* Navigation Controls */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto justify-between md:justify-end mt-2 md:mt-0">
            <div className="flex flex-col items-center sm:items-end text-center sm:text-right order-1 sm:order-2">
              <h3 className="text-xs md:text-sm font-extrabold text-slate-800 shrink-0 select-none">
                {formatHeaderLabel()}
              </h3>
              <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-md mt-0.5">
                {displayedAppts.length} {displayedAppts.length === 1 ? 'Appointment' : 'Appointments'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 order-2 sm:order-1 justify-center w-full sm:w-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleNavigateDate('PREV')}
                className="h-9 w-9 p-0 rounded-xl border border-slate-200"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                className="h-9 rounded-xl border border-slate-200 text-xs font-bold px-3.5 hidden sm:block"
                title="Go to Today"
              >
                Today
              </Button>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-9 rounded-xl border-slate-200 text-xs font-bold px-3 bg-white text-slate-700 hover:bg-slate-50 justify-start text-left shrink-0"
                  >
                    <Calendar className="mr-2 h-3.5 w-3.5 text-slate-400" />
                    {selectedDate ? format(parseISO(selectedDate), "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-2xl border-slate-200 shadow-md" align="center">
                  <CalendarComponent
                    mode="single"
                    selected={parseISO(selectedDate)}
                    onSelect={(date) => {
                      if (date) {
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        setSelectedDate(`${year}-${month}-${day}`);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleNavigateDate('NEXT')}
                className="h-9 w-9 p-0 rounded-xl border border-slate-200"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Slots schedule cards list */}
      <div className="space-y-4">
        {displayedAppts.length > 0 ? (
          displayedAppts.map((appt) => {
            const time = new Date(appt.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const date = new Date(appt.dateTime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
            
            // Check if the current user is an 'Other Dentist' looking at someone else's appointment
            const isOtherDentistViewingForeignAppt = user?.role === 'Other Dentist' && appt.dentistId !== user?.id;

            return (
              <Card 
                key={appt.id}
                className={`border-l-4 shadow-sm bg-white rounded-2xl overflow-hidden p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-200 hover:shadow-md ${
                  STATUS_COLORS[appt.status] || 'border-slate-200 bg-white text-slate-805'
                }`}
              >
                {/* Details info */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-705 text-xs shrink-0 select-none">
                    <Clock className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="space-y-0.5 text-xs">
                    <div className="flex items-center flex-wrap gap-2">
                      <h4 className="font-black text-sm text-slate-900 leading-snug">
                        {isOtherDentistViewingForeignAppt ? "Busy / Reserved Slot" : appt.patientName}
                      </h4>
                      {!isOtherDentistViewingForeignAppt && (
                        <span className="text-[10px] text-slate-400 font-semibold">{appt.reason}</span>
                      )}
                    </div>
                    <p className="font-bold text-slate-800">
                      {time} {viewMode !== 'DAY' && <span className="text-slate-455">({date})</span>}
                    </p>
                    <p className="text-slate-500 font-semibold leading-normal">
                      Doctor: {appt.dentistName} {!isOtherDentistViewingForeignAppt && appt.notes && `• Note: "${appt.notes}"`}
                    </p>
                  </div>
                </div>

                {/* Operations check-ins */}
                <div className="flex items-center gap-2 flex-wrap md:justify-end select-none">
                  {/* Status Pills */}
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 border rounded-lg bg-white shrink-0 shadow-sm mr-2 select-none">
                    {appt.status}
                  </span>

                  {/* Actions shortcuts */}
                  {/* Actions shortcuts */}
                  {!isOtherDentistViewingForeignAppt && (user?.role === 'Dentist' || user?.role === 'Other Dentist') && appt.status !== 'Cancelled' && appt.status !== 'Completed' && (
                    <Button
                      size="sm"
                      onClick={() => navigate(`/${user?.role === 'Other Dentist' ? 'other-dentist' : 'dentist'}/visit/${appt.patientId}?appointmentId=${appt.id}`)}
                      className="h-8.5 rounded-lg text-[10px] font-bold bg-red-600 hover:bg-red-700 text-white gap-1.5 shadow"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Start Visit</span>
                    </Button>
                  )}

                  {!isOtherDentistViewingForeignAppt && (appt.status as string) !== 'Completed' && (appt.status as string) !== 'Cancelled' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openRescheduleModal(appt)}
                      className="h-8.5 rounded-lg text-[10px] font-bold border border-slate-200 hover:bg-slate-50 text-slate-705 bg-white shrink-0"
                    >
                      <Settings2 className="w-3.5 h-3.5 mr-1" />
                      <span>Edit</span>
                    </Button>
                  )}

                  {!isOtherDentistViewingForeignAppt && (appt.status as string) !== 'Cancelled' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setCancelAppt(appt)}
                      className="h-8.5 w-8.5 rounded-lg text-slate-400 hover:text-rose-700 hover:bg-rose-50 p-0 shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </Card>
            );
          })
        ) : (
          <Card className="border-none shadow-sm bg-white rounded-2xl p-12 text-center text-xs">
            <Calendar className="w-10 h-10 text-slate-205 mx-auto mb-3" />
            <p className="font-bold text-slate-400 italic">No scheduled appointments logged in this period.</p>
          </Card>
        )}
      </div>

      {/* -------------------------------------------------------------
          APPOINTMENT BOOKING MODAL
      ------------------------------------------------------------- */}
      {isBookOpen && (
        <BookingModal
          isOpen={isBookOpen}
          onClose={() => setIsBookOpen(false)}
          onSuccess={() => loadAppointments()}
        />
      )}

      {/* -------------------------------------------------------------
          RESCHEDULE/MOVE MODAL
      ------------------------------------------------------------- */}
      {rescheduleAppt && (
        <Dialog open={!!rescheduleAppt} onOpenChange={(open: boolean) => !open && setRescheduleAppt(null)}>
          <DialogContent className="max-w-md rounded-2xl p-6 bg-white border-slate-205">
            <form onSubmit={handleRescheduleSubmit} className="space-y-4">
              <DialogHeader className="space-y-1">
                <DialogTitle className="text-base font-black text-slate-900">Edit Appointment</DialogTitle>
                <DialogDescription className="text-xs text-slate-500 font-semibold">
                  Change date, timing slots, or doctor for {rescheduleAppt.patientName}.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2 text-xs">
                {/* Date */}
                <div className="space-y-1">
                  <Label className="text-xs font-extrabold text-slate-500">New Schedule Date *</Label>
                  <Input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="h-10 rounded-xl border-slate-200"
                    required
                  />
                </div>

                {/* Time */}
                <div className="space-y-1">
                  <Label className="text-xs font-extrabold text-slate-500">New Time Slot *</Label>
                  <Input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="h-10 rounded-xl border-slate-200"
                    required
                  />
                </div>

                {/* Dentist Selection */}
                <div className="space-y-1">
                  <Label className="text-xs font-extrabold text-slate-500">Attending Doctor *</Label>
                  <select
                    value={newDentistId}
                    onChange={(e) => setNewDentistId(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 bg-white text-xs font-semibold"
                    required
                  >
                    <option value="" disabled>Select a doctor</option>
                    {dentists.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                {/* Notes */}
                <div className="space-y-1">
                  <Label className="text-xs font-extrabold text-slate-500">Reschedule Reason (Optional)</Label>
                  <Input
                    placeholder="e.g. Patient requested morning slot"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    className="h-10 rounded-xl border-slate-200"
                  />
                </div>
              </div>

              <DialogFooter className="flex gap-2 justify-end mt-4 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setRescheduleAppt(null)}
                  className="h-10 rounded-xl border border-slate-250 font-bold text-xs text-slate-655"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="h-10 rounded-xl bg-red-800 hover:bg-red-950 text-white font-bold text-xs px-4"
                >
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* -------------------------------------------------------------
          CANCEL APPOINTMENT CONFIRMATION
      ------------------------------------------------------------- */}
      {cancelAppt && (
        <Dialog open={!!cancelAppt} onOpenChange={(open: boolean) => !open && setCancelAppt(null)}>
          <DialogContent className="max-w-md rounded-2xl p-6 bg-white border-slate-205">
            <DialogHeader className="space-y-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center border bg-rose-50 border-rose-150 text-rose-800 shadow-sm">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <DialogTitle className="text-base font-black text-slate-900 leading-snug">
                  Cancel Patient Appointment?
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 font-semibold leading-relaxed mt-1">
                  Are you sure you want to cancel the scheduled slot for {cancelAppt.patientName} on {new Date(cancelAppt.dateTime).toLocaleDateString()}?
                </DialogDescription>
              </div>
            </DialogHeader>
            <DialogFooter className="flex gap-2 justify-end mt-5">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCancelAppt(null)}
                className="h-10 rounded-xl border border-slate-250 font-bold text-xs text-slate-655"
              >
                No, Keep Booked
              </Button>
              <Button
                type="button"
                onClick={handleCancelSubmit}
                className="h-10 rounded-xl bg-rose-800 hover:bg-rose-950 text-white font-bold text-xs px-4"
              >
                Yes, Cancel Appointment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ReceptionCalendar;

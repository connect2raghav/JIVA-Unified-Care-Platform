import React, { useState } from 'react';
import { usePatientStore } from '../../../../store/usePatientStore';
import { useAuthStore } from '../../../../store/useAuthStore';
import { useNotificationStore } from '../../../../store/useNotificationStore';
import { receptionService } from '../../../../services/receptionService';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { CalendarDays, AlertCircle, CheckCircle2, User, PlusCircle, Trash2, CheckCircle, Sparkles } from 'lucide-react';
import type { FollowUp } from '../../../../types';

export const FollowUpsTab: React.FC = () => {
  const { selectedPatient, followUps, addFollowUp, updateFollowUpStatus, deleteFollowUp } = usePatientStore();
  const { user } = useAuthStore();
  const { addToast } = useNotificationStore();

  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [specialtyType, setSpecialtyType] = useState<'Scaling' | 'Implant' | 'Orthodontic' | 'Root Canal' | 'Other'>('Other');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!selectedPatient) return null;

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || !dueDate) {
      addToast({ type: 'warning', title: 'Fields Missing', message: 'Provide a target date and reason for the recall.' });
      return;
    }

    setIsSubmitting(true);
    const res = await receptionService.scheduleFollowUp({
      patientId: selectedPatient.id,
      dentistId: user?.id || 'dentist-1',
      dentistName: user?.name || 'Dr. Prasad Patil',
      dueDate,
      reason,
      status: 'Pending',
      specialtyType
    });

    setIsSubmitting(false);
    if (res.success && res.data) {
      addFollowUp(res.data);
      addToast({
        type: 'success',
        title: 'Recall Scheduled',
        message: 'Recall follow-up has been catalogued.'
      });
      setReason('');
      setDueDate('');
      setSpecialtyType('Other');
      setIsScheduleOpen(false);
    } else {
      addToast({ type: 'error', title: 'Failed to Schedule', message: res.error || 'Server error' });
    }
  };

  const handleToggleStatus = async (fu: FollowUp) => {
    const nextStatus = fu.status === 'Completed' ? 'Pending' : 'Completed';
    const res = await receptionService.updateFollowUp(fu.id, { status: nextStatus });
    if (res.success) {
      updateFollowUpStatus(fu.id, nextStatus);
      addToast({
        type: 'success',
        title: 'Status Updated',
        message: `Recall status marked as ${nextStatus}.`
      });
    } else {
      addToast({ type: 'error', title: 'Update Failed', message: res.error || 'Server error' });
    }
  };

  const handleDeleteSubmit = async (id: string) => {
    const res = await receptionService.deleteFollowUp(id);
    if (res.success) {
      deleteFollowUp(id);
      addToast({
        type: 'success',
        title: 'Recall Deleted',
        message: 'Successfully removed recall follow-up.'
      });
    } else {
      addToast({ type: 'error', title: 'Delete Failed', message: res.error || 'Server error' });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 border border-amber-200 text-amber-900 select-none">
            <AlertCircle className="w-3 h-3" />
            <span>Recall Pending</span>
          </span>
        );
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 border border-emerald-100 text-emerald-800 select-none">
            <CheckCircle2 className="w-3 h-3" />
            <span>Completed</span>
          </span>
        );
      case 'Overdue':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-red-50 border border-red-200 text-red-800 animate-pulse select-none">
            <AlertCircle className="w-3 h-3" />
            <span>OVERDUE</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
      <CardContent className="p-6">
        {/* Header and Add Button */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-red-850" />
              <span>Recall & Prevention Follow-ups</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
              Configure patient recall schedules, preventions tracking, and dental hygiene visits.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-slate-455 select-none">Total Log: {followUps.length} Actions</span>
            <Button
              onClick={() => setIsScheduleOpen(true)}
              className="h-9.5 bg-red-800 hover:bg-red-955 text-white font-bold rounded-xl shadow-sm gap-1.5 text-xs px-4"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Schedule Recall</span>
            </Button>
          </div>
        </div>

        {followUps.length > 0 ? (
          <div className="space-y-4">
            {followUps.map((fu) => (
              <div 
                key={fu.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/20 hover:bg-slate-50/50 transition gap-4"
              >
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-slate-800 leading-tight">
                    {fu.reason}
                    {fu.specialtyType && (
                      <span className="ml-2 px-1.5 py-0.5 rounded border border-slate-200 bg-white text-[9px] text-slate-500 font-bold uppercase">
                        {fu.specialtyType}
                      </span>
                    )}
                  </h4>
                  <div className="flex items-center gap-2.5 text-[10px] text-slate-400 font-bold">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      Assigned: {fu.dentistName}
                    </span>
                    <span>•</span>
                    <span className={new Date(fu.dueDate) < new Date() && fu.status !== 'Completed' ? 'text-red-600' : ''}>
                      Target Recall Date: {new Date(fu.dueDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-3">
                  {new Date(fu.dueDate) < new Date() && fu.status === 'Pending' ? getStatusBadge('Overdue') : getStatusBadge(fu.status)}

                  {/* Complete Checkbox Toggle */}
                  <button
                    onClick={() => handleToggleStatus(fu)}
                    className={`p-1.5 rounded-lg border transition ${fu.status === 'Completed' ? 'bg-emerald-50 border-emerald-100 text-emerald-800 hover:bg-slate-100' : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-emerald-705'}`}
                    title={fu.status === 'Completed' ? 'Re-open Recall Task' : 'Mark Recall as Completed'}
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={() => handleDeleteSubmit(fu.id)}
                    className="p-1.5 rounded-lg border bg-slate-50 border-slate-200 text-slate-405 hover:text-rose-700 hover:bg-rose-50 transition"
                    title="Delete Recall"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-xs font-semibold text-slate-400">No active recall requirements mapped.</p>
          </div>
        )}
      </CardContent>

      {/* SCHEDULE RECALL DIALOG */}
      {isScheduleOpen && (
        <Dialog open={isScheduleOpen} onOpenChange={(open: boolean) => !open && setIsScheduleOpen(false)}>
          <DialogContent className="max-w-md rounded-2xl p-6 bg-white border-slate-205">
            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              <DialogHeader className="space-y-1">
                <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-red-808 shrink-0" />
                  <span>Schedule Prevention Recall</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-550 font-semibold leading-normal">
                  Configure target date and purpose for patient dental hygiene follow-up.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2 text-xs">
                {/* Due Date */}
                <div className="space-y-1">
                  <Label className="text-xs font-extrabold text-slate-500">Target Date *</Label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="h-10 rounded-xl"
                    required
                  />
                </div>

                {/* Specialty Type */}
                <div className="space-y-1">
                  <Label className="text-xs font-extrabold text-slate-500">Specialty Type</Label>
                  <select
                    value={specialtyType}
                    onChange={(e) => setSpecialtyType(e.target.value as any)}
                    className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="Scaling">Scaling / Hygiene</option>
                    <option value="Implant">Implant Maintenance</option>
                    <option value="Orthodontic">Orthodontic Adjustment</option>
                    <option value="Root Canal">Root Canal Follow-up</option>
                    <option value="Other">Other / General</option>
                  </select>
                </div>

                {/* Reason */}
                <div className="space-y-1">
                  <Label className="text-xs font-extrabold text-slate-500">Recall Purpose *</Label>
                  <Input
                    placeholder="e.g. 6-Month Routine Scale & Cleaning"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="h-10 rounded-xl"
                    required
                  />
                </div>
              </div>

              <DialogFooter className="flex gap-2 justify-end mt-4 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsScheduleOpen(false)}
                  className="h-10 rounded-xl border border-slate-250 font-bold text-xs text-slate-655"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-10 rounded-xl bg-red-800 hover:bg-red-955 text-white font-bold text-xs px-4"
                >
                  {isSubmitting ? 'Scheduling...' : 'Schedule Recall'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
};

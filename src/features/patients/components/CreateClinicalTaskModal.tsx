import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePatientStore } from '@/store/usePatientStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useAuthStore } from '@/store/useAuthStore';
import { taskService } from '@/services/taskService';


interface CreateClinicalTaskModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateClinicalTaskModal: React.FC<CreateClinicalTaskModalProps> = ({ open, onClose, onSuccess }) => {
  const { user } = useAuthStore();
  const { patientsList } = usePatientStore();
  const { addToast } = useNotificationStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Emergency'>('Medium');
  const [patientId, setPatientId] = useState<string>('none');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when opened
  useEffect(() => {
    if (open) {
      setTitle('');
      setDescription('');
      setPriority('Medium');
      setPatientId('none');
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      addToast({ type: 'error', title: 'Error', message: 'Task title is required.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedPatient = patientsList.find(p => p.id === patientId);

      const res = await taskService.createTask({
        title,
        description,
        patientId: patientId === 'none' ? undefined : patientId,
        patientName: selectedPatient?.name,
        doctorId: user?.id || 'doctor-1',
        doctorName: user?.name || 'Doctor',
        priority,
        dueTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        status: 'Pending',
        estimatedDuration: '15 mins',
        createdBy: user?.id || 'doctor-1',
        createdByName: user?.name || 'Doctor',
      } as any);

      if (res.success) {
        addToast({ type: 'success', title: 'Task Created', message: 'Task assigned successfully.' });
        onSuccess();
        onClose();
      } else {
        addToast({ type: 'error', title: 'Error', message: res.error || 'Failed to create task.' });
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: 'Unexpected error.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-md bg-white rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-black text-slate-900">Assign New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          
          <div className="space-y-2">
            <Label className="text-xs font-extrabold text-slate-500">Related Patient (Optional)</Label>
            <Select value={patientId} onValueChange={setPatientId}>
              <SelectTrigger className="w-full h-11 rounded-xl text-xs font-semibold bg-white border-slate-200">
                <SelectValue placeholder="Select patient..." />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                <SelectItem value="none" className="text-xs font-semibold italic text-slate-500">No specific patient (General task)</SelectItem>
                {patientsList.map(p => (
                  <SelectItem key={p.id} value={p.id} className="text-xs font-semibold">{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-extrabold text-slate-500">Task Title</Label>
            <Input 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              placeholder="e.g. Prepare extraction kit"
              className="h-11 rounded-xl text-xs font-semibold"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-extrabold text-slate-500">Instructions / Notes</Label>
            <Input 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              placeholder="Any specific details..."
              className="h-11 rounded-xl text-xs font-semibold"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-extrabold text-slate-500">Priority</Label>
            <Select value={priority} onValueChange={(val: any) => setPriority(val)}>
              <SelectTrigger className="w-full h-11 rounded-xl text-xs font-semibold bg-white border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Low" className="text-xs font-semibold">Low</SelectItem>
                <SelectItem value="Medium" className="text-xs font-semibold">Medium</SelectItem>
                <SelectItem value="High" className="text-xs font-semibold text-red-600">High</SelectItem>
                <SelectItem value="Emergency" className="text-xs font-black text-red-700">Emergency</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl h-11 text-xs font-bold w-full">Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="rounded-xl h-11 text-xs font-black w-full bg-slate-900 text-white hover:bg-slate-800">
              {isSubmitting ? 'Assigning...' : 'Assign Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

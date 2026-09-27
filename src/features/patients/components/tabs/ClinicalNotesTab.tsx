import React, { useState } from 'react';
import { usePatientStore } from '../../../../store/usePatientStore';
import { useAuthStore } from '../../../../store/useAuthStore';
import { useNotificationStore } from '../../../../store/useNotificationStore';
import { patientService } from '../../../../services/patientService';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { FileText, PlusCircle, User, Trash2 } from 'lucide-react';

export const ClinicalNotesTab: React.FC = () => {
  const { selectedPatient, clinicalNotes, addClinicalNote, deleteClinicalNote } = usePatientStore();
  const { user } = useAuthStore();
  const { addToast } = useNotificationStore();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [noteType, setNoteType] = useState<'Progress' | 'Surgical' | 'Periodontal'>('Progress');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getNoteBadgeStyle = (type: string) => {
    switch (type) {
      case 'Progress':
        return 'bg-blue-50 text-blue-805 border-blue-100';
      case 'Surgical':
        return 'bg-red-50 text-red-805 border-red-100';
      case 'Periodontal':
        return 'bg-emerald-50 text-emerald-805 border-emerald-100';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    if (!content.trim()) {
      addToast({ type: 'warning', title: 'Content Required', message: 'Please write some progress note text.' });
      return;
    }

    setIsSubmitting(true);
    const res = await patientService.createClinicalNote({
      patientId: selectedPatient.id,
      dateTime: new Date().toISOString(),
      doctorId: user?.id || 'doctor-1',
      doctorName: user?.name || 'Dr. Prasad Patil',
      noteType,
      content,
    });

    setIsSubmitting(false);
    if (res.success && res.data) {
      addClinicalNote(res.data);
      addToast({
        type: 'success',
        title: 'Note Logged',
        message: 'Progress note has been added to patient file.'
      });
      setContent('');
      setIsCreateOpen(false);
    } else {
      addToast({ type: 'error', title: 'Failed to Save', message: res.error || 'Server error' });
    }
  };

  const handleDeleteSubmit = async (id: string) => {
    const res = await patientService.deleteClinicalNote(id);
    if (res.success) {
      deleteClinicalNote(id);
      addToast({
        type: 'success',
        title: 'Note Deleted',
        message: 'Progress note has been removed from patient file.'
      });
    } else {
      addToast({ type: 'error', title: 'Delete Failed', message: res.error || 'Server error' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab controls */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-red-808" />
            <span>Clinical Progression Logs</span>
          </h3>
          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
            Document patient procedures, consultations, and surgical summaries.
          </p>
        </div>
        
        <button 
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-800 text-white font-bold text-xs shadow hover:bg-red-955 transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create Progress Note</span>
        </button>
      </div>

      {clinicalNotes.length > 0 ? (
        clinicalNotes.map((note) => {
          const date = new Date(note.dateTime);
          return (
            <Card key={note.id} className="border-none shadow-sm bg-white rounded-2xl overflow-hidden hover:shadow-md transition duration-200">
              <CardContent className="p-6">
                <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 mb-4 gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold border ${getNoteBadgeStyle(note.noteType)}`}>
                      {note.noteType} Note
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">
                      {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at{' '}
                      {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500 font-bold">
                    <div className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>Authored by: {note.doctorName}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteSubmit(note.id)}
                      className="text-slate-405 hover:text-rose-700 transition"
                      title="Delete Note"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed font-medium whitespace-pre-line bg-slate-50/20 p-4 rounded-xl border border-slate-100">
                  {note.content}
                </p>
              </CardContent>
            </Card>
          );
        })
      ) : (
        <Card className="border-none shadow-sm bg-white rounded-2xl">
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-xs font-semibold text-slate-400">No clinical notes recorded for this patient.</p>
          </CardContent>
        </Card>
      )}

      {/* CREATE CLINICAL NOTE DIALOG */}
      {isCreateOpen && (
        <Dialog open={isCreateOpen} onOpenChange={(open: boolean) => !open && setIsCreateOpen(false)}>
          <DialogContent className="max-w-md rounded-2xl p-6 bg-white border-slate-205">
            <form onSubmit={handleSaveNote} className="space-y-4">
              <DialogHeader className="space-y-1">
                <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-red-808 shrink-0" />
                  <span>Compose Progression Note</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-550 font-semibold leading-normal">
                  Write clinical observations, procedure outcomes, or post-operation comments.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2 text-xs">
                {/* Note Type */}
                <div className="space-y-1">
                  <Label className="text-xs font-extrabold text-slate-500">Note Type *</Label>
                  <select
                    className="w-full h-10 rounded-xl border border-slate-200 px-3 bg-white font-semibold text-slate-805"
                    value={noteType}
                    onChange={(e) => setNoteType(e.target.value as any)}
                  >
                    <option value="Progress">Progress Note</option>
                    <option value="Surgical">Surgical Note</option>
                    <option value="Periodontal">Periodontal Note</option>
                  </select>
                </div>

                {/* Content */}
                <div className="space-y-1">
                  <Label className="text-xs font-extrabold text-slate-500">Progression Content *</Label>
                  <textarea
                    placeholder="e.g. Conducted localized composite restoration on tooth #19. Inspected gingiva margins..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full min-h-[120px] p-3 rounded-xl border border-slate-200 outline-none text-xs font-semibold"
                    required
                  />
                </div>
              </div>

              <DialogFooter className="flex gap-2 justify-end mt-4 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsCreateOpen(false)}
                  className="h-10 rounded-xl border border-slate-250 font-bold text-xs text-slate-655"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-10 rounded-xl bg-red-800 hover:bg-red-950 text-white font-bold text-xs px-4"
                >
                  {isSubmitting ? 'Saving...' : 'Add Note'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { usePatientStore } from '../../../../store/usePatientStore';
import { useNotificationStore } from '../../../../store/useNotificationStore';
import { adminService } from '../../../../services/adminService';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { 
  ShieldAlert, 
  HeartHandshake, 
  ShieldCheck, 
  Activity, 
  Pencil, 
  Save, 
  AlertTriangle,
  Flame,
  Wine
} from 'lucide-react';

export const OverviewTab: React.FC = () => {
  const { selectedPatient, updatePatient } = usePatientStore();
  const { addToast } = useNotificationStore();

  const [isEditOpen, setIsEditOpen] = useState(false);

  // Form states initialized from patient context
  const [allergiesText, setAllergiesText] = useState(selectedPatient?.allergies?.join(', ') || '');
  const [medHistoryText, setMedHistoryText] = useState(selectedPatient?.medicalHistory?.join(', ') || '');
  const [bloodType, setBloodType] = useState(selectedPatient?.bloodType || 'O+');
  const [notes, setNotes] = useState(selectedPatient?.notes || '');
  
  // Emergency contact fields
  const [emergencyName, setEmergencyName] = useState(selectedPatient?.emergencyContact?.name || '');
  const [emergencyPhone, setEmergencyPhone] = useState(selectedPatient?.emergencyContact?.phone || '');
  const [emergencyRel, setEmergencyRel] = useState(selectedPatient?.emergencyContact?.relationship || '');

  // Add custom medications, dental history, habits, and insurance fields to localStorage cache
  const getExtendedFields = () => {
    if (!selectedPatient) return { medications: '', dentalHistory: '', smoking: 'No', alcohol: 'No', insurance: '' };
    const cached = localStorage.getItem(`dcip_patient_ext_${selectedPatient.id}`);
    if (cached) {
      try { return JSON.parse(cached); } catch {}
    }
    return {
      medications: 'Lisinopril 10mg daily',
      dentalHistory: 'Class I Composite restorations #3, #14. Extraction #18.',
      smoking: 'No',
      alcohol: 'Socially',
      insurance: 'Delta Dental Premier - Policy #DEL-9821'
    };
  };

  const [extFields, setExtFields] = useState(getExtendedFields());

  if (!selectedPatient) return null;

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const updatedPatient = {
      ...selectedPatient,
      bloodType,
      allergies: allergiesText ? allergiesText.split(',').map(a => a.trim()).filter(Boolean) : [],
      medicalHistory: medHistoryText ? medHistoryText.split(',').map(h => h.trim()).filter(Boolean) : [],
      notes,
      emergencyContact: {
        name: emergencyName,
        phone: emergencyPhone,
        relationship: emergencyRel
      }
    };

    // Save core patient updates
    updatePatient(updatedPatient);
    
    // Save to sandbox array
    const cachedPatients = localStorage.getItem('dcip_patients_sandbox');
    if (cachedPatients) {
      try {
        const list = JSON.parse(cachedPatients);
        const updatedList = list.map((p: any) => p.id === selectedPatient.id ? updatedPatient : p);
        localStorage.setItem('dcip_patients_sandbox', JSON.stringify(updatedList));
      } catch {}
    }

    // Save extended fields
    localStorage.setItem(`dcip_patient_ext_${selectedPatient.id}`, JSON.stringify(extFields));

    // Audit Log
    await adminService.logActivity(
      'Patient Profile Updated',
      `Modified clinical overview fields for ${selectedPatient.name}.`
    );

    addToast({
      type: 'success',
      title: 'Profile Updated',
      message: 'Successfully updated patient clinical history details.'
    });

    setIsEditOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Tab Header Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
        <div>
          <h3 className="text-lg font-black text-slate-900">Clinical Intake Summary</h3>
          <p className="text-xs text-slate-500 font-bold mt-1">
            Systemic health indicators, dental histories, allergies, and emergency details.
          </p>
        </div>

        <Button
          onClick={() => {
            // Re-read details
            setAllergiesText(selectedPatient.allergies?.join(', ') || '');
            setMedHistoryText(selectedPatient.medicalHistory?.join(', ') || '');
            setBloodType(selectedPatient.bloodType || 'O+');
            setNotes(selectedPatient.notes || '');
            setEmergencyName(selectedPatient.emergencyContact?.name || '');
            setEmergencyPhone(selectedPatient.emergencyContact?.phone || '');
            setEmergencyRel(selectedPatient.emergencyContact?.relationship || '');
            setExtFields(getExtendedFields());
            setIsEditOpen(true);
          }}
          className="h-10 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl shadow-sm gap-2 text-xs px-5 transition-all"
        >
          <Pencil className="w-4 h-4 text-slate-500" />
          <span>Edit Clinical Overview</span>
        </Button>
      </div>

      {/* Overview Layout 2-Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Column: Health & Dental */}
        <div className="space-y-6">
          <Card className="border border-slate-200 shadow-sm bg-white rounded-2xl overflow-hidden">
            <div className="bg-slate-50/50 px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center border border-red-100">
                <HeartHandshake className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-slate-900 text-base tracking-tight">Health & Medical</h4>
            </div>
            <div className="p-5 space-y-5">
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Systemic Conditions</span>
                <p className="font-semibold text-slate-800 text-sm">
                  {selectedPatient.medicalHistory && selectedPatient.medicalHistory.length > 0
                    ? selectedPatient.medicalHistory.join(', ')
                    : 'No chronic conditions reported.'}
                </p>
              </div>
              
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3 text-red-500" /> Allergies
                </span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {selectedPatient.allergies && selectedPatient.allergies.length > 0 ? (
                    selectedPatient.allergies.map(a => (
                      <span key={a} className="px-2.5 py-1 rounded-lg bg-red-50 text-red-700 text-xs font-bold border border-red-200 uppercase">
                        {a}
                      </span>
                    ))
                  ) : (
                    <span className="font-semibold text-slate-600 text-sm">No allergies reported.</span>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Active Medications</span>
                <p className="font-semibold text-slate-800 text-sm leading-relaxed">
                  {extFields.medications || 'No medications listed.'}
                </p>
              </div>
            </div>
          </Card>

          <Card className="border border-slate-200 shadow-sm bg-white rounded-2xl overflow-hidden">
            <div className="bg-slate-50/50 px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <Activity className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-slate-900 text-base tracking-tight">Dental History</h4>
            </div>
            <div className="p-5">
              <p className="font-semibold text-slate-800 text-sm leading-relaxed">
                {extFields.dentalHistory || 'No previous dental operation logs.'}
              </p>
            </div>
          </Card>
        </div>

        {/* Right Column: Social, Insurance, Emergency */}
        <div className="space-y-6">
          <Card className="border border-slate-200 shadow-sm bg-white rounded-2xl overflow-hidden">
            <div className="bg-slate-50/50 px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-slate-900 text-base tracking-tight">Lifestyle & Insurance</h4>
            </div>
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-orange-500" /> Smoking
                  </span>
                  <p className="font-semibold text-slate-800 text-sm">{extFields.smoking || 'No'}</p>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider flex items-center gap-1.5">
                    <Wine className="w-3.5 h-3.5 text-blue-500" /> Alcohol
                  </span>
                  <p className="font-semibold text-slate-800 text-sm">{extFields.alcohol || 'No'}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100 space-y-1.5">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Insurance Details</span>
                <p className="font-semibold text-slate-800 text-sm">
                  {extFields.insurance || 'No active dental insurance policy registered.'}
                </p>
              </div>
            </div>
          </Card>

          <Card className="border border-slate-200 shadow-sm bg-white rounded-2xl overflow-hidden">
            <div className="bg-slate-50/50 px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-slate-900 text-base tracking-tight">Emergency Contacts & Remarks</h4>
            </div>
            <div className="p-5 space-y-5">
              {selectedPatient.emergencyContact && selectedPatient.emergencyContact.name ? (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{selectedPatient.emergencyContact.name}</p>
                      <p className="text-slate-500 text-xs font-semibold mt-0.5">{selectedPatient.emergencyContact.relationship}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-extrabold text-slate-800 text-sm">{selectedPatient.emergencyContact.phone}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 font-semibold text-sm">No emergency contact details registered.</p>
              )}

              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Clinical Remarks</span>
                <p className="font-semibold text-slate-800 text-sm p-4 bg-yellow-50/60 rounded-xl border border-yellow-100/60 leading-relaxed">
                  {selectedPatient.notes || 'No general intake annotations.'}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* -------------------------------------------------------------
          EDIT CLINICAL OVERVIEW MODAL
      ------------------------------------------------------------- */}
      {isEditOpen && (
        <Dialog open={isEditOpen} onOpenChange={(open: boolean) => !open && setIsEditOpen(false)}>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 bg-white border-slate-205 md:p-8">
            <form onSubmit={handleEditSubmit} className="space-y-5">
              <DialogHeader className="space-y-1">
                <DialogTitle className="text-base md:text-lg font-black text-slate-900 leading-snug flex items-center gap-2">
                  <Activity className="w-5.5 h-5.5 text-red-808 shrink-0" />
                  <span>Edit Clinical Intake Information</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 font-semibold">
                  Update systemic illnesses, allergist notices, social habit indicators, and policy insurances.
                </DialogDescription>
              </DialogHeader>

              {/* Grid Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Blood Type */}
                <div className="space-y-1">
                  <Label className="text-xs font-extrabold text-slate-500">Blood Group *</Label>
                  <select
                    className="w-full h-10 rounded-xl border border-slate-200 px-3 bg-white font-semibold text-slate-805"
                    value={bloodType}
                    onChange={(e) => setBloodType(e.target.value)}
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>

                {/* Insurance policy */}
                <div className="space-y-1">
                  <Label className="text-xs font-extrabold text-slate-500">Insurance Carrier & Policy</Label>
                  <Input
                    value={extFields.insurance}
                    onChange={(e) => setExtFields({ ...extFields, insurance: e.target.value })}
                    className="h-10 rounded-xl border-slate-200"
                  />
                </div>

                {/* Allergies list */}
                <div className="space-y-1">
                  <Label className="text-xs font-extrabold text-slate-500">Allergies (Comma separated)</Label>
                  <Input
                    value={allergiesText}
                    onChange={(e) => setAllergiesText(e.target.value)}
                    className="h-10 rounded-xl border-slate-200"
                  />
                </div>

                {/* Systemic warnings */}
                <div className="space-y-1">
                  <Label className="text-xs font-extrabold text-slate-500">Medical Alerts (Comma separated)</Label>
                  <Input
                    value={medHistoryText}
                    onChange={(e) => setMedHistoryText(e.target.value)}
                    className="h-10 rounded-xl border-slate-200"
                  />
                </div>

                {/* Medications list */}
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs font-extrabold text-slate-500">Active Medications List</Label>
                  <Input
                    value={extFields.medications}
                    onChange={(e) => setExtFields({ ...extFields, medications: e.target.value })}
                    className="h-10 rounded-xl border-slate-200"
                  />
                </div>

                {/* Dental notes */}
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs font-extrabold text-slate-500">Dental History Notes</Label>
                  <Input
                    value={extFields.dentalHistory}
                    onChange={(e) => setExtFields({ ...extFields, dentalHistory: e.target.value })}
                    className="h-10 rounded-xl border-slate-200"
                  />
                </div>

                {/* Habits */}
                <div className="space-y-1">
                  <Label className="text-xs font-extrabold text-slate-500">Smoking</Label>
                  <select
                    className="w-full h-10 rounded-xl border border-slate-200 px-3 bg-white font-semibold text-slate-805"
                    value={extFields.smoking}
                    onChange={(e) => setExtFields({ ...extFields, smoking: e.target.value })}
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                    <option value="Occasionally">Occasionally</option>
                    <option value="Heavy Smoker">Heavy Smoker</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-extrabold text-slate-500">Alcohol Intake</Label>
                  <select
                    className="w-full h-10 rounded-xl border border-slate-200 px-3 bg-white font-semibold text-slate-805"
                    value={extFields.alcohol}
                    onChange={(e) => setExtFields({ ...extFields, alcohol: e.target.value })}
                  >
                    <option value="No">No</option>
                    <option value="Socially">Socially</option>
                    <option value="Frequently">Frequently</option>
                  </select>
                </div>

                {/* Emergency Details */}
                <div className="space-y-1">
                  <Label className="text-xs font-extrabold text-slate-500">Emergency Contact Name</Label>
                  <Input
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                    className="h-10 rounded-xl border-slate-200"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-extrabold text-slate-500">Relationship</Label>
                    <Input
                      value={emergencyRel}
                      onChange={(e) => setEmergencyRel(e.target.value)}
                      className="h-10 rounded-xl border-slate-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-extrabold text-slate-500">Contact Phone</Label>
                    <Input
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value)}
                      className="h-10 rounded-xl border-slate-200"
                    />
                  </div>
                </div>

                {/* Summary notes */}
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs font-extrabold text-slate-500">Clinical Intake Summary Remarks</Label>
                  <Input
                    placeholder="e.g. Needs dental implant assessment next week."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="h-10 rounded-xl border-slate-200"
                  />
                </div>
              </div>

              <DialogFooter className="flex gap-2 justify-end mt-4 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsEditOpen(false)}
                  className="h-10 rounded-xl border border-slate-250 font-bold text-xs text-slate-655"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="h-10 rounded-xl bg-red-800 hover:bg-red-950 text-white font-bold text-xs px-5 shadow"
                >
                  <div className="flex items-center gap-1.5">
                    <Save className="w-4 h-4" />
                    <span>Save Intake Details</span>
                  </div>
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default OverviewTab;

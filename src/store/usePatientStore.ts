import { create } from 'zustand';
import type { Patient, Appointment, Visit, ClinicalNote, TreatmentPlan, ImageRecord, TimelineEvent, FollowUp } from '../types';
import { patientService } from '../services/patientService';

interface PatientState {
  selectedPatient: Patient | null;
  activeTab: string;
  patientsList: Patient[];
  appointments: Appointment[];
  visits: Visit[];
  clinicalNotes: ClinicalNote[];
  treatmentPlans: TreatmentPlan[];
  images: ImageRecord[];
  followUps: FollowUp[];
  timeline: TimelineEvent[];
  isLoading: boolean;
  
  selectPatient: (patientId: string) => Promise<void>;
  clearSelectedPatient: () => void;
  setActiveTab: (tab: string) => void;
  loadAllPatients: () => Promise<void>;
  updatePatient: (patient: Patient) => void;
  addClinicalNote: (note: ClinicalNote) => void;
  deleteClinicalNote: (id: string) => void;
  addTreatmentPlan: (plan: TreatmentPlan) => void;
  updateTreatmentPlan: (id: string, updates: Partial<TreatmentPlan>) => void;
  deleteTreatmentPlan: (id: string) => void;
  addProcedureToPlan: (planId: string, item: any) => void;
  updateProcedureInPlan: (planId: string, itemId: string, updates: any) => void;
  deleteProcedureFromPlan: (planId: string, itemId: string) => void;
  addVisitLogToProcedure: (planId: string, itemId: string, visitLog: any) => void;
  updateProcedureOutcome: (planId: string, itemId: string, outcome: any) => void;
  addFollowUpToProcedure: (planId: string, itemId: string, followUp: any) => void;
  addImageRecord: (image: ImageRecord) => void;
  updateImageRecord: (id: string, updates: Partial<ImageRecord>) => void;
  deleteImageRecord: (id: string) => void;
  addFollowUp: (follow: FollowUp) => void;
  updateFollowUpStatus: (id: string, status: 'Pending' | 'Completed' | 'Overdue') => void;
  deleteFollowUp: (id: string) => void;
}

export const usePatientStore = create<PatientState>((set) => ({
  selectedPatient: null,
  activeTab: 'overview',
  patientsList: [],
  appointments: [],
  visits: [],
  clinicalNotes: [],
  treatmentPlans: [],
  images: [],
  followUps: [],
  timeline: [],
  isLoading: false,

  selectPatient: async (patientId: string) => {
    set({ isLoading: true });
    try {
      const patient = await patientService.getPatientById(patientId);
      if (!patient) {
        set({ selectedPatient: null, isLoading: false });
        return;
      }

      // Fetch all patient-related clinical intelligence records
      const [appts, visits, notes, plans, imgs, followUps, timeline] = await Promise.all([
        patientService.getAppointments(patientId),
        patientService.getVisits(patientId),
        patientService.getClinicalNotes(patientId),
        patientService.getTreatmentPlans(patientId),
        patientService.getImages(patientId),
        patientService.getFollowUps(patientId),
        patientService.getTimeline(patientId),
      ]);

      set({
        selectedPatient: patient,
        appointments: appts,
        visits,
        clinicalNotes: notes,
        treatmentPlans: plans,
        images: imgs,
        followUps,
        timeline,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to select patient context:', error);
      set({ isLoading: false });
    }
  },

  clearSelectedPatient: () => {
    set({
      selectedPatient: null,
      appointments: [],
      visits: [],
      clinicalNotes: [],
      treatmentPlans: [],
      images: [],
      followUps: [],
      timeline: [],
      activeTab: 'overview',
    });
  },

  setActiveTab: (tab: string) => {
    set({ activeTab: tab });
  },

  loadAllPatients: async () => {
    set({ isLoading: true });
    try {
      const patients = await patientService.getPatients();
      set({ patientsList: patients, isLoading: false });
    } catch (error) {
      console.error('Failed to load patient index:', error);
      set({ isLoading: false });
    }
  },

  updatePatient: (patient: Patient) => {
    set((state) => ({
      selectedPatient: state.selectedPatient?.id === patient.id ? patient : state.selectedPatient,
      patientsList: state.patientsList.map((p) => p.id === patient.id ? patient : p),
    }));
  },

  addClinicalNote: (note: ClinicalNote) => {
    set((state) => {
      const updatedNotes = [note, ...state.clinicalNotes];
      const updatedState = { ...state, clinicalNotes: updatedNotes };
      return {
        clinicalNotes: updatedNotes,
        timeline: generateTimelineFromState(updatedState)
      };
    });
  },

  deleteClinicalNote: (id: string) => {
    set((state) => {
      const updatedNotes = state.clinicalNotes.filter(n => n.id !== id);
      const updatedState = { ...state, clinicalNotes: updatedNotes };
      return {
        clinicalNotes: updatedNotes,
        timeline: generateTimelineFromState(updatedState)
      };
    });
  },

  addTreatmentPlan: (plan: TreatmentPlan) => {
    set((state) => {
      const updatedPlans = [plan, ...state.treatmentPlans];
      const updatedState = { ...state, treatmentPlans: updatedPlans };
      return {
        treatmentPlans: updatedPlans,
        timeline: generateTimelineFromState(updatedState)
      };
    });
  },

  updateTreatmentPlan: (id: string, updates: Partial<TreatmentPlan>) => {
    set((state) => {
      const updatedPlans = state.treatmentPlans.map(p => p.id === id ? { ...p, ...updates } : p);
      const updatedState = { ...state, treatmentPlans: updatedPlans };
      return {
        treatmentPlans: updatedPlans,
        timeline: generateTimelineFromState(updatedState)
      };
    });
  },

  deleteTreatmentPlan: (id: string) => {
    set((state) => {
      const updatedPlans = state.treatmentPlans.filter(p => p.id !== id);
      const updatedState = { ...state, treatmentPlans: updatedPlans };
      return {
        treatmentPlans: updatedPlans,
        timeline: generateTimelineFromState(updatedState)
      };
    });
  },

  addProcedureToPlan: (planId: string, item: any) => {
    set((state) => {
      const updatedPlans = state.treatmentPlans.map((p) => {
        if (p.id !== planId) return p;
        const items = [...(p.items || []), item];
        const totalCost = items.reduce((sum, it) => sum + Number(it.cost || 0), 0);
        return { ...p, items, totalCost };
      });
      const updatedState = { ...state, treatmentPlans: updatedPlans };
      return {
        treatmentPlans: updatedPlans,
        timeline: generateTimelineFromState(updatedState)
      };
    });
  },

  updateProcedureInPlan: (planId: string, itemId: string, updates: any) => {
    set((state) => {
      const updatedPlans = state.treatmentPlans.map((p) => {
        if (p.id !== planId) return p;
        const items = (p.items || []).map(it => it.id === itemId ? { ...it, ...updates } : it);
        const totalCost = items.reduce((sum, it) => sum + Number(it.cost || 0), 0);
        return { ...p, items, totalCost };
      });
      const updatedState = { ...state, treatmentPlans: updatedPlans };
      return {
        treatmentPlans: updatedPlans,
        timeline: generateTimelineFromState(updatedState)
      };
    });
  },

  deleteProcedureFromPlan: (planId: string, itemId: string) => {
    set((state) => {
      const updatedPlans = state.treatmentPlans.map((p) => {
        if (p.id !== planId) return p;
        const items = (p.items || []).filter(it => it.id !== itemId);
        const totalCost = items.reduce((sum, it) => sum + Number(it.cost || 0), 0);
        return { ...p, items, totalCost };
      });
      const updatedState = { ...state, treatmentPlans: updatedPlans };
      return {
        treatmentPlans: updatedPlans,
        timeline: generateTimelineFromState(updatedState)
      };
    });
  },

  addVisitLogToProcedure: (planId: string, itemId: string, visitLog: any) => {
    set((state) => {
      const updatedPlans = state.treatmentPlans.map((p) => {
        if (p.id !== planId) return p;
        const items = (p.items || []).map((it) => {
          if (it.id !== itemId) return it;
          return { ...it, visits: [...(it.visits || []), visitLog] };
        });
        return { ...p, items };
      });
      const updatedState = { ...state, treatmentPlans: updatedPlans };
      return {
        treatmentPlans: updatedPlans,
        timeline: generateTimelineFromState(updatedState)
      };
    });
  },

  updateProcedureOutcome: (planId: string, itemId: string, outcome: any) => {
    set((state) => {
      const updatedPlans = state.treatmentPlans.map((p) => {
        if (p.id !== planId) return p;
        const items = (p.items || []).map((it) => {
          if (it.id !== itemId) return it;
          return { ...it, outcome, status: 'Completed' as const };
        });
        return { ...p, items };
      });
      const updatedState = { ...state, treatmentPlans: updatedPlans };
      return {
        treatmentPlans: updatedPlans,
        timeline: generateTimelineFromState(updatedState)
      };
    });
  },

  addFollowUpToProcedure: (planId: string, itemId: string, followUp: any) => {
    set((state) => {
      const updatedPlans = state.treatmentPlans.map((p) => {
        if (p.id !== planId) return p;
        const items = (p.items || []).map((it) => {
          if (it.id !== itemId) return it;
          return { ...it, followUps: [...(it.followUps || []), followUp] };
        });
        return { ...p, items };
      });
      const updatedState = { ...state, treatmentPlans: updatedPlans };
      return {
        treatmentPlans: updatedPlans,
        timeline: generateTimelineFromState(updatedState)
      };
    });
  },

  addImageRecord: (image: ImageRecord) => {
    set((state) => {
      const updatedImages = [image, ...state.images];
      const updatedState = { ...state, images: updatedImages };
      return {
        images: updatedImages,
        timeline: generateTimelineFromState(updatedState)
      };
    });
  },

  updateImageRecord: (id: string, updates: Partial<ImageRecord>) => {
    set((state) => {
      const updatedImages = state.images.map(i => i.id === id ? { ...i, ...updates } : i);
      const updatedState = { ...state, images: updatedImages };
      return {
        images: updatedImages,
        timeline: generateTimelineFromState(updatedState)
      };
    });
  },

  deleteImageRecord: (id: string) => {
    set((state) => {
      const updatedImages = state.images.filter(i => i.id !== id);
      const updatedState = { ...state, images: updatedImages };
      return {
        images: updatedImages,
        timeline: generateTimelineFromState(updatedState)
      };
    });
  },

  addFollowUp: (follow: FollowUp) => {
    set((state) => {
      const updatedFollows = [follow, ...state.followUps];
      const updatedState = { ...state, followUps: updatedFollows };
      return {
        followUps: updatedFollows,
        timeline: generateTimelineFromState(updatedState)
      };
    });
  },

  updateFollowUpStatus: (id: string, status: 'Pending' | 'Completed' | 'Overdue') => {
    set((state) => {
      const updatedFollows = state.followUps.map(f => f.id === id ? { ...f, status } : f);
      const updatedState = { ...state, followUps: updatedFollows };
      return {
        followUps: updatedFollows,
        timeline: generateTimelineFromState(updatedState)
      };
    });
  },

  deleteFollowUp: (id: string) => {
    set((state) => {
      const updatedFollows = state.followUps.filter(f => f.id !== id);
      const updatedState = { ...state, followUps: updatedFollows };
      return {
        followUps: updatedFollows,
        timeline: generateTimelineFromState(updatedState)
      };
    });
  },
}));

const generateTimelineFromState = (state: any): TimelineEvent[] => {
  const events: TimelineEvent[] = [];
  const patientId = state.selectedPatient?.id || '';
  
  state.visits.forEach((v: any) => events.push({
    id: `t-v-${v.id}`,
    patientId,
    dateTime: v.dateTime,
    type: 'Visit',
    title: 'Clinical Visit Logged',
    description: `Chief Complaint: ${v.chiefComplaint}`,
    referenceId: v.id
  }));
  
  state.appointments.forEach((a: any) => events.push({
    id: `t-a-${a.id}`,
    patientId,
    dateTime: a.dateTime,
    type: 'Appointment',
    title: `Scheduled: ${a.reason}`,
    description: `Status: ${a.status}`,
    referenceId: a.id
  }));
  
  state.clinicalNotes.forEach((n: any) => events.push({
    id: `t-n-${n.id}`,
    patientId,
    dateTime: n.dateTime,
    type: 'Note',
    title: 'Clinical Note Written',
    description: `${n.noteType} Note: ${n.content.substring(0, 50)}...`,
    referenceId: n.id
  }));
  
  state.treatmentPlans.forEach((p: any) => {
    events.push({
      id: `t-p-${p.id}`,
      patientId,
      dateTime: p.createdAt,
      type: 'TreatmentPlan',
      title: 'Treatment Plan Formulated',
      description: `${p.name} (${p.status}) - Cost: $${p.totalCost}`,
      referenceId: p.id
    });
    
    (p.items || []).forEach((item: any) => {
      if (item.status === 'Completed' && item.outcome) {
        events.push({
          id: `t-proc-comp-${item.id}`,
          patientId,
          dateTime: item.outcome.createdAt || p.createdAt,
          type: 'TreatmentPlan',
          title: `Completed Procedure: ${item.description}`,
          description: `Outcome: Healing ${item.outcome.healingStatus}, Pain Level: ${item.outcome.painLevel}/10`,
          referenceId: p.id
        });
      } else if (item.status === 'In-Progress') {
        events.push({
          id: `t-proc-prog-${item.id}`,
          patientId,
          dateTime: p.createdAt,
          type: 'TreatmentPlan',
          title: `In-Progress Procedure: ${item.description}`,
          description: `Diagnosis: ${item.diagnosis || 'General'}`,
          referenceId: p.id
        });
      }
      
      // Progress visit logs inside timeline
      (item.visits || []).forEach((vLog: any) => {
        events.push({
          id: `t-proc-visit-${vLog.id}`,
          patientId,
          dateTime: vLog.date + 'T12:00:00Z',
          type: 'TreatmentPlan',
          title: `Progress Visit: ${item.description}`,
          description: `Performed: ${vLog.procedurePerformed} - Dentist: ${vLog.dentist}`,
          referenceId: p.id
        });
      });
    });
  });
  
  state.images.forEach((i: any) => events.push({
    id: `t-i-${i.id}`,
    patientId,
    dateTime: i.dateTime,
    type: 'Image',
    title: `${i.category} Uploaded`,
    description: i.title,
    referenceId: i.id
  }));
  
  state.followUps.forEach((f: any) => events.push({
    id: `t-f-${f.id}`,
    patientId,
    dateTime: f.dueDate + 'T12:00:00Z',
    type: 'FollowUp',
    title: 'Follow-up Recall',
    description: `Reason: ${f.reason} - Status: ${f.status}`,
    referenceId: f.id
  }));
  
  return events.sort((a, b) => b.dateTime.localeCompare(a.dateTime));
};

import type { Patient, Appointment, Visit, ClinicalNote, TreatmentPlan, TreatmentItem, ProcedureVisit, ClinicalOutcome, TreatmentFollowUp, ImageRecord, TimelineEvent, FollowUp } from '../types';

// Patient-centric database mappings & queries
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/useAuthStore';

const mapPatientFromDb = (db: any): Patient => {
  return {
    id: db.id,
    displayId: db.display_id || db.displayId,
    name: db.name,
    email: db.email || '',
    phone: db.phone || '',
    dateOfBirth: db.date_of_birth || db.dateOfBirth || '',
    gender: db.gender || 'Other',
    bloodType: db.blood_type || db.bloodType || 'N/A',
    allergies: db.allergies || [],
    medicalHistory: db.medical_history || db.medicalHistory || [],
    emergencyContact: db.emergency_contact || db.emergencyContact || undefined,
    avatarUrl: db.avatar_url || db.avatarUrl || '',
    address: db.address || '',
    notes: db.notes || '',
    assignedDentistId: db.assigned_dentist_id || db.assignedDentistId,
    assignedDentistName: db.assigned_dentist_name || db.assignedDentistName,
    createdAt: db.created_at || db.createdAt || new Date().toISOString()
  };
};

const mapAppointmentFromDb = (db: any): Appointment => {
  return {
    id: db.id,
    patientId: db.patient_id || db.patientId,
    patientName: db.patients?.name || db.patient_name || db.patientName || '',
    dentistId: db.dentist_id || db.dentistId,
    dentistName: db.users?.name || db.dentist_name || db.dentistName || '',
    dateTime: db.date_time || db.dateTime,
    durationMinutes: db.duration_minutes || db.durationMinutes || 30,
    status: db.status,
    reason: db.reason || '',
    notes: db.notes || ''
  };
};

const mapVisitFromDb = (db: any): Visit => {
  return {
    id: db.id,
    patientId: db.patient_id || db.patientId,
    dateTime: db.date_time || db.dateTime,
    dentistId: db.dentist_id || db.dentistId,
    dentistName: db.users?.name || db.dentist_name || db.dentistName || '',
    chiefComplaint: db.chief_complaint || db.chiefComplaint || '',
    vitals: db.vitals || {
      bloodPressure: db.blood_pressure,
      pulse: db.pulse,
      temperature: db.temperature
    },
    diagnosis: db.diagnosis || '',
    treatment: db.treatment || '',
    outcome: db.outcome || '',
    notes: db.notes || '',
    visitType: db.visit_type || db.visitType || undefined,
    status: db.status || undefined,
    prescriptions: db.prescriptions || [],
    followup: db.followup || null,
  };
};

const mapClinicalNoteFromDb = (db: any): ClinicalNote => {
  return {
    id: db.id,
    patientId: db.patient_id || db.patientId,
    dateTime: db.created_at || db.createdAt || db.dateTime || new Date().toISOString(),
    dentistId: db.dentist_id || db.dentistId,
    dentistName: db.users?.name || db.dentist_name || db.dentistName || '',
    noteType: db.note_type || db.noteType || 'Progress',
    content: db.content || ''
  };
};

const mapFollowUpFromDb = (db: any): FollowUp => {
  return {
    id: db.id,
    patientId: db.patient_id || db.patientId,
    dentistId: db.dentist_id || db.dentistId,
    dentistName: db.users?.name || db.dentist_name || db.dentistName || '',
    dueDate: db.due_date || db.dueDate,
    reason: db.reason,
    status: db.status || 'Pending',
    notes: db.notes
  };
};

export const patientService = {
  getPatients: async (): Promise<Patient[]> => {
    try {
      const user = useAuthStore.getState().user;
      let query = supabase.from('patients').select(`
        *,
        appointments (
          date_time,
          dentist_id,
          users ( name )
        )
      `);
      
      if (user && user.role !== 'Super Admin' && user.clinic_id) {
        query = query.eq('clinic_id', user.clinic_id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      let patients = (data || []).map((db: any) => {
        let latestAppt = null;
        if (db.appointments && db.appointments.length > 0) {
          const sorted = [...db.appointments].sort((a, b) => new Date(b.date_time).getTime() - new Date(a.date_time).getTime());
          latestAppt = sorted[0];
        }
        
        const patient = mapPatientFromDb(db);
        patient.assignedDentistId = latestAppt ? latestAppt.dentist_id : undefined;
        patient.assignedDentistName = latestAppt ? latestAppt.users?.name : undefined;
        return patient;
      });
      
      if (user && user.role === 'Other Dentist') {
        // Fetch all patients the user has either an appointment or a visit with
        const [apptsRes, visitsRes] = await Promise.all([
          supabase.from('appointments').select('patient_id').eq('dentist_id', user.id),
          supabase.from('visits').select('patient_id').eq('dentist_id', user.id)
        ]);
        
        const allowedIds = new Set<string>();
        (apptsRes.data || []).forEach(a => allowedIds.add(a.patient_id));
        (visitsRes.data || []).forEach(v => allowedIds.add(v.patient_id));
        
        patients = patients.filter(p => allowedIds.has(p.id));
      }
      
      return patients;
    } catch (e) {
      console.error("Operation failed:", e);
      throw e;
    }
  },

  getPatientById: async (id: string): Promise<Patient | undefined> => {
    try {
      const user = useAuthStore.getState().user;
      let query = supabase.from('patients').select(`
        *,
        appointments (
          date_time,
          dentist_id,
          users ( name )
        )
      `).eq('id', id);
      
      if (user && user.role !== 'Super Admin' && user.clinic_id) {
        query = query.eq('clinic_id', user.clinic_id);
      }
      
      const { data, error } = await query.single();
      if (error) throw error;
      if (!data) return undefined;
      
      let latestAppt = null;
      if (data.appointments && data.appointments.length > 0) {
        const sorted = [...data.appointments].sort((a, b) => new Date(b.date_time).getTime() - new Date(a.date_time).getTime());
        latestAppt = sorted[0];
      }
      
      const patient = mapPatientFromDb(data);
      patient.assignedDentistId = latestAppt ? latestAppt.dentist_id : undefined;
      patient.assignedDentistName = latestAppt ? latestAppt.users?.name : undefined;
      
      if (user && user.role === 'Other Dentist') {
        const [apptsRes, visitsRes] = await Promise.all([
          supabase.from('appointments').select('id').eq('dentist_id', user.id).eq('patient_id', id).limit(1),
          supabase.from('visits').select('id').eq('dentist_id', user.id).eq('patient_id', id).limit(1)
        ]);
        
        const hasAccess = (apptsRes.data && apptsRes.data.length > 0) || (visitsRes.data && visitsRes.data.length > 0);
        if (!hasAccess) {
          return undefined;
        }
      }
      
      return patient;
    } catch (e) {
      console.error('getPatientById failed:', e);
      const list = await patientService.getPatients();
      return list.find((p) => p.id === id);
    }
  },

  getAppointments: async (patientId: string): Promise<Appointment[]> => {
    try {
      const { data, error } = await supabase.from('appointments').select('*, patients(name), users(name)').eq('patient_id', patientId);
      if (error) throw error;
      return (data || []).map(mapAppointmentFromDb);
    } catch (e) {
      console.error("Operation failed:", e);
      throw e;
    }
  },

  getVisits: async (patientId: string): Promise<Visit[]> => {
    try {
      const { data, error } = await supabase
        .from('visits')
        .select('*, patients(name)')
        .eq('patient_id', patientId)
        .order('date_time', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapVisitFromDb);
    } catch (e) {
      console.error("Operation failed:", e);
      throw e;
    }
  },

  /** Return the most recent open visit for a patient, if any. */
  getActiveVisit: async (patientId: string): Promise<Visit | null> => {
    const visits = await patientService.getVisits(patientId);
    return (
      visits.find((v) => v.status === 'Started' || v.status === 'In Progress') || null
    );
  },

  /**
   * Create a new visit (or reuse an existing open visit) when Start Visit is clicked.
   * Persists immediately so the workspace never runs without a visit record.
   */
  createOrResumeVisit: async (payload: {
    patientId: string;
    dentistId: string;
    dentistName: string;
    visitType: string;
    chiefComplaint?: string;
  }): Promise<{ success: boolean; data?: Visit; error?: string; resumed?: boolean }> => {
    const existing = await patientService.getActiveVisit(payload.patientId);
    if (existing) {
      const updated = await patientService.updateVisit(existing.id, {
        visitType: payload.visitType,
        status: 'In Progress',
      });
      if (updated.success && updated.data) {
        return { success: true, data: updated.data, resumed: true };
      }
    }

    const visit: Visit = {
      id: `visit-${Math.random().toString(36).substring(2, 9)}`,
      patientId: payload.patientId,
      dateTime: new Date().toISOString(),
      dentistId: payload.dentistId,
      dentistName: payload.dentistName,
      chiefComplaint: payload.chiefComplaint || '',
      diagnosis: '',
      treatment: '',
      outcome: '',
      notes: '',
      visitType: payload.visitType,
      status: 'Started',
    };

    try {
      const row: Record<string, unknown> = {
        patient_id: payload.patientId,
        dentist_id: payload.dentistId || null,
        dentist_name: payload.dentistName,
        chief_complaint: payload.chiefComplaint || '',
        diagnosis: '',
        treatment: '',
        outcome: '',
        notes: '',
        visit_type: payload.visitType,
        status: 'Started',
        date_time: visit.dateTime,
      };

      const { data, error } = await supabase.from('visits').insert([row]).select('*').single();
      if (error) {
        const { visit_type: _vt, status: _st, ...minimal } = row;
        const retry = await supabase.from('visits').insert([minimal]).select('*').single();
        if (retry.error) throw retry.error;
        const mapped = mapVisitFromDb(retry.data);
        mapped.visitType = payload.visitType;
        mapped.status = 'Started';
        return { success: true, data: mapped, resumed: false };
      }
      return { success: true, data: mapVisitFromDb(data), resumed: false };
    } catch (e: any) {
      console.error('createOrResumeVisit failed:', e);
      return { success: false, error: e.message || 'Failed to create visit' };
    }
  },

  updateVisit: async (
    visitId: string,
    updates: Partial<Visit> & Record<string, unknown>
  ): Promise<{ success: boolean; data?: Visit; error?: string }> => {
    try {
      const row: Record<string, unknown> = {};
      if (updates.chiefComplaint !== undefined) row.chief_complaint = updates.chiefComplaint;
      if (updates.diagnosis !== undefined) row.diagnosis = updates.diagnosis;
      if (updates.treatment !== undefined) row.treatment = updates.treatment;
      if (updates.outcome !== undefined) row.outcome = updates.outcome;
      if (updates.notes !== undefined) row.notes = updates.notes;
      if (updates.visitType !== undefined) row.visit_type = updates.visitType;
      if (updates.status !== undefined) row.status = updates.status;
      if (updates.vitals !== undefined) row.vitals = updates.vitals;
      if (updates.periodontal !== undefined) row.periodontal = updates.periodontal;
      if (updates.measurements !== undefined) row.measurements = updates.measurements;
      if (updates.prescriptions !== undefined) row.prescriptions = updates.prescriptions;
      if (updates.followup !== undefined) row.followup = updates.followup;
      if (updates.blood_pressure !== undefined) row.blood_pressure = updates.blood_pressure;
      if (updates.pulse !== undefined) row.pulse = updates.pulse;
      if (updates.temperature !== undefined) row.temperature = updates.temperature;

      const { data, error } = await supabase
        .from('visits')
        .update(row)
        .eq('id', visitId)
        .select('*')
        .single();

      if (error) {
        const { visit_type: _vt, status: _st, ...minimal } = row;
        const retry = await supabase
          .from('visits')
          .update(minimal)
          .eq('id', visitId)
          .select('*')
          .single();
        if (retry.error) throw retry.error;
        const mapped = mapVisitFromDb(retry.data);
        if (updates.visitType) mapped.visitType = updates.visitType as string;
        if (updates.status) mapped.status = updates.status as Visit['status'];
        return { success: true, data: mapped };
      }
      return { success: true, data: mapVisitFromDb(data) };
    } catch (e: any) {
      console.error('updateVisit failed:', e);
      return { success: false, error: e.message || 'Failed to update visit' };
    }
  },

  getClinicalNotes: async (patientId: string): Promise<ClinicalNote[]> => {
    try {
      const { data, error } = await supabase.from('clinical_records').select('*, patients(name)').eq('patient_id', patientId);
      if (error) throw error;
      return (data || []).map(mapClinicalNoteFromDb);
    } catch (e) {
      console.error("Operation failed:", e);
      throw e;
    }
  },

  getTreatmentPlans: async (patientId: string): Promise<TreatmentPlan[]> => {
    try {
      // 1. Get treatment plans
      const { data: plansData, error: plansError } = await supabase
        .from('treatment_plans')
        .select('*')
        .eq('patient_id', patientId);
      if (plansError) throw plansError;
      
      if (!plansData || plansData.length === 0) return [];
      
      const planIds = plansData.map(p => p.id);
      
      // 2. Get procedures linked to these plans
      const { data: procData, error: procError } = await supabase
        .from('procedures')
        .select('*')
        .in('treatment_plan_id', planIds);
      if (procError) throw procError;
      
      // 3. Get visits logs, outcomes, and follow-ups for these procedures
      let visitLogs: any[] = [];
      let outcomes: any[] = [];
      let followUps: any[] = [];
      
      if (procData && procData.length > 0) {
        const procIds = procData.map(p => p.id);
        
        const [visitsRes, outcomesRes, followUpsRes] = await Promise.all([
          supabase.from('procedure_visits').select('*').in('procedure_id', procIds),
          supabase.from('clinical_outcomes').select('*').in('procedure_id', procIds),
          supabase.from('treatment_followups').select('*').in('procedure_id', procIds)
        ]);
        
        visitLogs = visitsRes.data || [];
        outcomes = outcomesRes.data || [];
        followUps = followUpsRes.data || [];
      }
      
      // 4. Assemble the nested structures
      return plansData.map((dbPlan) => {
        const planProcedures = (procData || [])
          .filter(p => p.treatment_plan_id === dbPlan.id)
          .map((dbProc) => {
            const procVisits = visitLogs
              .filter(v => v.procedure_id === dbProc.id)
              .map(v => ({
                id: v.id,
                procedureId: v.procedure_id,
                date: v.visit_date,
                procedurePerformed: v.procedure_performed,
                dentist: v.dentist_name,
                notes: v.notes,
                outcome: v.outcome,
                nextVisit: v.next_visit
              }));
              
            const procOutcomeRaw = outcomes.find(o => o.procedure_id === dbProc.id);
            const procOutcome = procOutcomeRaw ? {
              id: procOutcomeRaw.id,
              procedureId: procOutcomeRaw.procedure_id,
              healingStatus: procOutcomeRaw.healing_status,
              painLevel: procOutcomeRaw.pain_level,
              inflammation: procOutcomeRaw.inflammation,
              sensitivity: procOutcomeRaw.sensitivity,
              mobility: procOutcomeRaw.mobility,
              remarks: procOutcomeRaw.remarks,
              complications: procOutcomeRaw.complications,
              patientFeedback: procOutcomeRaw.patient_feedback,
              dentistRecommendation: procOutcomeRaw.dentist_recommendation
            } : undefined;
            
            const procFollowUps = followUps
              .filter(f => f.procedure_id === dbProc.id)
              .map(f => ({
                id: f.id,
                procedureId: f.procedure_id,
                purpose: f.purpose,
                date: f.date,
                priority: f.priority,
                reminder: f.reminder,
                instructions: f.instructions,
                status: f.status
              }));
              
            return {
              id: dbProc.id,
              code: dbProc.code,
              description: dbProc.description,
              cost: Number(dbProc.cost || 0),
              status: dbProc.status,
              teeth: dbProc.affected_tooth ? [dbProc.affected_tooth] : [],
              patientId: dbProc.patient_id,
              visitId: dbProc.visit_id,
              diagnosis: dbProc.diagnosis,
              affectedTooth: dbProc.affected_tooth,
              affectedSurface: dbProc.affected_surface,
              priority: dbProc.priority,
              estimatedVisits: dbProc.estimated_visits,
              estimatedDuration: dbProc.estimated_duration,
              assignedDentistId: dbProc.assigned_dentist_id,
              assignedDentistName: dbProc.assigned_dentist_name,
              assistantId: dbProc.assistant_id,
              assistantName: dbProc.assistant_name,
              expectedCompletionDate: dbProc.expected_completion_date,
              notes: dbProc.notes,
              visits: procVisits,
              outcome: procOutcome,
              followUps: procFollowUps
            };
          });
          
        return {
          id: dbPlan.id,
          patientId: dbPlan.patient_id,
          name: dbPlan.name,
          status: dbPlan.status,
          totalCost: Number(dbPlan.total_cost || 0),
          createdAt: dbPlan.created_at || new Date().toISOString(),
          expectedCompletionDate: dbPlan.expected_completion_date,
          clinicalNotes: dbPlan.clinical_notes,
          visitId: dbPlan.visit_id,
          items: planProcedures
        };
      });
    } catch (e) {
      console.error('getTreatmentPlans failed:', e);
      return [];
    }
  },

  getImages: async (patientId: string): Promise<ImageRecord[]> => {
    try {
      const { data, error } = await supabase.from('images').select('*').eq('patient_id', patientId);
      if (error) throw error;
      return (data || []).map(db => ({
        id: db.id,
        patientId: db.patient_id,
        title: db.title,
        category: db.category as any,
        imageUrl: db.image_url,
        dateTime: db.created_at || db.dateTime || new Date().toISOString(),
        notes: db.notes,
        visitId: db.visit_id,
        toothNumber: db.tooth_number,
        surface: db.surface,
        diseaseId: db.disease_id,
        treatmentId: db.treatment_id,
        dentistId: db.dentist_id,
        dentistName: db.dentist_name,
        annotations: db.annotations
      }));
    } catch (e) {
      console.error("Operation failed:", e);
      throw e;
    }
  },

  getFollowUps: async (patientId: string): Promise<FollowUp[]> => {
    try {
      const { data, error } = await supabase.from('follow_ups').select('*, patients(name), users(name)').eq('patient_id', patientId);
      if (error) throw error;
      return (data || []).map(mapFollowUpFromDb);
    } catch (e) {
      console.error("Operation failed:", e);
      throw e;
    }
  },

  getTimeline: async (patientId: string): Promise<TimelineEvent[]> => {
    try {
      const [visits, appts, notes, plans, imgs, followups] = await Promise.all([
        patientService.getVisits(patientId),
        patientService.getAppointments(patientId),
        patientService.getClinicalNotes(patientId),
        patientService.getTreatmentPlans(patientId),
        patientService.getImages(patientId),
        patientService.getFollowUps(patientId),
      ]);
      const events: TimelineEvent[] = [];
      visits.forEach(v => events.push({
        id: `t-v-${v.id}`,
        patientId,
        dateTime: v.dateTime,
        type: 'Visit',
        title: 'Clinical Visit Logged',
        description: `Chief Complaint: ${v.chiefComplaint}`,
        referenceId: v.id
      }));
      appts.forEach(a => events.push({
        id: `t-a-${a.id}`,
        patientId,
        dateTime: a.dateTime,
        type: 'Appointment',
        title: `Scheduled: ${a.reason}`,
        description: `Status: ${a.status}`,
        referenceId: a.id
      }));
      notes.forEach(n => events.push({
        id: `t-n-${n.id}`,
        patientId,
        dateTime: n.dateTime,
        type: 'Note',
        title: 'Clinical Note Written',
        description: `${n.noteType} Note: ${n.content.substring(0, 50)}...`,
        referenceId: n.id
      }));
      plans.forEach(p => events.push({
        id: `t-p-${p.id}`,
        patientId,
        dateTime: p.createdAt,
        type: 'TreatmentPlan',
        title: 'Treatment Plan Status',
        description: `${p.name} (${p.status}) - Cost: $${p.totalCost}`,
        referenceId: p.id
      }));
      imgs.forEach(i => events.push({
        id: `t-i-${i.id}`,
        patientId,
        dateTime: i.dateTime,
        type: 'Image',
        title: `${i.category} Uploaded`,
        description: i.title,
        referenceId: i.id
      }));
      followups.forEach(f => events.push({
        id: `t-f-${f.id}`,
        patientId,
        dateTime: f.dueDate + 'T12:00:00Z',
        type: 'FollowUp',
        title: 'Follow-up Recall',
        description: `Reason: ${f.reason} - Status: ${f.status}`,
        referenceId: f.id
      }));
      return events.sort((a, b) => b.dateTime.localeCompare(a.dateTime));
    } catch {
      return [];
    }
  },

  createClinicalNote: async (note: Omit<ClinicalNote, 'id'>): Promise<{ success: boolean; data?: ClinicalNote; error?: string }> => {
    const newNote = {
      ...note,
      id: `note-${Math.random().toString(36).substring(2, 9)}`
    };

    try {
      const { data, error } = await supabase
        .from('clinical_records')
        .insert([{
          patient_id: newNote.patientId,
          dentist_id: newNote.dentistId,
          note_type: newNote.noteType,
          content: newNote.content,
        }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data: { ...newNote, id: data.id } };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  deleteClinicalNote: async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.from('clinical_records').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  createTreatmentPlan: async (plan: Omit<TreatmentPlan, 'id' | 'createdAt'>): Promise<{ success: boolean; data?: TreatmentPlan; error?: string }> => {
    const newPlanId = `plan-${Math.random().toString(36).substring(2, 9)}`;
    const newPlan: TreatmentPlan = {
      ...plan,
      id: newPlanId,
      createdAt: new Date().toISOString(),
      items: plan.items || []
    };

    try {
      // 1. Insert treatment plan
      const { data: dbPlan, error: planErr } = await supabase
        .from('treatment_plans')
        .insert([{
          patient_id: newPlan.patientId,
          name: newPlan.name,
          status: newPlan.status,
          total_cost: newPlan.totalCost,
          expected_completion_date: newPlan.expectedCompletionDate || null,
          clinical_notes: newPlan.clinicalNotes || '',
          visit_id: newPlan.visitId || null
        }])
        .select()
        .single();

      if (planErr) throw planErr;

      // 2. Insert planned procedures/items
      if (newPlan.items && newPlan.items.length > 0) {
        const proceduresToInsert = newPlan.items.map(item => ({
          treatment_plan_id: dbPlan.id,
          patient_id: newPlan.patientId,
          visit_id: newPlan.visitId || null,
          diagnosis: item.diagnosis || '',
          affected_tooth: item.affectedTooth || (item.teeth && item.teeth[0]) || null,
          affected_surface: item.affectedSurface || null,
          code: item.code,
          description: item.description,
          priority: item.priority || 'Medium',
          estimated_visits: item.estimatedVisits || 1,
          estimated_duration: item.estimatedDuration || '',
          cost: item.cost,
          assigned_dentist_id: item.assignedDentistId || null,
          assigned_dentist_name: item.assignedDentistName || '',
          assistant_id: item.assistantId || null,
          assistant_name: item.assistantName || '',
          status: item.status || 'Planned',
          notes: item.notes || ''
        }));

        const { data: dbProcs, error: procsErr } = await supabase
          .from('procedures')
          .insert(proceduresToInsert)
          .select();

        if (procsErr) throw procsErr;

        newPlan.items = (dbProcs || []).map(p => ({
          id: p.id,
          code: p.code,
          description: p.description,
          cost: Number(p.cost || 0),
          status: p.status,
          teeth: p.affected_tooth ? [p.affected_tooth] : [],
          patientId: p.patient_id,
          visitId: p.visit_id,
          diagnosis: p.diagnosis,
          affectedTooth: p.affected_tooth,
          affectedSurface: p.affected_surface,
          priority: p.priority,
          estimatedVisits: p.estimated_visits,
          estimatedDuration: p.estimated_duration,
          assignedDentistId: p.assigned_dentist_id,
          assignedDentistName: p.assigned_dentist_name,
          assistantId: p.assistant_id,
          assistantName: p.assistant_name,
          expectedCompletionDate: p.expected_completion_date,
          notes: p.notes,
          visits: [],
          outcome: undefined,
          followUps: []
        }));
      }

      return { 
        success: true, 
        data: { 
          ...newPlan, 
          id: dbPlan.id,
          expectedCompletionDate: dbPlan.expected_completion_date,
          clinicalNotes: dbPlan.clinical_notes,
          visitId: dbPlan.visit_id
        } 
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  updateTreatmentPlan: async (id: string, updates: Partial<TreatmentPlan>): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('treatment_plans')
        .update({
          name: updates.name,
          status: updates.status,
          total_cost: updates.totalCost,
          expected_completion_date: updates.expectedCompletionDate,
          clinical_notes: updates.clinicalNotes
        })
        .eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  deleteTreatmentPlan: async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.from('treatment_plans').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  createProcedure: async (planId: string, procedure: Omit<TreatmentItem, 'id'>): Promise<{ success: boolean; data?: TreatmentItem; error?: string }> => {
    const newId = `ti-${Math.random().toString(36).substring(2, 9)}`;
    const newProc: TreatmentItem = {
      ...procedure,
      id: newId,
      visits: [],
      outcome: undefined,
      followUps: []
    };

    try {
      const { data, error } = await supabase
        .from('procedures')
        .insert([{
          treatment_plan_id: planId,
          patient_id: procedure.patientId,
          visit_id: procedure.visitId || null,
          diagnosis: procedure.diagnosis,
          affected_tooth: procedure.affectedTooth,
          affected_surface: procedure.affectedSurface,
          code: procedure.code,
          description: procedure.description,
          priority: procedure.priority || 'Medium',
          estimated_visits: procedure.estimatedVisits || 1,
          estimated_duration: procedure.estimatedDuration || '',
          cost: procedure.cost,
          assigned_dentist_id: procedure.assignedDentistId || null,
          assigned_dentist_name: procedure.assignedDentistName || '',
          assistant_id: procedure.assistantId || null,
          assistant_name: procedure.assistantName || '',
          status: procedure.status || 'Planned',
          notes: procedure.notes
        }])
        .select()
        .single();

      if (error) throw error;
      
      // Update treatment plan total cost in database
      const { data: procs } = await supabase.from('procedures').select('cost').eq('treatment_plan_id', planId);
      const newTotal = (procs || []).reduce((sum, p) => sum + Number(p.cost || 0), 0);
      await supabase.from('treatment_plans').update({ total_cost: newTotal }).eq('id', planId);

      return {
        success: true,
        data: {
          id: data.id,
          code: data.code,
          description: data.description,
          cost: Number(data.cost || 0),
          status: data.status,
          teeth: data.affected_tooth ? [data.affected_tooth] : [],
          patientId: data.patient_id,
          visitId: data.visit_id,
          diagnosis: data.diagnosis,
          affectedTooth: data.affected_tooth,
          affectedSurface: data.affected_surface,
          priority: data.priority,
          estimatedVisits: data.estimated_visits,
          estimatedDuration: data.estimated_duration,
          assignedDentistId: data.assigned_dentist_id,
          assignedDentistName: data.assigned_dentist_name,
          assistantId: data.assistant_id,
          assistantName: data.assistant_name,
          expectedCompletionDate: data.expected_completion_date,
          notes: data.notes,
          visits: [],
          outcome: undefined,
          followUps: []
        }
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  updateProcedure: async (planId: string, id: string, updates: Partial<TreatmentItem>): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('procedures')
        .update({
          status: updates.status,
          diagnosis: updates.diagnosis,
          affected_tooth: updates.affectedTooth,
          affected_surface: updates.affectedSurface,
          code: updates.code,
          description: updates.description,
          priority: updates.priority,
          estimated_visits: updates.estimatedVisits,
          estimated_duration: updates.estimatedDuration,
          cost: updates.cost,
          assigned_dentist_id: updates.assignedDentistId,
          assigned_dentist_name: updates.assignedDentistName,
          assistant_id: updates.assistantId,
          assistant_name: updates.assistantName,
          expected_completion_date: updates.expectedCompletionDate,
          notes: updates.notes
        })
        .eq('id', id);

      if (error) throw error;
      
      // Update plan total cost
      const { data: procs } = await supabase.from('procedures').select('cost').eq('treatment_plan_id', planId);
      const newTotal = (procs || []).reduce((sum, p) => sum + Number(p.cost || 0), 0);
      await supabase.from('treatment_plans').update({ total_cost: newTotal }).eq('id', planId);

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  deleteProcedure: async (planId: string, id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.from('procedures').delete().eq('id', id);
      if (error) throw error;

      // Update plan total cost
      const { data: procs } = await supabase.from('procedures').select('cost').eq('treatment_plan_id', planId);
      const newTotal = (procs || []).reduce((sum, p) => sum + Number(p.cost || 0), 0);
      await supabase.from('treatment_plans').update({ total_cost: newTotal }).eq('id', planId);

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  addProcedureVisitLog: async (planId: string, procedureId: string, visitLog: Omit<ProcedureVisit, 'id'>): Promise<{ success: boolean; data?: ProcedureVisit; error?: string }> => {
    const newId = `pv-${Math.random().toString(36).substring(2, 9)}`;
    const newLog: ProcedureVisit = { ...visitLog, id: newId };

    try {
      const { error } = await supabase
        .from('procedure_visits')
        .insert([{
          procedure_id: procedureId,
          visit_date: visitLog.date,
          procedure_performed: visitLog.procedurePerformed,
          dentist_name: visitLog.dentist,
          notes: visitLog.notes,
          outcome: visitLog.outcome,
          next_visit: visitLog.nextVisit
        }]);

      if (error) throw error;
      return { success: true, data: newLog };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  saveClinicalOutcome: async (planId: string, procedureId: string, outcome: Omit<ClinicalOutcome, 'id'>): Promise<{ success: boolean; data?: ClinicalOutcome; error?: string }> => {
    const newId = `co-${Math.random().toString(36).substring(2, 9)}`;
    const newOutcome: ClinicalOutcome = { ...outcome, id: newId };

    try {
      const { error } = await supabase
        .from('clinical_outcomes')
        .upsert([{
          procedure_id: procedureId,
          healing_status: outcome.healingStatus,
          pain_level: outcome.painLevel,
          inflammation: outcome.inflammation,
          sensitivity: outcome.sensitivity,
          mobility: outcome.mobility,
          remarks: outcome.remarks,
          complications: outcome.complications,
          patient_feedback: outcome.patientFeedback,
          dentist_recommendation: outcome.dentistRecommendation
        }], { onConflict: 'procedure_id' });

      if (error) throw error;

      // Update procedure status to Completed
      await supabase.from('procedures').update({ status: 'Completed' }).eq('id', procedureId);

      return { success: true, data: newOutcome };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  saveTreatmentFollowUp: async (planId: string, procedureId: string, followUp: Omit<TreatmentFollowUp, 'id'> & { patientId?: string }): Promise<{ success: boolean; data?: TreatmentFollowUp; error?: string }> => {
    const newId = `tf-${Math.random().toString(36).substring(2, 9)}`;
    const { patientId, ...cleanFollowUp } = followUp;
    const newFollowUp: TreatmentFollowUp = { ...cleanFollowUp, id: newId };

    try {
      const { error } = await supabase
        .from('treatment_followups')
        .insert([{
          procedure_id: procedureId,
          patient_id: patientId,
          purpose: followUp.purpose,
          date: followUp.date,
          priority: followUp.priority,
          reminder: followUp.reminder,
          instructions: followUp.instructions,
          status: followUp.status
        }]);

      if (error) throw error;
      return { success: true, data: newFollowUp };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  createImageRecord: async (img: Omit<ImageRecord, 'id' | 'dateTime'>): Promise<{ success: boolean; data?: ImageRecord; error?: string }> => {
    const newImg = {
      ...img,
      id: `img-${Math.random().toString(36).substring(2, 9)}`,
      dateTime: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('images')
        .insert([{
          patient_id: newImg.patientId,
          title: newImg.title,
          category: newImg.category,
          image_url: newImg.imageUrl,
          notes: newImg.notes,
          visit_id: newImg.visitId || null,
          tooth_number: newImg.toothNumber || null,
          surface: newImg.surface || null,
          disease_id: newImg.diseaseId || null,
          treatment_id: newImg.treatmentId || null,
          dentist_id: newImg.dentistId || null,
          dentist_name: newImg.dentistName || null
        }])
        .select()
        .single();

      if (error) throw error;
      return { 
        success: true, 
        data: { 
          ...newImg, 
          id: data.id,
          visitId: data.visit_id,
          toothNumber: data.tooth_number,
          surface: data.surface,
          diseaseId: data.disease_id,
          treatmentId: data.treatment_id,
          dentistId: data.dentist_id,
          dentistName: data.dentist_name,
          annotations: data.annotations
        } 
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  updateImageRecord: async (id: string, updates: Partial<ImageRecord>): Promise<{ success: boolean; data?: ImageRecord; error?: string }> => {
    try {
      const { data, error } = await supabase
        .from('images')
        .update({
          title: updates.title,
          category: updates.category,
          image_url: updates.imageUrl,
          notes: updates.notes,
          visit_id: updates.visitId,
          tooth_number: updates.toothNumber,
          surface: updates.surface,
          disease_id: updates.diseaseId,
          treatment_id: updates.treatmentId,
          dentist_id: updates.dentistId,
          dentist_name: updates.dentistName,
          annotations: updates.annotations
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return {
        success: true,
        data: {
          id: data.id,
          patientId: data.patient_id,
          title: data.title,
          category: data.category,
          imageUrl: data.image_url,
          dateTime: data.created_at || data.dateTime,
          notes: data.notes,
          visitId: data.visit_id,
          toothNumber: data.tooth_number,
          surface: data.surface,
          diseaseId: data.disease_id,
          treatmentId: data.treatment_id,
          dentistId: data.dentist_id,
          dentistName: data.dentist_name,
          annotations: data.annotations
        }
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  deleteImageRecord: async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.from('images').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },
};

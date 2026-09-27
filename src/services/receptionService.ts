import type { Patient, Appointment, FollowUp } from '../types';
import { supabase } from '../lib/supabaseClient';
import { adminService } from './adminService';
import { useAuthStore } from '../store/useAuthStore';

export const receptionService = {
  // -------------------------------------------------------------
  // PATIENT REGISTRATION
  // -------------------------------------------------------------
  registerPatient: async (patient: Omit<Patient, 'id' | 'createdAt'>): Promise<{ success: boolean; data?: Patient; error?: string }> => {
    const list = await receptionService.getAllPatientsList();

    // Duplicate prevention based on Mobile Number & Name (case-insensitive)
    const isDuplicate = list.some(
      (p) => p.name.toLowerCase().trim() === patient.name.toLowerCase().trim() &&
             p.phone.trim() === patient.phone.trim()
    );

    if (isDuplicate) {
      return { success: false, error: 'A patient with this name and phone number is already registered.' };
    }

    const newPatient: Patient = {
      ...patient,
      id: `pat-${Math.random().toString(36).substring(2, 9)}`,
      createdAt: new Date().toISOString()
    };

    try {
      const user = useAuthStore.getState().user;
      const clinicId = user?.clinic_id || '00000000-0000-0000-0000-000000000001';

      const { data, error } = await supabase
        .from('patients')
        .insert([{
          name: newPatient.name,
          phone: newPatient.phone,
          date_of_birth: newPatient.dateOfBirth,
          gender: newPatient.gender,
          email: newPatient.email,
          address: newPatient.address,
          allergies: newPatient.allergies,
          medical_history: newPatient.medicalHistory,
          emergency_contact: newPatient.emergencyContact,
          clinic_id: clinicId,
        }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data: data as Patient };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  getAllPatientsList: async (): Promise<Patient[]> => {
    try {
      const user = useAuthStore.getState().user;
      let query = supabase.from('patients').select(`
        *,
        appointments (
          date_time,
          doctor_id,
          users ( name )
        )
      `);
      
      if (user && user.role !== 'Super Admin' && user.clinic_id) {
        query = query.eq('clinic_id', user.clinic_id);
      }
      
      const { data, error } = await query;
      if (error) return [];
      
      let patients = (data || []).map((p: any) => {
        let latestAppt = null;
        if (p.appointments && p.appointments.length > 0) {
          const sorted = [...p.appointments].sort((a, b) => new Date(b.date_time).getTime() - new Date(a.date_time).getTime());
          latestAppt = sorted[0];
        }

        return {
          id: p.id,
          clinicId: p.clinic_id,
          displayId: p.display_id,
          name: p.name,
          email: p.email || '',
          phone: p.phone,
          dateOfBirth: p.date_of_birth,
          gender: p.gender || '',
          bloodType: p.blood_type || '',
          allergies: p.allergies || [],
          medicalHistory: p.medical_history || [],
          createdAt: p.created_at,
          address: p.address || '',
          emergencyContact: p.emergency_contact || '',
          avatarUrl: p.avatar_url,
          notes: p.notes,
          assignedDoctorId: latestAppt ? latestAppt.doctor_id : undefined,
          assignedDoctorName: latestAppt ? latestAppt.users?.name : undefined,
        } as Patient;
      });

      if (user && user.role === 'Other Doctor') {
        const [apptsRes, visitsRes] = await Promise.all([
          supabase.from('appointments').select('patient_id').eq('doctor_id', user.id),
          supabase.from('visits').select('patient_id').eq('doctor_id', user.id)
        ]);
        
        const allowedIds = new Set<string>();
        (apptsRes.data || []).forEach(a => allowedIds.add(a.patient_id));
        (visitsRes.data || []).forEach(v => allowedIds.add(v.patient_id));
        
        patients = patients.filter(p => allowedIds.has(p.id));
      }

      return patients;
    } catch {
      return [];
    }
  },

  // -------------------------------------------------------------
  // APPOINTMENT BOOKING
  // -------------------------------------------------------------
  getAllAppointments: async (): Promise<Appointment[]> => {
    try {
      const user = useAuthStore.getState().user;
      const clinicId = user?.clinic_id || (user as any)?.clinicId;
      
      let query = supabase.from('appointments').select('*, patients(name), users(name)');
      if (clinicId) {
        query = query.eq('clinic_id', clinicId);
      }
      
      const { data, error } = await query;
      if (error) return [];
      return data.map((d: any) => ({
        id: d.id,
        patientId: d.patient_id,
        patientName: d.patients?.name || d.patient_name || 'Registered Patient',
        physicianId: d.doctor_id,
        physicianName: d.users?.name || d.doctor_name || 'Dr. Prasad Patil',
        dateTime: d.date_time,
        durationMinutes: d.duration_minutes,
        status: d.status,
        reason: d.reason,
        notes: d.notes,
      })) as Appointment[];
    } catch {
      return [];
    }
  },

  bookAppointment: async (appt: Omit<Appointment, 'id'>): Promise<{ success: boolean; data?: Appointment; error?: string }> => {
    const list = await receptionService.getAllAppointments();
    const newAppt: Appointment = {
      ...appt,
      id: `appt-${Math.random().toString(36).substring(2, 9)}`
    };

    try {
      const { data, error } = await supabase
        .from('appointments')
        .insert([{
          clinic_id: newAppt.clinicId,
          patient_id: newAppt.patientId,
          doctor_id: newAppt.physicianId || (newAppt as any).doctorId,
          date_time: newAppt.dateTime,
          duration_minutes: newAppt.durationMinutes,
          status: newAppt.status,
          reason: newAppt.reason,
          notes: newAppt.notes,
        }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data: data as Appointment };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  updateAppointment: async (id: string, updates: Partial<Appointment>): Promise<{ success: boolean; error?: string }> => {
    if (!id) return { success: false, error: 'Appointment ID required.' };

    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          date_time: updates.dateTime,
          status: updates.status,
          reason: updates.reason,
          notes: updates.notes,
        })
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  deleteAppointment: async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.from('appointments').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  // -------------------------------------------------------------
  // FOLLOW-UPS
  // -------------------------------------------------------------
  getAllFollowUps: async (): Promise<FollowUp[]> => {
    try {
      const user = useAuthStore.getState().user;
      const clinicId = user?.clinic_id || (user as any)?.clinicId;
      
      let query = supabase.from('follow_ups').select('*, patients(name), users(name)');
      if (clinicId) {
        query = query.eq('clinic_id', clinicId);
      }

      const { data, error } = await query;
      if (error) return [];
      return data.map((d: any) => ({
        id: d.id,
        patientId: d.patient_id,
        doctorId: d.doctor_id,
        doctorName: d.users?.name || d.doctor_name || 'Dr. Prasad Patil',
        dueDate: d.due_date,
        reason: d.reason,
        status: d.status,
        notes: d.notes,
      })) as FollowUp[];
    } catch {
      return [];
    }
  },

  scheduleFollowUp: async (follow: Omit<FollowUp, 'id'>): Promise<{ success: boolean; data?: FollowUp; error?: string }> => {
    const list = await receptionService.getAllFollowUps();
    const newFollow: FollowUp = {
      ...follow,
      id: `fol-${Math.random().toString(36).substring(2, 9)}`
    };

    try {
      const { data, error } = await supabase
        .from('follow_ups')
        .insert([{
          patient_id: newFollow.patientId,
          doctor_id: newFollow.doctorId,
          due_date: newFollow.dueDate,
          reason: newFollow.reason,
          status: newFollow.status,
          notes: newFollow.notes,
        }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data: data as FollowUp };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  updateFollowUp: async (id: string, updates: Partial<FollowUp>): Promise<{ success: boolean; error?: string }> => {
    const list = await receptionService.getAllFollowUps();
    const item = list.find(f => f.id === id);
    if (!item) return { success: false, error: 'Follow-up recall record not found.' };

    try {
      const { error } = await supabase
        .from('follow_ups')
        .update({
          due_date: updates.dueDate,
          status: updates.status,
          reason: updates.reason,
          notes: updates.notes,
        })
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  deleteFollowUp: async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.from('follow_ups').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  // ─── Appointment Methods ──────────────────────────────────────
  getAppointments: async (date?: string): Promise<any[]> => {
    try {
      const user = useAuthStore.getState().user;
      const clinicId = user?.clinic_id || (user as any)?.clinicId;
      let query = supabase.from('appointments').select('*').eq('clinic_id', clinicId).order('date_time', { ascending: true });

      if (date) {
        query = query.gte('date_time', `${date}T00:00:00`).lte('date_time', `${date}T23:59:59`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((row: any) => ({
        id: row.id,
        clinicId: row.clinic_id,
        patientId: row.patient_id,
        patientName: row.patient_name,
        physicianId: row.physician_id,
        physicianName: row.physician_name,
        dateTime: row.date_time,
        durationMinutes: row.duration_minutes,
        status: row.status,
        reason: row.reason,
        notes: row.notes,
        tokenNumber: row.token_number,
        triagePriority: row.triage_priority,
        createdAt: row.created_at,
      }));
    } catch (err) {
      console.error('Failed to load appointments', err);
      return [];
    }
  },

  getAllAppointments: async (): Promise<any[]> => {
    return receptionService.getAppointments();
  },

  updateAppointmentStatus: async (id: string, status: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  updateAppointment: async (id: string, updates: Record<string, any>): Promise<{ success: boolean; error?: string }> => {
    try {
      const dbUpdates: Record<string, any> = {};
      if (updates.status) dbUpdates.status = updates.status;
      if (updates.dateTime) dbUpdates.date_time = updates.dateTime;
      if (updates.notes) dbUpdates.notes = updates.notes;
      if (updates.reason) dbUpdates.reason = updates.reason;

      const { error } = await supabase.from('appointments').update(dbUpdates).eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  deleteAppointment: async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.from('appointments').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
};

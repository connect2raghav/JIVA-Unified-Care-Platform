/**
 * JIVA — Unified Care Platform
 * Emergency Service Layer
 *
 * Handles CRUD for emergency requests and ambulance fleet management.
 * All queries scoped by clinic_id via Supabase RLS.
 */
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/useAuthStore';
import type {
  EmergencyRequest,
  EmergencyStatus,
  EmergencyPriority,
  Ambulance,
  AmbulanceStatus,
} from '@/types/domain';

// ─── Row mappers ─────────────────────────────────────────────────

function mapEmergencyRow(row: any): EmergencyRequest {
  return {
    id: row.id,
    clinicId: row.clinic_id,
    callerName: row.caller_name,
    callerPhone: row.caller_phone,
    patientId: row.patient_id ?? undefined,
    description: row.description,
    priority: row.priority as EmergencyPriority,
    status: row.status as EmergencyStatus,
    assignedAmbulanceId: row.assigned_ambulance_id ?? undefined,
    assignedAmbulanceVehicle: row.ambulances?.vehicle_number ?? undefined,
    pickupLocation: row.pickup_location,
    destinationFacility: row.destination_facility ?? undefined,
    dispatchedAt: row.dispatched_at ?? undefined,
    resolvedAt: row.resolved_at ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

function mapAmbulanceRow(row: any): Ambulance {
  return {
    id: row.id,
    clinicId: row.clinic_id,
    vehicleNumber: row.vehicle_number,
    driverName: row.driver_name,
    driverPhone: row.driver_phone,
    status: row.status as AmbulanceStatus,
    currentLocation: row.current_location ?? undefined,
    lastDispatchedAt: row.last_dispatched_at ?? undefined,
    equipmentLevel: row.equipment_level ?? 'Basic',
    createdAt: row.created_at,
  };
}

// ─── Emergency Requests ──────────────────────────────────────────

export const emergencyService = {
  async listRequests(): Promise<EmergencyRequest[]> {
    const user = useAuthStore.getState().user;
    const clinicId = user?.clinic_id || (user as any)?.clinicId;
    const { data, error } = await supabase
      .from('emergency_requests')
      .select('*, ambulances(vehicle_number)')
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapEmergencyRow);
  },

  async createRequest(req: Omit<EmergencyRequest, 'id' | 'createdAt'>): Promise<EmergencyRequest> {
    const { data, error } = await supabase
      .from('emergency_requests')
      .insert({
        clinic_id: req.clinicId,
        caller_name: req.callerName,
        caller_phone: req.callerPhone,
        patient_id: req.patientId ?? null,
        description: req.description,
        priority: req.priority,
        status: req.status || 'Received',
        pickup_location: req.pickupLocation,
        destination_facility: req.destinationFacility ?? null,
        notes: req.notes ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return mapEmergencyRow(data);
  },

  async updateStatus(id: string, status: EmergencyStatus, extra?: Record<string, any>): Promise<void> {
    const update: any = { status };
    if (status === 'Dispatched') update.dispatched_at = new Date().toISOString();
    if (status === 'Resolved' || status === 'Cancelled') update.resolved_at = new Date().toISOString();
    if (extra) Object.assign(update, extra);

    const { error } = await supabase
      .from('emergency_requests')
      .update(update)
      .eq('id', id);
    if (error) throw error;
  },

  async assignAmbulance(requestId: string, ambulanceId: string, vehicleNumber: string): Promise<void> {
    // Update the emergency request
    const { error: reqError } = await supabase
      .from('emergency_requests')
      .update({
        assigned_ambulance_id: ambulanceId,
        status: 'Dispatched',
        dispatched_at: new Date().toISOString(),
      })
      .eq('id', requestId);
    if (reqError) throw reqError;

    // Update ambulance status
    const { error: ambError } = await supabase
      .from('ambulances')
      .update({
        status: 'Dispatched',
        last_dispatched_at: new Date().toISOString(),
      })
      .eq('id', ambulanceId);
    if (ambError) throw ambError;
  },

  // ─── Ambulances ──────────────────────────────────────────────

  async listAmbulances(): Promise<Ambulance[]> {
    const user = useAuthStore.getState().user;
    const clinicId = user?.clinic_id || (user as any)?.clinicId;
    const { data, error } = await supabase
      .from('ambulances')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('vehicle_number');
    if (error) throw error;
    return (data ?? []).map(mapAmbulanceRow);
  },

  async updateAmbulanceStatus(id: string, status: AmbulanceStatus): Promise<void> {
    const { error } = await supabase
      .from('ambulances')
      .update({ status })
      .eq('id', id);
    if (error) throw error;
  },
};

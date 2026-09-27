/**
 * JIVA — Unified Care Platform
 * Blood Bank Service Layer
 *
 * CRUD for blood inventory (8 groups × components) and blood requests.
 * All queries scoped by clinic_id via Supabase RLS.
 */
import { supabase } from '@/lib/supabaseClient';
import type {
  BloodInventoryItem,
  BloodRequest,
  BloodGroup,
  BloodComponent,
} from '@/types/domain';

function mapInventoryRow(row: any): BloodInventoryItem {
  return {
    id: row.id,
    clinicId: row.clinic_id,
    bloodGroup: row.blood_group as BloodGroup,
    component: row.component as BloodComponent,
    unitsAvailable: row.units_available ?? 0,
    unitsReserved: row.units_reserved ?? 0,
    expiryDate: row.expiry_date,
    donorName: row.donor_name ?? undefined,
    donorPhone: row.donor_phone ?? undefined,
    collectionDate: row.collection_date,
    status: row.status ?? 'Available',
    updatedAt: row.updated_at,
  };
}

function mapRequestRow(row: any): BloodRequest {
  return {
    id: row.id,
    clinicId: row.clinic_id,
    patientId: row.patient_id ?? undefined,
    patientName: row.patient_name,
    bloodGroup: row.blood_group as BloodGroup,
    component: row.component as BloodComponent,
    unitsRequested: row.units_requested,
    urgency: row.urgency ?? 'Routine',
    status: row.status ?? 'Pending',
    requestedBy: row.requested_by,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

export const bloodBankService = {
  // ─── Inventory ─────────────────────────────────────────────
  async listInventory(): Promise<BloodInventoryItem[]> {
    const { data, error } = await supabase
      .from('blood_inventory')
      .select('*')
      .order('blood_group');
    if (error) throw error;
    return (data ?? []).map(mapInventoryRow);
  },

  async addInventory(item: Omit<BloodInventoryItem, 'id' | 'updatedAt'>): Promise<BloodInventoryItem> {
    const { data, error } = await supabase
      .from('blood_inventory')
      .insert({
        clinic_id: item.clinicId,
        blood_group: item.bloodGroup,
        component: item.component,
        units_available: item.unitsAvailable,
        units_reserved: item.unitsReserved || 0,
        expiry_date: item.expiryDate,
        donor_name: item.donorName ?? null,
        donor_phone: item.donorPhone ?? null,
        collection_date: item.collectionDate,
        status: item.status || 'Available',
      })
      .select()
      .single();
    if (error) throw error;
    return mapInventoryRow(data);
  },

  async updateInventory(id: string, updates: Partial<BloodInventoryItem>): Promise<void> {
    const mapped: any = {};
    if (updates.unitsAvailable !== undefined) mapped.units_available = updates.unitsAvailable;
    if (updates.unitsReserved !== undefined) mapped.units_reserved = updates.unitsReserved;
    if (updates.status) mapped.status = updates.status;

    const { error } = await supabase.from('blood_inventory').update(mapped).eq('id', id);
    if (error) throw error;
  },

  // ─── Blood Requests ────────────────────────────────────────
  async listRequests(): Promise<BloodRequest[]> {
    const { data, error } = await supabase
      .from('blood_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapRequestRow);
  },

  async createRequest(req: Omit<BloodRequest, 'id' | 'createdAt'>): Promise<BloodRequest> {
    const { data, error } = await supabase
      .from('blood_requests')
      .insert({
        clinic_id: req.clinicId,
        patient_id: req.patientId ?? null,
        patient_name: req.patientName,
        blood_group: req.bloodGroup,
        component: req.component,
        units_requested: req.unitsRequested,
        urgency: req.urgency,
        status: req.status || 'Pending',
        requested_by: req.requestedBy,
        notes: req.notes ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return mapRequestRow(data);
  },

  async updateRequestStatus(id: string, status: BloodRequest['status']): Promise<void> {
    const { error } = await supabase.from('blood_requests').update({ status }).eq('id', id);
    if (error) throw error;
  },

  // ─── Aggregate: Blood Stock Matrix ─────────────────────────
  async getStockMatrix(): Promise<Record<BloodGroup, { available: number; reserved: number; expiringSoon: number }>> {
    const items = await this.listInventory();
    const groups: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const matrix: Record<string, { available: number; reserved: number; expiringSoon: number }> = {};
    groups.forEach(g => { matrix[g] = { available: 0, reserved: 0, expiringSoon: 0 }; });

    items.forEach(item => {
      if (item.status === 'Expired' || item.status === 'Used') return;
      const entry = matrix[item.bloodGroup];
      if (!entry) return;
      entry.available += item.unitsAvailable;
      entry.reserved += item.unitsReserved;
      if (new Date(item.expiryDate) <= weekFromNow) entry.expiringSoon += item.unitsAvailable;
    });

    return matrix as Record<BloodGroup, { available: number; reserved: number; expiringSoon: number }>;
  },
};

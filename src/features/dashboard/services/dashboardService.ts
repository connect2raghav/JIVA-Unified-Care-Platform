/**
 * JIVA — Dashboard Service
 * Fetches real KPI data from Supabase for the admin dashboard.
 */
import { supabase } from '@/lib/supabaseClient';
import type { DashboardKPI, BloodGroup } from '@/types/domain';

export const dashboardService = {
  async getKPIs(clinicId: string): Promise<DashboardKPI> {
    const today = new Date().toISOString().split('T')[0];

    // Parallel queries for performance
    const [
      patientsRes,
      appointmentsRes,
      emergenciesRes,
      ambulancesRes,
      bloodRes,
      bloodRequestsRes,
      facilitiesRes,
    ] = await Promise.all([
      supabase.from('patients').select('id', { count: 'exact', head: true }).eq('clinic_id', clinicId),
      supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('clinic_id', clinicId).gte('date_time', `${today}T00:00:00`).lte('date_time', `${today}T23:59:59`),
      supabase.from('emergency_requests').select('id', { count: 'exact', head: true }).eq('clinic_id', clinicId).not('status', 'in', '("Resolved","Cancelled")'),
      supabase.from('ambulances').select('id', { count: 'exact', head: true }).eq('clinic_id', clinicId).eq('status', 'Available'),
      supabase.from('blood_inventory').select('blood_group, units_available').eq('clinic_id', clinicId).eq('status', 'Available'),
      supabase.from('blood_requests').select('id', { count: 'exact', head: true }).eq('clinic_id', clinicId).eq('status', 'Pending'),
      supabase.from('facilities').select('id', { count: 'exact', head: true }).eq('clinic_id', clinicId),
    ]);

    // Calculate low blood groups (< 5 units total)
    const bloodByGroup: Record<string, number> = {};
    (bloodRes.data || []).forEach((item: any) => {
      bloodByGroup[item.blood_group] = (bloodByGroup[item.blood_group] || 0) + item.units_available;
    });
    const allGroups: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const lowGroups = allGroups.filter(g => (bloodByGroup[g] || 0) < 5);
    const totalBloodUnits = Object.values(bloodByGroup).reduce((sum, v) => sum + v, 0);

    return {
      totalPatients: patientsRes.count || 0,
      appointmentsToday: appointmentsRes.count || 0,
      activeEmergencies: emergenciesRes.count || 0,
      ambulancesAvailable: ambulancesRes.count || 0,
      bloodUnitsLow: lowGroups,
      occupancyRate: 0,
      totalBloodUnits,
      pendingBloodRequests: bloodRequestsRes.count || 0,
      nearbyFacilities: facilitiesRes.count || 0,
    };
  },

  async getRecentAppointments(clinicId: string, limit = 5) {
    const { data } = await supabase
      .from('appointments')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('date_time', { ascending: false })
      .limit(limit);
    return data || [];
  },

  async getRecentEmergencies(clinicId: string, limit = 5) {
    const { data } = await supabase
      .from('emergency_requests')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false })
      .limit(limit);
    return data || [];
  },
};

import { supabase } from '@/lib/supabaseClient';
import type { Facility } from '@/types';

type FacilityRow = {
  id: string;
  clinic_id: string;
  name: string;
  type: Facility['type'];
  address: string;
  phone: string | null;
  email: string | null;
  distance: string | null;
  icu_beds_available: number | null;
  emergency_capable: boolean | null;
  operating_hours: string | null;
  specialties: string[] | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
};

function mapFacility(row: FacilityRow): Facility {
  return {
    id: row.id,
    clinicId: row.clinic_id,
    name: row.name,
    type: row.type,
    address: row.address,
    phone: row.phone ?? '',
    email: row.email ?? undefined,
    distance: row.distance ?? undefined,
    icuBedsAvailable: row.icu_beds_available ?? undefined,
    emergencyCapable: row.emergency_capable ?? false,
    operatingHours: row.operating_hours ?? undefined,
    specialties: row.specialties ?? undefined,
    coordinates: row.lat !== null && row.lng !== null ? { lat: row.lat, lng: row.lng } : undefined,
    createdAt: row.created_at,
  };
}

export const facilitiesService = {
  async listByClinic(clinicId: string): Promise<Facility[]> {
    const { data, error } = await supabase
      .from('facilities')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('name', { ascending: true });

    if (error) throw error;
    return (data as FacilityRow[]).map(mapFacility);
  },
};
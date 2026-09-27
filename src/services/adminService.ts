import type { ClinicSettings, ActivityLog } from '../types';
import { supabase } from '../lib/supabaseClient';

const DEFAULT_SETTINGS: ClinicSettings = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Core Dental Headquarters',
  logoUrl: '',
  address: '101 Medical Center Drive, Suite 400',
  phone: '(555) 500-1000',
  email: 'hq@dcip.org',
  workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  openingTime: '08:00',
  closingTime: '17:00',
  appointmentDuration: 30,
  holidays: ['2026-12-25', '2026-01-01'],
  emergencyContact: '(555) 500-9999',
};

const DEFAULT_ACTIVITIES: ActivityLog[] = [];

export const adminService = {
  getClinicSettings: async (): Promise<ClinicSettings> => {
    try {
      // 1. Check local cache to reduce API calls
      const cached = localStorage.getItem('dcip_clinic_settings');
      if (cached) {
        // We can parse and return it instantly, and optionally refresh in background
        const parsed = JSON.parse(cached);
        // Fire background refresh
        supabase.from('clinics').select('*').single().then(({ data, error }) => {
          if (!error && data) {
            const fresh = {
              ...parsed,
              name: data.name,
              address: data.address || '',
              phone: data.phone || '',
              email: data.email || '',
              workingDays: data.working_days || DEFAULT_SETTINGS.workingDays,
              openingTime: (data.opening_time || DEFAULT_SETTINGS.openingTime).substring(0, 5),
              closingTime: (data.closing_time || DEFAULT_SETTINGS.closingTime).substring(0, 5),
              appointmentDuration: data.appointment_duration || DEFAULT_SETTINGS.appointmentDuration,
              holidays: data.holidays || DEFAULT_SETTINGS.holidays,
              emergencyContact: data.emergency_contact || DEFAULT_SETTINGS.emergencyContact,
              clinicCode: data.clinic_code,
              logoUrl: data.logo_url || '',
            };
            localStorage.setItem('dcip_clinic_settings', JSON.stringify(fresh));
          }
        });
        return parsed;
      }

      const { data, error } = await supabase
        .from('clinics')
        .select('*')
        .single();
      
      if (error || !data) return DEFAULT_SETTINGS;
      
      // Parse database schema format into app type
      const settings = {
        id: data.id,
        name: data.name,
        address: data.address || '',
        phone: data.phone || '',
        email: data.email || '',
        workingDays: data.working_days || DEFAULT_SETTINGS.workingDays,
        openingTime: (data.opening_time || DEFAULT_SETTINGS.openingTime).substring(0, 5),
        closingTime: (data.closing_time || DEFAULT_SETTINGS.closingTime).substring(0, 5),
        appointmentDuration: data.appointment_duration || DEFAULT_SETTINGS.appointmentDuration,
        holidays: data.holidays || DEFAULT_SETTINGS.holidays,
        emergencyContact: data.emergency_contact || DEFAULT_SETTINGS.emergencyContact,
        clinicCode: data.clinic_code,
        logoUrl: data.logo_url || '',
      };
      
      localStorage.setItem('dcip_clinic_settings', JSON.stringify(settings));
      return settings;
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  updateClinicSettings: async (settings: ClinicSettings): Promise<ClinicSettings> => {
    try {
      const { error } = await supabase
        .from('clinics')
        .update({
          name: settings.name,
          address: settings.address,
          phone: settings.phone,
          email: settings.email,
          working_days: settings.workingDays,
          opening_time: settings.openingTime,
          closing_time: settings.closingTime,
          appointment_duration: settings.appointmentDuration,
          holidays: settings.holidays,
          emergency_contact: settings.emergencyContact,
          logo_url: settings.logoUrl,
        })
        .eq('id', settings.id);

      if (error) throw error;
      
      // Update local cache
      localStorage.setItem('dcip_clinic_settings', JSON.stringify(settings));
      
      return settings;
    } catch (err) {
      console.error('Failed to update clinic configurations in Supabase:', err);
      // Fallback
      localStorage.setItem('dcip_clinic_settings', JSON.stringify(settings));
      return settings;
    }
  },

  getRecentActivities: async (): Promise<ActivityLog[]> => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error || !data) return DEFAULT_ACTIVITIES;

      return data.map((log: any) => ({
        id: log.id,
        userEmail: log.user_email || 'system@dcip.org',
        userName: log.user_name || 'System Operator',
        action: log.action,
        description: log.description,
        timestamp: log.created_at,
      }));
    } catch {
      return DEFAULT_ACTIVITIES;
    }
  },

  logActivity: async (action: string, description: string, userEmail?: string, userName?: string): Promise<void> => {
    const newLog: ActivityLog = {
      id: `act-${Math.random().toString(36).substring(2, 9)}`,
      userEmail: userEmail || 'system@dcip.org',
      userName: userName || 'System Operator',
      action,
      description,
      timestamp: new Date().toISOString(),
    };

    try {
      await supabase.from('audit_logs').insert([{
        action,
        description,
        user_email: newLog.userEmail,
        user_name: newLog.userName,
        entity: 'system',
      }]);
    } catch (err) {
      console.error('Failed to write audit log entry in Supabase:', err);
    }
  },

  uploadLogo: async (file: File): Promise<{ success: boolean; url?: string; error?: string }> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `clinic-logo-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;
      
      let uploadResult = await supabase.storage
        .from('public') 
        .upload(filePath, file);

      if (uploadResult.error) {
        // Fallback to base64 if the bucket doesn't exist or RLS blocks the upload
        console.warn('Storage upload failed, falling back to base64:', uploadResult.error.message);
        return new Promise((resolve) => {
           const reader = new FileReader();
           reader.onloadend = () => {
              resolve({ success: true, url: reader.result as string });
           };
           reader.onerror = () => {
              resolve({ success: false, error: 'Failed to read file for base64 fallback' });
           };
           reader.readAsDataURL(file);
        });
      }
      
      const { data: urlData } = supabase.storage.from('public').getPublicUrl(filePath);
      
      return { success: true, url: urlData.publicUrl };
    } catch (err: any) {
      console.error('Failed to upload logo:', err);
      return { success: false, error: err.message || 'Failed to upload logo to Supabase.' };
    }
  },

  getAllUsers: async (): Promise<any[]> => {
    try {
      const { data, error } = await supabase.from('users').select('*');
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Failed to fetch users:', err);
      return [];
    }
  },
};

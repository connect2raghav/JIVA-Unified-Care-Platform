import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';
import type { UserProfile, UserRole } from '../types';
import type { Session } from '@supabase/supabase-js';

let authSubscription: any = null;

// Define permissions structure mapping roles to their rights
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  'ClinicAdmin': [
    'manage_users',
    'manage_clinic',
    'view_reports',
    'view_all_patients',
    'view_all_appointments',
    'system_settings',
    'clinical_records',
    'emergency_dispatch',
    'blood_bank',
    'facilities'
  ],
  'SuperAdmin': [
    'platform_management',
    'manage_clinics',
    'manage_platform_users',
    'view_platform_audit'
  ],
  'Physician': [
    'view_assigned_patients',
    'clinical_records',
    'view_reports',
    'emergency_dispatch',
    'blood_bank'
  ],
  'Receptionist': [
    'view_all_patients',
    'view_all_appointments',
    'emergency_dispatch'
  ],
  'BloodBankManager': [
    'blood_bank',
    'view_reports',
    'facilities'
  ],
  'AmbulanceDriver': [
    'emergency_dispatch',
    'view_dispatch_requests'
  ],
  'LabTechnician': [
    'view_all_patients',
    'clinical_records',
    'view_reports'
  ],
  'Patient': [
    'view_own_profile',
    'view_own_appointments',
    'book_appointment',
    'view_own_reports'
  ],
  // Legacy role mappings for backward compatibility
  'Dentist': [
    'manage_users', 'manage_clinic', 'view_reports',
    'view_all_patients', 'view_all_appointments',
    'system_settings', 'clinical_records'
  ],
  'Super Admin': [
    'platform_management', 'manage_clinics',
    'manage_platform_users', 'view_platform_audit'
  ],
  'Other Dentist': [
    'view_assigned_patients', 'clinical_records', 'view_reports'
  ],
  'Dental Assistant': [
    'view_all_patients', 'clinical_records'
  ]
};



interface AuthState {
  user: UserProfile | null;
  session: Session | null;
  role: UserRole | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  initializeAuth: () => Promise<void>;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  loginDemo: (role: UserRole) => void;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  hasPermission: (permission: string) => boolean;
  switchRole: (role: UserRole) => void;
  platformLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
}


export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  role: null,
  permissions: [],
  isAuthenticated: false,
  isLoading: true,

  initializeAuth: async () => {
    set({ isLoading: true });

    // Check if prototype demo account is active in localStorage
    const savedDemo = localStorage.getItem('jiva_demo_user');
    if (savedDemo) {
      try {
        const parsed = JSON.parse(savedDemo) as UserProfile;
        if (parsed && parsed.role) {
          set({
            user: parsed,
            role: parsed.role,
            permissions: parsed.custom_permissions ?? (ROLE_PERMISSIONS[parsed.role] || []),
            isAuthenticated: true,
            isLoading: false
          });
          return;
        }
      } catch (err) {
        console.warn('Could not parse demo user, proceeding to Supabase check', err);
      }
    }

    try {
      // 1. Get initial session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Fetch profile
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          if (!profile.is_active || profile.is_locked) {
            await supabase.auth.signOut();
            set({ user: null, role: null, permissions: [], isAuthenticated: false, session: null });
            return;
          }
          
          if (profile.role !== 'Super Admin') {
            if (!profile.clinic_id) {
              await supabase.auth.signOut();
              set({ user: null, role: null, permissions: [], isAuthenticated: false, session: null });
              return;
            }
            
            const { data: clinic, error: clinicError } = await supabase.from('clinics').select('is_active').eq('id', profile.clinic_id).single();
            if (clinicError || !clinic || !clinic.is_active) {
              await supabase.auth.signOut();
              set({ user: null, role: null, permissions: [], isAuthenticated: false, session: null });
              return;
            }
          }

          const matchedRole = profile.role || 'ClinicAdmin'; // fallback
          set({
            session,
            user: profile as UserProfile,
            role: matchedRole as UserRole,
            permissions: (profile as UserProfile).custom_permissions ?? (ROLE_PERMISSIONS[matchedRole as UserRole] || []),
            isAuthenticated: true,
          });
        } else {
          // If supabase auth session exists but user profile isn't found, deny access
          await supabase.auth.signOut();
          set({
            user: null,
            role: null,
            permissions: [],
            isAuthenticated: false,
            session: null
          });
        }
      }

      // 2. Setup auth change subscription (token refresh automatic)
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, currentSession) => {
        set({ session: currentSession });
        
        if (currentSession) {
          try {
            const { data: profile, error } = await supabase
              .from('users')
              .select('*')
              .eq('id', currentSession.user.id)
              .single();

            // Only update user state if we successfully fetched the profile (prevents wiping state on network flakes)
            if (profile && !error) {
              if (!profile.is_active || profile.is_locked) {
                set({ user: null, role: null, permissions: [], isAuthenticated: false });
                await supabase.auth.signOut();
                return;
              }
              
              if (profile.role !== 'Super Admin') {
                if (!profile.clinic_id) {
                  set({ user: null, role: null, permissions: [], isAuthenticated: false });
                  await supabase.auth.signOut();
                  return;
                }

                const { data: clinic, error: clinicError } = await supabase.from('clinics').select('is_active').eq('id', profile.clinic_id).single();
                if (clinicError || !clinic || !clinic.is_active) {
                  set({ user: null, role: null, permissions: [], isAuthenticated: false });
                  await supabase.auth.signOut();
                  return;
                }
              }

              const mappedRole = ((profile.role as string) || get().role || 'ClinicAdmin').trim();
              set({
                user: { ...profile, role: mappedRole } as UserProfile,
                role: mappedRole as UserRole,
                permissions: (profile as UserProfile).custom_permissions ?? (ROLE_PERMISSIONS[mappedRole as UserRole] || []),
                isAuthenticated: true,
              });
            }
          } catch (e) {
            console.error('Failed to sync auth state', e);
          }
        } else {
          // Prototype demo sessions run without a Supabase session; don't wipe them
          if (localStorage.getItem('jiva_demo_user') && get().user) {
            return;
          }
          set({
            user: null,
            role: null,
            permissions: [],
            isAuthenticated: false,
          });
        }
      });
      authSubscription = subscription;

    } catch (err) {
      console.error('Failed to initialize Supabase auth listener:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (email, password, rememberMe = false) => {
    set({ isLoading: true });
    const normalizedEmail = email.toLowerCase().trim();

    try {
      // Supabase Authenticate
      let { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: password
      });

      if (error) {
        set({ isLoading: false });
        return { success: false, error: error.message };
      }

      // Read profile
      if (data && data.user) {
        const { data: profile, error: dbError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (dbError || !profile) {
          await supabase.auth.signOut();
          set({ isLoading: false });
          return { success: false, error: 'User profile not found or access denied. Please contact administration.' };
        }
        activeProfile = profile;
      }

      const profile = activeProfile;

      if (profile.is_locked) {
        await supabase.auth.signOut();
        set({ isLoading: false });
        return { success: false, error: 'Account locked. Contact clinic administrator.' };
      }

      if (!profile.is_active) {
        await supabase.auth.signOut();
        set({ isLoading: false });
        return { success: false, error: 'Account deactivated.' };
      }

      // Check if clinic is deleted or suspended
      if (profile.role !== 'Super Admin') {
        if (!profile.clinic_id) {
          await supabase.auth.signOut();
          set({ isLoading: false });
          return { success: false, error: 'Your clinic has been deleted. Please contact platform administration.' };
        }

        const { data: clinic, error: clinicError } = await supabase
          .from('clinics')
          .select('is_active')
          .eq('id', profile.clinic_id)
          .single();

        if (clinicError || !clinic || !clinic.is_active) {
          await supabase.auth.signOut();
          set({ isLoading: false });
          return { success: false, error: 'Your clinic has been suspended or deleted. Please contact platform administration.' };
        }
      }

      // Update last login
      await supabase
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', profile.id);

      const mappedRole = profile.role;

      set({
        user: { ...profile, role: mappedRole } as UserProfile,
        role: mappedRole as UserRole,
        permissions: ROLE_PERMISSIONS[mappedRole as UserRole] || [],
        isAuthenticated: true,
        isLoading: false,
      });

      return { success: true };
    } catch (err: any) {
      set({ isLoading: false });
      return { success: false, error: err.message || 'An error occurred during login.' };
    }
  },

  platformLogin: async (email, password) => {
    set({ isLoading: true });
    const normalizedEmail = email.toLowerCase().trim();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password
      });

      if (error) {
        set({ isLoading: false });
        return { success: false, error: error.message };
      }

      const { data: profile, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (dbError || !profile || profile.role !== 'Super Admin') {
        await supabase.auth.signOut();
        set({ isLoading: false });
        return { success: false, error: 'Access Denied: Super Admin credentials required.' };
      }

      if (profile.is_locked || !profile.is_active) {
        await supabase.auth.signOut();
        set({ isLoading: false });
        return { success: false, error: 'Account is locked or deactivated.' };
      }

      await supabase
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', profile.id);

      set({
        user: profile as UserProfile,
        role: 'Super Admin',
        permissions: ROLE_PERMISSIONS['Super Admin'],
        isAuthenticated: true,
        isLoading: false,
      });

      return { success: true };
    } catch (err: any) {
      set({ isLoading: false });
      return { success: false, error: err.message || 'An error occurred during platform login.' };
    }
  },



  logout: async () => {
    set({ isLoading: true });

    try {
      localStorage.removeItem('jiva_demo_user');
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error during Supabase signout:', err);
    } finally {
      localStorage.removeItem('dcip_demo_user');
      set({
        user: null,
        session: null,
        role: null,
        permissions: [],
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  forgotPassword: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  resetPassword: async (password) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  hasPermission: (permission) => {
    return get().permissions.includes(permission);
  },

  switchRole: (role) => {
    const updatedPermissions = ROLE_PERMISSIONS[role] || [];
    set((state) => {
      if (!state.user) return state;
      const updatedUser = { ...state.user, role };
      return {
        user: updatedUser,
        role,
        permissions: updatedUser.custom_permissions ?? (ROLE_PERMISSIONS[role] || []),
      };
    });
  }
}));

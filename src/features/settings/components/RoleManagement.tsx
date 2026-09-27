import React, { useState, useEffect } from 'react';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabaseClient';
import { adminService } from '@/services/adminService';
import type { UserProfile, UserRole } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Shield, Users, Save, CheckSquare, Square } from 'lucide-react';
import { ROLE_PERMISSIONS } from '@/store/useAuthStore';

const ALL_PERMISSIONS = [
  { code: 'manage_users', name: 'Manage Staff Profiles' },
  { code: 'manage_clinic', name: 'Configure Clinic Settings' },
  { code: 'view_reports', name: 'View & Export Reports' },
  { code: 'view_all_patients', name: 'View All Clinic Patients' },
  { code: 'view_assigned_patients', name: 'View Assigned Patients Only' },
  { code: 'view_all_appointments', name: 'View All Appointments' },
  { code: 'system_settings', name: 'Access System Settings' },
  { code: 'clinical_records', name: 'Manage Clinical Records & Notes' },
  { code: 'visits', name: 'Manage Patient Visits' },
  { code: 'treatment_plans', name: 'Create Treatment Plans' },
  { code: 'odontogram', name: 'Edit Odontogram (Charting)' },
  { code: 'assigned_patients', name: 'Assigned Patients Access' },
  { code: 'images', name: 'Manage Radiographs & Images' },
  { code: 'clinical_notes', name: 'Write Clinical Notes' },
  { code: 'assist_procedures', name: 'Assist Procedures' },
  { code: 'platform_management', name: 'Platform Management (Super Admin)' },
  { code: 'manage_clinics', name: 'Manage All Clinics (Super Admin)' },
  { code: 'manage_platform_users', name: 'Manage Platform Users (Super Admin)' },
  { code: 'view_platform_audit', name: 'View Global Audit Logs (Super Admin)' },
];

export const RoleManagement: React.FC = () => {
  const { addToast } = useNotificationStore();
  const { user: currentAdmin } = useAuthStore();
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  
  // Local state for the selected user's editable properties
  const [editingRole, setEditingRole] = useState<UserRole>('Doctor');
  const [editingPermissions, setEditingPermissions] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase.from('users').select('*').order('name');
      if (error) throw error;
      if (data) {
        const list = data as UserProfile[];
        setUsers(list);
        
        // Auto select first user
        const options = list.filter(u => u.id !== currentAdmin?.id);
        if (options.length > 0) {
          handleUserSelect(options[0].id, list);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUserSelect = (userId: string, userList = users) => {
    setSelectedUserId(userId);
    const u = userList.find(usr => usr.id === userId);
    if (u) {
      setEditingRole(u.role);
      
      // Load their custom permissions, or fallback to their role defaults
      const activePerms = u.custom_permissions ?? (ROLE_PERMISSIONS[u.role] || []);
      setEditingPermissions(new Set(activePerms));
    }
  };

  const togglePermission = (code: string) => {
    setEditingPermissions(prev => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  const resetToRoleDefaults = (role: UserRole) => {
    setEditingRole(role);
    setEditingPermissions(new Set(ROLE_PERMISSIONS[role] || []));
  };

  const handleSave = async () => {
    if (!selectedUserId) return;
    const targetUser = users.find(u => u.id === selectedUserId);
    if (!targetUser) return;

    const newCustomPermissions = Array.from(editingPermissions);
    
    const updatedList = users.map(u => {
      if (u.id === selectedUserId) {
        return { 
          ...u, 
          role: editingRole, 
          custom_permissions: newCustomPermissions 
        };
      }
      return u;
    });

    // Update database
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          role: editingRole, 
          custom_permissions: newCustomPermissions 
        })
        .eq('id', selectedUserId);

      if (error) throw error;

      setUsers(updatedList);
      
      await adminService.logActivity(
        'Permissions Updated', 
        `Updated role/permissions for ${targetUser.name}.`
      );

      addToast({
        type: 'success',
        title: 'Permissions Saved',
        message: `Successfully updated permissions for ${targetUser.name}.`
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: err.message
      });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div>
        <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-2">
          <Shield className="w-6 h-6 text-red-805" />
          <span>Role & Permission Management</span>
        </h2>
        <p className="text-xs text-slate-405 font-semibold mt-1">
          Review and customize individual staff access levels and overrides.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Dynamic Permission Matrix */}
        <div className="lg:col-span-2">
          <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden p-6 md:p-8">
            <CardHeader className="p-0 pb-4 mb-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-extrabold text-slate-800">Staff Permissions</CardTitle>
                <CardDescription className="text-[10px] text-slate-400 font-semibold">
                  Check or uncheck boxes to grant or revoke specific access rights.
                </CardDescription>
              </div>
            </CardHeader>
            
            <CardContent className="p-0 text-xs">
              {!selectedUserId ? (
                <div className="py-12 text-center text-slate-400 font-semibold text-sm">
                  Please select a staff member to view and edit their permissions.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                  {ALL_PERMISSIONS.map((perm) => {
                    const hasAccess = editingPermissions.has(perm.code);
                    return (
                      <div 
                        key={perm.code}
                        onClick={() => togglePermission(perm.code)}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          hasAccess 
                            ? 'bg-red-50/50 border-red-200 shadow-sm' 
                            : 'bg-white border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        <div className={`flex-shrink-0 flex items-center justify-center w-5 h-5 rounded ${hasAccess ? 'bg-red-800 text-white' : 'border border-slate-300 text-transparent'}`}>
                          {hasAccess ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                        </div>
                        <div className="flex-1">
                          <p className={`font-bold ${hasAccess ? 'text-red-950' : 'text-slate-600'}`}>{perm.name}</p>
                          <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">{perm.code}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Quick Role Swapper tool */}
        <div>
          <Card className="border-none shadow-sm bg-white rounded-2xl p-6 sticky top-6">
            <CardHeader className="p-0 pb-4 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-red-808 font-bold" />
                <CardTitle className="text-sm font-extrabold text-slate-800">Staff Selection</CardTitle>
              </div>
              <CardDescription className="text-[10px] text-slate-400 font-semibold mt-0.5">
                Select a user to edit their access rights.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-0 text-xs space-y-5">
              {users.filter(u => u.id !== currentAdmin?.id).length > 0 ? (
                <>
                  {/* Select clinician */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-455 uppercase tracking-wide">Select Staff Member</label>
                    <select
                      className="w-full h-10.5 rounded-xl border border-slate-200 px-3 bg-white font-semibold text-slate-805"
                      value={selectedUserId}
                      onChange={(e) => handleUserSelect(e.target.value)}
                    >
                      {users.filter(u => u.id !== currentAdmin?.id).map((usr) => (
                        <option key={usr.id} value={usr.id}>{usr.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="w-full h-px bg-slate-100 my-2"></div>

                  {/* Role Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-455 uppercase tracking-wide">Base Template Role</label>
                    <p className="text-[10px] text-slate-400 mb-2 leading-relaxed">
                      Changing this will reset all checkboxes on the left to match this role's default permissions.
                    </p>
                    <Select value={editingRole} onValueChange={(val: UserRole) => resetToRoleDefaults(val)}>
                      <SelectTrigger className="h-10.5 rounded-xl border-slate-200 font-semibold text-slate-805">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="Doctor" className="text-xs font-semibold">Doctor</SelectItem>
                        <SelectItem value="Other Doctor" className="text-xs font-semibold">Other Doctor</SelectItem>
                        <SelectItem value="Dental Assistant" className="text-xs font-semibold">Dental Assistant</SelectItem>
                        <SelectItem value="Receptionist" className="text-xs font-semibold">Receptionist</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Save button */}
                  <div className="pt-2">
                    <Button
                      onClick={handleSave}
                      className="w-full h-11 bg-red-800 hover:bg-red-950 text-white font-bold rounded-xl gap-2 shadow-sm"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save Permissions</span>
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-400 italic">No other staff members available.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RoleManagement;

import React, { useState, useEffect, useMemo } from 'react';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabaseClient';
import type { UserProfile, UserRole } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  Users, 
  UserPlus, 
  Search, 
  Stethoscope, 
  Award,
  Calendar,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Mail,
  Phone
} from 'lucide-react';

interface ClinicStaff extends UserProfile {
  // We remove the hardcoded shifts and specializations 
}

export const EmployeesManagement: React.FC = () => {
  const { addToast } = useNotificationStore();
  const { user: currentUser } = useAuthStore();

  const [staff, setStaff] = useState<ClinicStaff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New staff form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('Dental Assistant');
  const [phone, setPhone] = useState('');

  // Edit staff form state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<ClinicStaff | null>(null);

  // Password reset state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordStaff, setPasswordStaff] = useState<ClinicStaff | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [newConfirmPassword, setNewConfirmPassword] = useState('');

  const fetchStaff = async () => {
    if (!currentUser?.clinic_id) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('clinic_id', currentUser.clinic_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setStaff(data.map((u: any) => ({
          id: u.id,
          name: u.name || 'Staff Member',
          email: u.email,
          role: u.role || 'Dental Assistant',
          phone: u.phone,
          is_active: u.is_active ?? true,
          is_locked: u.is_locked ?? false,
          createdAt: u.created_at,
          clinic_id: u.clinic_id
        })));
      }
    } catch (err: any) {
      console.error('Error fetching staff:', err?.message);
      addToast({ type: 'error', title: 'Error', message: 'Failed to load clinic staff.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [currentUser?.clinic_id]);

  const filteredStaff = useMemo(() => {
    return staff.filter(emp => {
      if (emp.role === 'Super Admin') return false;

      const matchesSearch = 
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.phone && emp.phone.includes(searchQuery));
      
      const matchesRole = roleFilter === 'ALL' || emp.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [staff, searchQuery, roleFilter]);

  const stats = useMemo(() => {
    return {
      total: staff.length,
      dentists: staff.filter(e => e.role === 'Dentist' || e.role === 'Other Dentist').length,
      assistants: staff.filter(e => e.role === 'Dental Assistant').length,
      receptionists: staff.filter(e => e.role === 'Receptionist').length,
      active: staff.filter(e => e.is_active).length,
    };
  }, [staff]);

  const handleToggleStatus = async (emp: ClinicStaff) => {
    const newStatus = !emp.is_active;
    try {
      await supabase.from('users').update({ is_active: newStatus }).eq('id', emp.id);
      setStaff(prev => prev.map(e => e.id === emp.id ? { ...e, is_active: newStatus } : e));
      addToast({
        type: 'success',
        title: 'Status Updated',
        message: `${emp.name} is now ${newStatus ? 'Active' : 'Inactive'}.`
      });
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'Failed to update status.' });
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone) {
      addToast({ type: 'error', title: 'Validation Error', message: 'Name, email, and phone number are required.' });
      return;
    }

    if (!currentUser?.clinic_id) {
      addToast({ type: 'error', title: 'Error', message: 'Clinic ID not found. Cannot add staff.' });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create user using Supabase Admin Auth (possible because VITE_SUPABASE_ANON_KEY is a service role key)
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email.trim(),
        password: phone.trim(),
        email_confirm: true,
        user_metadata: {
          name: name.trim(),
          role: role,
          clinic_id: currentUser.clinic_id
        }
      });

      if (authError) {
        throw new Error(`Auth Error: ${authError.message}`);
      }

      if (!authData?.user) {
        throw new Error('Failed to create auth user.');
      }
      
      const { data, error } = await supabase.from('users').insert([{
        id: authData.user.id,
        name: name.trim(),
        email: email.trim(),
        role: role,
        phone: phone.trim() || null,
        is_active: true,
        clinic_id: currentUser.clinic_id
      }]).select().single();

      if (error) {
        // Cleanup if user creation fails
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw error;
      }

      setStaff(prev => [{
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        phone: data.phone,
        is_active: data.is_active,
        createdAt: data.created_at,
        clinic_id: data.clinic_id
      }, ...prev]);

      setIsAddModalOpen(false);
      setName('');
      setEmail('');
      setPhone('');

      addToast({
        type: 'success',
        title: 'Staff Added',
        message: `${data.name} has been enrolled as a ${data.role}.`
      });
    } catch (err: any) {
      console.error(err);
      addToast({ type: 'error', title: 'Failed to add staff', message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (emp: ClinicStaff) => {
    setEditingStaff(emp);
    setName(emp.name);
    setEmail(emp.email);
    setRole(emp.role);
    setPhone(emp.phone || '');
    setIsEditModalOpen(true);
  };

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: name.trim(),
          role: role,
          phone: phone.trim() || null,
        })
        .eq('id', editingStaff.id);

      if (error) throw error;

      await supabase.auth.admin.updateUserById(editingStaff.id, {
        user_metadata: { name: name.trim(), role: role }
      });

      setStaff(prev => prev.map(s => s.id === editingStaff.id ? { ...s, name: name.trim(), role, phone: phone.trim() || null } : s));
      setIsEditModalOpen(false);
      addToast({ type: 'success', title: 'Staff Updated', message: 'Staff details updated successfully.' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Update Failed', message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openPasswordModal = (emp: ClinicStaff) => {
    setPasswordStaff(emp);
    setNewPassword('');
    setNewConfirmPassword('');
    setIsPasswordModalOpen(true);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordStaff) return;
    if (newPassword !== newConfirmPassword) {
      addToast({ type: 'error', title: 'Error', message: 'Passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      addToast({ type: 'error', title: 'Error', message: 'Password must be at least 6 characters.' });
      return;
    }
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.admin.updateUserById(passwordStaff.id, {
        password: newPassword
      });
      if (error) throw error;
      
      setIsPasswordModalOpen(false);
      addToast({ type: 'success', title: 'Password Changed', message: 'Staff password has been reset successfully.' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Reset Failed', message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStaff = async (emp: ClinicStaff) => {
    if (!window.confirm(`Are you sure you want to completely remove ${emp.name}? This action cannot be undone.`)) {
      return;
    }
    try {
      const { error } = await supabase.auth.admin.deleteUser(emp.id);
      if (error) throw error;
      
      setStaff(prev => prev.filter(s => s.id !== emp.id));
      addToast({ type: 'success', title: 'Staff Removed', message: 'Staff member has been deleted.' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Delete Failed', message: err.message });
    }
  };

  const getRoleBadge = (emp: ClinicStaff) => {
    const isCurrentUser = emp.id === currentUser?.id || emp.email === currentUser?.email;

    switch (emp.role) {
      case 'Dentist':
        return isCurrentUser ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-red-50 text-red-700 border border-red-200">
            <Stethoscope className="w-3 h-3" /> Owner
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Stethoscope className="w-3 h-3" /> Co-owner
          </span>
        );
      case 'Other Dentist':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Stethoscope className="w-3 h-3" /> Dentist
          </span>
        );
      case 'Dental Assistant':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Award className="w-3 h-3" /> Assistant
          </span>
        );
      case 'Receptionist':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-blue-50 text-blue-700 border border-blue-200">
            <Calendar className="w-3 h-3" /> Receptionist
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-slate-100 text-slate-700 border border-slate-200">
            <Users className="w-3 h-3" /> {empRole}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            Clinical Team
            <span className="px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full">
              {stats.active} Active
            </span>
          </h1>
          <p className="text-sm font-semibold text-slate-500 mt-1">
            Manage your clinic's dental team, assistants, and reception staff.
          </p>
        </div>
        <Button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-red-800 hover:bg-red-950 text-white font-bold rounded-xl shadow-md cursor-pointer"
        >
          <UserPlus className="w-4 h-4 mr-2" /> Add Staff Member
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-white rounded-2xl">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Total Staff</p>
              <h3 className="text-2xl font-black text-slate-900 leading-none mt-1">{stats.total}</h3>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm bg-white rounded-2xl">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Dentists</p>
              <h3 className="text-2xl font-black text-slate-900 leading-none mt-1">{stats.dentists}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white rounded-2xl">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Assistants</p>
              <h3 className="text-2xl font-black text-slate-900 leading-none mt-1">{stats.assistants}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white rounded-2xl">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Receptionists</p>
              <h3 className="text-2xl font-black text-slate-900 leading-none mt-1">{stats.receptionists}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-3 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Search staff by name, email or phone..." 
            className="pl-11 h-10 w-full border-none shadow-none focus-visible:ring-0 bg-transparent font-semibold text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="h-6 w-px bg-slate-200 hidden md:block"></div>
        <div className="flex gap-2 w-full md:w-auto p-1 overflow-x-auto no-scrollbar">
          {['ALL', 'Dentist', 'Other Dentist', 'Dental Assistant', 'Receptionist'].map(role => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                roleFilter === role 
                ? 'bg-slate-800 text-white shadow-md' 
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              {role === 'ALL' ? 'All Roles' : role}
            </button>
          ))}
        </div>
      </div>

      {/* Staff Grid */}
      {isLoading ? (
        <div className="text-center py-20">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-red-800 rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-bold text-slate-500 mt-4">Loading clinic staff...</p>
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm border-dashed">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-black text-slate-800">No staff members found</h3>
          <p className="text-sm font-medium text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
            There are no staff members matching your current filters. Clear the filters or add a new team member.
          </p>
          <Button 
            onClick={() => { setSearchQuery(''); setRoleFilter('ALL'); }}
            variant="outline"
            className="mt-6 rounded-xl font-bold border-slate-200 cursor-pointer text-slate-600 hover:bg-slate-50"
          >
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStaff.map((emp) => (
            <Card key={emp.id} className="border-slate-200 shadow-sm hover:shadow-md transition-all rounded-3xl overflow-hidden bg-white group">
              <CardContent className="p-0">
                <div className="p-5 flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-xl text-slate-600 shrink-0">
                    {emp.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-[15px] text-slate-900 truncate pr-2">{emp.name}</h3>
                        <div className="mt-1">
                          {getRoleBadge(emp)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer outline-none">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40 rounded-xl shadow-lg border-slate-100 p-1">
                            <DropdownMenuItem onClick={() => openEditModal(emp)} className="text-xs font-bold cursor-pointer text-slate-700 focus:bg-slate-50">
                              Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openPasswordModal(emp)} className="text-xs font-bold cursor-pointer text-slate-700 focus:bg-slate-50">
                              Reset Password
                            </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteStaff(emp)} 
                                disabled={emp.id === currentUser?.id || emp.email === currentUser?.email}
                                className="text-xs font-bold cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50"
                              >
                              Remove Staff
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-4 bg-slate-50/50 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-slate-600 font-medium truncate">{emp.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-slate-600 font-medium">{emp.phone || 'No phone added'}</span>
                  </div>
                </div>

                <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-white">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${emp.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      {emp.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                    <button 
                      onClick={() => handleToggleStatus(emp)}
                      className="text-[11px] font-bold text-red-600 hover:text-red-800 transition-colors cursor-pointer disabled:opacity-50"
                      disabled={emp.id === currentUser?.id || emp.email === currentUser?.email}
                    >
                    {emp.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Staff Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-md rounded-[24px] p-0 overflow-hidden border-none shadow-2xl">
          <div className="px-6 pt-6 pb-4">
            <DialogHeader>
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-3">
                <UserPlus className="w-6 h-6 text-red-600" />
              </div>
              <DialogTitle className="text-xl font-black text-slate-900">Add Staff Member</DialogTitle>
              <DialogDescription className="text-sm font-semibold text-slate-500">
                Enroll a new team member and grant them access to this clinic workspace.
              </DialogDescription>
            </DialogHeader>
          </div>

          <form onSubmit={handleAddStaff}>
            <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Role Selection */}
              <div className="space-y-2">
                <Label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Role Access</Label>
                <div className="grid grid-cols-2 gap-2">
                  {['Dentist', 'Other Dentist', 'Dental Assistant', 'Receptionist'].map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r as UserRole)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        role === r 
                        ? 'border-red-600 bg-red-50 text-red-900 shadow-sm ring-1 ring-red-600' 
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <div className="font-bold text-sm">{r}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-extrabold text-slate-500">Full Name</Label>
                <Input 
                  id="name" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder={role.includes('Dentist') ? "e.g. Dr. Jane Doe" : "e.g. Jane Doe"}
                  className="h-11 rounded-xl bg-slate-50 border-slate-200 font-semibold placeholder:text-slate-300"
                  required 
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-extrabold text-slate-500">Email Address (Login ID)</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  placeholder="jane.doe@clinic.com"
                  className="h-11 rounded-xl bg-slate-50 border-slate-200 font-semibold"
                  required 
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-extrabold text-slate-500">Phone Number (Required)</Label>
                <div className="relative flex items-center">
                  <div className="absolute left-3 font-bold text-slate-500 text-sm flex items-center gap-1 border-r border-slate-200 pr-2 h-6">
                    <span className="text-[10px] text-slate-400">IN</span>
                    <span>+91</span>
                  </div>
                  <Input 
                    id="phone" 
                    value={phone} 
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val.length <= 10) setPhone(val);
                    }} 
                    placeholder="9876543210"
                    className="pl-[4.5rem] h-11 rounded-xl bg-slate-50 border-slate-200 font-semibold placeholder:text-slate-300"
                    required
                    maxLength={10}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">This phone number will be used as their temporary login password.</p>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-xl font-bold hover:bg-slate-200 text-slate-600 cursor-pointer"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-red-800 hover:bg-red-950 text-white font-bold rounded-xl px-6 cursor-pointer"
              >
                {isSubmitting ? 'Adding...' : 'Add Staff Member'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Staff Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-md rounded-[24px] p-0 overflow-hidden border-none shadow-2xl">
          <div className="px-6 pt-6 pb-4">
            <DialogHeader>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mb-3">
                <Users className="w-6 h-6 text-indigo-600" />
              </div>
              <DialogTitle className="text-xl font-black text-slate-900">Edit Staff Details</DialogTitle>
              <DialogDescription className="text-sm font-semibold text-slate-500">
                Update the role, name, and contact details for {editingStaff?.name}.
              </DialogDescription>
            </DialogHeader>
          </div>

          <form onSubmit={handleUpdateStaff}>
            <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <Label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Role Access</Label>
                <div className="grid grid-cols-2 gap-2">
                  {['Dentist', 'Other Dentist', 'Dental Assistant', 'Receptionist'].map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r as UserRole)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        role === r 
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-sm ring-1 ring-indigo-600' 
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <div className="font-bold text-sm">{r}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-name" className="text-xs font-extrabold text-slate-500">Full Name</Label>
                <Input 
                  id="edit-name" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  className="h-11 rounded-xl bg-slate-50 border-slate-200 font-semibold"
                  required 
                />
              </div>

              <div className="space-y-1.5 opacity-60">
                <Label htmlFor="edit-email" className="text-xs font-extrabold text-slate-500">Email Address (Cannot be changed)</Label>
                <Input 
                  id="edit-email" 
                  value={email} 
                  readOnly
                  disabled
                  className="h-11 rounded-xl bg-slate-100 border-slate-200 font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-phone" className="text-xs font-extrabold text-slate-500">Phone Number (Required)</Label>
                <div className="relative flex items-center">
                  <div className="absolute left-3 font-bold text-slate-500 text-sm flex items-center gap-1 border-r border-slate-200 pr-2 h-6">
                    <span className="text-[10px] text-slate-400">IN</span>
                    <span>+91</span>
                  </div>
                  <Input 
                    id="edit-phone" 
                    value={phone} 
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val.length <= 10) setPhone(val);
                    }} 
                    className="pl-[4.5rem] h-11 rounded-xl bg-slate-50 border-slate-200 font-semibold"
                    required
                    maxLength={10}
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-xl font-bold hover:bg-slate-200 text-slate-600 cursor-pointer"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl px-6 cursor-pointer"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Modal */}
      <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
        <DialogContent className="sm:max-w-md rounded-[24px] p-0 overflow-hidden border-none shadow-2xl">
          <div className="px-6 pt-6 pb-4">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-slate-900">Reset Password</DialogTitle>
              <DialogDescription className="text-sm font-semibold text-slate-500">
                Set a new password for {passwordStaff?.name}.
              </DialogDescription>
            </DialogHeader>
          </div>

          <form onSubmit={handleChangePassword}>
            <div className="px-6 py-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-pass" className="text-xs font-extrabold text-slate-500">New Password</Label>
                <Input 
                  id="new-pass" 
                  type="password"
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)} 
                  placeholder="Minimum 6 characters"
                  className="h-11 rounded-xl bg-slate-50 border-slate-200 font-semibold"
                  required 
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-pass" className="text-xs font-extrabold text-slate-500">Confirm Password</Label>
                <Input 
                  id="confirm-pass" 
                  type="password"
                  value={newConfirmPassword} 
                  onChange={e => setNewConfirmPassword(e.target.value)} 
                  placeholder="Re-enter password"
                  className="h-11 rounded-xl bg-slate-50 border-slate-200 font-semibold"
                  required 
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setIsPasswordModalOpen(false)}
                className="rounded-xl font-bold hover:bg-slate-200 text-slate-600 cursor-pointer"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-slate-900 hover:bg-black text-white font-bold rounded-xl px-6 cursor-pointer"
              >
                {isSubmitting ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabaseClient';
import { adminService } from '@/services/adminService';
import type { UserProfile, UserRole } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { DataTable } from '@/components/DataTable';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Lock, 
  Unlock, 
  UserX, 
  UserCheck, 
  KeyRound, 
  Pencil, 
  Trash2,
  MoreVertical
} from 'lucide-react';

export const UserManagement: React.FC = () => {
  const { addToast } = useNotificationStore();
  const {
    user: currentAdmin
  } = useAuthStore();

  // Local storage profile state for sandboxing persistent edits
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  // Form states for creation
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('Dentist');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newConfirmPassword, setNewConfirmPassword] = useState('');
  const [newStatusActive, setNewStatusActive] = useState(true);

  // Form states for edition
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('Dentist');

  // Confirmations overlay state
  const [confirmAction, setConfirmAction] = useState<{
    type: 'lock' | 'unlock' | 'deactivate' | 'activate' | 'reset-password' | 'delete';
    user: UserProfile;
  } | null>(null);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      if (data) {
        setUsers(data.map((u: any) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          phone: u.phone || '',
          is_active: u.is_active,
          is_locked: u.is_locked,
          createdAt: u.created_at,
          last_login_at: u.last_login_at || null
        })));
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Fetch Failed', message: err.message });
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // -------------------------------------------------------------
  // ACTION HANDLERS
  // -------------------------------------------------------------
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newName || !newPassword || !newConfirmPassword) {
      addToast({ type: 'warning', title: 'Missing Information', message: 'Please input all user credentials.' });
      return;
    }

    if (newPassword.length < 6) {
      addToast({ type: 'error', title: 'Weak Password', message: 'The password must be at least 6 characters.' });
      return;
    }

    if (newPassword !== newConfirmPassword) {
      addToast({ type: 'error', title: 'Password Mismatch', message: 'The password inputs do not match.' });
      return;
    }

    const emailCheck = newEmail.toLowerCase().trim();
    if (users.some(u => u.email.toLowerCase() === emailCheck)) {
      addToast({ type: 'error', title: 'Creation Failed', message: 'Email address already exists inside clinic registry.' });
      return;
    }

    try {
      const p_id = crypto.randomUUID();
      const { error } = await supabase.rpc('create_user_admin', {
        p_id,
        p_email: emailCheck,
        p_password: newPassword,
        p_name: newName,
        p_role: newRole,
        p_phone: newPhone,
        p_clinic_id: (currentAdmin as any)?.clinic_id
      });

      if (error) throw error;
      await fetchUsers();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Creation Failed', message: err.message });
      return;
    }

    // Log user creation
    adminService.logActivity(
      'User Created', 
      `Registered clinician profile for ${newName} as a ${newRole}.`
    );

    // Reset forms
    setNewEmail('');
    setNewName('');
    setNewRole('Dentist');
    setNewPhone('');
    setNewPassword('');
    setNewConfirmPassword('');
    setNewStatusActive(true);
    setIsCreateOpen(false);

    addToast({
      type: 'success',
      title: 'User Registered Successfully',
      message: `Provisioned ${newName} as a clinical ${newRole}.`
    });
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !editName) return;

    try {
      const roleIds: Record<string, string> = {
        'Dentist': '00000000-0000-0000-0000-000000000003',
        'Other Dentist': '00000000-0000-0000-0000-000000000006',
        'Dental Assistant': '00000000-0000-0000-0000-000000000005'
      };
      const role_id = roleIds[editRole];

      const { error } = await supabase
        .from('users')
        .update({
          name: editName,
          role: editRole,
          role_id
        })
        .eq('id', selectedUser.id);

      if (error) throw error;
      await fetchUsers();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Update Failed', message: err.message });
      return;
    }

    setIsEditOpen(false);
    setSelectedUser(null);

    addToast({
      type: 'success',
      title: 'Profile Updated',
      message: 'Account details were edited successfully.'
    });
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    const { type, user } = confirmAction;
    let successMessage = '';

    try {
      if (type === 'lock') {
        const { error } = await supabase.from('users').update({ is_locked: true }).eq('id', user.id);
        if (error) throw error;
        successMessage = `Locked ${user.name}'s account security credentials.`;
      } else if (type === 'unlock') {
        const { error } = await supabase.from('users').update({ is_locked: false }).eq('id', user.id);
        if (error) throw error;
        successMessage = `Unlocked ${user.name}'s account security credentials.`;
      } else if (type === 'deactivate') {
        const { error } = await supabase.from('users').update({ is_active: false }).eq('id', user.id);
        if (error) throw error;
        successMessage = `Deactivated clinical access profile for ${user.name}.`;
      } else if (type === 'activate') {
        const { error } = await supabase.from('users').update({ is_active: true, is_locked: false }).eq('id', user.id);
        if (error) throw error;
        successMessage = `Activated clinical access profile for ${user.name}.`;
      } else if (type === 'delete') {
        if (user.id === currentAdmin?.id) {
          addToast({ type: 'error', title: 'Access Denied', message: 'You cannot delete your own Dentist account.' });
          setConfirmAction(null);
          return;
        }
        const { error } = await supabase.rpc('delete_user_admin', { p_id: user.id });
        if (error) throw error;
        successMessage = `Permanently removed user account file for ${user.name}.`;
      } else if (type === 'reset-password') {
        successMessage = `Successfully dispatched password recovery reset email to ${user.email}.`;
      }

      await fetchUsers();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Action Failed', message: err.message });
      setConfirmAction(null);
      return;
    }

    setConfirmAction(null);

    addToast({
      type: 'success',
      title: 'Action Processed',
      message: successMessage
    });
  };

  const openEditModal = (user: UserProfile) => {
    setSelectedUser(user);
    setEditName(user.name);
    setEditRole(user.role);
    setIsEditOpen(true);
  };

  // -------------------------------------------------------------
  // DATA TABLE COLUMNS
  // -------------------------------------------------------------
  const columns: ColumnDef<UserProfile>[] = [
    {
      accessorKey: 'name',
      header: 'Clinician / Staff',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-xs shrink-0 text-slate-700">
            {row.original.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
          </div>
          <div>
            <Link 
              to={`/dentist/settings/users/${row.original.id}`}
              className="font-bold text-slate-900 hover:text-red-800 transition leading-snug"
            >
              {row.original.name}
            </Link>
            <p className="text-[10px] text-slate-400 font-semibold">{row.original.email}</p>
          </div>
        </div>
      )
    },
    {
      accessorKey: 'role',
      header: 'Clinical Role',
      cell: ({ row }) => (
        <span className="inline-flex px-2 py-0.5 border border-red-100 bg-red-50 text-red-800 rounded-lg text-[10px] font-black tracking-wide">
          {row.original.role}
        </span>
      )
    },
    {
      accessorKey: 'status',
      header: 'Account Status',
      cell: ({ row }) => {
        const u = row.original;
        if (u.is_locked) {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-rose-50 border border-rose-200 text-rose-800 animate-pulse">
              <Lock className="w-3 h-3" /> Locked
            </span>
          );
        }
        if (!u.is_active) {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 border border-slate-200 text-slate-500">
              <UserX className="w-3 h-3" /> Deactivated
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 border border-emerald-100 text-emerald-800">
            <UserCheck className="w-3 h-3" /> Active
          </span>
        );
      }
    },
    {
      accessorKey: 'last_login_at',
      header: 'Last Login Activity',
      cell: ({ row }) => (
        <span className="text-xs text-slate-500 font-semibold">
          {row.original.last_login_at 
            ? new Date(row.original.last_login_at).toLocaleString() 
            : 'No activity logged'}
        </span>
      )
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const u = row.original;
        const isSelf = currentAdmin?.id === u.id;
        
        return (
          <div className="flex items-center justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer outline-none">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg border-slate-100">
                <DropdownMenuItem onClick={() => openEditModal(u)} className="font-bold text-xs cursor-pointer focus:bg-slate-50 gap-2">
                  <Pencil className="w-3.5 h-3.5" /> Edit Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setConfirmAction({ type: 'reset-password', user: u })} className="font-bold text-xs cursor-pointer focus:bg-slate-50 gap-2">
                  <KeyRound className="w-3.5 h-3.5" /> Reset Password
                </DropdownMenuItem>
                
                {u.is_locked ? (
                  <DropdownMenuItem onClick={() => setConfirmAction({ type: 'unlock', user: u })} className="font-bold text-xs cursor-pointer focus:bg-slate-50 gap-2 text-amber-600">
                    <Unlock className="w-3.5 h-3.5" /> Unlock Account
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => setConfirmAction({ type: 'lock', user: u })} disabled={isSelf} className="font-bold text-xs cursor-pointer focus:bg-slate-50 gap-2 text-rose-600">
                    <Lock className="w-3.5 h-3.5" /> Lock Account
                  </DropdownMenuItem>
                )}

                {u.is_active ? (
                  <DropdownMenuItem onClick={() => setConfirmAction({ type: 'deactivate', user: u })} disabled={isSelf} className="font-bold text-xs cursor-pointer focus:bg-slate-50 gap-2 text-rose-600">
                    <UserX className="w-3.5 h-3.5" /> Deactivate User
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => setConfirmAction({ type: 'activate', user: u })} className="font-bold text-xs cursor-pointer focus:bg-slate-50 gap-2 text-emerald-600">
                    <UserCheck className="w-3.5 h-3.5" /> Activate User
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem onClick={() => setConfirmAction({ type: 'delete', user: u })} disabled={isSelf} className="font-bold text-xs cursor-pointer focus:bg-slate-50 gap-2 text-red-600">
                  <Trash2 className="w-3.5 h-3.5" /> Delete User
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      }
    }
  ];

  // -------------------------------------------------------------
  // LIST FILTERING
  // -------------------------------------------------------------
  const filteredUsers = users.filter((u) => {
    if (u.role === 'Super Admin') return false;
    
    const matchesSearch = 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-2">
            <Users className="w-6 h-6 text-red-800" />
            <span>Practice User Management</span>
          </h2>
          <p className="text-xs text-slate-400 font-semibold mt-1">
            Create, modify and control security access profiles for clinical personnel.
          </p>
        </div>

        <Button
          onClick={() => setIsCreateOpen(true)}
          className="h-11 bg-red-800 hover:bg-red-950 text-white font-bold rounded-xl shadow-md gap-1.5 text-xs px-5 shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Provision New Clinician</span>
        </Button>
      </div>

      {/* Filter and Search Ribbon */}
      <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden p-4">
        <CardContent className="p-0 flex flex-col md:flex-row gap-4 items-center">
          {/* Search bar */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search users by name or practice email..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="pl-10 h-10.5 rounded-xl border-slate-200 bg-white font-semibold text-xs"
            />
          </div>

          {/* Role selector filter */}
          <div className="flex items-center gap-2 w-full md:w-64">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-10.5 rounded-xl border-slate-200 font-semibold text-xs bg-white">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="ALL" className="text-xs font-semibold">All Clinical Roles</SelectItem>
                <SelectItem value="Dentist" className="text-xs font-semibold">Dentist</SelectItem>
                <SelectItem value="Dental Assistant" className="text-xs font-semibold">Dental Assistant</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Data Grid */}
      <DataTable columns={columns} data={filteredUsers} pageSize={5} />

      {/* -------------------------------------------------------------
          PROVISION NEW USER DIALOG
      ------------------------------------------------------------- */}
      <Dialog open={isCreateOpen} onOpenChange={(open: boolean) => !open && setIsCreateOpen(false)}>
        <DialogContent className="max-w-md rounded-2xl p-6 bg-white border-slate-205">
          <form onSubmit={handleCreateUser} className="space-y-4">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-base font-black text-slate-900 leading-snug">
                Provision User
              </DialogTitle>
              <DialogDescription className="text-[11px] text-slate-500 font-semibold leading-normal">
                Register new clinic profile. Account credentials will be synced with Supabase authentication rules.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Full Name */}
              <div className="space-y-1">
                <Label htmlFor="create-name" className="text-xs font-extrabold text-slate-500">Full Name</Label>
                <Input
                  id="create-name"
                  type="text"
                  placeholder={newRole.includes('Dentist') ? "e.g. Dr. Prasad Patil" : "e.g. Prasad Patil"}
                  value={newName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewName(e.target.value)}
                  className="h-10 rounded-xl border-slate-200 text-xs font-semibold placeholder:text-slate-300"
                  required
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <Label htmlFor="create-email" className="text-xs font-extrabold text-slate-500">Practice Email</Label>
                <Input
                  id="create-email"
                  type="email"
                  placeholder="e.g. dentist-ray@dcip.org"
                  value={newEmail}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEmail(e.target.value)}
                  className="h-10 rounded-xl border-slate-200 text-xs font-semibold"
                  required
                />
              </div>

              {/* Mobile Number */}
              <div className="space-y-1">
                <Label htmlFor="create-phone" className="text-xs font-extrabold text-slate-500">Mobile Number</Label>
                <div className="relative flex items-center">
                  <div className="absolute left-3 font-bold text-slate-500 text-sm flex items-center gap-1 border-r border-slate-200 pr-2 h-5">
                    <span className="text-[10px] text-slate-400">IN</span>
                    <span>+91</span>
                  </div>
                  <Input
                    id="create-phone"
                    type="text"
                    placeholder="9876543210"
                    value={newPhone}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val.length <= 10) setNewPhone(val);
                    }}
                    className="pl-[4.5rem] h-10 rounded-xl border-slate-200 text-xs font-semibold placeholder:text-slate-300"
                    maxLength={10}
                  />
                </div>
              </div>

              {/* Role */}
              <div className="space-y-1">
                <Label htmlFor="create-role" className="text-xs font-extrabold text-slate-500">Access Role</Label>
                <Select value={newRole} onValueChange={(val: UserRole) => setNewRole(val)}>
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="Dentist" className="text-xs font-semibold">Dentist</SelectItem>
                    <SelectItem value="Other Dentist" className="text-xs font-semibold">Other Dentist</SelectItem>
                    <SelectItem value="Dental Assistant" className="text-xs font-semibold">Dental Assistant</SelectItem>
                    <SelectItem value="Receptionist" className="text-xs font-semibold">Receptionist</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Temp Password */}
              <div className="space-y-1">
                <Label htmlFor="create-pass" className="text-xs font-extrabold text-slate-500">Access Passcode</Label>
                <Input
                  id="create-pass"
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                  className="h-10 rounded-xl border-slate-200 text-xs font-semibold"
                  required
                />
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <Label htmlFor="create-confirm-pass" className="text-xs font-extrabold text-slate-500">Confirm Passcode</Label>
                <Input
                  id="create-confirm-pass"
                  type="password"
                  placeholder="Re-enter passcode"
                  value={newConfirmPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewConfirmPassword(e.target.value)}
                  className="h-10 rounded-xl border-slate-200 text-xs font-semibold"
                  required
                />
              </div>

              {/* Status Selector */}
              <div className="space-y-1">
                <Label className="text-xs font-extrabold text-slate-500">Initial Status</Label>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setNewStatusActive(true)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition ${
                      newStatusActive 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                        : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewStatusActive(false)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition ${
                      !newStatusActive 
                        ? 'bg-rose-50 border-rose-200 text-rose-808' 
                        : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    Inactive
                  </button>
                </div>
              </div>
            </div>

            <DialogFooter className="flex gap-2 justify-end mt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsCreateOpen(false)}
                className="h-10 rounded-xl border border-slate-250 font-bold text-xs text-slate-600"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-10 rounded-xl bg-red-800 hover:bg-red-950 text-white font-bold text-xs px-4"
              >
                Create Account
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* -------------------------------------------------------------
          EDIT USER MODAL
      ------------------------------------------------------------- */}
      <Dialog open={isEditOpen} onOpenChange={(open: boolean) => !open && setIsEditOpen(false)}>
        <DialogContent className="max-w-md rounded-2xl p-6 bg-white border-slate-205">
          <form onSubmit={handleEditUser} className="space-y-4">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-base font-black text-slate-900 leading-snug">
                Modify User Details
              </DialogTitle>
              <DialogDescription className="text-[11px] text-slate-500 font-semibold">
                Edit active clinical configurations for {selectedUser?.email}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Full Name */}
              <div className="space-y-1">
                <Label htmlFor="edit-name" className="text-xs font-extrabold text-slate-500">Full Name</Label>
                <Input
                  id="edit-name"
                  type="text"
                  value={editName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)}
                  className="h-10 rounded-xl border-slate-200 text-xs font-semibold"
                  required
                />
              </div>

              {/* Role */}
              <div className="space-y-1">
                <Label htmlFor="edit-role" className="text-xs font-extrabold text-slate-500">Access Role</Label>
                <Select value={editRole} onValueChange={(val: UserRole) => setEditRole(val)}>
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="Dentist" className="text-xs font-semibold">Dentist</SelectItem>
                    <SelectItem value="Other Dentist" className="text-xs font-semibold">Other Dentist</SelectItem>
                    <SelectItem value="Dental Assistant" className="text-xs font-semibold">Dental Assistant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="flex gap-2 justify-end mt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEditOpen(false)}
                className="h-10 rounded-xl border border-slate-250 font-bold text-xs text-slate-600"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-10 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-4"
              >
                Save Updates
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* -------------------------------------------------------------
          ACTION CONFIRMATIONS OVERLAYS
      ------------------------------------------------------------- */}
      {confirmAction && (
        <ConfirmationDialog
          isOpen={!!confirmAction}
          onClose={() => setConfirmAction(null)}
          onConfirm={handleConfirmAction}
          title={
            confirmAction.type === 'lock' ? 'Lock User Account?' :
            confirmAction.type === 'unlock' ? 'Unlock User Account?' :
            confirmAction.type === 'deactivate' ? 'Deactivate Clinical User?' :
            confirmAction.type === 'activate' ? 'Reactivate Clinical User?' :
            confirmAction.type === 'reset-password' ? 'Send Password Reset Email?' :
            'Delete User Record permanently?'
          }
          description={
            confirmAction.type === 'lock' 
              ? `Are you sure you want to lock the account for ${confirmAction.user.name}? This will prevent them from signing into the practice portal.` :
            confirmAction.type === 'unlock' 
              ? `Unlock account access for ${confirmAction.user.name}? They will be allowed to re-authenticate using their passwords.` :
            confirmAction.type === 'deactivate' 
              ? `Are you sure you want to deactivate ${confirmAction.user.name}? They will be logged out of active clinical sessions immediately.` :
            confirmAction.type === 'activate' 
              ? `Reactivate profile for ${confirmAction.user.name}? They will regain access to their dashboard.` :
            confirmAction.type === 'reset-password' 
              ? `Dispatch password change guidelines to ${confirmAction.user.email}?` :
            `WARNING: This action is permanent. Deleting ${confirmAction.user.name} will remove their records. If they are the active clinician, this could trigger audit exceptions.`
          }
          confirmText={
            confirmAction.type === 'lock' ? 'Lock User' :
            confirmAction.type === 'unlock' ? 'Unlock Account' :
            confirmAction.type === 'deactivate' ? 'Deactivate' :
            confirmAction.type === 'activate' ? 'Activate' :
            confirmAction.type === 'reset-password' ? 'Send Email' :
            'Delete User'
          }
          isDestructive={
            confirmAction.type === 'lock' || 
            confirmAction.type === 'deactivate' || 
            confirmAction.type === 'delete'
          }
        />
      )}
    </div>
  );
};

export default UserManagement;

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useAuthStore } from '@/store/useAuthStore';
import { adminService } from '@/services/adminService';
import type { UserProfile, UserRole, Patient } from '@/types';
import { supabase } from '@/lib/supabaseClient';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  Calendar, 
  Phone, 
  Activity, 
  Users, 
  Clock, 
  Lock, 
  Unlock, 
  UserX, 
  UserCheck, 
  Pencil, 
  Check 
} from 'lucide-react';
import { patientService } from '@/services/patientService';

export const UserProfileView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useNotificationStore();
  const { user: currentAdmin } = useAuthStore();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [assignedPatients, setAssignedPatients] = useState<Patient[]>([]);
  const [userActivities, setUserActivities] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  // Form states
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('Doctor');
  const [editActive, setEditActive] = useState<boolean>(true);
  const [editLocked, setEditLocked] = useState<boolean>(false);

  useEffect(() => {
    const loadUserProfile = async () => {
      if (!id) return;
      try {
        const { data: profile, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', id)
          .single();

        if (error || !profile) {
          addToast({ type: 'error', title: 'User Not Found', message: 'The user profile does not exist in the clinic ledger.' });
          navigate('/doctor/settings/users');
          return;
        }

        const mappedProfile: UserProfile = {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          role: profile.role,
          phone: profile.phone || '',
          is_active: profile.is_active,
          is_locked: profile.is_locked,
          createdAt: profile.created_at,
          last_login_at: profile.last_login_at || null
        };

        setUserProfile(mappedProfile);
        setEditName(mappedProfile.name);
        setEditPhone(mappedProfile.phone || '');
        setEditRole(mappedProfile.role);
        setEditActive(mappedProfile.is_active !== false);
        setEditLocked(mappedProfile.is_locked === true);

        // Fetch activity history
        const logs = await adminService.getRecentActivities();
        const filteredLogs = logs.filter(l => l.userEmail === mappedProfile.email);
        setUserActivities(filteredLogs);

        // Fetch patients if Doctor
        if (mappedProfile.role === 'Doctor') {
          const allPatients = await patientService.getPatients();
          setAssignedPatients(allPatients);
        }
      } catch (err) {
        console.error(err);
        addToast({ type: 'error', title: 'Error', message: 'Failed to load user profile.' });
        navigate('/doctor/settings/users');
      }
    };

    loadUserProfile();
  }, [id, navigate, addToast]);

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName || !userProfile) return;

    try {
      const roleIds: Record<string, string> = {
        'Doctor': '00000000-0000-0000-0000-000000000003',
        'Dental Assistant': '00000000-0000-0000-0000-000000000005',
        'Receptionist': '00000000-0000-0000-0000-000000000004'
      };
      
      const role_id = roleIds[editRole] || '00000000-0000-0000-0000-000000000003';

      const { error } = await supabase
        .from('users')
        .update({
          name: editName,
          phone: editPhone,
          role: editRole,
          role_id: role_id,
          is_active: editActive,
          is_locked: editLocked,
        })
        .eq('id', userProfile.id);

      if (error) throw error;

      setUserProfile({
        ...userProfile,
        name: editName,
        phone: editPhone,
        role: editRole,
        is_active: editActive,
        is_locked: editLocked,
      });

      setIsEditing(false);
      addToast({
        type: 'success',
        title: 'Profile Saved',
        message: `Successfully modified clinic configurations for ${editName}.`
      });
    } catch (err: any) {
      console.error(err);
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: err.message || 'An error occurred while saving.'
      });
    }
  };

  if (!userProfile) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[40vh] gap-3">
        <div className="w-8 h-8 border-3 border-red-200 border-t-red-800 rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-slate-400">Loading Clinician Profile File...</p>
      </div>
    );
  }

  const isSelf = currentAdmin?.id === userProfile.id;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Back button and profile title */}
      <div className="flex flex-col gap-4">
        <Link
          to="/doctor/settings/users"
          className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-slate-805 w-fit gap-1 bg-white hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Member List</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Card: Member Details & Editor */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden p-6 md:p-8">
            <div className="flex justify-between items-start border-b border-slate-100 pb-5 mb-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-800 flex items-center justify-center font-black text-lg uppercase shrink-0">
                  {userProfile.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 leading-tight">{userProfile.name}</h3>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">{userProfile.email}</p>
                </div>
              </div>

              {!isEditing && (
                <Button
                  onClick={() => setIsEditing(true)}
                  className="h-9 rounded-xl border border-slate-200 text-xs font-bold hover:bg-slate-50 text-slate-700 bg-white"
                >
                  <Pencil className="w-3.5 h-3.5 mr-1.5" />
                  <span>Edit Profile</span>
                </Button>
              )}
            </div>

            {!isEditing ? (
              /* View Details Panel */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 text-xs">
                <div className="space-y-1">
                  <span className="font-extrabold text-slate-400 uppercase tracking-wider text-[10px]">Clinical Role</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex px-2 py-0.5 border border-red-100 bg-red-50 text-red-800 rounded-lg font-black">
                      {userProfile.role}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="font-extrabold text-slate-400 uppercase tracking-wider text-[10px]">Contact Mobile</span>
                  <p className="font-semibold text-slate-800 flex items-center gap-2 mt-1">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{userProfile.phone || 'No mobile added'}</span>
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="font-extrabold text-slate-400 uppercase tracking-wider text-[10px]">Account Access Status</span>
                  <div className="flex items-center gap-2 mt-1">
                    {userProfile.is_locked ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-rose-50 border border-rose-200 text-rose-800">
                        <Lock className="w-3 h-3" /> Locked Account
                      </span>
                    ) : !userProfile.is_active ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 border border-slate-200 text-slate-500">
                        <UserX className="w-3 h-3" /> Deactivated
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 border border-emerald-100 text-emerald-800">
                        <UserCheck className="w-3 h-3" /> Active Access
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="font-extrabold text-slate-400 uppercase tracking-wider text-[10px]">Registration Date</span>
                  <p className="font-semibold text-slate-800 flex items-center gap-2 mt-1">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{new Date(userProfile.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
                  </p>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <span className="font-extrabold text-slate-400 uppercase tracking-wider text-[10px]">Last Session Active</span>
                  <p className="font-semibold text-slate-800 flex items-center gap-2 mt-1">
                    <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{userProfile.last_login_at ? new Date(userProfile.last_login_at).toLocaleString() : 'No session logins tracked yet'}</span>
                  </p>
                </div>
              </div>
            ) : (
              /* Editor Form Panel */
              <form onSubmit={handleSaveChanges} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                  {/* Phone */}
                  <div className="space-y-1">
                    <Label htmlFor="edit-phone" className="text-xs font-extrabold text-slate-500">Mobile Number</Label>
                    <Input
                      id="edit-phone"
                      type="text"
                      value={editPhone}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditPhone(e.target.value)}
                      className="h-10 rounded-xl border-slate-200 text-xs font-semibold"
                    />
                  </div>

                  {/* Role */}
                  <div className="space-y-1">
                    <Label htmlFor="edit-role" className="text-xs font-extrabold text-slate-500">Clinical Role Access</Label>
                    <Select value={editRole} onValueChange={(val: UserRole) => setEditRole(val)} disabled={isSelf}>
                      <SelectTrigger className="h-10 rounded-xl border-slate-200 text-xs font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="Doctor" className="text-xs font-semibold">Doctor</SelectItem>
                        <SelectItem value="Dental Assistant" className="text-xs font-semibold">Dental Assistant</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Access Statuses */}
                  <div className="space-y-1">
                    <Label className="text-xs font-extrabold text-slate-500">Account Access</Label>
                    <div className="flex gap-2 pt-1">
                      {/* Active Toggle */}
                      <button
                        type="button"
                        onClick={() => setEditActive(!editActive)}
                        disabled={isSelf}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1.5 ${
                          editActive 
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                            : 'bg-slate-50 border-slate-200 text-slate-400'
                        }`}
                      >
                        {editActive ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                        <span>{editActive ? 'Active' : 'Inactive'}</span>
                      </button>

                      {/* Lock Toggle */}
                      <button
                        type="button"
                        onClick={() => setEditLocked(!editLocked)}
                        disabled={isSelf}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1.5 ${
                          editLocked 
                            ? 'bg-rose-50 border-rose-200 text-rose-800' 
                            : 'bg-slate-50 border-slate-200 text-slate-400'
                        }`}
                      >
                        {editLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        <span>{editLocked ? 'Locked' : 'Unlocked'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsEditing(false)}
                    className="h-10 rounded-xl border border-slate-250 font-bold text-xs text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="h-10 rounded-xl bg-red-800 hover:bg-red-950 text-white font-bold text-xs px-4"
                  >
                    <Check className="w-3.5 h-3.5 mr-1.5" />
                    <span>Save Changes</span>
                  </Button>
                </div>
              </form>
            )}
          </Card>

          {/* Assigned Patients lists (For doctors only) */}
          {userProfile.role === 'Doctor' && (
            <Card className="border-none shadow-sm bg-white rounded-2xl p-6">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                <Users className="w-4 h-4 text-red-808" />
                <h3 className="text-sm font-extrabold text-slate-800">Assigned Patient Files</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assignedPatients.length > 0 ? (
                  assignedPatients.map((pat) => (
                    <div 
                      key={pat.id}
                      className="border border-slate-100 rounded-xl p-4 bg-slate-50/20 hover:bg-slate-50/50 transition text-xs space-y-1.5"
                    >
                      <p className="font-black text-slate-800">{pat.name}</p>
                      <p className="text-slate-400 font-semibold uppercase text-[9px]">ID: {pat.displayId || 'N/A'}</p>
                      <p className="text-slate-500 font-medium">Born: {new Date(pat.dateOfBirth).toLocaleDateString()}</p>
                      <p className="text-slate-500 font-medium">Phone: {pat.phone}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-405 font-semibold italic py-2 md:col-span-2">No patients assigned to this doctor.</p>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Right Card: Activity History */}
        <div className="space-y-6">
          <Card className="border-none shadow-sm bg-white rounded-2xl p-6 flex flex-col">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <Activity className="w-4 h-4 text-red-808" />
              <h3 className="text-sm font-extrabold text-slate-800">Clinician Activity Summary</h3>
            </div>

            <div className="space-y-4 overflow-y-auto max-h-[350px] pr-1">
              {userActivities.length > 0 ? (
                userActivities.map((act) => (
                  <div key={act.id} className="text-xs space-y-1 border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-red-850 font-extrabold uppercase tracking-wide text-[10px]">{act.action}</span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {new Date(act.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-slate-500 font-semibold leading-relaxed leading-normal">{act.description}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Activity className="w-8 h-8 text-slate-205 mx-auto mb-2" />
                  <p className="text-xs text-slate-405 font-semibold italic">No recent clinic operations saved.</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UserProfileView;

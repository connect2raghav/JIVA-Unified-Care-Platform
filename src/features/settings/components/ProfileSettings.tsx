import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, Mail, Phone, Lock, Save, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabaseClient';

export const ProfileSettings: React.FC = () => {
  const { user, initializeAuth } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isEditing, setIsEditing] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (password && password !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }

    if (password && !currentPassword) {
      setErrorMsg('Please enter your current password to change it.');
      return;
    }

    setIsLoading(true);

    try {
      // If changing password, verify current password first
      if (password && currentPassword) {
        const { error: verifyError } = await supabase.auth.signInWithPassword({
          email: user?.email || '',
          password: currentPassword
        });
        if (verifyError) {
          throw new Error('Current password is incorrect.');
        }
      }

      // 1. Update auth metadata and password
      const updates: any = {};
      if (password) updates.password = password;
      if (name !== user?.name || phone !== user?.phone) {
        updates.data = { name, phone };
      }

      const { error: authError } = await supabase.auth.updateUser(updates);
      if (authError) throw authError;

      // 2. Update public.users table
      if (name !== user?.name || phone !== user?.phone) {
        const { error: dbError } = await supabase
          .from('users')
          .update({ name, phone })
          .eq('id', user?.id);
        
        if (dbError) throw dbError;
      }

      setSuccessMsg('Profile updated successfully.');
      setPassword('');
      setConfirmPassword('');
      setCurrentPassword('');
      setIsEditing(false);
      await initializeAuth(); // Refresh user store
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while updating the profile.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
                <User className="w-5 h-5 text-red-700" />
                My Profile
              </CardTitle>
              <p className="text-xs font-semibold text-slate-500 mt-1">
                Manage your personal details and change your password.
              </p>
            </div>
            <div>
              {!isEditing ? (
                <Button type="button" variant="outline" onClick={() => setIsEditing(true)} className="h-9 px-4 rounded-xl border-slate-200 hover:bg-slate-50 text-xs font-bold shadow-sm bg-white">
                  Edit Profile
                </Button>
              ) : (
                <Button type="button" variant="ghost" onClick={() => {
                  setIsEditing(false);
                  setName(user?.name || '');
                  setPhone(user?.phone || '');
                  setPassword('');
                  setConfirmPassword('');
                  setCurrentPassword('');
                  setErrorMsg('');
                  setSuccessMsg('');
                }} className="h-9 px-4 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-900 bg-white border border-slate-200">
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleUpdate} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 ml-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input 
                    value={name}
                    disabled={!isEditing}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-9 h-11 rounded-xl bg-slate-50 border-slate-200 disabled:opacity-70" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 ml-1">Phone Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input 
                    value={phone}
                    disabled={!isEditing}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-9 h-11 rounded-xl bg-slate-50 border-slate-200 disabled:opacity-70" 
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input 
                  value={user?.email || ''} 
                  disabled 
                  className="pl-9 h-11 rounded-xl bg-slate-100 border-slate-200 text-slate-500" 
                />
              </div>
              <p className="text-[10px] text-slate-400 ml-1 font-semibold">Email cannot be changed.</p>
            </div>

            <hr className="border-slate-100" />

            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-800">Change Password</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 ml-1">Current Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input 
                      type="password"
                      value={currentPassword}
                      disabled={!isEditing}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Required to change password"
                      className="pl-9 h-11 rounded-xl bg-slate-50 border-slate-200 disabled:opacity-70" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 ml-1">New Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <Input 
                        type="password"
                        value={password}
                        disabled={!isEditing}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Leave blank to keep current"
                        className="pl-9 h-11 rounded-xl bg-slate-50 border-slate-200 disabled:opacity-70" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 ml-1">Confirm New Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <Input 
                        type="password"
                        value={confirmPassword}
                        disabled={!isEditing}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        className="pl-9 h-11 rounded-xl bg-slate-50 border-slate-200 disabled:opacity-70" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold border border-red-100">
                {errorMsg}
              </div>
            )}
            
            {successMsg && (
              <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-100">
                {successMsg}
              </div>
            )}

            {isEditing && (
              <div className="pt-2">
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="h-11 w-full bg-red-800 hover:bg-red-900 text-white font-bold rounded-xl shadow-md gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Profile Changes
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

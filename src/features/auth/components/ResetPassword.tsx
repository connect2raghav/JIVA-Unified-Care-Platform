import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { HeartPulse, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export const ResetPassword: React.FC = () => {
  const { resetPassword } = useAuthStore();
  const { addToast } = useNotificationStore();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      addToast({
        type: 'error',
        title: 'Weak Password',
        message: 'Passcode must be at least 6 characters.',
      });
      return;
    }

    if (password !== confirmPassword) {
      addToast({
        type: 'error',
        title: 'Passwords Mismatch',
        message: 'The password inputs do not match.',
      });
      return;
    }

    setIsLoading(true);
    const res = await resetPassword(password);
    setIsLoading(false);

    if (res.success) {
      addToast({
        type: 'success',
        title: 'Password Updated',
        message: 'Your clinician account password has been changed successfully.',
      });
      navigate('/login');
    } else {
      addToast({
        type: 'error',
        title: 'Modification Failed',
        message: res.error || 'Please request another email link.',
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-none shadow-xl bg-white rounded-3xl overflow-hidden p-4 md:p-8">
        <CardHeader className="text-center pb-6 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-red-800 flex items-center justify-center text-white mx-auto shadow-md shadow-red-800/20">
            <HeartPulse className="w-6 h-6" />
          </div>

          <div className="space-y-1.5">
            <CardTitle className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-none">
              Reset Passcode
            </CardTitle>
            <CardDescription className="text-xs font-semibold text-slate-400">
              Establish a new clinical access password.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleReset} className="space-y-5">
            {/* New Password */}
            <div className="space-y-1.5">
              <Label htmlFor="pass" className="text-xs font-extrabold text-slate-500">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <Input
                  id="pass"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  className="pl-10 h-10.5 rounded-xl border-slate-200 bg-white font-semibold text-sm"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <Label htmlFor="confirm-pass" className="text-xs font-extrabold text-slate-500">Confirm New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <Input
                  id="confirm-pass"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                  className="pl-10 h-10.5 rounded-xl border-slate-200 bg-white font-semibold text-sm"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading || !password || !confirmPassword}
              className="w-full h-11 bg-red-800 hover:bg-red-950 text-white font-bold rounded-xl shadow-md shadow-red-900/10 transition-all text-sm mt-2"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Updating passcode...</span>
                </div>
              ) : (
                'Save and Login'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;

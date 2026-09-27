import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { HeartPulse, Mail, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export const ForgotPassword: React.FC = () => {
  const { forgotPassword } = useAuthStore();
  const { addToast } = useNotificationStore();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    const res = await forgotPassword(email);
    setIsLoading(false);

    if (res.success) {
      addToast({
        type: 'success',
        title: 'Recovery Email Sent',
        message: 'Please check your inbox for instructions to reset your passcode.',
      });
      navigate('/login');
    } else {
      addToast({
        type: 'error',
        title: 'Reset Request Failed',
        message: res.error || 'Check email spelling and connectivity.',
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
              Recovery Portal
            </CardTitle>
            <CardDescription className="text-xs font-semibold text-slate-400 leading-normal max-w-xs mx-auto">
              Provide your clinician email to retrieve password modification links.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleResetRequest} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-extrabold text-slate-500">Practice Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@dcip.org"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  className="pl-10 h-10.5 rounded-xl border-slate-200 bg-white font-semibold text-sm"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Request Button */}
            <Button
              type="submit"
              disabled={isLoading || !email}
              className="w-full h-11 bg-red-800 hover:bg-red-950 text-white font-bold rounded-xl shadow-md shadow-red-900/10 transition-all text-sm"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Sending instructions...</span>
                </div>
              ) : (
                'Request Reset Link'
              )}
            </Button>

            {/* Back Links */}
            <div className="text-center pt-2">
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-1.5 text-xs font-extrabold text-slate-500 hover:text-slate-800 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Sign In</span>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;

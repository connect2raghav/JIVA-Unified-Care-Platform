import React from 'react';
import { HeartPulse, Stethoscope, Users, ClipboardList, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import type { UserRole } from '@/types';

interface RoleSelectScreenProps {
  onSelectRole: (role: UserRole) => void;
}

export const RoleSelectScreen: React.FC<RoleSelectScreenProps> = ({ onSelectRole }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-[420px] border-none shadow-xl bg-white rounded-3xl overflow-hidden p-4 md:p-8">
        <CardHeader className="text-center pb-6 space-y-3">
          {/* Logo */}
          <div className="w-14 h-14 rounded-full bg-red-800 flex items-center justify-center text-white mx-auto shadow-md shadow-red-800/20">
            <HeartPulse className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <CardTitle className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-none">
              Dental Clinical Intelligence
            </CardTitle>
            <CardDescription className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              Select Your Role
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 px-0 md:px-0">
          {/* Role Rows */}
          <RoleCard
            icon={<Stethoscope className="w-5 h-5 text-red-700" />}
            title="Dentist"
            description="Full clinical access and patient management"
            onClick={() => onSelectRole('Dentist')}
            iconBg="bg-red-50"
          />
          <RoleCard
            icon={<Users className="w-5 h-5 text-indigo-700" />}
            title="Other Dentist"
            description="Access assigned patients and clinical records"
            onClick={() => onSelectRole('Other Dentist')}
            iconBg="bg-indigo-50"
          />
          <RoleCard
            icon={<ClipboardList className="w-5 h-5 text-teal-700" />}
            title="Dental Assistant"
            description="Assist with patient records and clinical data"
            onClick={() => onSelectRole('Dental Assistant')}
            iconBg="bg-teal-50"
          />
          <RoleCard
            icon={<Calendar className="w-5 h-5 text-blue-700" />}
            title="Receptionist"
            description="Manage registration, appointments and follow-ups"
            onClick={() => onSelectRole('Receptionist')}
            iconBg="bg-blue-50"
          />

          <hr className="border-slate-100 my-6" />

          {/* Footer Link */}
          <div className="text-center text-xs font-semibold">
            <span className="text-slate-400">Don't have a clinic account? </span>
            <Link to="/register-clinic" className="text-red-600 font-bold hover:text-red-800 transition-colors">
              Register Clinic
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

interface RoleCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  iconBg: string;
}

const RoleCard: React.FC<RoleCardProps> = ({ icon, title, description, onClick, iconBg }) => {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all group flex items-start gap-4 cursor-pointer bg-white"
    >
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <div>
        <h3 className="font-bold text-slate-900 group-hover:text-red-700 transition-colors">{title}</h3>
        <p className="text-xs text-slate-500 mt-0.5 leading-snug">{description}</p>
      </div>
    </button>
  );
};

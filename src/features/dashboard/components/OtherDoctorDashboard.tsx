import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthStore } from '@/store/useAuthStore';
import { usePatientStore } from '@/store/usePatientStore';
import { receptionService } from '@/services/receptionService';
import type { Appointment } from '@/types';
import { Calendar, Clock, Play, FileText, CheckCircle2, AlertCircle, HeartPulse, Activity, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const OtherDoctorDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const { loadAllPatients } = usePatientStore();
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    loadAllPatients();
    loadAppointments();

    const interval = setInterval(() => {
      loadAppointments();
    }, 15000);

    return () => clearInterval(interval);
  }, [loadAllPatients]);

  const loadAppointments = async () => {
    const data = await receptionService.getAllAppointments();
    setAppointments(data);
  };

  const handleDeleteAppointment = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this completed appointment?")) {
      const res = await receptionService.deleteAppointment(id);
      if (res.success) {
        setAppointments(prev => prev.filter(a => a.id !== id));
      } else {
        alert(res.error || "Failed to delete");
      }
    }
  };

  if (!user) return null;

  const todayStr = new Date().toDateString();
  const todayAppointments = appointments.filter(apt => {
    try {
      return new Date(apt.dateTime).toDateString() === todayStr;
    } catch {
      return false;
    }
  });

  const waitingPatients = todayAppointments.filter(a => a.status === 'Checked-In' || a.status === 'Waiting');
  const inTreatment = todayAppointments.filter(a => a.status === 'In Treatment');
  const completedVisits = todayAppointments.filter(a => a.status === 'Completed');
  const emergencyPatients = todayAppointments.filter(a => (a.reason || '').toLowerCase().includes('emergency'));

  const myAppointments = todayAppointments.filter(a => a.doctorId === user.id || (a.doctorName && a.doctorName === user.name));
  const otherAppointments = todayAppointments.filter(a => a.doctorId !== user.id && (!a.doctorName || a.doctorName !== user.name));

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-xs font-medium text-slate-600 leading-relaxed">
      
      {/* Welcome Message */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 select-none mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 leading-none flex items-center gap-2">
            <HeartPulse className="w-6 h-6 text-red-600" />
            <span>Welcome, {user.name}</span>
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-2">
            Here's your clinical overview for today.
          </p>
        </div>
      </div>

      {/* Top Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 select-none">
        <Card className="border-none shadow-sm bg-white rounded-2xl">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
              <Calendar className="w-5 h-5" />
            </div>
            <p className="text-2xl font-black text-slate-900">{myAppointments.length}</p>
            <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">My Schedule</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white rounded-2xl">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-2">
              <Clock className="w-5 h-5" />
            </div>
            <p className="text-2xl font-black text-slate-900">{waitingPatients.filter(a => a.doctorId === user.id || a.doctorName === user.name).length}</p>
            <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">My Waiting</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white rounded-2xl">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mb-2">
              <Activity className="w-5 h-5" />
            </div>
            <p className="text-2xl font-black text-slate-900">{inTreatment.filter(a => a.doctorId === user.id || a.doctorName === user.name).length}</p>
            <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">My In Treatment</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white rounded-2xl">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <p className="text-2xl font-black text-slate-900">{completedVisits.filter(a => a.doctorId === user.id || a.doctorName === user.name).length}</p>
            <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">My Completed</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white rounded-2xl">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-2">
              <AlertCircle className="w-5 h-5" />
            </div>
            <p className="text-2xl font-black text-slate-900">{emergencyPatients.filter(a => a.doctorId === user.id || a.doctorName === user.name).length}</p>
            <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">My Emergencies</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4">My Appointments</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {myAppointments.map(appt => (
            <Card key={appt.id} className="border border-slate-100 shadow-sm bg-white rounded-2xl hover:shadow-md transition-shadow">
              <CardContent className="p-5 flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-150 flex items-center justify-center font-bold text-slate-600 text-sm shrink-0">
                    {appt.patientName.split(' ').map(n => n[0]).slice(0,2).join('')}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900 text-sm">{appt.patientName}</h4>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Time: {new Date(appt.dateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • Status: {appt.status}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-slate-400 font-semibold block mb-1">Appointment Type</span>
                    <span className="font-bold text-slate-800">{appt.reason || 'General Visit'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block mb-1">Assigned Doctor</span>
                    <span className="font-bold text-slate-800">{appt.doctorName}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-50">
                  <button
                    onClick={() => navigate(`/other-doctor/visit/${appt.patientId}?appointmentId=${appt.id}`)}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white h-9 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Play className="w-3.5 h-3.5" /> Start Visit
                  </button>
                  <button
                    onClick={() => navigate(`/other-doctor/patients/${appt.patientId}`)}
                    className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 h-9 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" /> View History
                  </button>
                  {appt.status === 'Completed' && (
                    <button
                      onClick={() => handleDeleteAppointment(appt.id)}
                      className="flex-1 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 h-9 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
                      title="Delete completed appointment"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {myAppointments.length === 0 && (
            <div className="col-span-1 md:col-span-2 py-8 text-center text-slate-500 font-semibold text-xs border border-dashed border-slate-200 rounded-2xl">
              No appointments scheduled for you today.
            </div>
          )}
        </div>
        
        {otherAppointments.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center mb-6">
              <div className="h-px flex-1 bg-slate-200"></div>
              <span className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Other Doctors' Activity</span>
              <div className="h-px flex-1 bg-slate-200"></div>
            </div>
            <div className="bg-slate-50 rounded-2xl p-6 text-center border border-slate-100">
              <p className="text-3xl font-black text-slate-900 mb-1">{otherAppointments.length}</p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Patients being seen by other doctors today</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


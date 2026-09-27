/**
 * JIVA — Unified Care Platform
 * Appointment Status Board (Phase 1)
 *
 * Kanban-style board showing appointments flowing through:
 * Scheduled → Waiting/Checked-In → In-Consultation → Completed/Cancelled
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { receptionService } from '@/services/receptionService';
import { printAppointmentToken } from '@/utils/tokenSlip';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import {
  Clock,
  CheckCircle2,
  XCircle,
  UserCheck,
  Stethoscope,
  CalendarDays,
  Printer,
  ArrowRight,
  RefreshCw,
  Users,
  AlertTriangle,
  Timer
} from 'lucide-react';
import type { Appointment } from '@/types';

type BoardColumn = 'Scheduled' | 'Waiting' | 'In-Consultation' | 'Completed';

interface ColumnConfig {
  key: BoardColumn;
  label: string;
  icon: React.ElementType;
  statusKeys: string[];
  color: string;
  bgColor: string;
  borderColor: string;
}

const COLUMNS: ColumnConfig[] = [
  {
    key: 'Scheduled',
    label: 'Scheduled',
    icon: CalendarDays,
    statusKeys: ['Scheduled'],
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
  },
  {
    key: 'Waiting',
    label: 'Waiting / Checked-In',
    icon: UserCheck,
    statusKeys: ['Waiting', 'Checked-In'],
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
  {
    key: 'In-Consultation',
    label: 'In Consultation',
    icon: Stethoscope,
    statusKeys: ['In-Consultation', 'In Treatment'],
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
  },
  {
    key: 'Completed',
    label: 'Completed / Done',
    icon: CheckCircle2,
    statusKeys: ['Completed', 'Cancelled', 'No-Show', 'No Show'],
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
  },
];

const TRIAGE_BADGE: Record<string, string> = {
  'Normal': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Urgent': 'bg-amber-100 text-amber-800 border-amber-200',
  'Critical': 'bg-red-100 text-red-700 border-red-200',
};

const NEXT_STATUS: Record<string, string> = {
  'Scheduled': 'Checked-In',
  'Checked-In': 'Waiting',
  'Waiting': 'In-Consultation',
  'In-Consultation': 'Completed',
  'In Treatment': 'Completed',
};

export const AppointmentStatusBoard: React.FC = () => {
  const { user } = useAuthStore();
  const { addToast } = useNotificationStore();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const loadAppointments = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await receptionService.getAppointments(selectedDate);
      setAppointments(data || []);
    } catch (err) {
      console.error('Failed to load appointments', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadAppointments();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadAppointments, 30000);
    return () => clearInterval(interval);
  }, [loadAppointments]);

  const handleStatusChange = async (apptId: string, newStatus: string) => {
    try {
      await receptionService.updateAppointmentStatus(apptId, newStatus);
      setAppointments(prev =>
        prev.map(a => a.id === apptId ? { ...a, status: newStatus as Appointment['status'] } : a)
      );
      addToast({
        type: 'success',
        title: 'Status Updated',
        message: `Appointment moved to ${newStatus}`,
      });
    } catch (err) {
      addToast({
        type: 'warning',
        title: 'Update Failed',
        message: 'Could not update appointment status.',
      });
    }
  };

  const handlePrintToken = (appt: Appointment) => {
    printAppointmentToken(
      {
        ...appt,
        physicianName: appt.physicianName || (appt as any).doctorName || 'Physician',
        tokenNumber: appt.tokenNumber || Math.floor(Math.random() * 900) + 100,
        triagePriority: appt.triagePriority || 'Normal',
      },
      undefined,
      'JIVA Clinic'
    );
    addToast({
      type: 'success',
      title: 'Token Printed',
      message: `Token slip generated for ${appt.patientName}`,
    });
  };

  const getColumnAppointments = (col: ColumnConfig) => {
    return appointments.filter(a => col.statusKeys.includes(a.status));
  };

  const dateLabel = format(new Date(selectedDate + 'T00:00:00'), 'EEEE, MMM d, yyyy');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Appointment Board</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">{dateLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={loadAppointments}
            className="rounded-xl gap-2 font-bold text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {COLUMNS.map(col => {
          const count = getColumnAppointments(col).length;
          const Icon = col.icon;
          return (
            <Card key={col.key} className={`border ${col.borderColor} ${col.bgColor} shadow-none rounded-2xl`}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${col.bgColor} border ${col.borderColor} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${col.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-900">{count}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{col.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Board Columns */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-emerald-200 border-t-emerald-700 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {COLUMNS.map(col => {
            const colAppointments = getColumnAppointments(col);
            const Icon = col.icon;

            return (
              <div key={col.key} className="space-y-3">
                {/* Column Header */}
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl ${col.bgColor} border ${col.borderColor}`}>
                  <Icon className={`w-4 h-4 ${col.color}`} />
                  <span className={`text-sm font-extrabold ${col.color}`}>{col.label}</span>
                  <span className={`ml-auto px-2 py-0.5 rounded-lg ${col.bgColor} border ${col.borderColor} text-xs font-black ${col.color}`}>
                    {colAppointments.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-2 min-h-[200px]">
                  {colAppointments.length === 0 ? (
                    <div className="flex items-center justify-center h-32 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                      <p className="text-xs text-slate-400 font-medium">No appointments</p>
                    </div>
                  ) : (
                    colAppointments
                      .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
                      .map(appt => {
                        const nextStatus = NEXT_STATUS[appt.status];
                        const timeStr = format(new Date(appt.dateTime), 'h:mm a');
                        const triage = (appt as any).triagePriority || 'Normal';

                        return (
                          <Card
                            key={appt.id}
                            className="border border-slate-200 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 group"
                          >
                            <CardContent className="p-3 space-y-2">
                              {/* Patient name + time */}
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="text-sm font-extrabold text-slate-900 leading-tight">
                                    {appt.patientName}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {timeStr}
                                    </span>
                                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${TRIAGE_BADGE[triage] || TRIAGE_BADGE['Normal']}`}>
                                      {triage}
                                    </span>
                                  </div>
                                </div>
                                {(appt as any).tokenNumber && (
                                  <span className="text-lg font-black text-emerald-700">
                                    #{(appt as any).tokenNumber}
                                  </span>
                                )}
                              </div>

                              {/* Reason */}
                              <p className="text-[11px] text-slate-500 font-medium truncate">
                                {appt.reason || 'General consultation'}
                              </p>

                              {/* Physician */}
                              <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                                <Stethoscope className="w-3 h-3" />
                                {appt.physicianName || (appt as any).doctorName || 'Assigned Physician'}
                              </p>

                              {/* Actions */}
                              <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                                {nextStatus && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleStatusChange(appt.id, nextStatus)}
                                    className="flex-1 h-7 rounded-lg text-[10px] font-bold bg-emerald-700 hover:bg-emerald-800 text-white gap-1"
                                  >
                                    <ArrowRight className="w-3 h-3" />
                                    {nextStatus}
                                  </Button>
                                )}

                                {appt.status === 'Scheduled' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleStatusChange(appt.id, 'Cancelled')}
                                    className="h-7 rounded-lg text-[10px] font-bold text-red-600 border-red-200 hover:bg-red-50 gap-1"
                                  >
                                    <XCircle className="w-3 h-3" />
                                  </Button>
                                )}

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handlePrintToken(appt)}
                                  className="h-7 rounded-lg text-[10px] font-bold text-slate-600 border-slate-200 hover:bg-slate-50 gap-1"
                                  title="Print Token Slip"
                                >
                                  <Printer className="w-3 h-3" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

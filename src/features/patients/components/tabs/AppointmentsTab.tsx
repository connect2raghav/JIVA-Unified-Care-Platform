import React from 'react';
import { usePatientStore } from '../../../../store/usePatientStore';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, User, Printer } from 'lucide-react';

export const AppointmentsTab: React.FC = () => {
  const { appointments } = usePatientStore();

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Scheduled':
        return 'bg-blue-50 text-blue-800 border-blue-100';
      case 'Completed':
        return 'bg-emerald-50 text-emerald-800 border-emerald-100';
      case 'Cancelled':
        return 'bg-red-50 text-red-800 border-red-100';
      case 'No-Show':
        return 'bg-amber-50 text-amber-850 border-amber-100';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  return (
    <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-red-800" />
            <span>Appointment Registry</span>
          </h3>
          <span className="text-xs font-semibold text-slate-400">Total: {appointments.filter(a => a.status !== 'Cancelled').length} Slots</span>
        </div>

        {appointments.filter(a => a.status !== 'Cancelled').length > 0 ? (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-55/60">
                <TableRow>
                  <TableHead className="text-xs font-black text-slate-500">Date & Time</TableHead>
                  <TableHead className="text-xs font-black text-slate-500">Dentist</TableHead>
                  <TableHead className="text-xs font-black text-slate-500">Reason</TableHead>
                  <TableHead className="text-xs font-black text-slate-500">Duration</TableHead>
                  <TableHead className="text-xs font-black text-slate-500">Status</TableHead>
                  <TableHead className="text-xs font-black text-slate-500 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.filter(a => a.status !== 'Cancelled').map((appt) => {
                  const date = new Date(appt.dateTime);
                  return (
                    <TableRow key={appt.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-bold text-xs text-slate-800 whitespace-nowrap">
                        {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} •{' '}
                        {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-slate-700">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-600">
                            <User className="w-3 h-3" />
                          </div>
                          <span>{appt.dentistName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-slate-800 max-w-[250px] truncate">
                        {appt.reason}
                        {appt.notes && <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{appt.notes}</p>}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-slate-600">{appt.durationMinutes} mins</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold border ${getStatusStyle(appt.status)}`}>
                          {appt.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <button
                          onClick={() => window.print()}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                          title="Print Appointment History"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-xs font-semibold text-slate-400">No scheduled appointments for this patient.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

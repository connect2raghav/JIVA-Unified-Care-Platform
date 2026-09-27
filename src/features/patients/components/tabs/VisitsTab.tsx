import React from 'react';
import { usePatientStore } from '../../../../store/usePatientStore';
import { Card, CardContent } from '@/components/ui/card';
import { Clipboard, HeartPulse } from 'lucide-react';

export const VisitsTab: React.FC = () => {
  const { visits } = usePatientStore();

  return (
    <div className="space-y-6">
      {visits.length > 0 ? (
        visits.map((visit) => {
          const date = new Date(visit.dateTime);
          return (
            <Card key={visit.id} className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 mb-4 gap-2">
                  <div>
                    <h4 className="text-sm font-black text-slate-800 leading-tight">
                      Clinical Visit with {visit.dentistName}
                    </h4>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">
                      {date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })} at{' '}
                      {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  
                  {visit.vitals && (
                    <div className="flex items-center gap-4 bg-slate-50 border border-slate-200/50 p-2 rounded-xl text-xs font-bold text-slate-500">
                      <div className="flex items-center gap-1">
                        <HeartPulse className="w-3.5 h-3.5 text-red-850" />
                        <span>BP: <strong className="text-slate-700">{visit.vitals.bloodPressure || 'N/A'}</strong></span>
                      </div>
                      <div>
                        <span>Pulse: <strong className="text-slate-700">{visit.vitals.pulse ? `${visit.vitals.pulse} bpm` : 'N/A'}</strong></span>
                      </div>
                      <div>
                        <span>Temp: <strong className="text-slate-700">{visit.vitals.temperature ? `${visit.vitals.temperature} °F` : 'N/A'}</strong></span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <div className="space-y-1">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Chief Complaint</h5>
                    <p className="text-xs text-slate-700 leading-relaxed font-semibold bg-slate-50/50 p-3 border border-slate-100 rounded-xl">
                      {visit.chiefComplaint}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Diagnosis Outcome</h5>
                    <p className="text-xs text-red-950 font-bold bg-red-50/30 p-3 border border-red-100 rounded-xl leading-relaxed">
                      {visit.diagnosis}
                    </p>
                  </div>
                </div>

                {visit.notes && (
                  <div className="mt-4 pt-4 border-t border-slate-150">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Clinical Visit Notes</h5>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      {visit.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
      ) : (
        <Card className="border-none shadow-sm bg-white rounded-2xl">
          <CardContent className="p-12 text-center">
            <Clipboard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-xs font-semibold text-slate-400">No clinical visits logged in this records ledger.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

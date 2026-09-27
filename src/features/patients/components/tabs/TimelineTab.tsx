import React from 'react';
import { usePatientStore } from '../../../../store/usePatientStore';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clipboard, TrendingUp, Image as ImageIcon, FileText, CheckSquare, Clock } from 'lucide-react';

export const TimelineTab: React.FC = () => {
  const { timeline } = usePatientStore();

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'Appointment':
        return <Calendar className="w-4 h-4 text-blue-800" />;
      case 'Visit':
        return <Clipboard className="w-4 h-4 text-indigo-800" />;
      case 'TreatmentPlan':
        return <TrendingUp className="w-4 h-4 text-emerald-800" />;
      case 'Image':
        return <ImageIcon className="w-4 h-4 text-purple-800" />;
      case 'Note':
        return <FileText className="w-4 h-4 text-amber-800" />;
      case 'FollowUp':
        return <CheckSquare className="w-4 h-4 text-rose-800" />;
      default:
        return <Clock className="w-4 h-4 text-slate-805" />;
    }
  };

  const getEventBgColor = (type: string) => {
    switch (type) {
      case 'Appointment':
        return 'bg-blue-50 border-blue-105';
      case 'Visit':
        return 'bg-indigo-50 border-indigo-105';
      case 'TreatmentPlan':
        return 'bg-emerald-50 border-emerald-105';
      case 'Image':
        return 'bg-purple-50 border-purple-105';
      case 'Note':
        return 'bg-amber-50 border-amber-105';
      case 'FollowUp':
        return 'bg-rose-50 border-rose-105';
      default:
        return 'bg-slate-50 border-slate-105';
    }
  };

  return (
    <Card className="border-none shadow-sm bg-white rounded-2xl">
      <CardContent className="p-6">
        <h3 className="text-base font-black text-slate-900 mb-8 flex items-center gap-2">
          <Clock className="w-5 h-5 text-red-800" />
          <span>Patient Unified Health Timeline</span>
        </h3>

        {timeline.length > 0 ? (
          <div className="relative pl-6 border-l-2 border-slate-100 space-y-8 py-2 ml-4">
            {timeline.map((event) => {
              const date = new Date(event.dateTime);
              return (
                <div key={event.id} className="relative group">
                  {/* Icon Indicator Badge */}
                  <div className={`absolute -left-[35px] top-1 w-8 h-8 rounded-xl border flex items-center justify-center bg-white shadow-sm ${getEventBgColor(event.type)} transition-transform duration-200 group-hover:scale-105`}>
                    {getEventIcon(event.type)}
                  </div>

                  {/* Text Details Block */}
                  <div className="space-y-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <h4 className="text-xs font-black text-slate-950">
                        {event.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-extrabold whitespace-nowrap">
                        {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at{' '}
                        {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-2xl">
                      {event.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs font-semibold text-slate-400 text-center py-8">
            No events registered in this clinical timeline database.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

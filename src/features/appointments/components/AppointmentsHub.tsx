import React, { useState } from 'react';
import { AppointmentStatusBoard } from './AppointmentStatusBoard';
import { ReceptionCalendar } from './ReceptionCalendar';
import { LayoutDashboard, Calendar as CalendarIcon } from 'lucide-react';

export const AppointmentsHub: React.FC = () => {
  const [activeView, setActiveView] = useState<'board' | 'calendar'>('board');

  return (
    <div className="space-y-4">
      {/* View Toggle */}
      <div className="flex bg-slate-100 p-1 rounded-xl w-fit mb-2 shadow-inner border border-slate-200">
        <button
          onClick={() => setActiveView('board')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeView === 'board'
              ? 'bg-white text-emerald-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          Status Board
        </button>
        <button
          onClick={() => setActiveView('calendar')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeView === 'calendar'
              ? 'bg-white text-emerald-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <CalendarIcon className="w-4 h-4" />
          Calendar View
        </button>
      </div>

      {/* Content */}
      <div className="transition-all">
        {activeView === 'board' ? <AppointmentStatusBoard /> : <ReceptionCalendar />}
      </div>
    </div>
  );
};

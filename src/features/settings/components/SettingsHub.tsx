import React from 'react';
import { NavLink, Outlet, useLocation, Navigate } from 'react-router-dom';
import { Settings, Users, Shield, User } from 'lucide-react';

export const SettingsHub: React.FC = () => {
  const location = useLocation();

  if (location.pathname === '/doctor/settings' || location.pathname === '/doctor/settings/') {
    return <Navigate to="/doctor/settings/profile" replace />;
  }

  const tabs = [
    { name: 'My Profile', path: '/doctor/settings/profile', icon: User },
    { name: 'Clinic Profile', path: '/doctor/settings/clinic', icon: Settings },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Settings Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 md:gap-4 border-b border-slate-200 pb-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          // Exact match for base tabs or prefix match for nested routes like users/:id
          const isActive = location.pathname.startsWith(tab.path);
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                isActive
                  ? 'bg-red-800 text-white shadow-md'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 bg-white border border-slate-200'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{tab.name}</span>
            </NavLink>
          );
        })}
      </div>
      
      {/* Content Area */}
      <div className="pt-2 animate-in fade-in duration-300 slide-in-from-bottom-2">
        <Outlet />
      </div>
    </div>
  );
};

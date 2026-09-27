import React from 'react';
import { Outlet, Navigate, NavLink } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { LayoutDashboard, Building2, Settings, LogOut, ShieldAlert } from 'lucide-react';

export const PlatformLayout: React.FC = () => {
  const { user } = useAuthStore();
  
  if (user?.role !== 'Super Admin') {
    return <Navigate to="/login" replace />;
  }

  const navItems = [
    { name: 'Dashboard', path: '/platform/dashboard', icon: LayoutDashboard },
    { name: 'Clinics', path: '/platform/clinics', icon: Building2 },
    { name: 'Settings', path: '/platform/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Platform Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col shadow-xl z-10">
        <div className="p-6 border-b border-gray-800 flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white leading-tight">Super Admin</h1>
            <p className="text-xs text-gray-400 font-medium">Platform Management</p>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1.5">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-indigo-600 text-white font-medium shadow-md shadow-indigo-900/20' 
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </NavLink>
          ))}
        </nav>
        
        <div className="p-4 border-t border-gray-800 bg-gray-900/50">
          <div className="flex items-center gap-3 px-4 py-3 mb-4 rounded-lg bg-gray-800/50 border border-gray-700/50">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 font-bold text-sm">
              {user.name?.charAt(0) || 'A'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
          <button 
            onClick={() => useAuthStore.getState().logout()}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto p-8 relative">
        <Outlet />
      </main>
    </div>
  );
};

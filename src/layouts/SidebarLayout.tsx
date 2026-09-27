import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, 
  X, 
  LogOut, 
  Users, 
  Calendar, 
  LayoutDashboard, 
  FileSpreadsheet, 
  Settings, 
  Bell,
  Check,
  Trash,
  Search,
  MessageCircle,
  HeartPulse,
  Siren,
  Droplets,
  Building2,
  Ambulance as AmbulanceIcon
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '../store/useAuthStore';
import { usePatientStore } from '../store/usePatientStore';
import { useNotificationStore } from '../store/useNotificationStore';
import type { UserRole } from '../types';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { BookingModal } from '@/features/appointments/components/BookingModal';
import { adminService } from '@/services/adminService';

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const SidebarLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { selectedPatient } = usePatientStore();
  const { notifications, loadNotifications, markAsRead, markAllAsRead, clearNotifications } = useNotificationStore();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingMode, setBookingMode] = useState<'EXISTING' | 'NEW'>('EXISTING');
  const [clinicLogo, setClinicLogo] = useState<string | null>(null);
  
  const globalSearchRef = React.useRef<HTMLInputElement>(null);
  
  const [searchIndex, setSearchIndex] = useState(-1);
  const { patientsList, loadAllPatients } = usePatientStore();
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    loadAllPatients();
  }, [loadAllPatients, user?.id]);

  // Load system notifications
  React.useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  useEffect(() => {
    const loadLogo = async () => {
      try {
        const settings = await adminService.getClinicSettings();
        if (settings?.logoUrl) {
          setClinicLogo(settings.logoUrl);
        }
      } catch (err) {
        console.error('Failed to load clinic settings', err);
      }
    };
    if (user?.role === 'ClinicAdmin' || user?.role === 'Physician') {
      loadLogo();
    }
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-xs font-bold text-slate-500 gap-2">
        <div className="w-5 h-5 border-2 border-slate-200 border-t-emerald-700 rounded-full animate-spin" />
        Preparing workspace…
      </div>
    );
  }

  // Resolve role-specific links
  const getSidebarItems = (role: UserRole): SidebarItem[] => {
    switch (role) {

      case 'ClinicAdmin':
        return [
          { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
          { name: 'Patients', href: '/admin/patients', icon: Users },
          { name: 'Appointments', href: '/admin/appointments', icon: Calendar },
          { name: 'Emergency', href: '/admin/emergency', icon: Siren },
          { name: 'Blood Bank', href: '/admin/blood-bank', icon: Droplets },
          { name: 'Facilities', href: '/admin/facilities', icon: Building2 },
          { name: 'Reports', href: '/admin/reports', icon: FileSpreadsheet },
          { name: 'Settings', href: '/admin/settings', icon: Settings },
        ];

      case 'Physician':
        return [
          { name: 'Dashboard', href: '/physician/dashboard', icon: LayoutDashboard },
          { name: 'Patients', href: '/physician/patients', icon: Users },
          { name: 'Appointments', href: '/physician/appointments', icon: Calendar },
          { name: 'Emergency', href: '/physician/emergency', icon: Siren },
          { name: 'Blood Bank', href: '/physician/blood-bank', icon: Droplets },
          { name: 'Reports', href: '/physician/reports', icon: FileSpreadsheet },
        ];

      case 'Receptionist':
        return [
          { name: 'Dashboard', href: '/receptionist/dashboard', icon: LayoutDashboard },
          { name: 'Patient Directory', href: '/receptionist/patients', icon: Users },
          { name: 'Appointments', href: '/receptionist/appointments', icon: Calendar },
          { name: 'Emergency', href: '/receptionist/emergency', icon: Siren },
        ];
      default:
        return [];
    }
  };

  const menuItems = getSidebarItems(user.role as UserRole);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };


  // Determine active breadcrumb label
  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean);
    if (paths.length === 0) return [{ name: 'Platform', href: '#' }];
    
    const crumbs = paths.map((path, idx) => {
      const href = '/' + paths.slice(0, idx + 1).join('/');
      
      if (path === 'patients' && selectedPatient) {
        return { name: 'Patients Directory', href };
      }
      
      if (idx > 0 && paths[idx - 1] === 'patients' && selectedPatient) {
        return { name: selectedPatient.name, href };
      }

      const name = path
        .split('-')
        .filter(Boolean)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      return { name, href };
    });

    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  const getPatientRoute = (patientId: string) => {
    switch (user.role) {
      case 'Physician':
        return `/physician/patients/${patientId}`;
      case 'Receptionist':
        return `/receptionist/patients/${patientId}`;
      case 'ClinicAdmin':
      default:
        return `/admin/patients/${patientId}`;
    }
  };

  // Patients are securely filtered at the service level
  const visiblePatients = patientsList;

  const matchingPatients = visiblePatients.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q) ||
      (p.displayId && p.displayId.toLowerCase().includes(q)) ||
      p.phone.includes(searchQuery)
    );
  });

  const handleGlobalSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!searchQuery.trim()) return;
    const maxIndex = Math.min(matchingPatients.length, 8) - 1;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSearchIndex(prev => (prev < maxIndex ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSearchIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (searchIndex >= 0 && searchIndex <= maxIndex) {
        const selected = matchingPatients[searchIndex];
        setSearchQuery('');
        setSearchIndex(-1);
        navigate(getPatientRoute(selected.id));
      } else if (matchingPatients.length > 0) {
        setSearchQuery('');
        setSearchIndex(-1);
        navigate(getPatientRoute(matchingPatients[0].id));
      }
    }
  };

  // Reset indices on query change
  React.useEffect(() => setSearchIndex(-1), [searchQuery]);

  // Global Keyboard Shortcuts
  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            e.stopPropagation();
            setBookingMode('EXISTING');
            setIsBookingModalOpen(true);
            break;
          case '2':
            e.preventDefault();
            e.stopPropagation();
            setBookingMode('NEW');
            setIsBookingModalOpen(true);
            break;
          case '3':
            e.preventDefault();
            e.stopPropagation();
            setIsBookingModalOpen(false);
            setTimeout(() => globalSearchRef.current?.focus(), 100);
            break;
        }
      }
    };
    
    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-800 antialiased font-sans">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 shrink-0 sticky top-0 h-screen">
        {/* Logo and Brand */}
        <div className="h-16 px-6 border-b border-slate-100 flex items-center gap-3">
          {clinicLogo ? (
            <img src={clinicLogo} alt="Clinic Logo" className="w-9 h-9 rounded-xl object-cover bg-white shadow-sm" />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-emerald-700 flex items-center justify-center text-white shadow-sm shadow-emerald-800/30">
              <HeartPulse className="w-5 h-5" />
            </div>
          )}
          <div>
            <h1 className="font-bold text-slate-900 tracking-tight leading-none text-base">JIVA</h1>
            <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase mt-0.5">
              Unified Care
            </p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {menuItems.map((item, idx) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                `flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group ${
                  isActive
                    ? 'bg-emerald-700 text-white shadow-md shadow-emerald-900/10'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                    <item.icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-105 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'}`} />
                    <span className="flex-1">{item.name}</span>
                  </>
                )}
              </NavLink>
          ))}
        </nav>

        {/* User profile details at the bottom */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div 
            onClick={() => {
              if (user.role === 'ClinicAdmin') {
                navigate('/admin/settings/profile');
              }
            }}
            className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-slate-200 cursor-pointer transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm shadow-inner uppercase shrink-0">
              {user.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900 truncate leading-snug">{user.name}</p>
              <p className="text-xs font-semibold text-emerald-800 truncate">{user.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 mt-3 rounded-xl border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-white bg-transparent transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="fixed inset-0 bg-black z-40 md:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
              className="fixed top-0 bottom-0 left-0 w-72 bg-white z-50 flex flex-col md:hidden border-r border-slate-200"
            >
              <div className="h-16 px-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {clinicLogo ? (
                    <img src={clinicLogo} alt="Clinic Logo" className="w-9 h-9 rounded-xl object-cover bg-white shadow-sm" />
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-emerald-700 flex items-center justify-center text-white shadow-sm">
                      <HeartPulse className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <h1 className="font-bold text-slate-950 text-base">JIVA</h1>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">
                      Unified Care
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileOpen(false)}
                  className="p-2 text-slate-500 hover:text-slate-950 bg-slate-100 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
                {menuItems.map((item) => (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    onClick={() => setIsMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                        isActive
                          ? 'bg-emerald-700 text-white shadow-sm'
                          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                      }`
                    }
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </NavLink>
                ))}
              </nav>

              <div className="p-4 border-t border-slate-100 bg-slate-50">
                <div 
                  onClick={() => {
                    navigate(`/profile`);
                    setIsMobileOpen(false);
                  }}
                  className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-slate-200 cursor-pointer transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm uppercase shrink-0">
                    {user.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
                    <p className="text-xs font-semibold text-emerald-800 truncate">{user.role}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 mt-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 bg-white shadow-sm"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative h-screen overflow-hidden pb-16 md:pb-0">
        {/* Topbar Header */}
        <header className="h-16 border-b border-slate-200 bg-white/90 backdrop-blur-md flex items-center justify-between px-4 md:px-8 shrink-0 z-40 relative">
          <div className="flex items-center gap-4">
            {/* Quick Actions Desktop */}
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => {
                  setBookingMode('EXISTING');
                  setIsBookingModalOpen(true);
                }}
                className="relative px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs transition-colors flex items-center gap-2 group"
              >
                <Calendar className="w-3.5 h-3.5" /> Book Appt
                <kbd className="absolute -bottom-2 -right-2 hidden group-hover:flex items-center justify-center bg-white border border-slate-200 text-slate-500 font-bold text-[8px] px-1 rounded shadow-sm">
                  Alt 1
                </kbd>
              </button>
            </div>
          </div>

          {/* Mobile Right Actions */}
          <div className="flex md:hidden items-center gap-3">
            <button
              onClick={() => setIsMobileSearchOpen(true)}
              className="p-1.5 text-slate-500 hover:text-slate-900"
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                setBookingMode('EXISTING');
                setIsBookingModalOpen(true);
              }}
              className="p-1.5 text-emerald-600 bg-emerald-100 rounded-lg hover:bg-emerald-200"
            >
              <Calendar className="w-5 h-5" />
            </button>
            <button className="relative p-1.5 text-slate-500 hover:text-slate-900">
              <Bell className="w-5 h-5" />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs uppercase shrink-0 select-none">
              {user.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
            </div>
          </div>

          {/* Global Patient Search */}
          <div className={`${isMobileSearchOpen ? 'absolute inset-0 bg-white z-50 flex items-center px-4 justify-between gap-3' : 'hidden md:flex flex-1 max-w-md mx-auto relative z-50 justify-center'}`}>
            <div className="relative w-full group flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <Input
                ref={globalSearchRef}
                placeholder="Search patient by name, ID, or phone..."
                value={searchQuery}
                autoFocus={isMobileSearchOpen}
                onKeyDown={handleGlobalSearchKeyDown}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-14 h-9 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-1 focus-visible:ring-emerald-500 text-xs shadow-sm transition-all group-hover:bg-white group-hover:border-slate-300 group-hover:shadow-md"
              />
              <kbd className="absolute right-3 top-2.5 hidden md:group-hover:flex items-center justify-center bg-white border border-slate-200 text-slate-500 font-bold text-[8px] px-1.5 rounded shadow-sm">
                Alt 3
              </kbd>
              {searchQuery.trim().length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden divide-y divide-slate-100 max-h-[60vh] overflow-y-auto">
                  {matchingPatients.slice(0, 8).map((p, idx) => (
                    <div
                      key={p.id}
                      className={`transition flex items-center justify-between group/item h-16 ${searchIndex === idx ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
                    >
                      <div 
                        className="flex items-center gap-3 w-full h-full p-3 cursor-pointer"
                        onClick={() => {
                          setSearchQuery('');
                          setSearchIndex(-1);
                          setIsMobileSearchOpen(false);
                          navigate(getPatientRoute(p.id));
                        }}
                      >
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                          {p.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm group-hover/item:text-emerald-700 transition-colors">{p.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium">ID: {p.displayId || 'N/A'} • {p.phone}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {matchingPatients.length === 0 && (
                    <div className="p-4 text-center text-slate-500 text-xs">No patients found.</div>
                  )}
                </div>
              )}
            </div>
            {isMobileSearchOpen && (
              <button 
                onClick={() => {
                  setIsMobileSearchOpen(false);
                  setSearchQuery('');
                }}
                className="p-2 bg-slate-100 rounded-full text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="hidden md:flex items-center gap-4">

            {/* Notification Bell Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative p-2 rounded-xl text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition">
                  <Bell className="w-4 h-4" />
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 rounded-2xl p-4 bg-white border border-slate-200 shadow-xl space-y-3 z-50">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-wider">Alerts</h4>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => markAllAsRead()}
                      className="text-[9px] font-bold text-emerald-800 hover:text-emerald-900 transition flex items-center gap-0.5"
                    >
                      <Check className="w-3 h-3" /> Mark all read
                    </button>
                    <span className="text-slate-200">|</span>
                    <button
                      type="button"
                      onClick={() => clearNotifications()}
                      className="text-[9px] font-bold text-slate-400 hover:text-rose-700 transition flex items-center gap-0.5"
                    >
                      <Trash className="w-3 h-3" /> Clear
                    </button>
                  </div>
                </div>
                <hr className="border-slate-100" />
                <div className="max-h-72 overflow-y-auto space-y-2 pr-1 text-xs">
                  {notifications.length > 0 ? (
                    notifications.map((noti) => (
                      <div
                        key={noti.id}
                        onClick={() => !noti.read && markAsRead(noti.id)}
                        className={`p-3 rounded-xl border transition cursor-pointer text-[11px] leading-relaxed flex items-start gap-2.5 ${
                          noti.read 
                            ? 'border-slate-50 bg-slate-50/20 text-slate-500' 
                            : 'border-emerald-50 bg-emerald-50/10 text-slate-800 font-semibold'
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${noti.read ? 'bg-slate-300' : 'bg-emerald-600 animate-pulse'}`} />
                        <div className="space-y-0.5">
                          <p className="font-extrabold text-slate-900">{noti.title}</p>
                          <p className="text-[10px] text-slate-500 font-medium leading-normal">{noti.description}</p>
                          <p className="text-[9px] text-slate-400 font-semibold">{new Date(noti.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-slate-400 text-[10px] font-bold">
                      No notifications.
                    </div>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-4 md:p-8 max-w-[1600px] mx-auto min-h-[calc(100vh-4rem)]">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex items-center justify-around z-50 h-16 px-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        {menuItems
          .filter(item => ['Dashboard', 'Appointments', 'Emergency'].includes(item.name))
          .map(item => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
                  isActive ? 'text-emerald-700' : 'text-slate-400 hover:text-slate-600'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[9px] font-bold">{item.name}</span>
            </NavLink>
          ))}
          
          {/* Menu Toggle for other options */}
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
              isMobileOpen ? 'text-emerald-700' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Menu className="w-5 h-5" />
            <span className="text-[9px] font-bold">Menu</span>
          </button>
      </nav>

      <BookingModal 
        isOpen={isBookingModalOpen} 
        onClose={() => setIsBookingModalOpen(false)}
        defaultMode={bookingMode}
      />
    </div>
  );
};

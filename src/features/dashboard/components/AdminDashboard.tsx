/**
 * JIVA — Unified Care Platform
 * Admin Dashboard (Phase 4)
 *
 * Real-time KPI cards wired to Supabase, activity feed,
 * emergency alerts, and blood inventory overview.
 */
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { dashboardService } from '../services/dashboardService';
import type { DashboardKPI } from '@/types/domain';
import {
  Users,
  Calendar,
  Siren,
  Droplets,
  Activity,
  Building2,
  TrendingUp,
  AlertTriangle,
  HeartPulse,
  Truck,
  Clock,
  ArrowRight,
  RefreshCw,
  Zap,
  Shield,
  Bell,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const StatCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  onClick?: () => void;
  alert?: boolean;
}> = ({ title, value, subtitle, icon, color, bgColor, onClick, alert }) => (
  <div
    onClick={onClick}
    className={`relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 ${
      alert ? 'border-red-200 bg-red-50/50' : 'border-slate-200 bg-white'
    }`}
  >
    {alert && (
      <div className="absolute top-3 right-3">
        <span className="flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
        </span>
      </div>
    )}
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-2">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</p>
        <p className={`text-3xl font-black ${color}`}>{value}</p>
        {subtitle && <p className="text-xs font-semibold text-slate-400">{subtitle}</p>}
      </div>
      <div className={`w-12 h-12 rounded-2xl ${bgColor} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
    </div>
  </div>
);

export const AdminDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [kpis, setKpis] = useState<DashboardKPI | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentEmergencies, setRecentEmergencies] = useState<any[]>([]);

  const clinicId = user?.clinic_id || user?.clinicId || '';

  const loadData = async () => {
    if (!clinicId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [kpiData, emergencies] = await Promise.all([
        dashboardService.getKPIs(clinicId),
        dashboardService.getRecentEmergencies(clinicId, 4),
      ]);
      setKpis(kpiData);
      setRecentEmergencies(emergencies);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Auto-refresh every 30s
    return () => clearInterval(interval);
  }, [clinicId]);

  const getRolePath = () => {
    switch (user?.role) {
      case 'Physician': return '/physician';
      case 'Receptionist': return '/receptionist';
      default: return '/admin';
    }
  };

  const priorityColors: Record<string, string> = {
    Low: 'bg-slate-100 text-slate-600',
    Medium: 'bg-blue-100 text-blue-700',
    High: 'bg-amber-100 text-amber-800',
    Critical: 'bg-red-100 text-red-700 animate-pulse',
  };

  const statusColors: Record<string, string> = {
    Received: 'text-indigo-600',
    Acknowledged: 'text-blue-600',
    Dispatched: 'text-purple-600',
    'In-Transit': 'text-amber-600',
    Arrived: 'text-emerald-600',
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (loading && !kpis) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-emerald-200 border-t-emerald-700 rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-500">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {greeting()}, {user?.name?.split(' ')[0] || 'Admin'} 👋
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Here's your healthcare operations overview for today
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Emergency Broadcast Banner */}
      {recentEmergencies.some((e: any) => e.priority === 'Critical' && !['Resolved', 'Cancelled'].includes(e.status)) && (
        <div className="rounded-2xl bg-gradient-to-r from-red-600 to-red-700 text-white p-4 flex items-center gap-4 shadow-lg shadow-red-500/20 animate-pulse">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Siren className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="font-black text-sm">🚨 CRITICAL EMERGENCY ACTIVE</p>
            <p className="text-xs text-red-100 font-medium mt-0.5">
              {recentEmergencies.filter((e: any) => e.priority === 'Critical' && !['Resolved', 'Cancelled'].includes(e.status)).length} critical emergency request(s) require immediate attention
            </p>
          </div>
          <button
            onClick={() => navigate(`${getRolePath()}/emergency`)}
            className="px-4 py-2 bg-white text-red-700 rounded-xl text-xs font-black hover:bg-red-50 transition-colors shrink-0"
          >
            View Now →
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Patients"
          value={kpis?.totalPatients ?? 0}
          subtitle="Registered in system"
          icon={<Users className="w-6 h-6 text-emerald-600" />}
          color="text-emerald-700"
          bgColor="bg-emerald-50"
          onClick={() => navigate(`${getRolePath()}/patients`)}
        />
        <StatCard
          title="Today's Appointments"
          value={kpis?.appointmentsToday ?? 0}
          subtitle={new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' })}
          icon={<Calendar className="w-6 h-6 text-blue-600" />}
          color="text-blue-700"
          bgColor="bg-blue-50"
          onClick={() => navigate(`${getRolePath()}/appointments`)}
        />
        <StatCard
          title="Active Emergencies"
          value={kpis?.activeEmergencies ?? 0}
          subtitle="Pending resolution"
          icon={<Siren className="w-6 h-6 text-red-600" />}
          color="text-red-700"
          bgColor="bg-red-50"
          onClick={() => navigate(`${getRolePath()}/emergency`)}
          alert={(kpis?.activeEmergencies ?? 0) > 0}
        />
        <StatCard
          title="Ambulances Ready"
          value={kpis?.ambulancesAvailable ?? 0}
          subtitle="Available for dispatch"
          icon={<Truck className="w-6 h-6 text-purple-600" />}
          color="text-purple-700"
          bgColor="bg-purple-50"
          onClick={() => navigate(`${getRolePath()}/emergency`)}
        />
        <StatCard
          title="Blood Units"
          value={kpis?.totalBloodUnits ?? 0}
          subtitle={kpis?.bloodUnitsLow?.length ? `⚠ Low: ${kpis.bloodUnitsLow.join(', ')}` : 'All groups adequate'}
          icon={<Droplets className="w-6 h-6 text-rose-600" />}
          color="text-rose-700"
          bgColor="bg-rose-50"
          onClick={() => navigate(`${getRolePath()}/blood-bank`)}
          alert={(kpis?.bloodUnitsLow?.length ?? 0) > 0}
        />
        <StatCard
          title="Pending Blood Requests"
          value={kpis?.pendingBloodRequests ?? 0}
          subtitle="Awaiting fulfillment"
          icon={<Activity className="w-6 h-6 text-amber-600" />}
          color="text-amber-700"
          bgColor="bg-amber-50"
          onClick={() => navigate(`${getRolePath()}/blood-bank`)}
        />
        <StatCard
          title="Nearby Facilities"
          value={kpis?.nearbyFacilities ?? 0}
          subtitle="Hospitals, labs, pharmacies"
          icon={<Building2 className="w-6 h-6 text-indigo-600" />}
          color="text-indigo-700"
          bgColor="bg-indigo-50"
          onClick={() => navigate(`${getRolePath()}/facilities`)}
        />
        <StatCard
          title="Platform Status"
          value="Online"
          subtitle="All systems operational"
          icon={<Shield className="w-6 h-6 text-emerald-600" />}
          color="text-emerald-700"
          bgColor="bg-emerald-50"
        />
      </div>

      {/* Bottom Section: Recent Emergencies + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Emergency Feed */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Siren className="w-4 h-4 text-red-500" />
              Recent Emergency Requests
            </h3>
            <button
              onClick={() => navigate(`${getRolePath()}/emergency`)}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 transition-colors"
            >
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-3">
            {recentEmergencies.length > 0 ? recentEmergencies.map((e: any) => (
              <div key={e.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${priorityColors[e.priority] || 'bg-slate-100 text-slate-600'}`}>
                  {e.priority}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{e.description}</p>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    📍 {e.pickup_location} • <span className={statusColors[e.status] || 'text-slate-500'}>{e.status}</span>
                  </p>
                </div>
                <p className="text-[10px] text-slate-400 font-semibold shrink-0">
                  {new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            )) : (
              <div className="text-center py-8 text-slate-400">
                <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-bold">No recent emergencies</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-amber-500" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Register Patient', icon: Users, color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100', path: `${getRolePath()}/patients` },
              { label: 'Book Appointment', icon: Calendar, color: 'bg-blue-50 text-blue-700 hover:bg-blue-100', path: `${getRolePath()}/appointments` },
              { label: 'New Emergency', icon: Siren, color: 'bg-red-50 text-red-700 hover:bg-red-100', path: `${getRolePath()}/emergency` },
              { label: 'Blood Bank', icon: Droplets, color: 'bg-rose-50 text-rose-700 hover:bg-rose-100', path: `${getRolePath()}/blood-bank` },
              { label: 'View Facilities', icon: Building2, color: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100', path: `${getRolePath()}/facilities` },
              { label: 'View Reports', icon: TrendingUp, color: 'bg-purple-50 text-purple-700 hover:bg-purple-100', path: `${getRolePath()}/reports` },
            ].map(action => (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className={`flex items-center gap-3 p-4 rounded-xl ${action.color} transition-all text-left group`}
              >
                <action.icon className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

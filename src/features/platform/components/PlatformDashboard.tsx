import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { Building2, Users, Calendar, Activity, TrendingUp, Search } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export const PlatformDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalClinics: 0,
    activeClinics: 0,
    inactiveClinics: 0,
    totalDentists: 0,
    totalAssistants: 0,
    totalPatients: 0,
    totalAppointments: 0,
  });
  
  const [recentClinics, setRecentClinics] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [clinicGrowth, setClinicGrowth] = useState<any[]>([]);
  const [patientsByClinic, setPatientsByClinic] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      
      // 1. Basic Stats
      const { count: totalClinics } = await supabase.from('clinics').select('*', { count: 'exact', head: true });
      const { count: activeClinics } = await supabase.from('clinics').select('*', { count: 'exact', head: true }).eq('is_active', true);
      const { count: inactiveClinics } = await supabase.from('clinics').select('*', { count: 'exact', head: true }).eq('is_active', false);
      const { count: totalDentists } = await supabase.from('users').select('id, clinics!inner(is_active)', { count: 'exact', head: true }).eq('role_id', '00000000-0000-0000-0000-000000000003').eq('clinics.is_active', true);
      const { count: totalAssistants } = await supabase.from('users').select('id, clinics!inner(is_active)', { count: 'exact', head: true }).in('role_id', ['00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000005']).eq('clinics.is_active', true);
      const { count: totalPatients } = await supabase.from('patients').select('id, clinics!inner(is_active)', { count: 'exact', head: true }).eq('clinics.is_active', true);
      const { count: totalAppointments } = await supabase.from('appointments').select('id, patients!inner(clinics!inner(is_active))', { count: 'exact', head: true }).eq('patients.clinics.is_active', true);

      setStats({
        totalClinics: totalClinics || 0,
        activeClinics: activeClinics || 0,
        inactiveClinics: inactiveClinics || 0,
        totalDentists: totalDentists || 0,
        totalAssistants: totalAssistants || 0,
        totalPatients: totalPatients || 0,
        totalAppointments: totalAppointments || 0,
      });

      // 2. Recent Clinics
      const { data: latestClinics } = await supabase.from('clinics').select('*').order('created_at', { ascending: false }).limit(5);
      if (latestClinics) setRecentClinics(latestClinics);

      // 3. Recent Activity (Audit Logs)
      const { data: logs } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(5);
      if (logs) setRecentActivity(logs);

      // 4. Chart Data: Clinic Growth (Mocked grouped by month using available clinics for demo)
      // In a real app, this would be an aggregation query or processed on the server
      const { data: allClinics } = await supabase.from('clinics').select('created_at').order('created_at', { ascending: true });
      if (allClinics) {
        const growthData: any = {};
        let cumulative = 0;
        allClinics.forEach(c => {
          const month = new Date(c.created_at).toLocaleString('default', { month: 'short', year: 'numeric' });
          if (!growthData[month]) growthData[month] = 0;
          growthData[month]++;
        });
        
        const growthChart = Object.keys(growthData).map(month => {
          cumulative += growthData[month];
          return { month, clinics: cumulative, new: growthData[month] };
        });
        // Ensure at least some data for the chart if only 1 month exists
        if (growthChart.length === 1) {
            growthChart.unshift({ month: 'Previous', clinics: 0, new: 0 });
        }
        setClinicGrowth(growthChart);
      }

      // 5. Chart Data: Patients by Clinic
      // Using a quick aggregate simulation for the top clinics
      const { data: pByC } = await supabase.from('patients').select('clinic_id');
      if (pByC && latestClinics) {
        const clinicMap: Record<string, number> = {};
        pByC.forEach(p => {
          clinicMap[p.clinic_id] = (clinicMap[p.clinic_id] || 0) + 1;
        });
        
        const pieData = latestClinics.map(c => ({
          name: c.name.substring(0, 15) + (c.name.length > 15 ? '...' : ''),
          value: clinicMap[c.id] || 0
        })).filter(d => d.value > 0);
        
        setPatientsByClinic(pieData.length > 0 ? pieData : [{ name: 'No Data', value: 1 }]);
      }

      setLoading(false);
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Platform Overview</h1>
          <p className="text-gray-500 mt-1">Monitor the health and growth of your multi-clinic system.</p>
        </div>
        <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg font-medium text-sm border border-indigo-100 flex items-center">
          <Activity className="w-4 h-4 mr-2" />
          System Status: Healthy
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-gray-500 text-sm font-medium">Total Clinics</h3>
              <p className="text-3xl font-bold mt-2 text-gray-900">{stats.totalClinics}</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 text-sm flex gap-4">
            <span className="bg-green-50 text-green-700 px-2 py-1 rounded-md font-medium">{stats.activeClinics} Active</span>
            <span className="bg-red-50 text-red-700 px-2 py-1 rounded-md font-medium">{stats.inactiveClinics} Inactive</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
           <div className="flex justify-between items-start">
            <div>
              <h3 className="text-gray-500 text-sm font-medium">Total Staff</h3>
              <p className="text-3xl font-bold mt-2 text-gray-900">{stats.totalDentists + stats.totalAssistants}</p>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 text-sm flex gap-4 text-gray-600">
            <span className="font-medium">{stats.totalDentists} Dentists</span>
            <span className="font-medium">{stats.totalAssistants} Assistants</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-gray-500 text-sm font-medium">Total Patients</h3>
              <p className="text-3xl font-bold mt-2 text-gray-900">{stats.totalPatients}</p>
            </div>
            <div className="bg-emerald-50 p-3 rounded-lg">
              <Activity className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500 flex items-center">
            <TrendingUp className="w-4 h-4 mr-1 text-emerald-500" /> Across all active clinics
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-gray-500 text-sm font-medium">Appointments</h3>
              <p className="text-3xl font-bold mt-2 text-gray-900">{stats.totalAppointments}</p>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <Calendar className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            Total scheduled in system
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Platform Growth (Clinics)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={clinicGrowth}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 12}} dx={-10} />
                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" />
                <Line type="monotone" dataKey="clinics" name="Total Clinics" stroke="#4f46e5" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
                <Line type="monotone" dataKey="new" name="New Clinics" stroke="#10b981" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Patient Distribution (Top Clinics)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={patientsByClinic}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {patientsByClinic.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" layout="vertical" verticalAlign="middle" align="right" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Lists Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900">Recently Added Clinics</h3>
            <span className="text-sm text-indigo-600 font-medium cursor-pointer hover:text-indigo-800">View All</span>
          </div>
          <div className="flex-1 overflow-auto">
            <ul className="divide-y divide-gray-100">
              {recentClinics.length > 0 ? recentClinics.map(clinic => (
                <li key={clinic.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg mr-4">
                      {clinic.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{clinic.name}</p>
                      <p className="text-sm text-gray-500">{clinic.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                     <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${clinic.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {clinic.is_active ? 'Active' : 'Suspended'}
                      </span>
                  </div>
                </li>
              )) : (
                <li className="p-6 text-center text-gray-500">No clinics found.</li>
              )}
            </ul>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-bold text-gray-900">Recent Platform Activity</h3>
          </div>
          <div className="flex-1 overflow-auto">
            <ul className="divide-y divide-gray-100">
              {recentActivity.length > 0 ? recentActivity.map(log => (
                <li key={log.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="font-medium text-gray-900 text-sm">
                      {log.action}
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                      {new Date(log.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-gray-600">
                    <span className="font-medium">{log.user_name || log.user_email}</span> {log.details}
                  </div>
                </li>
              )) : (
                <li className="p-6 text-center text-gray-500">No recent activity recorded.</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

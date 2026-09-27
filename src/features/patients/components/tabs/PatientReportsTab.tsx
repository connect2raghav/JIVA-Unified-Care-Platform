import React, { useState, useEffect, useMemo } from 'react';
import { usePatientStore } from '@/store/usePatientStore';
import { reportsService } from '@/services/reportsService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart3, Calendar, Activity, Stethoscope, ShieldAlert, 
  ClipboardList, AlertTriangle, History, Users, CheckCircle2,
  Clock, TrendingUp
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';


const DATE_RANGES = [
  'Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 
  'This Month', 'Last Month', 'This Year', 'All Time', 'Custom Date Range'
];

const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#6b7280', '#8b5cf6', '#3b82f6'];
const STATUS_COLORS: Record<string, string> = {
  Scheduled: '#3b82f6',
  'Checked-In': '#8b5cf6',
  Waiting: '#f59e0b',
  'In Treatment': '#f97316',
  Completed: '#10b981',
  Cancelled: '#ef4444',
  'No-Show': '#6b7280',
  'No Show': '#6b7280'
};

export const PatientReportsTab: React.FC = () => {
  const { selectedPatient } = usePatientStore();
  const [dateRange, setDateRange] = useState('This Year');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPatientData = async () => {
      if (!selectedPatient) return;
      setIsLoading(true);
      try {
        const data = await reportsService.getReportsData({
          dateRange,
          startDate: dateRange === 'Custom Date Range' ? startDate : undefined,
          endDate: dateRange === 'Custom Date Range' ? endDate : undefined,
          patient: selectedPatient.id
        });
        setReportData(data);
      } catch (err) {
        console.error('Failed to load patient reports:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPatientData();
  }, [selectedPatient, dateRange, startDate, endDate]);

  const chartData = useMemo(() => {
    if (!reportData) return null;

    const appts = reportData.raw.appointments || [];
    const procs = reportData.raw.procedures || [];
    const diseases = reportData.raw.diseases || [];
    const followUps = reportData.raw.followUps || [];
    const toothRecords = reportData.raw.toothRecords || [];

    // KPI calculations
    const totalAppointments = appts.length;
    const completedAppts = appts.filter((a: any) => a.status === 'Completed').length;
    const missedAppts = appts.filter((a: any) => a.status === 'Cancelled' || a.status === 'No Show' || a.status === 'No-Show').length;
    const totalTreatments = procs.length;
    const completedTreatments = procs.filter((p: any) => p.status === 'Completed').length;
    const activeDiseases = diseases.filter((d: any) => d.status === 'Active' || d.status === 'Under Treatment').length;
    const pendingFollowUps = followUps.filter((f: any) => f.status === 'Pending').length;
    const missedFollowUps = followUps.filter((f: any) => f.status === 'Pending' && new Date(f.dueDate) < new Date()).length;

    // Appointment status breakdown
    const apptStatusMap: Record<string, number> = {};
    appts.forEach((a: any) => { apptStatusMap[a.status] = (apptStatusMap[a.status] || 0) + 1; });
    const apptStatusData = Object.entries(apptStatusMap).map(([name, value]) => ({ name, value }));

    // Appointment trend (by date)
    const apptByDate: Record<string, number> = {};
    appts.forEach((a: any) => {
      const d = new Date(a.dateTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      apptByDate[d] = (apptByDate[d] || 0) + 1;
    });
    const appointmentTrend = Object.entries(apptByDate).map(([date, count]) => ({ date, Appointments: count }));

    // Treatment status breakdown
    const txStatusMap: Record<string, number> = { Planned: 0, 'In-Progress': 0, Completed: 0, Cancelled: 0 };
    procs.forEach((p: any) => {
      const key = p.status === 'In Progress' ? 'In-Progress' : p.status;
      if (key in txStatusMap) txStatusMap[key]++;
    });
    const txStatusData = Object.entries(txStatusMap).map(([name, value]) => ({ name, value }));

    // Treatment completion rate
    const completionRate = totalTreatments > 0 ? Math.round((completedTreatments / totalTreatments) * 100) : 0;

    // Disease status breakdown
    const diseaseStatusMap: Record<string, number> = {};
    diseases.forEach((d: any) => { diseaseStatusMap[d.status] = (diseaseStatusMap[d.status] || 0) + 1; });
    const diseaseStatusData = Object.entries(diseaseStatusMap).map(([name, value]) => ({ name, value }));

    // Most affected teeth
    const teethMap: Record<string, number> = {};
    toothRecords.forEach((tr: any) => {
      const tName = getToothName(tr.tooth_number || 11);
      teethMap[tName] = (teethMap[tName] || 0) + 1;
    });
    const teethData = Object.entries(teethMap).map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count).slice(0, 8);

    // Tooth heatmap data (all 32 teeth)
    const treatedTeethRaw: Record<number, number> = {};
    toothRecords.forEach((tr: any) => {
      if (tr.tooth_number) treatedTeethRaw[tr.tooth_number] = (treatedTeethRaw[tr.tooth_number] || 0) + 1;
    });
    const toothHeatmap = Array.from({ length: 32 }, (_, i) => {
      const num = i + 1;
      const count = treatedTeethRaw[num] || 0;
      return {
        toothNumber: num,
        treatedCount: count,
        condition: toothRecords.find((tr: any) => tr.tooth_number === num)?.condition || 'Healthy',
        intensity: count === 0 ? 0 : count === 1 ? 0.3 : count === 2 ? 0.6 : 1.0
      };
    });

    // Follow-up status
    const fuStatusMap: Record<string, number> = { Pending: 0, Completed: 0, Overdue: 0 };
    followUps.forEach((f: any) => {
      if (f.status === 'Completed') fuStatusMap.Completed++;
      else if (new Date(f.dueDate) < new Date()) fuStatusMap.Overdue++;
      else fuStatusMap.Pending++;
    });
    const followUpData = Object.entries(fuStatusMap).map(([status, count]) => ({ status, count }));

    // Visit history (recent visits)
    const visitHistory = (reportData.raw.visits || []).map((v: any) => ({
      id: v.id,
      date: v.dateTime,
      diagnosis: v.diagnosis || 'General',
      complaint: v.chiefComplaint || '',
      doctor: v.doctorName || 'Unknown',
      status: v.status || 'Completed'
    })).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

    return {
      kpis: {
        totalAppointments,
        completedAppts,
        missedAppts,
        totalTreatments,
        completedTreatments,
        completionRate,
        activeDiseases,
        totalDiseases: diseases.length,
        pendingFollowUps,
        missedFollowUps,
        totalFollowUps: followUps.length
      },
      apptStatusData,
      appointmentTrend,
      txStatusData,
      diseaseStatusData,
      teethData,
      toothHeatmap,
      followUpData,
      visitHistory
    };
  }, [reportData]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-10 h-10 border-4 border-red-200 border-t-red-800 rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-slate-500">Compiling patient clinical summary...</p>
      </div>
    );
  }

  if (!reportData || !chartData) return null;

  const { kpis } = chartData;

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-red-700" />
            Clinical Summary
          </h2>
          <p className="text-xs font-semibold text-slate-500">Aggregate reports for {selectedPatient?.name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 shadow-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all cursor-pointer"
          >
            {DATE_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          {dateRange === 'Custom Date Range' && (
            <div className="flex items-center gap-2">
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="h-10 px-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 shadow-sm" />
              <span className="text-slate-400 font-bold">-</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="h-10 px-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 shadow-sm" />
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="rounded-2xl border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-100/50 to-transparent rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700 mb-3">
              <Calendar className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Total Appointments</p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{kpis.totalAppointments}</h3>
            <p className="text-[10px] font-semibold text-slate-500 mt-2">
              <span className="text-emerald-600">{kpis.completedAppts} Completed</span>
              <span className="text-slate-300 mx-1">|</span>
              <span className="text-red-600">{kpis.missedAppts} Missed</span>
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-100/50 to-transparent rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 mb-3">
              <Stethoscope className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Treatments</p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{kpis.totalTreatments}</h3>
            <p className="text-[10px] font-semibold text-slate-500 mt-2">
              {kpis.completionRate}% Completion Rate
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-100/50 to-transparent rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700 mb-3">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Disease Records</p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{kpis.totalDiseases}</h3>
            <p className="text-[10px] font-semibold text-slate-500 mt-2">
              <span className="text-amber-600">{kpis.activeDiseases} Active</span>
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-purple-100/50 to-transparent rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-700 mb-3">
              <Clock className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Pending Follow-ups</p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{kpis.pendingFollowUps}</h3>
            <p className="text-[10px] font-semibold text-slate-500 mt-2">
              {kpis.missedFollowUps > 0 && <span className="text-red-600">{kpis.missedFollowUps} Overdue</span>}
              {kpis.missedFollowUps === 0 && <span className="text-emerald-600">All on track</span>}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden relative group col-span-2 md:col-span-1">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-rose-100/50 to-transparent rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-700 mb-3">
              <TrendingUp className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Visit Frequency</p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{reportData.patientStats.visitFrequency}</h3>
            <p className="text-[10px] font-semibold text-slate-500 mt-2">Avg. visits per patient</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1: Appointment Trend + Treatment Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              Appointment History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {chartData.appointmentTrend.length ? (
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.appointmentTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', fontWeight: 'bold' }} />
                    <Bar dataKey="Appointments" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={35} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-sm font-bold text-slate-400">No appointments recorded.</div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="text-sm font-black text-slate-900 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-emerald-600" />
              Treatment Status
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {chartData.txStatusData.filter((d: any) => d.value > 0).length ? (
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData.txStatusData.filter((d: any) => d.value > 0)}
                      cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={5} dataKey="value">
                      {chartData.txStatusData.filter((d: any) => d.value > 0).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', fontWeight: 'bold' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-sm font-bold text-slate-400">No treatments recorded.</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2: Disease Status + Most Affected Teeth */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="text-sm font-black text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              Disease Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {chartData.diseaseStatusData.length ? (
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.diseaseStatusData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', fontWeight: 'bold' }} />
                    <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={45} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-sm font-bold text-slate-400">No disease records.</div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Charts Row 3: Follow-up Status + Appointment Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-600" />
              Follow-up Status
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {chartData.followUpData.filter((d: any) => d.count > 0).length ? (
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.followUpData.filter((d: any) => d.count > 0)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="status" tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', fontWeight: 'bold' }} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={50}>
                      {chartData.followUpData.filter((d: any) => d.count > 0).map((entry: any, index: number) => {
                        let color = '#94a3b8';
                        if (entry.status === 'Pending') color = '#3b82f6';
                        else if (entry.status === 'Completed') color = '#10b981';
                        else if (entry.status === 'Overdue') color = '#ef4444';
                        return <Cell key={`cell-${index}`} fill={color} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-sm font-bold text-slate-400">No follow-ups recorded.</div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              Appointment Status
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {chartData.apptStatusData.length ? (
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.apptStatusData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', fontWeight: 'bold' }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={45}>
                      {chartData.apptStatusData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || '#94a3b8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-sm font-bold text-slate-400">No appointments recorded.</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Visit History Table */}
      {chartData.visitHistory.length > 0 && (
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="text-sm font-black text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-slate-600" />
              Recent Visit History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Diagnosis</th>
                    <th className="py-3 px-4">Chief Complaint</th>
                    <th className="py-3 px-4">Doctor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {chartData.visitHistory.map((v: any) => (
                    <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">{new Date(v.date).toLocaleDateString()}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold">{v.diagnosis}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{v.complaint || '-'}</td>
                      <td className="py-3 px-4">{v.doctor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

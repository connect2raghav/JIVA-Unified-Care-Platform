/**
 * JIVA — Unified Care Platform
 * Emergency Dispatch Desk (Phase 2)
 *
 * Intake modal, priority levels, one-click ambulance assignment,
 * ambulance fleet board, emergency request list with status management.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { emergencyService } from '../services/emergencyService';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Siren,
  Plus,
  RefreshCw,
  Phone,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Ambulance as AmbulanceIcon,
  ArrowRight,
  User,
  FileText,
  Zap,
  Activity,
  Truck,
} from 'lucide-react';
import type {
  EmergencyRequest,
  EmergencyPriority,
  EmergencyStatus,
  Ambulance,
  AmbulanceStatus,
} from '@/types/domain';

// ─── Constants ───────────────────────────────────────────────────

const PRIORITY_STYLES: Record<EmergencyPriority, string> = {
  Low: 'bg-slate-100 text-slate-700 border-slate-200',
  Medium: 'bg-blue-50 text-blue-700 border-blue-200',
  High: 'bg-amber-50 text-amber-800 border-amber-200',
  Critical: 'bg-red-50 text-red-700 border-red-200 animate-pulse',
};

const STATUS_STYLES: Record<EmergencyStatus, string> = {
  Received: 'bg-indigo-50 text-indigo-700',
  Acknowledged: 'bg-blue-50 text-blue-700',
  Dispatched: 'bg-purple-50 text-purple-700',
  'In-Transit': 'bg-amber-50 text-amber-800',
  Arrived: 'bg-emerald-50 text-emerald-700',
  Resolved: 'bg-slate-100 text-slate-500',
  Cancelled: 'bg-slate-50 text-slate-400',
};

const AMBULANCE_STATUS_STYLES: Record<AmbulanceStatus, string> = {
  Available: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Dispatched: 'bg-purple-100 text-purple-700 border-purple-200',
  'En-Route': 'bg-amber-100 text-amber-800 border-amber-200',
  'At-Scene': 'bg-red-100 text-red-700 border-red-200',
  Returning: 'bg-blue-100 text-blue-700 border-blue-200',
  'Out-of-Service': 'bg-slate-100 text-slate-400 border-slate-200',
};

const NEXT_EMERGENCY_STATUS: Record<string, EmergencyStatus> = {
  Received: 'Acknowledged',
  Acknowledged: 'Dispatched',
  Dispatched: 'In-Transit',
  'In-Transit': 'Arrived',
  Arrived: 'Resolved',
};

// ─── Component ───────────────────────────────────────────────────

export const EmergencyDispatchDesk: React.FC = () => {
  const { user } = useAuthStore();
  const { addToast } = useNotificationStore();

  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [ambulances, setAmbulances] = useState<Ambulance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showIntakeModal, setShowIntakeModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState<EmergencyRequest | null>(null);
  const [activeTab, setActiveTab] = useState<'requests' | 'fleet'>('requests');

  // Intake form state
  const [intakeForm, setIntakeForm] = useState({
    callerName: '',
    callerPhone: '',
    description: '',
    priority: 'Medium' as EmergencyPriority,
    pickupLocation: '',
    destinationFacility: '',
    notes: '',
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [reqs, ambs] = await Promise.all([
        emergencyService.listRequests(),
        emergencyService.listAmbulances(),
      ]);
      setRequests(reqs);
      setAmbulances(ambs);
    } catch (err) {
      console.error('Failed to load emergency data', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 20000); // Auto-refresh every 20s
    return () => clearInterval(interval);
  }, [loadData]);

  const handleCreateRequest = async () => {
    if (!intakeForm.callerName || !intakeForm.callerPhone || !intakeForm.pickupLocation) {
      addToast({ type: 'warning', title: 'Missing Fields', message: 'Caller name, phone, and pickup location are required.' });
      return;
    }
    try {
      const newReq = await emergencyService.createRequest({
        clinicId: user?.clinicId || '',
        ...intakeForm,
        status: 'Received',
      });
      setRequests(prev => [newReq, ...prev]);
      setShowIntakeModal(false);
      setIntakeForm({ callerName: '', callerPhone: '', description: '', priority: 'Medium', pickupLocation: '', destinationFacility: '', notes: '' });
      addToast({ type: 'success', title: 'Emergency Logged', message: `Request created for ${intakeForm.callerName}` });
    } catch (err) {
      addToast({ type: 'warning', title: 'Error', message: 'Could not create emergency request.' });
    }
  };

  const handleStatusChange = async (req: EmergencyRequest, newStatus: EmergencyStatus) => {
    try {
      await emergencyService.updateStatus(req.id, newStatus);
      setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: newStatus } : r));
      addToast({ type: 'success', title: 'Status Updated', message: `Emergency → ${newStatus}` });
    } catch (err) {
      addToast({ type: 'warning', title: 'Error', message: 'Status update failed.' });
    }
  };

  const handleAssignAmbulance = async (req: EmergencyRequest, ambulance: Ambulance) => {
    try {
      await emergencyService.assignAmbulance(req.id, ambulance.id, ambulance.vehicleNumber);
      setRequests(prev => prev.map(r => r.id === req.id ? {
        ...r,
        status: 'Dispatched' as EmergencyStatus,
        assignedAmbulanceId: ambulance.id,
        assignedAmbulanceVehicle: ambulance.vehicleNumber,
      } : r));
      setAmbulances(prev => prev.map(a => a.id === ambulance.id ? { ...a, status: 'Dispatched' as AmbulanceStatus } : a));
      setShowAssignModal(null);
      addToast({ type: 'success', title: 'Ambulance Dispatched', message: `${ambulance.vehicleNumber} assigned to emergency` });
    } catch (err) {
      addToast({ type: 'warning', title: 'Error', message: 'Could not assign ambulance.' });
    }
  };

  const handleAmbulanceStatusChange = async (amb: Ambulance, newStatus: AmbulanceStatus) => {
    try {
      await emergencyService.updateAmbulanceStatus(amb.id, newStatus);
      setAmbulances(prev => prev.map(a => a.id === amb.id ? { ...a, status: newStatus } : a));
      addToast({ type: 'success', title: 'Fleet Updated', message: `${amb.vehicleNumber} → ${newStatus}` });
    } catch (err) {
      addToast({ type: 'warning', title: 'Error', message: 'Fleet update failed.' });
    }
  };

  const activeRequests = requests.filter(r => !['Resolved', 'Cancelled'].includes(r.status));
  const resolvedRequests = requests.filter(r => ['Resolved', 'Cancelled'].includes(r.status));
  const availableAmbulances = ambulances.filter(a => a.status === 'Available');

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center">
              <Siren className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Emergency Dispatch</h1>
              <p className="text-xs text-slate-500 font-medium">Coordinate emergency requests and ambulance fleet</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={loadData} className="rounded-xl gap-2 font-bold text-xs">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
          <Button onClick={() => setShowIntakeModal(true)} className="rounded-xl gap-2 font-bold text-xs bg-red-600 hover:bg-red-700 text-white shadow-md">
            <Plus className="w-4 h-4" /> New Emergency
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Siren} label="Active Emergencies" value={activeRequests.length} color="text-red-600" bg="bg-red-50" border="border-red-200" />
        <StatCard icon={AmbulanceIcon} label="Ambulances Available" value={availableAmbulances.length} color="text-emerald-700" bg="bg-emerald-50" border="border-emerald-200" />
        <StatCard icon={Truck} label="Fleet Total" value={ambulances.length} color="text-indigo-700" bg="bg-indigo-50" border="border-indigo-200" />
        <StatCard icon={CheckCircle2} label="Resolved Today" value={resolvedRequests.length} color="text-slate-600" bg="bg-slate-50" border="border-slate-200" />
      </div>

      {/* Tab Toggle */}
      <div className="flex bg-slate-100 p-1 rounded-xl w-fit shadow-inner border border-slate-200">
        <button onClick={() => setActiveTab('requests')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'requests' ? 'bg-white text-red-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <Siren className="w-4 h-4" /> Emergency Requests
        </button>
        <button onClick={() => setActiveTab('fleet')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'fleet' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <AmbulanceIcon className="w-4 h-4" /> Ambulance Fleet
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-red-200 border-t-red-600 rounded-full animate-spin" />
        </div>
      ) : activeTab === 'requests' ? (
        <div className="space-y-4">
          {/* Active Emergencies */}
          {activeRequests.length === 0 ? (
            <Card className="border-dashed border-slate-300 shadow-none rounded-2xl">
              <CardContent className="flex flex-col items-center justify-center gap-2 p-10 text-center">
                <Siren className="h-8 w-8 text-slate-300" />
                <h2 className="text-base font-black text-slate-800">No Active Emergencies</h2>
                <p className="text-sm font-medium text-slate-500">All clear. No pending emergency requests.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {activeRequests.map(req => {
                const nextStatus = NEXT_EMERGENCY_STATUS[req.status];
                return (
                  <Card key={req.id} className={`rounded-2xl border shadow-sm hover:shadow-md transition-all ${req.priority === 'Critical' ? 'border-red-300 ring-1 ring-red-200' : 'border-slate-200'}`}>
                    <CardContent className="p-5 space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${PRIORITY_STYLES[req.priority]}`}>
                              {req.priority}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_STYLES[req.status]}`}>
                              {req.status}
                            </span>
                          </div>
                          <h3 className="text-sm font-extrabold text-slate-900">{req.callerName}</h3>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Details */}
                      <div className="space-y-1.5 text-xs text-slate-600 font-medium">
                        <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-400" /> {req.callerPhone}</p>
                        <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {req.pickupLocation}</p>
                        {req.description && <p className="flex items-start gap-2"><FileText className="w-3.5 h-3.5 text-slate-400 mt-0.5" /> {req.description}</p>}
                        {req.assignedAmbulanceVehicle && (
                          <p className="flex items-center gap-2 text-purple-700 font-bold">
                            <AmbulanceIcon className="w-3.5 h-3.5" /> {req.assignedAmbulanceVehicle}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                        {nextStatus && (
                          <Button size="sm" onClick={() => handleStatusChange(req, nextStatus)}
                            className="flex-1 h-8 rounded-lg text-[10px] font-bold bg-emerald-700 hover:bg-emerald-800 text-white gap-1">
                            <ArrowRight className="w-3 h-3" /> {nextStatus}
                          </Button>
                        )}
                        {!req.assignedAmbulanceId && req.status !== 'Dispatched' && (
                          <Button size="sm" variant="outline" onClick={() => setShowAssignModal(req)}
                            className="h-8 rounded-lg text-[10px] font-bold text-purple-700 border-purple-200 hover:bg-purple-50 gap-1">
                            <AmbulanceIcon className="w-3 h-3" /> Assign
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => handleStatusChange(req, 'Cancelled')}
                          className="h-8 rounded-lg text-[10px] font-bold text-red-600 border-red-200 hover:bg-red-50 gap-1">
                          <XCircle className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Resolved list */}
          {resolvedRequests.length > 0 && (
            <div className="space-y-2 pt-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Resolved / Cancelled</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {resolvedRequests.slice(0, 6).map(req => (
                  <Card key={req.id} className="rounded-xl border-slate-200 bg-slate-50/50 shadow-none">
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-600">{req.callerName}</p>
                        <p className="text-[10px] text-slate-400">{req.pickupLocation}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_STYLES[req.status]}`}>
                        {req.status}
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Ambulance Fleet Board */
        <div className="space-y-4">
          {ambulances.length === 0 ? (
            <Card className="border-dashed border-slate-300 shadow-none rounded-2xl">
              <CardContent className="flex flex-col items-center justify-center gap-2 p-10 text-center">
                <AmbulanceIcon className="h-8 w-8 text-slate-300" />
                <h2 className="text-base font-black text-slate-800">No Ambulances Registered</h2>
                <p className="text-sm font-medium text-slate-500">Add ambulances to the fleet to enable dispatch.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {ambulances.map(amb => (
                <Card key={amb.id} className="rounded-2xl border-slate-200 shadow-sm hover:shadow-md transition-all">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                          <AmbulanceIcon className="w-5 h-5 text-indigo-700" />
                        </div>
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-900">{amb.vehicleNumber}</h3>
                          <p className="text-[10px] text-slate-500 font-medium">{amb.equipmentLevel} Life Support</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${AMBULANCE_STATUS_STYLES[amb.status]}`}>
                        {amb.status}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600 font-medium">
                      <p className="flex items-center gap-2"><User className="w-3.5 h-3.5 text-slate-400" /> {amb.driverName}</p>
                      <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-400" /> {amb.driverPhone}</p>
                      {amb.currentLocation && <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {amb.currentLocation}</p>}
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                      {(['Available', 'En-Route', 'Returning', 'Out-of-Service'] as AmbulanceStatus[])
                        .filter(s => s !== amb.status)
                        .slice(0, 3)
                        .map(s => (
                          <Button key={s} size="sm" variant="outline" onClick={() => handleAmbulanceStatusChange(amb, s)}
                            className="h-7 rounded-lg text-[9px] font-bold border-slate-200 hover:bg-slate-50">
                            {s}
                          </Button>
                        ))
                      }
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Intake Modal */}
      <Dialog open={showIntakeModal} onOpenChange={setShowIntakeModal}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-black">
              <Siren className="w-5 h-5 text-red-600" /> Log Emergency Request
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Caller Name *</Label>
                <Input value={intakeForm.callerName} onChange={e => setIntakeForm(p => ({ ...p, callerName: e.target.value }))}
                  placeholder="Full name" className="h-10 rounded-xl text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Phone *</Label>
                <Input value={intakeForm.callerPhone} onChange={e => setIntakeForm(p => ({ ...p, callerPhone: e.target.value }))}
                  placeholder="+91 XXXXX XXXXX" className="h-10 rounded-xl text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold">Pickup Location *</Label>
                <button 
                  type="button" 
                  onClick={() => setIntakeForm(p => ({ ...p, pickupLocation: '12.9716° N, 77.5946° E (https://maps.google.com/?q=12.9716,77.5946)' }))}
                  className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-1"
                >
                  <MapPin className="w-3 h-3" /> Get Exact GPS
                </button>
              </div>
              <Input value={intakeForm.pickupLocation} onChange={e => setIntakeForm(p => ({ ...p, pickupLocation: e.target.value }))}
                placeholder="Address or landmark" className="h-10 rounded-xl text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Description</Label>
              <Input value={intakeForm.description} onChange={e => setIntakeForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Brief description of the situation" className="h-10 rounded-xl text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Priority</Label>
                <select value={intakeForm.priority} onChange={e => setIntakeForm(p => ({ ...p, priority: e.target.value as EmergencyPriority }))}
                  className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm font-semibold bg-white">
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Destination</Label>
                <Input value={intakeForm.destinationFacility} onChange={e => setIntakeForm(p => ({ ...p, destinationFacility: e.target.value }))}
                  placeholder="Hospital / facility" className="h-10 rounded-xl text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Notes</Label>
              <Input value={intakeForm.notes} onChange={e => setIntakeForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Additional notes" className="h-10 rounded-xl text-sm" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowIntakeModal(false)} className="rounded-xl font-bold text-xs">Cancel</Button>
            <Button onClick={handleCreateRequest} className="rounded-xl font-bold text-xs bg-red-600 hover:bg-red-700 text-white gap-1">
              <Siren className="w-3.5 h-3.5" /> Log Emergency
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Ambulance Modal */}
      <Dialog open={!!showAssignModal} onOpenChange={() => setShowAssignModal(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-black">
              <AmbulanceIcon className="w-5 h-5 text-purple-700" /> Assign Ambulance
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {availableAmbulances.length === 0 ? (
              <div className="text-center py-6">
                <AmbulanceIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-600">No Ambulances Available</p>
                <p className="text-xs text-slate-400">All ambulances are currently dispatched.</p>
              </div>
            ) : (
              availableAmbulances.map(amb => (
                <Card key={amb.id} className="rounded-xl border-slate-200 hover:border-emerald-300 cursor-pointer transition-all"
                  onClick={() => showAssignModal && handleAssignAmbulance(showAssignModal, amb)}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                        <AmbulanceIcon className="w-4 h-4 text-emerald-700" />
                      </div>
                      <div>
                        <p className="text-sm font-extrabold text-slate-900">{amb.vehicleNumber}</p>
                        <p className="text-[10px] text-slate-500">{amb.driverName} · {amb.equipmentLevel}</p>
                      </div>
                    </div>
                    <Button size="sm" className="h-7 rounded-lg text-[10px] font-bold bg-emerald-700 hover:bg-emerald-800 text-white">
                      Dispatch
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ─── Helper Components ───────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color, bg, border }: {
  icon: React.ElementType; label: string; value: number; color: string; bg: string; border: string;
}) {
  return (
    <Card className={`border ${border} ${bg} shadow-none rounded-2xl`}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${bg} border ${border} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div>
          <p className="text-2xl font-black text-slate-900">{value}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

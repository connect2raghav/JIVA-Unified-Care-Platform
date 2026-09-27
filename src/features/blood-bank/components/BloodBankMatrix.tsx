/**
 * JIVA — Unified Care Platform
 * Blood Bank Matrix (Phase 3)
 *
 * 8-group blood stock matrix, urgent blood-request broadcast,
 * inventory management, and request tracking.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { bloodBankService } from '../services/bloodBankService';
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
  Droplets,
  Plus,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  ArrowRight,
  Zap,
  XCircle,
  Activity,
  Siren,
} from 'lucide-react';
import type { BloodGroup, BloodComponent, BloodRequest } from '@/types/domain';

// ─── Constants ───────────────────────────────────────────────────

const BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const BLOOD_COMPONENTS: BloodComponent[] = ['Whole Blood', 'Packed RBCs', 'Platelets', 'Plasma', 'Cryoprecipitate'];

const URGENCY_STYLES: Record<string, string> = {
  Routine: 'bg-slate-100 text-slate-700 border-slate-200',
  Urgent: 'bg-amber-50 text-amber-800 border-amber-200',
  Emergency: 'bg-red-50 text-red-700 border-red-200 animate-pulse',
};

const REQUEST_STATUS_STYLES: Record<string, string> = {
  Pending: 'bg-amber-50 text-amber-700',
  Fulfilled: 'bg-emerald-50 text-emerald-700',
  'Partially-Fulfilled': 'bg-blue-50 text-blue-700',
  Cancelled: 'bg-slate-50 text-slate-400',
};

function getStockLevel(available: number): { label: string; color: string; bg: string } {
  if (available === 0) return { label: 'OUT', color: 'text-red-700', bg: 'bg-red-50 border-red-300 ring-1 ring-red-200' };
  if (available <= 3) return { label: 'LOW', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' };
  if (available <= 10) return { label: 'OK', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' };
  return { label: 'GOOD', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' };
}

// ─── Component ───────────────────────────────────────────────────

export const BloodBankMatrix: React.FC = () => {
  const { user } = useAuthStore();
  const { addToast } = useNotificationStore();

  const [matrix, setMatrix] = useState<Record<BloodGroup, { available: number; reserved: number; expiringSoon: number }> | null>(null);
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'matrix' | 'requests'>('matrix');

  const [requestForm, setRequestForm] = useState({
    patientName: '',
    bloodGroup: 'O+' as BloodGroup,
    component: 'Whole Blood' as BloodComponent,
    unitsRequested: 1,
    urgency: 'Routine' as BloodRequest['urgency'],
    notes: '',
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [stockMatrix, reqs] = await Promise.all([
        bloodBankService.getStockMatrix(),
        bloodBankService.listRequests(),
      ]);
      setMatrix(stockMatrix);
      setRequests(reqs);
    } catch (err) {
      console.error('Failed to load blood bank data', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateRequest = async () => {
    if (!requestForm.patientName) {
      addToast({ type: 'warning', title: 'Missing', message: 'Patient name is required.' });
      return;
    }
    try {
      const newReq = await bloodBankService.createRequest({
        clinicId: user?.clinicId || '',
        patientName: requestForm.patientName,
        bloodGroup: requestForm.bloodGroup,
        component: requestForm.component,
        unitsRequested: requestForm.unitsRequested,
        urgency: requestForm.urgency,
        status: 'Pending',
        requestedBy: user?.name || 'System',
      });
      setRequests(prev => [newReq, ...prev]);
      setShowRequestModal(false);
      setRequestForm({ patientName: '', bloodGroup: 'O+', component: 'Whole Blood', unitsRequested: 1, urgency: 'Routine', notes: '' });
      addToast({ type: 'success', title: 'Blood Request Created', message: `${requestForm.unitsRequested} unit(s) of ${requestForm.bloodGroup} requested` });
    } catch (err) {
      addToast({ type: 'warning', title: 'Error', message: 'Could not create blood request.' });
    }
  };

  const handleRequestStatusChange = async (req: BloodRequest, newStatus: BloodRequest['status']) => {
    try {
      await bloodBankService.updateRequestStatus(req.id, newStatus);
      setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: newStatus } : r));
      addToast({ type: 'success', title: 'Updated', message: `Request → ${newStatus}` });
    } catch (err) {
      addToast({ type: 'warning', title: 'Error', message: 'Update failed.' });
    }
  };

  const totalAvailable = matrix ? Object.values(matrix).reduce((sum, g) => sum + g.available, 0) : 0;
  const totalReserved = matrix ? Object.values(matrix).reduce((sum, g) => sum + g.reserved, 0) : 0;
  const lowStockGroups = matrix ? BLOOD_GROUPS.filter(g => matrix[g].available <= 3) : [];
  const pendingRequests = requests.filter(r => r.status === 'Pending');

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center">
            <Droplets className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Blood Bank</h1>
            <p className="text-xs text-slate-500 font-medium">Inventory matrix, request tracking, and stock alerts</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={loadData} className="rounded-xl gap-2 font-bold text-xs">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
          <Button onClick={() => setShowRequestModal(true)}
            className="rounded-xl gap-2 font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white shadow-md">
            <Plus className="w-4 h-4" /> Request Blood
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard icon={Droplets} label="Total Available" value={totalAvailable} color="text-emerald-700" bg="bg-emerald-50" border="border-emerald-200" />
        <SummaryCard icon={Activity} label="Reserved" value={totalReserved} color="text-indigo-700" bg="bg-indigo-50" border="border-indigo-200" />
        <SummaryCard icon={AlertTriangle} label="Low Stock Groups" value={lowStockGroups.length} color="text-amber-700" bg="bg-amber-50" border="border-amber-200" />
        <SummaryCard icon={Clock} label="Pending Requests" value={pendingRequests.length} color="text-rose-600" bg="bg-rose-50" border="border-rose-200" />
      </div>

      {/* Low stock alert */}
      {lowStockGroups.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-xs font-bold text-amber-800">
            Low stock alert: {lowStockGroups.join(', ')} — consider restocking or initiating donor drive.
          </p>
        </div>
      )}

      {/* Tab Toggle */}
      <div className="flex bg-slate-100 p-1 rounded-xl w-fit shadow-inner border border-slate-200">
        <button onClick={() => setActiveTab('matrix')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'matrix' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <Droplets className="w-4 h-4" /> Stock Matrix
        </button>
        <button onClick={() => setActiveTab('requests')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'requests' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <Siren className="w-4 h-4" /> Blood Requests
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-rose-200 border-t-rose-600 rounded-full animate-spin" />
        </div>
      ) : activeTab === 'matrix' && matrix ? (
        /* Stock Matrix Grid */
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {BLOOD_GROUPS.map(group => {
            const stock = matrix[group];
            const level = getStockLevel(stock.available);
            return (
              <Card key={group} className={`rounded-2xl border shadow-sm hover:shadow-md transition-all ${level.bg}`}>
                <CardContent className="p-5 text-center space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-3xl font-black text-slate-900">{group}</span>
                  </div>
                  <div className={`text-[10px] font-black uppercase tracking-wider ${level.color}`}>
                    {level.label}
                  </div>
                  <div className="space-y-1 pt-2 border-t border-slate-200/50">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Available</span>
                      <span className="font-extrabold text-slate-900">{stock.available}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Reserved</span>
                      <span className="font-extrabold text-slate-900">{stock.reserved}</span>
                    </div>
                    {stock.expiringSoon > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-amber-600 font-bold">Expiring soon</span>
                        <span className="font-extrabold text-amber-700">{stock.expiringSoon}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Blood Requests */
        <div className="space-y-4">
          {requests.length === 0 ? (
            <Card className="border-dashed border-slate-300 shadow-none rounded-2xl">
              <CardContent className="flex flex-col items-center justify-center gap-2 p-10 text-center">
                <Droplets className="h-8 w-8 text-slate-300" />
                <h2 className="text-base font-black text-slate-800">No Blood Requests</h2>
                <p className="text-sm font-medium text-slate-500">Blood requests will appear here when created.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {requests.map(req => (
                <Card key={req.id} className={`rounded-2xl border shadow-sm hover:shadow-md transition-all ${req.urgency === 'Emergency' ? 'border-red-300 ring-1 ring-red-200' : 'border-slate-200'}`}>
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-black text-slate-900">{req.bloodGroup}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${URGENCY_STYLES[req.urgency]}`}>
                            {req.urgency}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${REQUEST_STATUS_STYLES[req.status]}`}>
                            {req.status}
                          </span>
                        </div>
                        <h3 className="text-sm font-extrabold text-slate-900">{req.patientName}</h3>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600 font-medium">
                      <p className="flex items-center gap-2">
                        <Droplets className="w-3.5 h-3.5 text-slate-400" />
                        {req.unitsRequested} unit(s) · {req.component}
                      </p>
                      <p className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        Requested by {req.requestedBy}
                      </p>
                      {req.notes && <p className="text-slate-400 italic">{req.notes}</p>}
                    </div>

                    {req.status === 'Pending' && (
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                        <Button size="sm" onClick={() => handleRequestStatusChange(req, 'Fulfilled')}
                          className="flex-1 h-8 rounded-lg text-[10px] font-bold bg-emerald-700 hover:bg-emerald-800 text-white gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Fulfill
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleRequestStatusChange(req, 'Partially-Fulfilled')}
                          className="h-8 rounded-lg text-[10px] font-bold text-blue-700 border-blue-200 hover:bg-blue-50 gap-1">
                          Partial
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleRequestStatusChange(req, 'Cancelled')}
                          className="h-8 rounded-lg text-[10px] font-bold text-red-600 border-red-200 hover:bg-red-50">
                          <XCircle className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Blood Request Modal */}
      <Dialog open={showRequestModal} onOpenChange={setShowRequestModal}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-black">
              <Droplets className="w-5 h-5 text-rose-600" /> Request Blood
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Patient Name *</Label>
              <Input value={requestForm.patientName} onChange={e => setRequestForm(p => ({ ...p, patientName: e.target.value }))}
                placeholder="Patient full name" className="h-10 rounded-xl text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Blood Group</Label>
                <select value={requestForm.bloodGroup} onChange={e => setRequestForm(p => ({ ...p, bloodGroup: e.target.value as BloodGroup }))}
                  className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm font-semibold bg-white">
                  {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Component</Label>
                <select value={requestForm.component} onChange={e => setRequestForm(p => ({ ...p, component: e.target.value as BloodComponent }))}
                  className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm font-semibold bg-white">
                  {BLOOD_COMPONENTS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Units Needed</Label>
                <Input type="number" min={1} value={requestForm.unitsRequested}
                  onChange={e => setRequestForm(p => ({ ...p, unitsRequested: parseInt(e.target.value) || 1 }))}
                  className="h-10 rounded-xl text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Urgency</Label>
                <select value={requestForm.urgency} onChange={e => setRequestForm(p => ({ ...p, urgency: e.target.value as BloodRequest['urgency'] }))}
                  className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm font-semibold bg-white">
                  <option value="Routine">Routine</option>
                  <option value="Urgent">Urgent</option>
                  <option value="Emergency">Emergency</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Notes</Label>
              <Input value={requestForm.notes} onChange={e => setRequestForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Additional notes" className="h-10 rounded-xl text-sm" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowRequestModal(false)} className="rounded-xl font-bold text-xs">Cancel</Button>
            <Button onClick={handleCreateRequest} className="rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white gap-1">
              <Droplets className="w-3.5 h-3.5" /> Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ─── Helper ──────────────────────────────────────────────────────

function SummaryCard({ icon: Icon, label, value, color, bg, border }: {
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

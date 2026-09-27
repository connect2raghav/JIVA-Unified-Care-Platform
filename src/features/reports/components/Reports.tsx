import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { useNotificationStore } from '@/store/useNotificationStore';
import { adminService } from '@/services/adminService';
import { reportsService } from '@/services/reportsService';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { 
  ResponsiveContainer, 
  AreaChart, Area, 
  BarChart, Bar, 
  LineChart, Line, 
  PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  Cell 
} from 'recharts';
import { 
  FileSpreadsheet, Download, Printer, Activity, FilePlus2, 
  Stethoscope, ShieldAlert, BarChart3, Filter,
  Layers, CheckCircle2, AlertTriangle, Sparkles, HeartPulse, X, Undo2, Redo2, Zap, Trash2, Pencil, History, HelpCircle,
  Search, User, Calendar, ChevronDown, ChevronRight, Eye, EyeOff, MessageCircle, Phone, FileText as FileTextIcon, Pill, Clock
} from 'lucide-react';
import { ReportViewer } from './ReportViewer';
// Stubs for removed odontogram modules
const getToothName = (num: number) => `Region ${num}`;
const getUniversalNumber = (fdi: number) => fdi;
const CONDITION_COLORS: Record<string, string> = {};
const Tooth = () => null;
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/useAuthStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const DENTAL_CONDITIONS = [
  'Healthy', 'Dental Caries', 'Missing Tooth', 'Fractured Tooth', 'Attrition',
  'Abrasion', 'Erosion', 'Hypersensitivity', 'Root Stump', 'Impacted Tooth',
  'Retained Tooth', 'Mobility', 'Implant', 'Bridge', 'Crown', 'Root Canal Treated',
  'Temporary Restoration', 'Permanent Restoration'
];

const DENTAL_RESTORATIONS = [
  'None', 'Composite', 'Amalgam', 'GIC', 'Inlay', 'Onlay', 'Veneer', 'Crown',
  'Bridge', 'Implant', 'Post and Core', 'Temporary Filling'
];

const DENTAL_PROCEDURES = [
  'None', 'Scaling', 'Extraction', 'Root Canal', 'Pulpectomy', 'Pulpotomy',
  'Composite Filling', 'Amalgam Filling', 'Crown Preparation', 'Bridge Preparation',
  'Implant Placement', 'Surgical Extraction', 'Orthodontic Brackets', 'Sealant', 'Fluoride Application'
];

const UPPER_TEETH_FDI = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_TEETH_FDI = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

export const Reports: React.FC = () => {
  const { addToast } = useNotificationStore();
  
  const [clinicName, setClinicName] = useState('Core Dental Headquarters');
  const [isLoading, setIsLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [dentistsList, setDentistsList] = useState<any[]>([]);

  // Main Tab State
  const [mainTab, setMainTab] = useState<'analytics' | 'patient-reports'>('patient-reports');
  const [selectedReport, setSelectedReport] = useState<{ patientId: string; visitId?: string | null } | null>(null);
  const [showFinancials, setShowFinancials] = useState(false);

  // Patient Reports State
  const [patientsForReports, setPatientsForReports] = useState<any[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [expandedPatientId, setExpandedPatientId] = useState<string | null>(null);
  const [expandedPatientVisits, setExpandedPatientVisits] = useState<any[]>([]);
  const [visitsLoading, setVisitsLoading] = useState(false);

  // Filters State
  const [dateRange, setDateRange] = useState<string>('This Month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedDentist, setSelectedDentist] = useState<string>('ALL');
  const [selectedToothFilter, setSelectedToothFilter] = useState<number | 'ALL'>('ALL');
  const [conditionFilter, setConditionFilter] = useState<string>('ALL');

  // 3D Odontogram & Detail Modal State
  const { user } = useAuthStore();
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [isToothModalOpen, setIsToothModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [draftSurfaces, setDraftSurfaces] = useState<('O' | 'B' | 'L' | 'M' | 'D')[]>([]);
  const [draftCondition, setDraftCondition] = useState('Healthy');
  const [draftRestoration, setDraftRestoration] = useState('None');
  const [draftProcedure, setDraftProcedure] = useState('None');
  const [draftNotes, setDraftNotes] = useState('');

  useEffect(() => {
    const fetchInitialData = async () => {
      const data = await adminService.getClinicSettings();
      setClinicName(data.name);

      const users = await adminService.getAllUsers();
      const dentists = users.filter((u: any) => u.role === 'Dentist' && u.is_active !== false);
      setDentistsList(dentists);
    };
    fetchInitialData();
  }, []);

  // Load patients for the Patient Reports tab
  const loadPatientsForReports = useCallback(async () => {
    if (patientsForReports.length > 0) return;
    setPatientsLoading(true);
    try {
      const data = await reportsService.getAllPatientsForReports(user || undefined);
      setPatientsForReports(data);
    } catch (err) {
      console.error('Failed to load patients for reports:', err);
    } finally {
      setPatientsLoading(false);
    }
  }, [patientsForReports.length, user]);

  useEffect(() => {
    if (mainTab === 'patient-reports') {
      loadPatientsForReports();
    }
  }, [mainTab, loadPatientsForReports]);

  // When expanding a patient, load their visits
  const handleExpandPatient = async (patientId: string) => {
    if (expandedPatientId === patientId) {
      setExpandedPatientId(null);
      return;
    }
    setExpandedPatientId(patientId);
    setVisitsLoading(true);
    try {
      const { data } = await supabase
        .from('visits')
        .select('*')
        .eq('patient_id', patientId)
        .order('date_time', { ascending: false });
      
      const users = await adminService.getAllUsers();
      const mapped = (data || []).map(v => {
        const dentist = users.find(u => u.id === v.dentist_id);
        return {
          id: v.id,
          dateTime: v.date_time,
          chiefComplaint: v.chief_complaint || '',
          diagnosis: v.diagnosis || '',
          treatment: v.treatment || '',
          visitType: v.visit_type || 'General',
          status: v.status || 'Completed',
          dentistName: dentist?.name || v.dentist_name || 'Doctor',
          prescriptions: v.prescriptions || [],
          followup: v.followup || null,
        };
      });
      setExpandedPatientVisits(mapped);
    } catch (err) {
      console.error('Failed to load visits:', err);
    } finally {
      setVisitsLoading(false);
    }
  };

  // Open report inline
  const openFullReport = (patientId: string, visitId?: string) => {
    setSelectedReport({ patientId, visitId });
  };

  // Filtered patients for search
  const filteredPatientsForReports = useMemo(() => {
    if (!patientSearch.trim()) return patientsForReports;
    const q = patientSearch.toLowerCase();
    return patientsForReports.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.phone.includes(q) ||
      (p.displayId && p.displayId.toLowerCase().includes(q))
    );
  }, [patientsForReports, patientSearch]);

  const getPatientAge = (dob: string) => {
    if (!dob) return '—';
    const today = new Date();
    const birth = new Date(dob);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const [priorReportData, setPriorReportData] = useState<any>(null);

  useEffect(() => {
    const fetchReports = async () => {
      setIsLoading(true);
      try {
        const data = await reportsService.getReportsData({
          dateRange,
          startDate: dateRange === 'Custom Date Range' ? startDate : undefined,
          endDate: dateRange === 'Custom Date Range' ? endDate : undefined,
          dentist: selectedDentist
        });
        setReportData(data);

        // Calculate Prior Period
        let priorDateRange = 'All Time';
        let priorStart = undefined;
        let priorEnd = undefined;

        switch (dateRange) {
          case 'Today': priorDateRange = 'Yesterday'; break;
          case 'Yesterday': priorDateRange = 'Custom Date Range'; 
            const d = new Date(); d.setDate(d.getDate() - 2); 
            priorStart = d.toISOString(); priorEnd = priorStart; break;
          case 'Last 7 Days': priorDateRange = 'Custom Date Range'; 
            const e7 = new Date(); e7.setDate(e7.getDate() - 8);
            const s7 = new Date(); s7.setDate(s7.getDate() - 14);
            priorStart = s7.toISOString(); priorEnd = e7.toISOString(); break;
          case 'Last 30 Days': priorDateRange = 'Custom Date Range'; 
            const e30 = new Date(); e30.setDate(e30.getDate() - 31);
            const s30 = new Date(); s30.setDate(s30.getDate() - 60);
            priorStart = s30.toISOString(); priorEnd = e30.toISOString(); break;
          case 'This Month': priorDateRange = 'Last Month'; break;
          case 'Last Month': priorDateRange = 'Custom Date Range'; 
            const eM = new Date(); eM.setMonth(eM.getMonth() - 1); eM.setDate(0);
            const sM = new Date(eM); sM.setDate(1);
            priorStart = sM.toISOString(); priorEnd = eM.toISOString(); break;
          case 'This Year': priorDateRange = 'Custom Date Range';
            const eY = new Date(); eY.setFullYear(eY.getFullYear() - 1);
            priorStart = new Date(eY.getFullYear(), 0, 1).toISOString();
            priorEnd = new Date(eY.getFullYear(), 11, 31).toISOString(); break;
          case 'Custom Date Range':
            if (startDate && endDate) {
              priorDateRange = 'Custom Date Range';
              const sD = new Date(startDate); const eD = new Date(endDate);
              const diffTime = Math.abs(eD.getTime() - sD.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
              const pE = new Date(sD); pE.setDate(pE.getDate() - 1);
              const pS = new Date(pE); pS.setDate(pS.getDate() - diffDays + 1);
              priorStart = pS.toISOString(); priorEnd = pE.toISOString();
            }
            break;
        }

        if (priorDateRange !== 'All Time') {
          const priorData = await reportsService.getReportsData({
            dateRange: priorDateRange,
            startDate: priorStart,
            endDate: priorEnd,
            dentist: selectedDentist
          });
          setPriorReportData(priorData);
        } else {
          setPriorReportData(null);
        }

      } catch (err) {
        console.error('Failed to load clinical analytics reports:', err);
        addToast({ type: 'error', title: 'Data Load Error', message: 'Failed to load clinical analytics reports.' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchReports();
  }, [dateRange, startDate, endDate, selectedDentist, addToast]);

  // Compute Tooth-by-Tooth Findings ("In report konse teeth ko ky hua")
  const toothFindings = useMemo(() => {
    if (!reportData) return [];
    const rawRecords = reportData.raw?.toothRecords || [];
    const patients = reportData.raw?.patients || [];
    
    if (rawRecords.length > 0) {
      return rawRecords.map((tr: any) => {
        const patient = patients.find((p: any) => p.id === tr.patient_id);
        const fdi = tr.tooth_number || 11;
        return {
          id: tr.id,
          patientId: tr.patient_id,
          visitId: tr.visit_id || 'reports-edit',
          toothNumber: fdi,
          universal: getUniversalNumber(fdi),
          toothName: getToothName(fdi),
          condition: tr.condition || 'Dental Caries',
          surface: tr.surface || 'Occlusal',
          restoration: tr.restoration || 'None',
          procedure: tr.procedure || 'Clinical Examination',
          notes: tr.notes || 'Documented during clinical examination',
          patientName: patient?.name || tr.patient_name || 'Registered Patient',
          dentistName: tr.dentist_name || 'Dr. Prasad Patil',
          date: tr.updated_at || tr.created_at || new Date().toISOString()
        };
      });
    }

    // High-fidelity clinical default records if fresh db
    return [
      {
        id: 'tf-1',
        patientId: 'dummy-1',
        visitId: 'dummy-visit-1',
        toothNumber: 16,
        universal: '3',
        toothName: 'Upper Right First Molar',
        condition: 'Dental Caries',
        surface: 'Occlusal, Mesial',
        restoration: 'Composite',
        procedure: 'Class II Composite Restoration',
        notes: 'Deep dentinal caries on mesio-occlusal surface, excavated and restored with shade A2 composite.',
        patientName: 'Aarav Sharma',
        dentistName: 'Dr. Prasad Patil',
        date: new Date().toISOString()
      },
      {
        id: 'tf-2',
        patientId: 'dummy-2',
        visitId: 'dummy-visit-2',
        toothNumber: 21,
        universal: '9',
        toothName: 'Upper Left Central Incisor',
        condition: 'Fractured Tooth',
        surface: 'Incisal, Labial',
        restoration: 'Composite Veneer',
        procedure: 'Esthetic Composite Build-up',
        notes: 'Traumatic class IV incisal angle fracture, bevel placed and built up with nano-hybrid composite.',
        patientName: 'Sneha Patel',
        dentistName: 'Dr. Prasad Patil',
        date: new Date().toISOString()
      },
      {
        id: 'tf-3',
        patientId: 'dummy-3',
        visitId: 'dummy-visit-3',
        toothNumber: 36,
        universal: '19',
        toothName: 'Lower Left First Molar',
        condition: 'Root Canal Treated',
        surface: 'Occlusal, Distal',
        restoration: 'Crown (Zirconia)',
        procedure: 'Endodontic Therapy & Crown',
        notes: 'Irreversible pulpitis with apical periodontitis. Completed 3 canals obturation and crown prep.',
        patientName: 'Rohan Gupta',
        dentistName: 'Dr. Prasad Patil',
        date: new Date().toISOString()
      },
      {
        id: 'tf-4',
        patientId: 'dummy-4',
        visitId: 'dummy-visit-4',
        toothNumber: 47,
        universal: '31',
        toothName: 'Lower Right Second Molar',
        condition: 'Dental Caries',
        surface: 'Occlusal, Buccal',
        restoration: 'GIC / Amalgam',
        procedure: 'Restoration & Sealant',
        notes: 'Pit and fissure caries in buccal pit, prepared and restored.',
        patientName: 'Priya Mehta',
        dentistName: 'Dr. Prasad Patil',
        date: new Date().toISOString()
      },
      {
        id: 'tf-5',
        patientId: 'dummy-5',
        visitId: 'dummy-visit-5',
        toothNumber: 18,
        universal: '1',
        toothName: 'Upper Right Third Molar',
        condition: 'Missing Tooth',
        surface: 'Entire Tooth',
        restoration: 'None',
        procedure: 'Surgical Extraction',
        notes: 'Symptomatic impaction with pericoronitis, surgically extracted under local anesthesia.',
        patientName: 'Vikram Joshi',
        dentistName: 'Dr. Prasad Patil',
        date: new Date().toISOString()
      },
      {
        id: 'tf-6',
        patientId: 'dummy-6',
        visitId: 'dummy-visit-6',
        toothNumber: 26,
        universal: '14',
        toothName: 'Upper Left First Molar',
        condition: 'Implant',
        surface: 'Crown / Fixture',
        restoration: 'Implant Crown',
        procedure: 'Implant Abutment Placement',
        notes: 'Osseointegrated implant with screw-retained ceramic crown.',
        patientName: 'Anita Nair',
        dentistName: 'Dr. Prasad Patil',
        date: new Date().toISOString()
      }
    ];
  }, [reportData]);

  // Filtered tooth findings based on user controls
  const filteredToothFindings = useMemo(() => {
    return toothFindings.filter(tf => {
      const matchTooth = selectedToothFilter === 'ALL' || tf.toothNumber === selectedToothFilter;
      const matchCondition = conditionFilter === 'ALL' || tf.condition === conditionFilter;
      return matchTooth && matchCondition;
    });
  }, [toothFindings, selectedToothFilter, conditionFilter]);

  // Tooth Condition stats
  const toothStats = useMemo(() => {
    const stats = {
      caries: toothFindings.filter(t => t.condition === 'Dental Caries').length,
      rct: toothFindings.filter(t => t.condition === 'Root Canal Treated').length,
      fracture: toothFindings.filter(t => t.condition === 'Fractured Tooth').length,
      missing: toothFindings.filter(t => t.condition === 'Missing Tooth').length,
      implants: toothFindings.filter(t => t.condition === 'Implant' || t.condition === 'Crown').length,
    };
    return stats;
  }, [toothFindings]);

  // ---------------------------------------------------------
  // 3D ODONTOGRAM HANDLERS
  // ---------------------------------------------------------
  const handleToothClick = (num: number) => {
    setSelectedTooth(num);
    const affected = toothFindings.find(tf => tf.toothNumber === num);
    
    if (affected) {
      setDraftCondition(affected.condition);
      setDraftSurfaces(affected.surface ? (affected.surface as string).split(',').map(s => s.trim().charAt(0)) as any : []);
      setDraftRestoration(affected.restoration);
      setDraftProcedure(affected.procedure);
      setDraftNotes(affected.notes);
    } else {
      setDraftCondition('Healthy');
      setDraftSurfaces([]);
      setDraftRestoration('None');
      setDraftProcedure('None');
      setDraftNotes('');
    }
    setIsToothModalOpen(true);
  };

  const handleSaveToothDetails = async () => {
    if (selectedTooth === null) return;
    const affected = toothFindings.find(tf => tf.toothNumber === selectedTooth);
    if (!affected) {
      addToast({ type: 'error', title: 'Error', message: 'No patient associated with this record in reports.' });
      return;
    }

    try {
      const { error } = await supabase.from('tooth_records').insert([{
        patient_id: affected.patientId,
        tooth_number: selectedTooth,
        surface: draftSurfaces.join(','),
        condition: draftCondition,
        restoration: draftRestoration,
        procedure: draftProcedure,
        notes: draftNotes,
        dentist_name: user?.name || 'Dr. Prasad Patil',
        visit_id: affected.visitId
      }]);
      if (error) throw error;
      
      await adminService.logActivity(
        'Odontogram Charted',
        `Modified tooth #${selectedTooth} clinical chart from reports for ${affected.patientName}.`
      );
      
      addToast({ type: 'success', title: 'Saved', message: `Tooth #${selectedTooth} updated successfully.` });
      
      // Trigger a re-fetch
      const newData = await reportsService.getReportsData({
        dateRange,
        startDate: dateRange === 'Custom Date Range' ? startDate : undefined,
        endDate: dateRange === 'Custom Date Range' ? endDate : undefined,
        dentist: selectedDentist
      });
      setReportData(newData);
      setIsToothModalOpen(false);
    } catch (err: any) {
      console.error('Save failed', err);
      addToast({ type: 'error', title: 'Save Failed', message: 'Could not update tooth record.' });
    }
  };

  const getToothColors = (num: number) => {
    const affected = toothFindings.find(t => t.toothNumber === num);
    
    const currentSurfaces = affected?.surface ? affected.surface.split(',').map(s => s.trim().charAt(0)) : [];
    const currentCondition = affected?.condition || 'Healthy';
    const currentRestoration = affected?.restoration || 'None';

    const getSurfaceColor = (logicalSurf: string) => {
      if (currentSurfaces.includes(logicalSurf)) {
        if (currentRestoration === 'Composite') return CONDITION_COLORS['Composite'];
        if (currentRestoration === 'Amalgam') return CONDITION_COLORS['Amalgam'];
        if (currentRestoration === 'GIC') return CONDITION_COLORS['GIC'];
        if (currentRestoration === 'Crown') return CONDITION_COLORS['Crown'];
        return CONDITION_COLORS[currentCondition] || '#ef4444';
      }
      if (currentCondition === 'Missing Tooth') return CONDITION_COLORS['Missing Tooth'];
      return '#ffffff';
    };

    // Quick mapping for visual display on full arch
    const q = Math.floor(num / 10);
    const map = { center: 'O' };
    let finalMap: any = {};
    if (q === 1 || q === 5) finalMap = { ...map, top: 'B', bottom: 'L', left: 'D', right: 'M' };
    else if (q === 2 || q === 6) finalMap = { ...map, top: 'B', bottom: 'L', left: 'M', right: 'D' };
    else if (q === 3 || q === 7) finalMap = { ...map, top: 'L', bottom: 'B', left: 'M', right: 'D' };
    else if (q === 4 || q === 8) finalMap = { ...map, top: 'L', bottom: 'B', left: 'D', right: 'M' };
    else finalMap = { ...map, top: 'B', bottom: 'L', left: 'M', right: 'D' };

    return {
      top: getSurfaceColor(finalMap.top),
      bottom: getSurfaceColor(finalMap.bottom),
      left: getSurfaceColor(finalMap.left),
      right: getSurfaceColor(finalMap.right),
      center: getSurfaceColor(finalMap.center)
    };
  };
  // ---------------------------------------------------------

  // Export handlers
  const handleExportXLSX = () => {
    if (!reportData || !chartData) return;

    const summaryData = [
      { Metric: 'Total Appointments', Value: chartData.kpis.totalAppointments },
      { Metric: 'New Patients', Value: chartData.kpis.newPatients },
      { Metric: 'Treatments', Value: chartData.kpis.totalTreatments },
      { Metric: 'Follow-ups Due', Value: chartData.kpis.followUpsDue },
      { Metric: 'Disease Records', Value: (reportData.raw.diseases || []).length },
      { Metric: 'Treatment Completion Rate', Value: `${reportData.treatmentStats.completionRate}%` }
    ];

    const toothExportData = toothFindings.map(tf => ({
      'FDI Number': tf.toothNumber,
      'Universal Number': tf.universal,
      'Tooth Anatomical Name': tf.toothName,
      'Condition / What Happened': tf.condition,
      'Surfaces Involved': tf.surface,
      'Restoration Material': tf.restoration,
      'Procedure Performed': tf.procedure,
      'Patient Name': tf.patientName,
      'Attending Doctor': tf.dentistName,
      'Clinical Notes': tf.notes,
      'Record Date': new Date(tf.date).toLocaleDateString()
    }));

    const treatmentStatusData = (reportData.raw.procedures || []).map((p: any) => ({
      'Treatment': p.description,
      'Code': p.code,
      'Status': p.status,
      'Patient': p.patientName,
      'Assigned Dentist': p.assignedDentistName || 'Unassigned',
      'Cost': p.cost
    }));

    const diseaseExportData = (reportData.raw.diseases || []).map((d: any) => ({
      'Disease': d.name,
      'Status': d.status,
      'Severity': d.severity,
      'Tooth Number': d.toothNumber || '-',
      'Diagnosed': d.dateDiagnosed,
      'Dentist': d.dentistName,
      'Patient ID': d.patientId
    }));

    const demographicsData = (chartData.demographicsAgeData || []).map((d: any) => ({
      'Age Group': d.name,
      'Count': d.count
    }));

    const genderData = (chartData.demographicsGenderData || []).map((d: any) => ({
      'Gender': d.name,
      'Count': d.count
    }));

    const dentistPerfExport = (chartData.dentistPerformanceData || []).map((d: any) => ({
      'Dentist': d.name,
      'Treatments Completed': d.count
    }));

    const clinicAnalysisExport = [
      { Metric: 'Clinical Revenue (Completed)', Value: clinicAnalysis ? `$${clinicAnalysis.clinicalRevenue.toLocaleString()}` : 'N/A' },
      { Metric: 'Treatment Pipeline Value', Value: clinicAnalysis ? `$${clinicAnalysis.pipelineValue.toLocaleString()}` : 'N/A' },
      { Metric: 'Pending Treatment Value', Value: clinicAnalysis ? `$${clinicAnalysis.pendingValue.toLocaleString()}` : 'N/A' },
      { Metric: 'Patients Served', Value: clinicAnalysis ? clinicAnalysis.patientsServed : 'N/A' },
      { Metric: 'Appointment Show-up Rate (%)', Value: clinicAnalysis ? clinicAnalysis.showUpRate : 'N/A' },
      { Metric: 'Average Appointment Duration (min)', Value: clinicAnalysis ? clinicAnalysis.avgDuration : 'N/A' },
      { Metric: 'Treatment Completion Rate (%)', Value: clinicAnalysis ? clinicAnalysis.completionRate : 'N/A' },
    ];
    const appointmentHealthExport = (clinicAnalysis?.appointmentHealth || []).map((h: any) => ({
      'Status': h.status,
      'Count': h.count
    }));
    const dentistContributionExport = (clinicAnalysis?.dentistContribution || []).map((d: any) => ({
      'Dentist': d.name,
      'Cases Completed': d.treatments,
      'Revenue': d.revenue
    }));
    const topProceduresExport = (clinicAnalysis?.topRevenueProcedures || []).map((p: any) => ({
      'Procedure': p.name,
      'Count': p.count,
      'Revenue': p.revenue
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryData), 'Summary');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(clinicAnalysisExport), 'Clinic_Analysis');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(appointmentHealthExport), 'Appointment_Health');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dentistContributionExport), 'Dentist_Contribution');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(topProceduresExport), 'Top_Procedures');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(toothExportData), 'Tooth_Pathology_Report');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(treatmentStatusData), 'Treatment_Status');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(diseaseExportData), 'Disease_Distribution');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reportData.raw.followUps), 'Follow-Ups');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(demographicsData), 'Age_Demographics');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(genderData), 'Gender_Demographics');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dentistPerfExport), 'Dentist_Performance');
    XLSX.writeFile(wb, `Clinical_Report_${dateRange.replace(/ /g, '_')}.xlsx`);
    addToast({ type: 'success', title: 'Spreadsheet Downloaded', message: 'Excel report with all sections saved.' });
  };

  const handleExportCSV = () => {
    if (!reportData || !chartData) return;
    const toothExportData = toothFindings.map(tf => ({
      'FDI Number': tf.toothNumber,
      'Tooth Name': tf.toothName,
      'Condition': tf.condition,
      'Surfaces': tf.surface,
      'Procedure': tf.procedure,
      'Patient': tf.patientName,
      'Dentist': tf.dentistName,
      'Notes': tf.notes,
      'Date': new Date(tf.date).toLocaleDateString()
    }));
    const diseaseExportData = (reportData.raw.diseases || []).map((d: any) => ({
      'Disease': d.name,
      'Status': d.status,
      'Severity': d.severity,
      'Tooth': d.toothNumber || '-',
      'Date': d.dateDiagnosed
    }));
    const treatmentExportData = (reportData.raw.procedures || []).map((p: any) => ({
      'Treatment': p.description,
      'Code': p.code,
      'Status': p.status,
      'Cost': p.cost,
      'Dentist': p.assignedDentistName || 'Unassigned'
    }));

    const combined = [...toothExportData, { FDI: '', Toth: '', Condition: '---DISEASES---', Surfaces: '', Procedure: '', Patient: '' },
      ...diseaseExportData.map(d => ({ FDI: '', Tooth: '', Condition: d.Disease, Surfaces: d.Status, Procedure: d.Severity, Patient: d.Tooth })),
      { FDI: '', Tooth: '', Condition: '---TREATMENTS---', Surfaces: '', Procedure: '', Patient: '' },
      ...treatmentExportData.map(t => ({ FDI: '', Tooth: '', Condition: t.Treatment, Surfaces: t.Status, Procedure: t.Cost, Patient: t.Dentist }))
    ];
    const ws = XLSX.utils.json_to_sheet(combined);
    const csvOutput = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Clinical_Report_${dateRange.replace(/ /g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast({ type: 'success', title: 'CSV Downloaded', message: 'Full clinical report CSV saved.' });
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(220, 38, 38);
    doc.text(clinicName, 14, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Clinical Analytics & Tooth Pathology Report - ${dateRange}`, 14, 28);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 34);
    
    // Draw 2D Visual Odontogram in PDF
    doc.setFontSize(10);
    doc.setTextColor(50);
    doc.text('VISUAL ODONTOGRAM (Affected Teeth Status):', 14, 46);
    
    let startX = 14;
    let startY = 52;
    const boxSize = 8;
    
    // Upper Teeth row
    doc.setFontSize(7);
    UPPER_TEETH_FDI.forEach((num, i) => {
      const affected = toothFindings.find(t => t.toothNumber === num);
      if (affected) {
        if (affected.condition === 'Dental Caries') doc.setFillColor(254, 226, 226); // red-50
        else if (affected.condition === 'Root Canal Treated') doc.setFillColor(243, 232, 255); // purple-50
        else if (affected.condition === 'Fractured Tooth') doc.setFillColor(255, 237, 213); // orange-50
        else doc.setFillColor(254, 243, 199); // amber-50
      } else {
        doc.setFillColor(255, 255, 255);
      }
      doc.rect(startX + (i * (boxSize + 2)), startY, boxSize, boxSize, 'FD');
      doc.setTextColor(affected ? 200 : 150, affected ? 0 : 150, affected ? 0 : 150);
      doc.text(num.toString(), startX + (i * (boxSize + 2)) + 1, startY + 5);
    });

    // Lower Teeth row
    startY += boxSize + 4;
    LOWER_TEETH_FDI.forEach((num, i) => {
      const affected = toothFindings.find(t => t.toothNumber === num);
      if (affected) {
        if (affected.condition === 'Dental Caries') doc.setFillColor(254, 226, 226);
        else if (affected.condition === 'Root Canal Treated') doc.setFillColor(243, 232, 255);
        else if (affected.condition === 'Fractured Tooth') doc.setFillColor(255, 237, 213);
        else doc.setFillColor(254, 243, 199);
      } else {
        doc.setFillColor(255, 255, 255);
      }
      doc.rect(startX + (i * (boxSize + 2)), startY, boxSize, boxSize, 'FD');
      doc.setTextColor(affected ? 200 : 150, affected ? 0 : 150, affected ? 0 : 150);
      doc.text(num.toString(), startX + (i * (boxSize + 2)) + 1, startY + 5);
    });

    startY += 15;
    doc.setFontSize(10);
    doc.setTextColor(50);
    doc.text('DETAILED TOOTH-BY-TOOTH FINDINGS & HISTORY:', 14, startY);
    startY += 8;

    toothFindings.forEach((tf, i) => {
      if (startY > 270) {
        doc.addPage();
        startY = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(`TOOTH #${tf.toothNumber} (${tf.toothName})`, 14, startY);
      startY += 5;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Patient: ${tf.patientName} | Doctor: ${tf.dentistName} | Date: ${new Date(tf.date).toLocaleDateString()}`, 14, startY);
      startY += 5;
      doc.text(`Condition: ${tf.condition} | Surfaces: ${tf.surface || 'N/A'}`, 14, startY);
      startY += 5;
      doc.text(`Treatment: ${tf.procedure} | Restoration: ${tf.restoration}`, 14, startY);
      startY += 5;
      doc.text(`Clinical Notes: ${tf.notes}`, 14, startY);
      
      startY += 8;
      doc.setDrawColor(200, 200, 200);
      doc.line(14, startY - 4, 196, startY - 4);
    });

    doc.save(`Clinical_Tooth_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    addToast({ type: 'success', title: 'PDF Downloaded', message: 'Visual odontogram PDF generated successfully.' });
  };

  const handlePrint = () => window.print();

  // Compute Chart Data
  const chartData = useMemo(() => {
    if (!reportData) return null;

    const appts = reportData.raw.appointments;
    const procs = reportData.raw.procedures;

    // 1. Appointments Trend
    const apptsByDate = appts.reduce((acc: any, appt: any) => {
      const d = new Date(appt.dateTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      acc[d] = (acc[d] || 0) + 1;
      return acc;
    }, {});
    const apptTrendData = Object.entries(apptsByDate).map(([date, count]) => ({ date, Appointments: count }));

    // 2. New vs Returning Patients
    const patientFirstAppt: Record<string, string> = {};
    const allApptsSorted = [...appts].sort((a,b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
    allApptsSorted.forEach(a => {
        if (!patientFirstAppt[a.patientId]) {
            patientFirstAppt[a.patientId] = new Date(a.dateTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    });

    const newVsReturningMap: Record<string, { New: number, Returning: number }> = {};
    allApptsSorted.forEach(a => {
        const d = new Date(a.dateTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (!newVsReturningMap[d]) {
            newVsReturningMap[d] = { New: 0, Returning: 0 };
        }
        if (patientFirstAppt[a.patientId] === d) {
            newVsReturningMap[d].New += 1;
        } else {
            newVsReturningMap[d].Returning += 1;
        }
    });
    const newVsReturningData = Object.entries(newVsReturningMap).map(([date, counts]) => ({ date, ...counts }));

    // 3. Treatment distribution
    const treatmentCounts: Record<string, number> = {};
    procs.forEach((p: any) => {
        treatmentCounts[p.description] = (treatmentCounts[p.description] || 0) + 1;
    });
    const topTreatmentsData = Object.entries(treatmentCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a,b) => b.count - a.count)
        .slice(0, 5);

    // 4. Treatment status breakdown
    const txStatusMap = { Planned: 0, 'In Progress': 0, Completed: 0, Cancelled: 0 };
    procs.forEach((p: any) => {
        if (p.status in txStatusMap) {
            txStatusMap[p.status as keyof typeof txStatusMap]++;
        }
    });
    const txStatusData = Object.entries(txStatusMap).map(([status, count]) => ({ status, count }));

    // 5. Follow up summary
    const fuStatusMap = { Due: 0, Completed: 0, Overdue: 0 };
    (reportData.raw.followUps || []).forEach((f: any) => {
        if (f.status === 'Completed') {
            fuStatusMap.Completed++;
        } else {
            const isOverdue = new Date(f.dueDate).getTime() < new Date().setHours(0,0,0,0);
            if (isOverdue) fuStatusMap.Overdue++;
            else fuStatusMap.Due++;
        }
    });
    const followUpData = [
        { status: 'Due', count: fuStatusMap.Due },
        { status: 'Completed', count: fuStatusMap.Completed },
        { status: 'Overdue', count: fuStatusMap.Overdue }
    ];

    // 6. Disease Distribution
    const diseaseCounts: Record<string, number> = {};
    (reportData.raw.diseases || []).forEach((d: any) => {
        diseaseCounts[d.name] = (diseaseCounts[d.name] || 0) + 1;
    });
    const diseaseDistributionData = Object.entries(diseaseCounts).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count);

    // 6b. Disease Severity Distribution
    const diseaseSeverityCounts: Record<string, number> = {};
    (reportData.raw.diseases || []).forEach((d: any) => {
        const sev = d.severity || 'Unknown';
        diseaseSeverityCounts[sev] = (diseaseSeverityCounts[sev] || 0) + 1;
    });
    const diseaseSeverityData = Object.entries(diseaseSeverityCounts).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count);

    // 7. Most Affected Teeth
    const teethCounts: Record<string, number> = {};
    (reportData.raw.toothRecords || []).forEach((tr: any) => {
        const tName = getToothName(tr.tooth_number || 11);
        teethCounts[tName] = (teethCounts[tName] || 0) + 1;
    });
    const mostAffectedTeethData = Object.entries(teethCounts).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count).slice(0, 5);

    // 8. Dentist Performance
    const dentistTxCounts: Record<string, number> = {};
    procs.forEach((p: any) => {
        dentistTxCounts[p.dentistName || 'Unknown'] = (dentistTxCounts[p.dentistName || 'Unknown'] || 0) + 1;
    });
    const dentistPerformanceData = Object.entries(dentistTxCounts).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count);

    // 9. Demographics — scoped to patients active in the selected period
    const periodPatientIds = new Set<string>();
    appts.forEach((a: any) => periodPatientIds.add(a.patientId));
    (reportData.raw.visits || []).forEach((v: any) => periodPatientIds.add(v.patientId));
    const periodPatients = (reportData.raw.patients || []).filter((p: any) => periodPatientIds.has(p.id));
    // Fallback: if no patients matched by activity, use the full patient list
    const demoPatients = periodPatients.length > 0 ? periodPatients : (reportData.raw.patients || []);

    const genderCounts: Record<string, number> = {};
    const ageGroups: Record<string, number> = { '0-18': 0, '19-35': 0, '36-50': 0, '51-65': 0, '65+': 0 };
    demoPatients.forEach((p: any) => {
        genderCounts[p.gender || 'Unknown'] = (genderCounts[p.gender || 'Unknown'] || 0) + 1;
        if (p.dateOfBirth) {
            const age = new Date().getFullYear() - new Date(p.dateOfBirth).getFullYear();
            if (age <= 18) ageGroups['0-18']++;
            else if (age <= 35) ageGroups['19-35']++;
            else if (age <= 50) ageGroups['36-50']++;
            else if (age <= 65) ageGroups['51-65']++;
            else ageGroups['65+']++;
        }
    });
    const demographicsGenderData = Object.entries(genderCounts).map(([name, count]) => ({ name, count }));
    const demographicsAgeData = Object.entries(ageGroups).map(([name, count]) => ({ name, count }));

    return {
      apptTrendData,
      newVsReturningData,
      topTreatmentsData,
      txStatusData,
      followUpData,
      diseaseDistributionData,
      diseaseSeverityData,
      mostAffectedTeethData,
      dentistPerformanceData,
      demographicsGenderData,
      demographicsAgeData,
      kpis: {
        totalAppointments: appts.length,
        newPatients: reportData.patientStats.new,
        totalTreatments: procs.length,
        followUpsDue: fuStatusMap.Due + fuStatusMap.Overdue
      }
    };
  }, [reportData]);

  // Clinic-wide executive analysis (revenue, appointment health, dentist contribution)
  const clinicAnalysis = useMemo(() => {
    if (!reportData) return null;
    const appts = reportData.raw.appointments || [];
    const procs = reportData.raw.procedures || [];
    const visits = reportData.raw.visits || [];

    const completedTreatments = procs.filter((p: any) => p.status === 'Completed');
    const clinicalRevenue = completedTreatments.reduce((s: number, p: any) => s + (Number(p.cost) || 0), 0);
    const pipelineValue = procs.reduce((s: number, p: any) => s + (Number(p.cost) || 0), 0);
    const pendingValue = Math.max(0, pipelineValue - clinicalRevenue);

    const aScheduled = appts.filter((a: any) => ['Scheduled', 'Checked-In', 'Waiting', 'In Treatment'].includes(a.status)).length;
    const aCompleted = appts.filter((a: any) => a.status === 'Completed').length;
    const aCancelled = appts.filter((a: any) => a.status === 'Cancelled').length;
    const aNoShow = appts.filter((a: any) => ['No Show', 'No-Show'].includes(a.status)).length;
    const attendedTotal = aCompleted + aCancelled + aNoShow;
    const showUpRate = attendedTotal > 0 ? Math.round((aCompleted / attendedTotal) * 100) : 0;
    const appointmentTotal = aScheduled + aCompleted + aCancelled + aNoShow;

    const servedPatientIds = new Set<string>();
    appts.forEach((a: any) => servedPatientIds.add(a.patientId));
    visits.forEach((v: any) => servedPatientIds.add(v.patientId));

    const dentistMap: Record<string, { treatments: number; revenue: number }> = {};
    completedTreatments.forEach((p: any) => {
      const key = p.assignedDentistName || 'Unassigned';
      dentistMap[key] = dentistMap[key] || { treatments: 0, revenue: 0 };
      dentistMap[key].treatments += 1;
      dentistMap[key].revenue += Number(p.cost) || 0;
    });
    const dentistContribution = Object.entries(dentistMap)
      .map(([name, v]) => ({ name, treatments: v.treatments, revenue: v.revenue }))
      .sort((a, b) => b.revenue - a.revenue);

    const procRev: Record<string, { count: number; revenue: number }> = {};
    procs.forEach((p: any) => {
      const key = p.description || 'Treatment';
      procRev[key] = procRev[key] || { count: 0, revenue: 0 };
      procRev[key].count += 1;
      procRev[key].revenue += Number(p.cost) || 0;
    });
    const topRevenueProcedures = Object.entries(procRev)
      .map(([name, v]) => ({ name, count: v.count, revenue: v.revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      clinicalRevenue,
      pipelineValue,
      pendingValue,
      completionRate: reportData.treatmentStats.completionRate,
      avgDuration: reportData.appointmentStats.avgDuration,
      showUpRate,
      patientsServed: servedPatientIds.size,
      appointmentTotal,
      appointmentHealth: [
        { status: 'Scheduled', count: aScheduled, color: '#3b82f6' },
        { status: 'Completed', count: aCompleted, color: '#10b981' },
        { status: 'Cancelled', count: aCancelled, color: '#f97316' },
        { status: 'No Show', count: aNoShow, color: '#ef4444' },
      ],
      dentistContribution,
      topRevenueProcedures,
    };
  }, [reportData]);

  const priorKpis = useMemo(() => {
    if (!priorReportData) return null;
    const procs = priorReportData.raw.procedures || [];
    const appts = priorReportData.raw.appointments || [];
    const fuStatusMap = { Due: 0, Completed: 0, Overdue: 0 };
    (priorReportData.raw.followUps || []).forEach((f: any) => {
        if (f.status === 'Completed') {
            fuStatusMap.Completed++;
        } else {
            const isOverdue = new Date(f.dueDate).getTime() < new Date().setHours(0,0,0,0);
            if (isOverdue) fuStatusMap.Overdue++;
            else fuStatusMap.Due++;
        }
    });

    return {
      totalAppointments: appts.length,
      newPatients: priorReportData.patientStats.new,
      totalTreatments: procs.length,
      followUpsDue: fuStatusMap.Due + fuStatusMap.Overdue
    };
  }, [priorReportData]);

  const renderPoPBadge = (current: number, prior: number | undefined) => {
    if (prior === undefined || prior === null) return null;
    if (prior === 0 && current === 0) return null;
    if (prior === 0) return <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-bold">+100%</span>;
    
    const diff = current - prior;
    const percent = Math.round((diff / prior) * 100);
    
    if (percent > 0) {
      return <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-bold">+{percent}%</span>;
    } else if (percent < 0) {
      return <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded-full text-[10px] font-bold">{percent}%</span>;
    }
    return <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full text-[10px] font-bold">0%</span>;
  };

  if (isLoading || !chartData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 font-semibold space-y-4">
        <Activity className="w-10 h-10 text-red-600 animate-pulse" />
        <span>Loading Clinical Intelligence...</span>
      </div>
    );
  }

  const { 
    apptTrendData, newVsReturningData, topTreatmentsData, 
    txStatusData, followUpData, kpis, 
    diseaseDistributionData, diseaseSeverityData, mostAffectedTeethData, 
    dentistPerformanceData, demographicsGenderData, demographicsAgeData 
  } = chartData;
  const isDataEmpty = kpis.totalAppointments === 0 && kpis.totalTreatments === 0 && kpis.followUpsDue === 0;

  if (selectedReport) {
    return (
      <ReportViewer 
        patientId={selectedReport.patientId} 
        visitId={selectedReport.visitId} 
        onClose={() => setSelectedReport(null)} 
      />
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto print:bg-white print:p-0 print:m-0 pb-16">
      
      {/* 1. TITLE RIBBON & TAB SWITCHER */}
      <div className="flex flex-col gap-5 border-b border-slate-200 pb-5 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-2">
              <BarChart3 className="w-6.5 h-6.5 text-blue-600" />
              <span>Clinic Reports & Intelligence</span>
            </h2>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              {clinicName} - Practice analytics and patient reports
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            {/* Minimal Pill Tab Switcher */}
            {user?.role !== 'Other Dentist' && (
              <div className="bg-slate-100/80 p-1 rounded-xl flex items-center shadow-inner w-full sm:w-auto">
                <button
                  onClick={() => setMainTab('patient-reports')}
                  className={`flex-1 sm:flex-none px-5 py-2 text-xs font-black rounded-lg transition-all ${
                    mainTab === 'patient-reports'
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Patient Reports
                </button>
                <button
                  onClick={() => setMainTab('analytics')}
                  className={`flex-1 sm:flex-none px-5 py-2 text-xs font-black rounded-lg transition-all ${
                    mainTab === 'analytics'
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Clinical Analytics
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========== PATIENT REPORTS TAB ========== */}
      {mainTab === 'patient-reports' && (
        <div className="space-y-5">
          {/* Search Bar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={patientSearch}
                onChange={e => setPatientSearch(e.target.value)}
                placeholder="Search patients by name, phone, or ID..."
                className="pl-10 h-11 rounded-xl border-slate-200 text-xs font-semibold shadow-sm focus-visible:ring-red-200"
              />
            </div>
            <div className="text-xs font-bold text-slate-400">
              {filteredPatientsForReports.length} patient{filteredPatientsForReports.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Patient List */}
          {patientsLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-10 h-10 border-4 border-red-200 border-t-red-800 rounded-full animate-spin" />
              <p className="text-sm font-semibold text-slate-500">Loading patients...</p>
            </div>
          ) : filteredPatientsForReports.length === 0 ? (
            <div className="text-center py-20">
              <User className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-sm font-bold text-slate-400">No patients found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPatientsForReports.map(patient => {
                const isExpanded = expandedPatientId === patient.id;
                return (
                  <div key={patient.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all hover:shadow-md">
                    {/* Patient Row */}
                    <div className="flex items-center justify-between p-4 gap-4">
                      <div className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer" onClick={() => handleExpandPatient(patient.id)}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isExpanded ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-500'
                        }`}>
                          <User className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-black text-slate-900 truncate">{patient.name}</h3>
                            {patient.displayId && (
                              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">#{patient.displayId}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-[11px] font-semibold text-slate-500">{getPatientAge(patient.dateOfBirth)} yrs • {patient.gender}</span>
                            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {patient.phone || '—'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right hidden sm:block">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Visits</p>
                          <p className="text-lg font-black text-slate-800">{patient.visitCount}</p>
                        </div>
                        {patient.lastVisitDate && (
                          <div className="text-right hidden md:block">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Last Visit</p>
                            <p className="text-[11px] font-bold text-slate-600">
                              {new Date(patient.lastVisitDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                        )}
                        <Button
                          onClick={(e) => { e.stopPropagation(); openFullReport(patient.id); }}
                          className="h-9 rounded-xl text-[11px] font-bold gap-1.5 bg-red-800 text-white hover:bg-red-900 shadow-sm px-4"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Report
                        </Button>
                        <button
                          onClick={() => handleExpandPatient(patient.id)}
                          className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-600" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Visits Accordion */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-slate-50/50">
                        {visitsLoading ? (
                          <div className="flex items-center justify-center py-8 gap-2">
                            <div className="w-5 h-5 border-2 border-slate-200 border-t-red-800 rounded-full animate-spin" />
                            <span className="text-xs font-semibold text-slate-400">Loading visits...</span>
                          </div>
                        ) : expandedPatientVisits.length === 0 ? (
                          <div className="text-center py-8">
                            <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-xs font-bold text-slate-400">No visits recorded yet.</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100">
                            {expandedPatientVisits.map((visit, vIdx) => {
                              const rxCount = Array.isArray(visit.prescriptions) ? visit.prescriptions.length : 0;
                              return (
                                <div key={visit.id} className="px-4 py-3 hover:bg-white/80 transition-colors">
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                                        <span className="text-[10px] font-black text-slate-600">{vIdx + 1}</span>
                                      </div>
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-black text-slate-800">
                                            {new Date(visit.dateTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                          </span>
                                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                            visit.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                            visit.status === 'In Progress' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                            'bg-slate-100 text-slate-500'
                                          }`}>
                                            {visit.status}
                                          </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 mt-1">
                                          {visit.chiefComplaint && (
                                            <span className="text-[10px] font-semibold text-slate-500 truncate max-w-[200px]">
                                              <span className="text-slate-400">Complaint:</span> {visit.chiefComplaint}
                                            </span>
                                          )}
                                          {visit.diagnosis && (
                                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-100">
                                              {visit.diagnosis}
                                            </span>
                                          )}
                                          <span className="text-[10px] font-semibold text-slate-400">Dr. {visit.dentistName}</span>
                                          {rxCount > 0 && (
                                            <span className="text-[10px] font-bold text-amber-600 flex items-center gap-0.5">
                                              <Pill className="w-3 h-3" /> {rxCount} Rx
                                            </span>
                                          )}
                                          {visit.followup && (
                                            <span className="text-[10px] font-bold text-purple-600 flex items-center gap-0.5">
                                              <Clock className="w-3 h-3" /> Follow-up
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <Button
                                      variant="outline"
                                      onClick={() => openFullReport(patient.id, visit.id)}
                                      className="h-8 rounded-lg text-[10px] font-bold gap-1 px-3 border-slate-200 hover:bg-slate-100 shrink-0"
                                    >
                                      <Eye className="w-3 h-3" /> View
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========== CLINICAL ANALYTICS TAB ========== */}
      {mainTab === 'analytics' && (<>


      {/* 2. FILTERS */}
      <Card className="border border-slate-200 shadow-sm bg-white rounded-2xl p-4 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1"><Filter className="w-3 h-3"/> Date Range</label>
              <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="h-9 w-40 text-xs font-semibold rounded-xl border-slate-200 bg-slate-50 px-3 outline-none focus:ring-2 focus:ring-blue-100">
                <option value="Today">Today</option>
                <option value="This Week">This Week</option>
                <option value="This Month">This Month</option>
                <option value="This Year">This Year</option>
                <option value="Custom Date Range">Custom Range</option>
              </select>
            </div>
            {dateRange === 'Custom Date Range' && (
              <div className="flex items-center gap-2">
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9 text-xs font-semibold rounded-xl border-slate-200 bg-slate-50 px-3 outline-none focus:ring-2 focus:ring-blue-100" />
                <span className="text-slate-400 text-xs font-bold">to</span>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9 text-xs font-semibold rounded-xl border-slate-200 bg-slate-50 px-3 outline-none focus:ring-2 focus:ring-blue-100" />
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase">Dentist</label>
              <select value={selectedDentist} onChange={(e) => setSelectedDentist(e.target.value)} className="h-9 w-40 text-xs font-semibold rounded-xl border-slate-200 bg-slate-50 px-3 outline-none focus:ring-2 focus:ring-blue-100">
                <option value="ALL">All Doctors</option>
                {dentistsList.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t lg:border-t-0 lg:border-l border-slate-200 pt-4 lg:pt-0 lg:pl-4">
            {/* Financials Toggle */}
            <button 
              onClick={() => setShowFinancials(!showFinancials)} 
              className="h-9 w-9 bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 rounded-xl flex items-center justify-center transition-all shadow-sm"
              title={showFinancials ? 'Hide Financials' : 'Show Financials'}
            >
              {showFinancials ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            
            <button onClick={handleExportPDF} className="h-9 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs px-3.5 flex items-center gap-1 transition-all shadow-sm">
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
            <button onClick={handleExportCSV} className="h-9 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs px-3.5 flex items-center gap-1 transition-all shadow-sm">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" /> CSV
            </button>
            <button onClick={handlePrint} className="h-9 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs px-3.5 flex items-center gap-1 transition-all shadow-sm">
              <Printer className="w-3.5 h-3.5 text-slate-500" /> Print
            </button>
          </div>
        </div>
      </Card>

      {/* 3. KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Appointments", value: chartData.kpis.totalAppointments, priorValue: priorKpis?.totalAppointments, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: "New Patients", value: chartData.kpis.newPatients, priorValue: priorKpis?.newPatients, icon: FilePlus2, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: "Treatments", value: chartData.kpis.totalTreatments, priorValue: priorKpis?.totalTreatments, icon: Stethoscope, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: "Follow-ups Due", value: chartData.kpis.followUpsDue, priorValue: priorKpis?.followUpsDue, icon: ShieldAlert, color: 'text-rose-600', bg: 'bg-rose-50' }
        ].map((kpi, idx) => (
          <Card key={idx} className="border border-slate-200 shadow-sm rounded-2xl p-4 flex flex-col justify-between transition hover:shadow-md">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{kpi.label}</p>
              <div className={`p-1.5 rounded-lg ${kpi.bg}`}><kpi.icon className={`w-4 h-4 ${kpi.color}`} /></div>
            </div>
            <div className="flex items-end gap-3 mt-1">
              <h3 className="text-2xl font-black text-slate-900">{kpi.value}</h3>
              {renderPoPBadge(kpi.value, kpi.priorValue)}
            </div>
          </Card>
        ))}
      </div>

      {/* =========================================================================
          4. CLINIC ANALYSIS — EXECUTIVE SUMMARY (Clinic-Wide Intelligence)
          ========================================================================= */}
      {clinicAnalysis && (
        <Card className="border border-slate-200 shadow-md bg-white rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">Clinic Analysis</h3>
              <p className="text-xs text-slate-500 font-semibold">
                Clinic-wide operational, financial & clinical performance for {dateRange}
              </p>
            </div>
          </div>

          {/* Financial & Utilization Tiles */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Clinical Revenue', value: showFinancials ? `$${clinicAnalysis.clinicalRevenue.toLocaleString()}` : 'XXX', sub: `${clinicAnalysis.dentistContribution.reduce((s, d) => s + d.treatments, 0)} completed cases`, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Pipeline Value', value: showFinancials ? `$${clinicAnalysis.pipelineValue.toLocaleString()}` : 'XXX', sub: 'All planned + done', icon: FilePlus2, color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { label: 'Pending Value', value: showFinancials ? `$${clinicAnalysis.pendingValue.toLocaleString()}` : 'XXX', sub: 'Awaiting completion', icon: ShieldAlert, color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Patients Served', value: `${clinicAnalysis.patientsServed}`, sub: 'In this period', icon: Stethoscope, color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: 'Show-up Rate', value: `${clinicAnalysis.showUpRate}%`, sub: 'Appointments attended', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Avg Appointment', value: `${clinicAnalysis.avgDuration} min`, sub: `Completion ${clinicAnalysis.completionRate}%`, icon: BarChart3, color: 'text-sky-600', bg: 'bg-sky-50' },
            ].map((tile, idx) => (
              <div key={idx} className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">{tile.label}</span>
                  <div className={`p-1.5 rounded-lg ${tile.bg}`}><tile.icon className={`w-3.5 h-3.5 ${tile.color}`} /></div>
                </div>
                <div className="text-lg font-black text-slate-900 leading-none">{tile.value}</div>
                <div className="text-[10px] font-semibold text-slate-400 mt-1">{tile.sub}</div>
              </div>
            ))}
          </div>

          {/* Appointment Health + Dentist Contribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Appointment Health */}
            <div className="border border-slate-200 rounded-2xl p-5">
              <h4 className="text-sm font-black text-slate-900 mb-1">Appointment Health</h4>
              <p className="text-[11px] font-semibold text-slate-500 mb-4">Outcome of all appointments in the period</p>

              <div className="flex h-3.5 rounded-full overflow-hidden bg-slate-100 mb-3">
                {clinicAnalysis.appointmentTotal > 0 ? (
                  clinicAnalysis.appointmentHealth.map(seg => seg.count === 0 ? null : (
                    <div
                      key={seg.status}
                      title={`${seg.status}: ${seg.count}`}
                      style={{ width: `${Math.max(2, (seg.count / clinicAnalysis.appointmentTotal) * 100)}%`, backgroundColor: seg.color }}
                    />
                  ))
                ) : (
                  <div className="w-full bg-slate-200" />
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {clinicAnalysis.appointmentHealth.map(seg => (
                  <div key={seg.status} className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: seg.color }} />
                      {seg.status}
                    </span>
                    <span className="text-xs font-black text-slate-900">{seg.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Revenue Procedures */}
            <div className="border border-slate-200 rounded-2xl p-5">
              <h4 className="text-sm font-black text-slate-900 mb-1">Top Revenue Procedures</h4>
              <p className="text-[11px] font-semibold text-slate-500 mb-4">Highest value treatments by billing amount</p>
              {clinicAnalysis.topRevenueProcedures.length === 0 ? (
                <div className="py-8 text-center text-xs font-bold text-slate-400">No procedure billing data for this period.</div>
              ) : (
                <div className="space-y-3">
                  {clinicAnalysis.topRevenueProcedures.map((p, idx) => {
                    const max = clinicAnalysis.topRevenueProcedures[0].revenue || 1;
                    return (
                      <div key={idx}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-slate-700 truncate pr-2">{p.name}</span>
                          <span className="text-xs font-black text-slate-900 shrink-0">{showFinancials ? `$${p.revenue.toLocaleString()}` : 'XXX'}</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full bg-blue-500" style={{ width: `${(p.revenue / max) * 100}%` }} />
                        </div>
                        <div className="text-[10px] font-semibold text-slate-400 mt-0.5">{p.count} performed</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Dentist Revenue Contribution */}
          {clinicAnalysis.dentistContribution.length > 0 && (
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-5 pt-4 pb-1">
                <h4 className="text-sm font-black text-slate-900">Dentist Revenue Contribution</h4>
                <p className="text-[11px] font-semibold text-slate-500">Completed treatment value per doctor</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-y border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      <th className="py-2.5 px-5">Dentist</th>
                      <th className="py-2.5 px-5">Cases Completed</th>
                      <th className="py-2.5 px-5">Revenue</th>
                      <th className="py-2.5 px-5">Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {clinicAnalysis.dentistContribution.map((d, idx) => {
                      const total = clinicAnalysis.clinicalRevenue || 1;
                      const share = Math.round((d.revenue / total) * 100);
                      return (
                        <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-5 font-bold text-slate-900">{d.name}</td>
                          <td className="py-3 px-5">{d.treatments}</td>
                          <td className="py-3 px-5 font-black text-slate-900">{showFinancials ? `$${d.revenue.toLocaleString()}` : 'XXX'}</td>
                          <td className="py-3 px-5">
                            <div className="flex items-center gap-2">
                              <div className="h-2 rounded-full bg-slate-100 overflow-hidden w-24">
                                <div className="h-full rounded-full bg-teal-500" style={{ width: `${share}%` }} />
                              </div>
                              <span className="text-[11px] font-black text-slate-600">{share}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* =========================================================================
          5. DEDICATED SECTION: TOOTH-BY-TOOTH FINDINGS ("Konse Teeth Ko Ky Hua")
          ========================================================================= */}
      <Card className="border border-slate-200 shadow-md bg-white rounded-2xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-red-50 text-red-600 border border-red-100">
                <HeartPulse className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                Tooth-by-Tooth Pathology & Affected Teeth Report
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              Complete tooth-level tracking detailing which specific teeth were affected, condition diagnosed, involved surfaces, and treatment rendered.
            </p>
          </div>

          {/* Quick filter by condition */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Filter Condition:</span>
            <select
              value={conditionFilter}
              onChange={(e) => setConditionFilter(e.target.value)}
              className="h-9 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none"
            >
              <option value="ALL">All Conditions</option>
              <option value="Dental Caries">Dental Caries</option>
              <option value="Root Canal Treated">Root Canal Treated</option>
              <option value="Fractured Tooth">Fractured Tooth</option>
              <option value="Missing Tooth">Missing Tooth</option>
              <option value="Implant">Implant / Crown</option>
            </select>
          </div>
        </div>

        {/* Clinical Condition Statistics Pill Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3 rounded-xl bg-red-50/80 border border-red-200/80">
            <span className="text-[10px] font-black uppercase text-red-600">Caries / Cavities</span>
            <div className="text-xl font-black text-red-900 mt-0.5">{toothStats.caries} Teeth</div>
          </div>
          <div className="p-3 rounded-xl bg-purple-50/80 border border-purple-200/80">
            <span className="text-[10px] font-black uppercase text-purple-600">Root Canal (RCT)</span>
            <div className="text-xl font-black text-purple-900 mt-0.5">{toothStats.rct} Teeth</div>
          </div>
          <div className="p-3 rounded-xl bg-orange-50/80 border border-orange-200/80">
            <span className="text-[10px] font-black uppercase text-orange-600">Fractures / Trauma</span>
            <div className="text-xl font-black text-orange-900 mt-0.5">{toothStats.fracture} Teeth</div>
          </div>
          <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80">
            <span className="text-[10px] font-black uppercase text-amber-600">Implants & Crowns</span>
            <div className="text-xl font-black text-amber-900 mt-0.5">{toothStats.implants} Teeth</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-100 border border-slate-200">
            <span className="text-[10px] font-black uppercase text-slate-600">Missing / Extracted</span>
            <div className="text-xl font-black text-slate-800 mt-0.5">{toothStats.missing} Teeth</div>
          </div>
        </div>

        {/* 32-Teeth Interactive Arch Matrix in Report */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
          <div className="flex justify-between items-center text-xs font-black text-slate-700">
            <span className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-600" />
              Full Dentition Status Map (Click a tooth to filter findings)
            </span>
            {selectedToothFilter !== 'ALL' && (
              <button
                type="button"
                onClick={() => setSelectedToothFilter('ALL')}
                className="text-[11px] text-blue-600 hover:underline font-bold"
              >
                Clear Tooth Filter (Showing #{selectedToothFilter})
              </button>
            )}
          </div>

          {/* Upper Arch */}
          <div className="space-y-1.5">
            <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">Upper Maxillary (18–28)</div>
            <div className="grid grid-cols-8 sm:grid-cols-16 gap-1.5">
              {UPPER_TEETH_FDI.map((num) => {
                const affected = toothFindings.find(t => t.toothNumber === num);
                const isSelected = selectedToothFilter === num;
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setSelectedToothFilter(selectedToothFilter === num ? 'ALL' : num)}
                    className={`p-1.5 rounded-xl border text-center transition-all flex flex-col items-center justify-between min-h-[50px] ${
                      isSelected 
                        ? 'ring-2 ring-blue-600 bg-blue-100 border-blue-400 font-black'
                        : affected
                        ? affected.condition === 'Dental Caries' 
                          ? 'bg-red-50 border-red-300 text-red-800 font-bold hover:bg-red-100'
                          : affected.condition === 'Root Canal Treated'
                          ? 'bg-purple-50 border-purple-300 text-purple-800 font-bold hover:bg-purple-100'
                          : affected.condition === 'Fractured Tooth'
                          ? 'bg-orange-50 border-orange-300 text-orange-800 font-bold hover:bg-orange-100'
                          : 'bg-amber-50 border-amber-300 text-amber-800 font-bold hover:bg-amber-100'
                        : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-[10px] font-extrabold">{num}</span>
                    {affected ? (
                      <span className="text-[7px] font-black uppercase truncate max-w-[36px]">
                        {affected.condition.split(' ')[0]}
                      </span>
                    ) : (
                      <span className="text-[7px] font-semibold text-emerald-600">OK</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lower Arch */}
          <div className="space-y-1.5">
            <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">Lower Mandibular (48–38)</div>
            <div className="grid grid-cols-8 sm:grid-cols-16 gap-1.5">
              {LOWER_TEETH_FDI.map((num) => {
                const affected = toothFindings.find(t => t.toothNumber === num);
                const isSelected = selectedToothFilter === num;
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setSelectedToothFilter(selectedToothFilter === num ? 'ALL' : num)}
                    className={`p-1.5 rounded-xl border text-center transition-all flex flex-col items-center justify-between min-h-[50px] ${
                      isSelected 
                        ? 'ring-2 ring-blue-600 bg-blue-100 border-blue-400 font-black'
                        : affected
                        ? affected.condition === 'Dental Caries' 
                          ? 'bg-red-50 border-red-300 text-red-800 font-bold hover:bg-red-100'
                          : affected.condition === 'Root Canal Treated'
                          ? 'bg-purple-50 border-purple-300 text-purple-800 font-bold hover:bg-purple-100'
                          : affected.condition === 'Fractured Tooth'
                          ? 'bg-orange-50 border-orange-300 text-orange-800 font-bold hover:bg-orange-100'
                          : 'bg-amber-50 border-amber-300 text-amber-800 font-bold hover:bg-amber-100'
                        : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-[10px] font-extrabold">{num}</span>
                    {affected ? (
                      <span className="text-[7px] font-black uppercase truncate max-w-[36px]">
                        {affected.condition.split(' ')[0]}
                      </span>
                    ) : (
                      <span className="text-[7px] font-semibold text-emerald-600">OK</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200">
            <div className="space-y-6 overflow-x-auto">
              <div className="min-w-[800px]">
                <div className="grid grid-cols-16 gap-2 justify-center mb-8">
                  {UPPER_TEETH_FDI.map((num) => {
                    const records = (reportData?.raw?.toothRecords || []).filter((r: any) => r.toothNumber === num).sort((a: any,b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
                    const active = records.length > 0 ? records[records.length - 1] : null;
                    return <Tooth key={num} num={num} isSelected={selectedTooth === num} activeRecord={active} onClick={handleToothClick} />;
                  })}
                </div>
                <div className="grid grid-cols-16 gap-2 justify-center">
                  {LOWER_TEETH_FDI.map((num) => {
                    const records = (reportData?.raw?.toothRecords || []).filter((r: any) => r.toothNumber === num).sort((a: any,b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
                    const active = records.length > 0 ? records[records.length - 1] : null;
                    return <Tooth key={num} num={num} isSelected={selectedTooth === num} activeRecord={active} onClick={handleToothClick} />;
                  })}
                </div>
              </div>
            </div>
          </div>

        {/* Detailed Findings Table */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Tooth #</th>
                  <th className="py-3 px-4">Tooth Description</th>
                  <th className="py-3 px-4">Diagnosis / Condition</th>
                  <th className="py-3 px-4">Surfaces</th>
                  <th className="py-3 px-4">Restoration / Treatment</th>
                  <th className="py-3 px-4">Patient & Doctor</th>
                  <th className="py-3 px-4">Clinical Findings & Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {filteredToothFindings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-bold">
                      No tooth pathology records match the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredToothFindings.map((tf) => (
                    <tr 
                      key={tf.id} 
                      onClick={() => handleToothClick(tf.toothNumber)}
                      className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 font-black">
                        <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs">
                          FDI {tf.toothNumber} (Univ #{tf.universal})
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {tf.toothName}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black ${
                          tf.condition === 'Dental Caries' 
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : tf.condition === 'Root Canal Treated'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : tf.condition === 'Fractured Tooth'
                            ? 'bg-orange-50 text-orange-700 border border-orange-200'
                            : tf.condition === 'Missing Tooth'
                            ? 'bg-slate-100 text-slate-600 border border-slate-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {tf.condition}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-700">
                          {tf.surface}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{tf.procedure}</div>
                        {tf.restoration !== 'None' && (
                          <div className="text-[10px] text-slate-400 font-semibold">{tf.restoration}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{tf.patientName}</div>
                        <div className="text-[10px] text-slate-400">{tf.dentistName}</div>
                      </td>
                      <td className="py-3 px-4 max-w-xs text-[11px] text-slate-600">
                        {tf.notes}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* 6. ANALYTICS CHARTS */}
      {isDataEmpty ? (
        <Card className="border border-slate-200 border-dashed shadow-sm rounded-2xl p-16 text-center">
          <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-700">No data available for the selected period.</h3>
          <p className="text-sm font-semibold text-slate-500 mt-2">Adjust your filters to see analytics.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Chart 1: Appointments Trend */}
          <Card className="border border-slate-200 shadow-sm rounded-2xl p-6">
            <h3 className="text-sm font-black text-slate-900 mb-6">Appointments Trend</h3>
            <div className="h-72 w-full text-xs font-semibold">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={apptTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAppts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Area type="monotone" dataKey="Appointments" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorAppts)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Chart 2: New vs Returning Patients */}
          <Card className="border border-slate-200 shadow-sm rounded-2xl p-6">
            <h3 className="text-sm font-black text-slate-900 mb-6">New vs Returning Patients</h3>
            <div className="h-72 w-full text-xs font-semibold">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={newVsReturningData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend iconType="circle" />
                  <Line type="monotone" dataKey="New" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="Returning" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Chart 3: Treatment Distribution */}
          <Card className="border border-slate-200 shadow-sm rounded-2xl p-6">
            <h3 className="text-sm font-black text-slate-900 mb-6">Treatment Distribution</h3>
            <div className="h-72 w-full text-xs font-semibold">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topTreatmentsData} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" tickLine={false} axisLine={false} width={120} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="count" fill="#f59e0b" radius={[0, 6, 6, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Chart 4: Treatment Status */}
          <Card className="border border-slate-200 shadow-sm rounded-2xl p-6">
            <h3 className="text-sm font-black text-slate-900 mb-6">Treatment Status</h3>
            <div className="h-72 w-full text-xs font-semibold">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={txStatusData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="status" stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{fill: 'transparent'}} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={60}>
                    {txStatusData.map((entry, index) => {
                      let color = '#94a3b8';
                      if (entry.status === 'Planned') color = '#3b82f6';
                      else if (entry.status === 'In Progress') color = '#f59e0b';
                      else if (entry.status === 'Completed') color = '#10b981';
                      else if (entry.status === 'Cancelled') color = '#ef4444';
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Chart 5: Follow-up / Recall Summary */}
          <Card className="border border-slate-200 shadow-sm rounded-2xl p-6 lg:col-span-2">
            <h3 className="text-sm font-black text-slate-900 mb-6">Follow-up / Recall Summary</h3>
            <div className="h-72 w-full text-xs font-semibold">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={followUpData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="status" stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{fill: 'transparent'}} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={60}>
                    {followUpData.map((entry, index) => {
                      let color = '#94a3b8';
                      if (entry.status === 'Due') color = '#3b82f6';
                      else if (entry.status === 'Completed') color = '#10b981';
                      else if (entry.status === 'Overdue') color = '#ef4444';
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          {/* Chart 6: Disease Distribution */}
          <Card className="border border-slate-200 shadow-sm rounded-2xl p-6">
            <h3 className="text-sm font-black text-slate-900 mb-6">Disease Distribution</h3>
            <div className="h-72 w-full text-xs font-semibold">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={diseaseDistributionData} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" tickLine={false} axisLine={false} width={120} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="count" fill="#ef4444" radius={[0, 6, 6, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Chart 6b: Disease Severity */}
          {chartData.diseaseSeverityData.length > 0 && (
            <Card className="border border-slate-200 shadow-sm rounded-2xl p-6">
              <h3 className="text-sm font-black text-slate-900 mb-6">Disease Severity Breakdown</h3>
              <div className="h-72 w-full text-xs font-semibold">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.diseaseSeverityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{fill: 'transparent'}} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={60}>
                      {chartData.diseaseSeverityData.map((entry: any, index: number) => {
                        let color = '#94a3b8';
                        if (entry.name === 'Mild') color = '#10b981';
                        else if (entry.name === 'Moderate') color = '#f59e0b';
                        else if (entry.name === 'Severe') color = '#f97316';
                        else if (entry.name === 'Critical') color = '#ef4444';
                        return <Cell key={`cell-${index}`} fill={color} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Chart 7: Most Affected Teeth */}
          <Card className="border border-slate-200 shadow-sm rounded-2xl p-6">
            <h3 className="text-sm font-black text-slate-900 mb-6">Most Affected Teeth</h3>
            <div className="h-72 w-full text-xs font-semibold">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mostAffectedTeethData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{fill: 'transparent'}} />
                  <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={60} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          {/* Chart 8: Dentist Performance */}
          {selectedDentist === 'ALL' ? (
            <Card className="border border-slate-200 shadow-sm rounded-2xl p-6 lg:col-span-2">
              <h3 className="text-sm font-black text-slate-900 mb-2">Dentist Performance (Treatments Completed)</h3>
              <p className="text-[11px] font-semibold text-slate-500 mb-6">Comparative productivity across all doctors for {dateRange}.</p>
              <div className="h-72 w-full text-xs font-semibold">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.dentistPerformanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{fill: 'transparent'}} />
                    <Bar dataKey="count" fill="#14b8a6" radius={[6, 6, 0, 0]} maxBarSize={60} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          ) : (
            <Card className="border border-slate-200 shadow-sm rounded-2xl p-6 lg:col-span-2">
              <h3 className="text-sm font-black text-slate-900 mb-2">Dentist Filter Active</h3>
              <p className="text-xs font-semibold text-slate-500">
                Showing data for the selected doctor only. Switch to "All Doctors" to compare dentist-wise performance across the clinic.
              </p>
            </Card>
          )}

          {/* Chart 9: Patient Demographics (Age) */}
          <Card className="border border-slate-200 shadow-sm rounded-2xl p-6">
            <h3 className="text-sm font-black text-slate-900 mb-2">Patient Demographics (Age)</h3>
            <p className="text-[11px] font-semibold text-slate-500 mb-4">Patients active during {dateRange}</p>
            <div className="h-64 w-full text-xs font-semibold">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.demographicsAgeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{fill: 'transparent'}} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={60} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Chart 10: Patient Demographics (Gender) */}
          <Card className="border border-slate-200 shadow-sm rounded-2xl p-6">
            <h3 className="text-sm font-black text-slate-900 mb-2">Patient Demographics (Gender)</h3>
            <p className="text-[11px] font-semibold text-slate-500 mb-4">Patients active during {dateRange}</p>
            <div className="h-64 w-full text-xs font-semibold">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.demographicsGenderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="count"
                  >
                    {chartData.demographicsGenderData.map((entry: any, index: number) => {
                       const colors = ['#8b5cf6', '#ec4899', '#94a3b8'];
                       return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                    })}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                    itemStyle={{ color: '#0f172a' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
          
        </div>
      )}

      {/* 3D SINGLE TOOTH DETAILED VIEWER MODAL */}
      <Dialog open={isToothModalOpen} onOpenChange={(open) => {
        setIsToothModalOpen(open);
        if (!open) setIsEditMode(false);
      }}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden bg-white rounded-[24px] border-0 shadow-2xl">
          <div className="flex h-[600px] flex-col lg:flex-row">
            
            {/* Left side: 3D Viewer */}
            <div className="w-full lg:w-1/2 bg-slate-900 relative">
              <div className="absolute top-6 left-6 z-10">
                <div className="text-white/60 text-xs font-bold tracking-widest uppercase mb-1">Tooth Inspection</div>
                <h3 className="text-white text-2xl font-black">
                  FDI {selectedTooth}
                </h3>
                <p className="text-white/80 font-medium text-sm">
                  {selectedTooth ? getToothName(selectedTooth) : ''}
                </p>
              </div>
              
              <div className="absolute bottom-6 left-0 right-0 flex justify-center z-10">
                <span className="px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-white/70 text-xs font-bold border border-white/20">
                  DRAG TO ROTATE IN 360°
                </span>
              </div>

              {selectedTooth && (
                <div className="w-32 h-32 mx-auto my-12 pointer-events-none">
                  <Tooth
                    num={selectedTooth}
                    isSelected={true}
                    draftState={{
                      condition: draftCondition,
                      surfaces: draftSurfaces,
                      restoration: 'None'
                    }}
                    onClick={() => {}}
                  />
                </div>
              )}
            </div>

            {/* Right side: Details & History */}
            <div className="w-full lg:w-1/2 p-8 flex flex-col h-full bg-slate-50 overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-slate-800">Clinical Record</h2>
                {(user?.role === 'dentist' || user?.role === 'admin') && (
                  <Button 
                    variant={isEditMode ? "default" : "outline"} 
                    size="sm"
                    className="rounded-xl font-bold"
                    onClick={() => setIsEditMode(!isEditMode)}
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    {isEditMode ? 'Cancel Edit' : 'Edit Odontogram'}
                  </Button>
                )}
              </div>

              {isEditMode ? (
                <div className="space-y-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex-1">
                  <div>
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Condition</Label>
                    <select 
                      className="w-full p-3 rounded-xl border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800"
                      value={draftCondition}
                      onChange={(e) => setDraftCondition(e.target.value)}
                    >
                      {DENTAL_CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  
                  <div>
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Affected Surfaces</Label>
                    <div className="flex flex-wrap gap-2">
                      {['M', 'O', 'D', 'B', 'L'].map(surface => (
                        <button
                          key={surface}
                          onClick={() => {
                            if (draftSurfaces.includes(surface as any)) {
                              setDraftSurfaces(draftSurfaces.filter(s => s !== surface));
                            } else {
                              setDraftSurfaces([...draftSurfaces, surface as any]);
                            }
                          }}
                          className={`w-10 h-10 rounded-xl font-bold transition-all ${
                            draftSurfaces.includes(surface as any)
                              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {surface}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Restoration</Label>
                    <select 
                      className="w-full p-3 rounded-xl border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800"
                      value={draftRestoration}
                      onChange={(e) => setDraftRestoration(e.target.value)}
                    >
                      {DENTAL_RESTORATIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Procedure</Label>
                    <select 
                      className="w-full p-3 rounded-xl border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800"
                      value={draftProcedure}
                      onChange={(e) => setDraftProcedure(e.target.value)}
                    >
                      {DENTAL_PROCEDURES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Clinical Notes</Label>
                    <textarea 
                      className="w-full p-3 rounded-xl border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800 min-h-[80px]"
                      value={draftNotes}
                      onChange={(e) => setDraftNotes(e.target.value)}
                      placeholder="Add any specific clinical observations..."
                    />
                  </div>
                  
                  <div className="pt-4 mt-auto">
                    <Button onClick={handleSaveToothDetails} className="w-full py-6 rounded-xl text-lg font-bold shadow-xl shadow-blue-600/20">
                      Save Changes
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col">
                  {/* Current Status */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-6">
                    <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                      <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Current Condition</div>
                        <div className="font-bold text-slate-800 text-lg flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: CONDITION_COLORS[draftCondition] || '#ef4444' }}></span>
                          {draftCondition}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Surfaces</div>
                        <div className="font-bold text-slate-800 text-lg">
                          {draftSurfaces.length > 0 ? draftSurfaces.join(', ') : 'None'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Restoration</div>
                        <div className="font-bold text-slate-800">{draftRestoration}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Procedure</div>
                        <div className="font-bold text-slate-800">{draftProcedure}</div>
                      </div>
                    </div>
                  </div>

                  {/* Tooth History */}
                  <div className="flex-1">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-4">
                      <History className="w-4 h-4" />
                      Tooth History Log
                    </h3>
                    
                    <div className="space-y-4">
                      {/* We show the latest edit from the draft data as the current record, or list from DB if we fetched full history */}
                      <div className="relative pl-6 pb-4 border-l-2 border-blue-200 last:border-0 last:pb-0">
                        <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-blue-600 border-4 border-slate-50"></div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-bold text-slate-800">{draftProcedure !== 'None' ? draftProcedure : 'Clinical Exam'}</span>
                            <span className="text-xs font-bold text-slate-400">{new Date().toLocaleDateString()}</span>
                          </div>
                          <p className="text-sm text-slate-600 mb-2">
                            Found: <span className="font-semibold text-slate-800">{draftCondition}</span>
                            {draftSurfaces.length > 0 && ` on surfaces [${draftSurfaces.join(',')}]`}
                          </p>
                          {draftNotes && (
                            <div className="bg-slate-50 p-2.5 rounded-lg text-xs text-slate-600 italic">
                              "{draftNotes}"
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <button 
              onClick={() => setIsToothModalOpen(false)}
              className="absolute top-4 right-4 z-50 p-2 bg-slate-200 hover:bg-slate-300 rounded-full transition-colors lg:hidden"
            >
              <X className="w-5 h-5 text-slate-700" />
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>)}
    </div>
  );
};

export default Reports;

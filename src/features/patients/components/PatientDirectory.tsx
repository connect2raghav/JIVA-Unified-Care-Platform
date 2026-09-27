import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatientStore } from '@/store/usePatientStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RegistrationModal } from './RegistrationModal';
import { BookingModal } from '@/features/appointments/components/BookingModal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Patient } from '@/types';
import * as XLSX from 'xlsx';
import { 
  Users, 
  Search, 
  AlertTriangle, 
  Plus, 
  Download, 
  Play,
  Filter,
  Activity
} from 'lucide-react';

export const PatientDirectory: React.FC = () => {
  const { patientsList, loadAllPatients, selectPatient, setActiveTab } = usePatientStore();
  const { addToast } = useNotificationStore();
  const navigate = useNavigate();

  // Modal triggers
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isBookOpen, setIsBookOpen] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [sortField, setSortField] = useState<'name' | 'id'>('name');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    loadAllPatients();
  }, [loadAllPatients]);

  const handleSelectPatient = async (id: string) => {
    await selectPatient(id);
    const pathSegments = window.location.pathname.split('/');
    const rolePrefix = pathSegments[1] || 'dentist';
    navigate(`/${rolePrefix}/patients/${id}`);
  };

  const handleStartOdontogram = async (patient: Patient) => {
    const pathSegments = window.location.pathname.split('/');
    const rolePrefix = pathSegments[1] || 'dentist';

    await selectPatient(patient.id);
    setActiveTab('odontogram');
    navigate(`/${rolePrefix}/patients/${patient.id}`);
  };

  const handleStartVisit = async (patient: Patient) => {
    const pathSegments = window.location.pathname.split('/');
    const rolePrefix = pathSegments[1] || 'dentist';

    if (rolePrefix === 'dentist' || rolePrefix === 'admin' || rolePrefix === 'other-dentist') {
      navigate(`/${rolePrefix}/visit/${patient.id}`);
      return;
    }

    addToast({
      type: 'info',
      title: 'Open Patient Profile',
      message: `Opening profile for ${patient.name}. Clinical visits are started by dentists.`,
    });
    await selectPatient(patient.id);
    navigate(`/${rolePrefix}/patients/${patient.id}`);
  };

  // Export Patients List using SheetJS
  const handleExportExcel = () => {
    if (patientsList.length === 0) return;
    
    const formatted = patientsList.map(p => ({
      'Patient ID': p.displayId || 'N/A',
      'Full Name': p.name,
      'Email Contact': p.email,
      'Mobile Number': p.phone,
      'Date of Birth': p.dateOfBirth,
      'Gender': p.gender,
      'Attending Doctor': p.assignedDentistName || 'Unassigned',
      'Allergies': p.allergies?.join(', ') || 'None',
      'Medical History': p.medicalHistory?.join(', ') || 'None',
      'Date Registered': p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'N/A'
    }));

    const worksheet = XLSX.utils.json_to_sheet(formatted);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Patients Ledger');
    
    XLSX.writeFile(workbook, `DCIP_Patient_Ledger_${new Date().toISOString().split('T')[0]}.xlsx`);

    addToast({
      type: 'success',
      title: 'Export Successful',
      message: 'Saved patient records to clinical spreadsheet.'
    });
  };

  // Process filters
  const filteredPatients = patientsList.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone.includes(searchQuery) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.displayId && p.displayId.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesGender = genderFilter ? p.gender === genderFilter : true;
    
    return matchesSearch && matchesGender;
  });

  // Process sorting
  const sortedPatients = [...filteredPatients].sort((a, b) => {
    if (sortField === 'name') {
      return a.name.localeCompare(b.name);
    }
    if (sortField === 'doctor') {
      const docA = a.assignedDentistName || 'Unassigned';
      const docB = b.assignedDentistName || 'Unassigned';
      return docA.localeCompare(docB) || a.name.localeCompare(b.name);
    }
    const idA = a.displayId || a.id;
    const idB = b.displayId || b.id;
    return idA.localeCompare(idB);
  });

  // Process pagination
  const totalPages = Math.ceil(sortedPatients.length / itemsPerPage);
  const paginatedPatients = sortedPatients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header and Action Ribbon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-2">
            <Users className="w-6 h-6 text-red-808" />
            <span>Patients Directory</span>
          </h2>
          <p className="text-xs text-slate-400 font-semibold mt-1">
            Browse registered patient profiles, configure diagnostic details, and launch clinical visits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={handleExportExcel}
            className="h-10.5 rounded-xl border border-slate-200 bg-white font-bold text-xs text-slate-700 hover:bg-slate-50 gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </Button>

          <Button
            onClick={() => setIsRegisterOpen(true)}
            className="h-10.5 bg-red-800 hover:bg-red-950 text-white font-bold rounded-xl shadow-md gap-1.5 text-xs px-5"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Patient</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Ribbon */}
      <Card className="border-none shadow-none bg-transparent rounded-none overflow-visible p-0 mb-4">
        <CardContent className="p-0 flex flex-col lg:flex-row gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by full name, ID, or mobile number..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 h-10 rounded-xl border-slate-200 text-xs font-semibold shadow-sm bg-white"
            />
          </div>

          {/* Filters Row (Mobile: side by side) */}
          <div className="flex flex-row items-center gap-2 w-full lg:w-auto shrink-0">
            {/* Gender Filter */}
            <div className="flex items-center gap-2 flex-1 lg:flex-none text-xs font-bold">
              <Filter className="w-3.5 h-3.5 text-slate-400 hidden lg:block" />
              <select
                className="h-10 rounded-xl border border-slate-200 px-3 bg-white font-semibold text-slate-805 w-full lg:w-36 shadow-sm"
                value={genderFilter}
                onChange={(e) => {
                  setGenderFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All Genders</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Sort field select */}
            <div className="flex items-center gap-2 flex-1 lg:flex-none text-xs font-bold">
              <select
                className="h-10 rounded-xl border border-slate-200 px-3 bg-white font-semibold text-slate-805 w-full lg:w-36 shadow-sm"
                value={sortField}
                onChange={(e) => setSortField(e.target.value as any)}
              >
                <option value="name">Sort by Name</option>
                <option value="id">Sort by ID</option>
                <option value="doctor">Sort by Doctor</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Directory Cards Table */}
      {paginatedPatients.length > 0 ? (
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
          <Table>
            <TableHeader className="bg-slate-55/60">
              <TableRow>
                <TableHead className="text-xs font-black text-slate-500 w-[250px]">Patient Name</TableHead>
                <TableHead className="text-xs font-black text-slate-500">Contact</TableHead>
                <TableHead className="text-xs font-black text-slate-500">Gender</TableHead>
                <TableHead className="text-xs font-black text-slate-500">Attending Doctor</TableHead>
                <TableHead className="text-xs font-black text-slate-500">Alerts</TableHead>
                <TableHead className="text-xs font-black text-slate-500 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedPatients.map((patient) => {
                const initials = patient.name.split(' ').map((n) => n[0]).slice(0, 2).join('');
                
                return (
                  <TableRow key={patient.id} className="hover:bg-slate-50/50 group cursor-pointer transition-colors" onClick={() => handleSelectPatient(patient.id)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                          {patient.avatarUrl ? (
                            <img src={patient.avatarUrl} alt={patient.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="font-black text-[10px] text-slate-500 uppercase leading-none">{initials}</span>
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-slate-900 group-hover:text-red-808 transition">{patient.name}</h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{patient.displayId || 'N/A'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-slate-700">
                      {patient.phone}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-slate-700">
                      {patient.gender}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-slate-700">
                      {patient.assignedDentistName || 'Unassigned'}
                    </TableCell>
                    <TableCell>
                      {patient.allergies && patient.allergies.length > 0 ? (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-red-50/50 border border-red-100 rounded-lg text-[10px] font-bold text-red-850 w-fit">
                          <AlertTriangle className="w-3 h-3" />
                          <span className="truncate max-w-[150px]">{patient.allergies.join(', ').toUpperCase()}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-semibold">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          onClick={() => handleSelectPatient(patient.id)}
                          className="h-8 rounded-lg text-[10px] font-bold bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hidden sm:flex"
                        >
                          Profile
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleStartOdontogram(patient)}
                          className="h-8 w-8 p-0 flex items-center justify-center rounded-lg text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 shadow-sm transition-colors"
                          title="View Odontogram"
                        >
                          <Activity className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleStartVisit(patient)}
                          className="h-8 rounded-lg text-[10px] font-bold bg-red-50 hover:bg-red-100 text-red-808 px-3 gap-1 shadow-sm"
                        >
                          <Play className="w-3 h-3" />
                          <span className="hidden sm:inline">Visit</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <Card className="border-none shadow-sm bg-white rounded-2xl p-16 text-center text-xs">
          <Users className="w-10 h-10 text-slate-205 mx-auto mb-3" />
          <p className="font-bold text-slate-800 mb-1">No Clinical Records Found</p>
          <p className="text-slate-400 font-semibold">No registered patient files match the filters.</p>
        </Card>
      )}

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 text-xs font-bold text-slate-500 select-none">
          <span>Page {currentPage} of {totalPages}</span>
          <div className="flex gap-1.5">
            <Button
              variant="ghost"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="h-9 border border-slate-200 rounded-lg px-3"
            >
              Prev
            </Button>
            <Button
              variant="ghost"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="h-9 border border-slate-200 rounded-lg px-3"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Register dialog modal */}
      {isRegisterOpen && (
        <RegistrationModal
          isOpen={isRegisterOpen}
          onClose={() => setIsRegisterOpen(false)}
          onSuccess={() => loadAllPatients()}
        />
      )}

      {/* Booking Dialog Modal */}
      {isBookOpen && (
        <BookingModal
          isOpen={isBookOpen}
          onClose={() => setIsBookOpen(false)}
          onSuccess={() => loadAllPatients()}
        />
      )}

    </div>
  );
};

export default PatientDirectory;

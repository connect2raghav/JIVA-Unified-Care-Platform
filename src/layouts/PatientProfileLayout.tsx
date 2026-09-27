import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { usePatientStore } from '../store/usePatientStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { Button } from '@/components/ui/button';
import { BookingModal } from '../features/appointments/components/BookingModal';

import {
  User,
  Calendar,
  FileText,
  Clock,
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Activity,
  ChevronDown,
  Menu
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

// Tab components
import { OverviewTab } from '../features/patients/components/tabs/OverviewTab';
import { AppointmentsTab } from '../features/patients/components/tabs/AppointmentsTab';
import { VisitsTab } from '../features/patients/components/tabs/VisitsTab';
import { ClinicalNotesTab } from '../features/patients/components/tabs/ClinicalNotesTab';
import { ImagesTab } from '../features/patients/components/tabs/ImagesTab';
import { TimelineTab } from '../features/patients/components/tabs/TimelineTab';
import { DocumentsTab } from '../features/patients/components/tabs/DocumentsTab';

export const PatientProfileLayout: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    selectedPatient,
    activeTab,
    isLoading,
    selectPatient,
    setActiveTab,
    clearSelectedPatient
  } = usePatientStore();

  const { addToast } = useNotificationStore();
  const [isBookOpen, setIsBookOpen] = useState(false);

  const location = useLocation();

  useEffect(() => {
    if (id) {
      selectPatient(id);
    }
  }, [id, selectPatient]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [location.search, setActiveTab]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-700 rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-slate-500">Loading Patient Record...</p>
      </div>
    );
  }

  if (!selectedPatient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-sm max-w-md mx-auto my-12">
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center text-red-600 mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-black text-slate-900 tracking-tight">Patient Not Found</h2>
        <p className="text-slate-500 text-xs font-semibold mt-2 mb-6 max-w-xs leading-relaxed">
          The patient record with ID <span className="font-extrabold text-slate-800">"{id}"</span> could not be retrieved. It may have been deleted or doesn't exist.
        </p>
        <button
          onClick={() => {
            clearSelectedPatient();
            const pathSegments = window.location.pathname.split('/');
            const rolePrefix = pathSegments[1] || 'physician';
            navigate(`/${rolePrefix}/patients`);
          }}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-sm transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Directory</span>
        </button>
      </div>
    );
  }

  // Calculate age
  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const difference = Date.now() - birthDate.getTime();
    const ageDate = new Date(difference);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  const age = calculateAge(selectedPatient.dateOfBirth);

  const primaryTabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'history', label: 'Visit History', icon: Clock },
    { id: 'appointments', label: 'Appointments', icon: Calendar },
    { id: 'documents', label: 'Documents', icon: FileText },
  ];

  const secondaryTabs: { id: string; label: string; icon: React.ElementType }[] = [];

  const allTabs = [...primaryTabs, ...secondaryTabs];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab />;
      case 'appointments':
        return <AppointmentsTab />;
      case 'history':
        return (
          <div className="space-y-6">
            <TimelineTab />
            <VisitsTab />
          </div>
        );
      case 'documents':
        return (
          <div className="space-y-6">
            <DocumentsTab />
            <ImagesTab />
            <ClinicalNotesTab />
          </div>
        );
      default:
        return <OverviewTab />;
    }
  };

  const handleBackToDirectory = () => {
    clearSelectedPatient();
    const pathSegments = window.location.pathname.split('/');
    const rolePrefix = pathSegments[1];
    navigate(`/${rolePrefix}/patients`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Back Button and Patient Profile Header */}
      <div className="flex flex-col gap-4 pt-4 pb-2 -mx-4 px-4 md:-mx-8 md:px-8">
        <button
          onClick={handleBackToDirectory}
          className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-slate-800 w-fit gap-1 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Patients</span>
        </button>

        {/* Patient Info Panel */}
        <Card className="border shadow-sm bg-white overflow-hidden rounded-2xl border-slate-200">
          <CardContent className="p-5 md:p-6">
            <div className="flex flex-col xl:flex-row justify-between gap-6">

              {/* Left side: Avatar and Info */}
              <div className="flex items-start md:items-center gap-5">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 shrink-0 shadow-sm">
                  {selectedPatient.avatarUrl ? (
                    <img
                      src={selectedPatient.avatarUrl}
                      alt={selectedPatient.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <User className="w-8 h-8" />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                      {selectedPatient.name}
                    </h2>
                    <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {selectedPatient.displayId || selectedPatient.id}
                    </span>

                    {/* Clinical badges */}
                    {selectedPatient.allergies && selectedPatient.allergies.length > 0 && (
                      <span className="px-2.5 py-1 rounded-md bg-red-50 border border-red-200 text-red-700 text-[10px] font-black uppercase tracking-wide flex items-center gap-1 shadow-sm">
                        <AlertTriangle className="w-3 h-3" /> Allergy
                      </span>
                    )}
                    {selectedPatient.medicalHistory && selectedPatient.medicalHistory.length > 0 && (
                      <span className="px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-black uppercase tracking-wide flex items-center gap-1 shadow-sm">
                        <AlertTriangle className="w-3 h-3" /> Med Alert
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 md:gap-4 text-xs md:text-sm font-semibold text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                      {age} Yrs
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                      {selectedPatient.gender}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                      {selectedPatient.phone}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                      Blood: <span className="font-extrabold text-slate-800">{selectedPatient.bloodType || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right side: Stats and Actions */}
              <div className="flex flex-col sm:flex-row xl:flex-col items-start sm:items-center xl:items-end justify-between gap-4 xl:gap-0">
                <div className="flex items-center gap-5 bg-slate-50 px-5 py-2.5 rounded-xl border border-slate-100 w-full sm:w-auto justify-between sm:justify-start xl:mb-3">
                  <div className="flex flex-col">
                    <span className="text-slate-400 text-[10px] font-black uppercase tracking-wider mb-0.5">Last Visit</span>
                    <span className="font-extrabold text-slate-800 text-sm">{new Date().toLocaleDateString()}</span>
                  </div>
                  <div className="w-px h-8 bg-slate-200"></div>
                  <div className="flex flex-col">
                    <span className="text-slate-400 text-[10px] font-black uppercase tracking-wider mb-0.5">Next Appt</span>
                    <span className="font-extrabold text-slate-800 text-sm">In 7 Days</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Button
                    size="sm"
                    onClick={() => setIsBookOpen(true)}
                    className="flex-1 sm:flex-none h-10 px-5 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 gap-2 shadow-sm transition-all"
                  >
                    <CalendarDays className="w-4 h-4 text-slate-500" />
                    <span>Book Appt</span>
                  </Button>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile Tabs Dropdown */}
      <div className="md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full h-12 flex justify-between items-center rounded-xl font-bold bg-white shadow-sm border-slate-200">
              <div className="flex items-center gap-2 text-slate-800">
                <Menu className="w-4 h-4 text-slate-500" />
                {allTabs.find(t => t.id === activeTab)?.label || 'Overview'}
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl border-slate-200 shadow-lg">
            {allTabs.map(tab => {
              const Icon = tab.icon;
              return (
                <DropdownMenuItem
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 p-3 font-semibold ${activeTab === tab.id ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600'}`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Desktop Tabs */}
      <div className="hidden md:flex flex-col space-y-4">
        <div className="w-full bg-white rounded-2xl p-1.5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex gap-1 flex-wrap">
            {primaryTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all duration-200 shrink-0 ${isActive
                      ? 'bg-emerald-700 text-white shadow-sm shadow-emerald-900/10'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected tab view contents */}
      <div className="min-h-[40vh] transition-all">
        {renderTabContent()}
      </div>

      {isBookOpen && (
        <BookingModal
          isOpen={isBookOpen}
          onClose={() => setIsBookOpen(false)}
        />
      )}
    </div>
  );
};

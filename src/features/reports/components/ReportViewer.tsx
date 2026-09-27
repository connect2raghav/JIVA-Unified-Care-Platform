import React, { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { reportsService } from '@/services/reportsService';
import { jsPDF } from 'jspdf';
import {
  Printer, Download, MessageCircle, Loader2, ArrowLeft,
  Phone, Mail, MapPin, Calendar, Stethoscope, Pill,
  FileText, Image as ImageIcon, AlertTriangle, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
// Stub for removed module
const getToothName = (num: number) => `Region ${num}`;

const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

const CONDITION_BG: Record<string, string> = {
  'Dental Caries': '#f8fafc',
  'Root Canal Treated': '#f1f5f9',
  'Fractured Tooth': '#e2e8f0',
  'Missing Tooth': '#f8fafc',
  'Implant': '#f1f5f9',
  'Crown': '#e2e8f0',
  'Bridge': '#f8fafc',
  'Healthy': '#ffffff',
};

const CONDITION_BORDER: Record<string, string> = {
  'Dental Caries': '#cbd5e1',
  'Root Canal Treated': '#94a3b8',
  'Fractured Tooth': '#64748b',
  'Missing Tooth': '#cbd5e1',
  'Implant': '#94a3b8',
  'Crown': '#64748b',
  'Bridge': '#cbd5e1',
  'Healthy': '#e2e8f0',
};

const getAge = (dob: string) => {
  if (!dob) return '—';
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

const formatDate = (d: string) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatTime = (d: string) => {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

export interface ReportViewerProps {
  patientId?: string;
  visitId?: string | null;
  onClose?: () => void;
}

export const ReportViewer: React.FC<ReportViewerProps> = ({ patientId: propPatientId, visitId: propVisitId, onClose }) => {
  const { patientId: urlPatientId } = useParams<{ patientId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const patientId = propPatientId || urlPatientId;
  const visitId = propVisitId || searchParams.get('visitId');
  const printParam = searchParams.get('print');
  const redirectParam = searchParams.get('redirect');

  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading && data && printParam === 'true') {
      const t = setTimeout(() => {
        handlePrint();
      }, 500);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, !!data, printParam]);

  useEffect(() => {
    if (!patientId) return;
    (async () => {
      setIsLoading(true);
      try {
        const result = await reportsService.getPatientReportData(patientId);
        setData(result);
      } catch (e: any) {
        console.error('Failed to load report data:', e);
        setError('Failed to load report data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [patientId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-red-800" />
          <p className="text-sm font-bold text-slate-600">Generating clinical report...</p>
        </div>
      </div>
    );
  }

  if (error || !data || !data.patient) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 shadow-lg max-w-md text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-lg font-black text-slate-900 mb-2">Report Unavailable</h2>
          <p className="text-sm text-slate-500">{error || 'Patient data could not be loaded.'}</p>
          <Button onClick={() => window.close()} className="mt-6 bg-slate-900 text-white rounded-xl">Close</Button>
        </div>
      </div>
    );
  }

  const { patient, clinic, visits, toothRecords, toothRecordsByVisit, currentToothState, images, followUps, treatmentPlans } = data;

  // Filter visits if visitId is specified
  const displayVisits = visitId ? visits.filter((v: any) => v.id === visitId) : visits;

  const clinicName = clinic.name || 'Dental Clinic';
  const patientName = patient.name || 'Patient';
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const safeName = patientName.replace(/[^a-zA-Z0-9]/g, '');
  const safeClinic = clinicName.replace(/[^a-zA-Z0-9]/g, '');
  const fileName = `${safeClinic}_${safeName}_${dateStr.replace(/ /g, '')}_{${timeStr.replace(/[: ]/g, '')}}`;

  const generatePDFDoc = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    let y = 15;

    const addPageIfNeeded = (neededSpace: number) => {
      if (y + neededSpace > 280) {
        doc.addPage();
        y = 15;
      }
    };

    // Letterhead
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(153, 27, 27);
    doc.text(clinicName, margin, y);
    y += 6;
    doc.setFontSize(8);
    doc.setTextColor(100);
    if (clinic.address) { doc.text(clinic.address, margin, y); y += 4; }
    if (clinic.phone) { doc.text(`Phone: ${clinic.phone}`, margin, y); y += 4; }
    if (clinic.email) { doc.text(`Email: ${clinic.email}`, margin, y); y += 4; }

    // Separator
    y += 2;
    doc.setDrawColor(220, 38, 38);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    // Title
    doc.setFontSize(14);
    doc.setTextColor(30);
    doc.text('Patient Clinical Report', margin, y);
    y += 5;
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Generated: ${dateStr} at ${timeStr}`, margin, y);
    y += 8;

    // Patient Info
    doc.setFontSize(10);
    doc.setTextColor(30);
    doc.setFont('helvetica', 'bold');
    doc.text('Patient Information', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const pInfo = [
      `Name: ${patientName}`,
      `Age: ${getAge(patient.dateOfBirth)} years  |  Gender: ${patient.gender}`,
      `Phone: ${patient.phone}  |  Email: ${patient.email || '—'}`,
      `Blood Type: ${patient.bloodType || '—'}`,
      `Allergies: ${patient.allergies?.join(', ') || 'None known'}`,
    ];
    pInfo.forEach(line => { doc.text(line, margin, y); y += 4.5; });
    y += 4;

    // Main Odontogram
    addPageIfNeeded(35);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30);
    doc.text('Current Odontogram Status', margin, y);
    y += 6;

    const drawToothRow = (teeth: number[]) => {
      const cellW = (pageWidth - 2 * margin) / teeth.length;
      teeth.forEach((num, i) => {
        const x = margin + i * cellW;
        const rec = currentToothState[num];
        const cond = rec?.condition || 'Healthy';
        
        if (cond !== 'Healthy') {
          doc.setFillColor(248, 250, 252);
          doc.rect(x, y, cellW - 1, 8, 'F');
        }
        doc.setDrawColor(200);
        doc.rect(x, y, cellW - 1, 8);
        doc.setFontSize(6);
        doc.setTextColor(cond !== 'Healthy' ? 180 : 100, cond !== 'Healthy' ? 30 : 100, cond !== 'Healthy' ? 30 : 100);
        doc.text(String(num), x + cellW / 2 - 2, y + 5);
      });
      y += 10;
    };

    doc.setFontSize(7);
    doc.setTextColor(120);
    doc.text('Upper Arch', margin, y); y += 3;
    drawToothRow(UPPER_TEETH);
    doc.text('Lower Arch', margin, y); y += 3;
    drawToothRow(LOWER_TEETH);
    y += 6;

    // Visit Sections
    displayVisits.forEach((visit: any, idx: number) => {
      addPageIfNeeded(60);
      if (idx > 0) {
        doc.addPage();
        y = 15;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(153, 27, 27);
      doc.text(`Visit ${idx + 1}: ${formatDate(visit.dateTime)}`, margin, y);
      y += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(80);
      doc.text(`Type: ${visit.visitType || 'General'}  |  Doctor: ${visit.doctorName}  |  Status: ${visit.status}`, margin, y);
      y += 6;

      // Complaint & Diagnosis
      if (visit.chiefComplaint) { doc.setFont('helvetica', 'bold'); doc.text('Chief Complaint:', margin, y); doc.setFont('helvetica', 'normal'); doc.text(visit.chiefComplaint, margin + 30, y); y += 5; }
      if (visit.diagnosis) { doc.setFont('helvetica', 'bold'); doc.text('Diagnosis:', margin, y); doc.setFont('helvetica', 'normal'); doc.text(visit.diagnosis, margin + 22, y); y += 5; }
      if (visit.treatment) { doc.setFont('helvetica', 'bold'); doc.text('Treatment:', margin, y); doc.setFont('helvetica', 'normal'); doc.text(visit.treatment, margin + 22, y); y += 5; }
      if (visit.notes) { doc.setFont('helvetica', 'bold'); doc.text('Notes:', margin, y); doc.setFont('helvetica', 'normal'); const noteLines = doc.splitTextToSize(visit.notes, pageWidth - 2 * margin - 15); noteLines.forEach((l: string) => { doc.text(l, margin + 15, y); y += 4; }); y += 2; }

      // Prescriptions
      const rxList = Array.isArray(visit.prescriptions) ? visit.prescriptions : [];
      if (rxList.length > 0) {
        addPageIfNeeded(20 + rxList.length * 6);
        y += 3;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(30);
        doc.text('Prescriptions', margin, y); y += 5;

        // Table header
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, pageWidth - 2 * margin, 6, 'F');
        doc.setFontSize(7);
        doc.setTextColor(80);
        doc.text('Drug', margin + 2, y + 4);
        doc.text('Dosage', margin + 60, y + 4);
        doc.text('Instructions', margin + 110, y + 4);
        y += 7;

        doc.setTextColor(50);
        rxList.forEach((rx: any) => {
          addPageIfNeeded(6);
          doc.text(rx.drug || '—', margin + 2, y + 3);
          doc.text(rx.dose || '—', margin + 60, y + 3);
          doc.text(rx.instructions || '—', margin + 110, y + 3);
          doc.setDrawColor(230);
          doc.line(margin, y + 5, pageWidth - margin, y + 5);
          y += 6;
        });
        y += 3;
      }

      // Per-Visit Tooth Records
      const visitToothRecords = toothRecordsByVisit[visit.id] || [];
      if (visitToothRecords.length > 0) {
        addPageIfNeeded(15 + visitToothRecords.length * 6);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(30);
        doc.text('Odontogram Changes This Visit', margin, y); y += 5;

        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, pageWidth - 2 * margin, 6, 'F');
        doc.setFontSize(7);
        doc.setTextColor(80);
        doc.text('Tooth', margin + 2, y + 4);
        doc.text('Condition', margin + 30, y + 4);
        doc.text('Surface', margin + 70, y + 4);
        doc.text('Restoration', margin + 100, y + 4);
        doc.text('Procedure', margin + 135, y + 4);
        y += 7;

        doc.setTextColor(50);
        visitToothRecords.forEach((tr: any) => {
          addPageIfNeeded(6);
          doc.text(`#${tr.toothNumber}`, margin + 2, y + 3);
          doc.text(tr.condition, margin + 30, y + 3);
          doc.text(tr.surface || '—', margin + 70, y + 3);
          doc.text(tr.restoration || '—', margin + 100, y + 3);
          doc.text(tr.procedure || '—', margin + 135, y + 3);
          doc.setDrawColor(230);
          doc.line(margin, y + 5, pageWidth - margin, y + 5);
          y += 6;
        });
        y += 3;
      }

      // Follow-up
      if (visit.followup && visit.followup.dueDate) {
        addPageIfNeeded(10);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(30);
        doc.text('Follow-up:', margin, y);
        doc.setFont('helvetica', 'normal');
        doc.text(`${formatDate(visit.followup.dueDate)} — ${visit.followup.reason || 'Review'}`, margin + 22, y);
        y += 6;
      }

      // Clinical Images
      const visitImages = images.filter((img: any) => img.visitId === visit.id);
      if (visitImages.length > 0) {
        addPageIfNeeded(40);
        y += 4;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(30);
        doc.text('Attached Clinical Images', margin, y);
        y += 6;

        let imgX = margin;
        const imgWidth = 50;
        const imgHeight = 35;
        const gap = 5;

        visitImages.forEach((img: any) => {
          if (imgX + imgWidth > pageWidth - margin) {
            imgX = margin;
            y += imgHeight + 8; 
            addPageIfNeeded(imgHeight + 15);
          }

          try {
            if (img.imageUrl && img.imageUrl.startsWith('data:image')) {
              // jsPDF auto-detects image format from data URI
              doc.addImage(img.imageUrl, imgX, y, imgWidth, imgHeight);
            }
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6);
            doc.setTextColor(100);
            const safeTitle = img.title ? img.title.substring(0, 35) : 'Image';
            doc.text(safeTitle, imgX, y + imgHeight + 3);
          } catch (e) {
            console.error("Error adding image to PDF", e);
          }
          imgX += imgWidth + gap;
        });
        // Reset y to the bottom of the last image row
        y += imgHeight + 10;
      }
    });

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text('This is a computer-generated clinical report. Please verify with the attending doctor.', margin, 290);
    
    return doc;
  };

  const handlePrint = () => {
    const doc = generatePDFDoc();
    doc.autoPrint();
    const blobUrl = doc.output('bloburl');
    window.open(blobUrl, '_blank');

    if (redirectParam === 'appointments') {
      setTimeout(() => {
        const pathSegments = window.location.pathname.split('/');
        const rolePrefix = pathSegments[1] || 'doctor';
        navigate(`/${rolePrefix}/appointments`);
      }, 1000);
    }
  };

  const handleDownloadPDF = () => {
    const doc = generatePDFDoc();
    doc.save(`${fileName}.pdf`);
  };

  const handleShareWhatsApp = () => {
    const phone = patient.phone ? patient.phone.replace(/[^0-9+]/g, '') : '';
    const message = encodeURIComponent(
      `Hello ${patientName},\n\nYour clinical report from ${clinicName} is ready for review.\n\nPlease find the attached document for details of your recent visit and diagnosis.\n\nThank you,\n${clinicName}`
    );
    const waUrl = phone
      ? `https://wa.me/${phone.startsWith('+') ? phone.slice(1) : (phone.startsWith('91') ? phone : '91' + phone)}?text=${message}`
      : `https://wa.me/?text=${message}`;
    window.open(waUrl, '_blank');
  };

  // Render the HTML report
  return (
    <div className="min-h-screen bg-slate-100">
      {/* Action Bar — Not Printed */}
      <div className="no-print sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-sm">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 shrink min-w-0">
            <button onClick={() => window.close()} className="p-2 rounded-xl hover:bg-slate-100 transition-colors shrink-0">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div className="truncate">
              <h1 className="text-sm font-black text-slate-900 truncate">{patientName} — Clinical Report</h1>
              <p className="text-[10px] font-semibold text-slate-400 truncate">{clinicName} • {dateStr}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={handlePrint}
              variant="outline"
              className="h-9 w-9 sm:w-auto px-0 sm:px-4 rounded-xl text-xs font-bold sm:gap-2 border-slate-200 hover:bg-slate-50 justify-center"
            >
              <Printer className="w-4 h-4" /> <span className="hidden sm:inline">Print</span>
            </Button>
            <Button
              onClick={handleDownloadPDF}
              className="h-9 w-9 sm:w-auto px-0 sm:px-4 rounded-xl text-xs font-bold sm:gap-2 bg-red-800 text-white hover:bg-red-900 shadow-sm justify-center"
            >
              <Download className="w-4 h-4" /> <span className="hidden sm:inline">Download PDF</span>
            </Button>
            <Button
              onClick={handleShareWhatsApp}
              className="h-9 w-9 sm:w-auto px-0 sm:px-4 rounded-xl text-xs font-bold sm:gap-2 bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm justify-center"
            >
              <MessageCircle className="w-4 h-4" /> <span className="hidden sm:inline">WhatsApp</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div ref={reportRef} className="report-content max-w-[900px] mx-auto my-8 bg-white shadow-2xl rounded-2xl overflow-hidden print:overflow-visible print:shadow-none print:rounded-none print:my-0">

        {/* ===== LETTERHEAD ===== */}
        <div className="px-10 pt-10 pb-6">
          <div className="flex items-start justify-between">
            <div>
              {clinic.logoUrl && (
                <img src={clinic.logoUrl} alt="Clinic Logo" className="h-14 mb-3 object-contain" />
              )}
              <h1 className="text-2xl font-black tracking-tight" style={{ color: '#991b1b' }}>
                {clinicName}
              </h1>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-[11px] font-semibold text-slate-500">
                {clinic.address && (
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {clinic.address}</span>
                )}
                {clinic.phone && (
                  <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {clinic.phone}</span>
                )}
                {clinic.email && (
                  <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {clinic.email}</span>
                )}
              </div>
            </div>
            <div className="text-right text-[10px] font-semibold text-slate-400">
              <p>Report Generated</p>
              <p className="text-slate-600 font-bold">{dateStr}</p>
              <p className="text-slate-600">{timeStr}</p>
            </div>
          </div>
          <div className="mt-4 h-[3px] rounded-full" style={{ background: 'linear-gradient(90deg, #991b1b 0%, #dc2626 40%, #f87171 100%)' }} />
        </div>

        {/* ===== REPORT TITLE ===== */}
        <div className="px-10 pb-4">
          <h2 className="text-lg font-black text-slate-900 tracking-tight">
            {visitId ? 'Visit Clinical Report' : 'Complete Patient Clinical Report'}
          </h2>
          <p className="text-xs font-semibold text-slate-400 mt-0.5">
            Comprehensive dental record for clinical review
          </p>
        </div>

        {/* ===== PATIENT INFORMATION ===== */}
        <div className="mx-10 mb-6 rounded-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-5 py-2.5 border-b border-slate-200">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Patient Information</h3>
          </div>
          <div className="p-5 grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-8">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Full Name</p>
              <p className="text-sm font-black text-slate-900">{patientName}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Age / Gender</p>
              <p className="text-sm font-bold text-slate-700">{getAge(patient.dateOfBirth)} years • {patient.gender}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Date of Birth</p>
              <p className="text-sm font-bold text-slate-700">{formatDate(patient.dateOfBirth)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Phone</p>
              <p className="text-sm font-bold text-slate-700">{patient.phone || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Email</p>
              <p className="text-sm font-bold text-slate-700">{patient.email || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Blood Type</p>
              <p className="text-sm font-bold text-slate-700">{patient.bloodType || '—'}</p>
            </div>
            {patient.allergies?.length > 0 && (
              <div className="col-span-2 md:col-span-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Allergies</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {patient.allergies.map((a: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200">{a}</span>
                  ))}
                </div>
              </div>
            )}
            {patient.medicalHistory?.length > 0 && (
              <div className="col-span-2 md:col-span-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Medical History</p>
                <p className="text-xs font-semibold text-slate-600 mt-0.5">{patient.medicalHistory.join(', ')}</p>
              </div>
            )}
            {patient.address && (
              <div className="col-span-2 md:col-span-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Address</p>
                <p className="text-xs font-semibold text-slate-600 mt-0.5">{patient.address}</p>
              </div>
            )}
          </div>
        </div>


        {/* ===== VISIT-BY-VISIT SECTIONS ===== */}
        {displayVisits.length === 0 ? (
          <div className="mx-10 mb-8 rounded-xl border border-dashed border-slate-300 p-8 text-center">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-400">No visits recorded for this patient.</p>
          </div>
        ) : (
          displayVisits.map((visit: any, idx: number) => {
            const visitToothRecords = toothRecordsByVisit[visit.id] || [];
            const visitImages = images.filter((img: any) => img.visitId === visit.id);
            const rxList: any[] = Array.isArray(visit.prescriptions) ? visit.prescriptions : [];

            return (
              <div key={visit.id} className="visit-page-break mx-10 mb-8 rounded-xl border border-slate-200 overflow-hidden print:overflow-visible print:break-before-page print:break-inside-avoid">
                {/* Visit Header */}
                <div className="bg-gradient-to-r from-red-50 to-white px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                      <span className="text-xs font-black text-red-800">{idx + 1}</span>
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900">
                        Visit — {formatDate(visit.dateTime)}
                      </h3>
                      <p className="text-[10px] font-semibold text-slate-500">
                        {visit.visitType || 'General'} • Dr. {visit.doctorName} • {formatTime(visit.dateTime)}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    visit.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    visit.status === 'In Progress' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                    'bg-slate-50 text-slate-600 border border-slate-200'
                  }`}>
                    {visit.status}
                  </span>
                </div>

                <div className="p-5 space-y-5">
                  {/* Chief Complaint & Diagnosis */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {visit.chiefComplaint && (
                      <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-wider mb-1">Chief Complaint</p>
                        <p className="text-xs font-bold text-slate-800">{visit.chiefComplaint}</p>
                      </div>
                    )}
                    {visit.diagnosis && (
                      <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-wider mb-1">Diagnosis</p>
                        <p className="text-xs font-bold text-slate-800">{visit.diagnosis}</p>
                      </div>
                    )}
                  </div>

                  {/* Treatment & Notes */}
                  {(visit.treatment || visit.notes) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {visit.treatment && (
                        <div className="rounded-lg bg-emerald-50/50 border border-emerald-100 p-3">
                          <p className="text-[9px] font-black text-emerald-600 uppercase tracking-wider mb-1">Treatment</p>
                          <p className="text-xs font-bold text-slate-800">{visit.treatment}</p>
                        </div>
                      )}
                      {visit.notes && (
                        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Clinical Notes</p>
                          <p className="text-xs font-semibold text-slate-600">{visit.notes}</p>
                        </div>
                      )}
                    </div>
                  )}


                  {/* Prescriptions */}
                  {rxList.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Pill className="w-3 h-3 text-slate-500" />
                        Prescriptions
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-[9px] font-black text-slate-700 uppercase tracking-wider">
                              <th className="py-2 px-3 border-b border-slate-100 rounded-tl-lg">#</th>
                              <th className="py-2 px-3 border-b border-slate-100">Drug Name</th>
                              <th className="py-2 px-3 border-b border-slate-100">Dosage</th>
                              <th className="py-2 px-3 border-b border-slate-100 rounded-tr-lg">Instructions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rxList.map((rx: any, idx: number) => (
                              <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                                <td className="py-2.5 px-3 text-xs font-semibold text-slate-400">{idx + 1}</td>
                                <td className="py-2.5 px-3 text-xs font-bold text-slate-800">{rx.drug || '—'}</td>
                                <td className="py-2.5 px-3 text-xs font-semibold text-slate-600">{rx.dose || '—'}</td>
                                <td className="py-2.5 px-3 text-xs font-semibold text-slate-600">{rx.instructions || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Attached Documents / Images */}
                  {visitImages.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <ImageIcon className="w-3 h-3 text-purple-500" />
                        Attached Documents & Images
                      </h4>
                      <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                        {visitImages.map((img: any) => (
                          <div key={img.id} className="rounded-lg border border-slate-200 overflow-hidden">
                            {img.imageUrl ? (
                              <img src={img.imageUrl} alt={img.title} className="w-full h-24 object-cover" />
                            ) : (
                              <div className="w-full h-24 bg-slate-100 flex items-center justify-center">
                                <FileText className="w-6 h-6 text-slate-400" />
                              </div>
                            )}
                            <div className="p-2">
                              <p className="text-[9px] font-bold text-slate-600 truncate">{img.title}</p>
                              <p className="text-[8px] font-semibold text-slate-400">{img.category}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Follow-up */}
                  {visit.followup && visit.followup.dueDate && (
                    <div className="rounded-lg bg-purple-50/50 border border-purple-100 p-3 flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-purple-600 shrink-0" />
                      <div>
                        <p className="text-[9px] font-black text-purple-600 uppercase tracking-wider">Follow-up Scheduled</p>
                        <p className="text-xs font-bold text-slate-800">
                          {formatDate(visit.followup.dueDate)} — {visit.followup.reason || 'Review'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* ===== TREATMENT PLANS SUMMARY ===== */}
        {!visitId && treatmentPlans.length > 0 && (
          <div className="mx-10 mb-8 rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-5 py-2.5 border-b border-slate-200">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Treatment Plans</h3>
            </div>
            <div className="p-5 space-y-3">
              {treatmentPlans.map((tp: any) => (
                <div key={tp.id} className="rounded-lg border border-slate-100 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-black text-slate-800">{tp.name}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      tp.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' :
                      tp.status === 'Active' ? 'bg-blue-50 text-blue-700' :
                      'bg-slate-50 text-slate-600'
                    }`}>
                      {tp.status}
                    </span>
                  </div>
                  {tp.items.length > 0 && (
                    <div className="space-y-1">
                      {tp.items.map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between text-[11px] font-semibold text-slate-600 py-1 border-t border-slate-50">
                          <span className="flex items-center gap-2">
                            <ChevronRight className="w-3 h-3 text-slate-400" />
                            {item.description} <span className="text-slate-400">({item.code})</span>
                          </span>
                          <span className={`text-[10px] font-bold ${
                            item.status === 'Completed' ? 'text-emerald-600' :
                            item.status === 'In-Progress' ? 'text-amber-600' :
                            'text-slate-400'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== FOLLOW-UPS SUMMARY ===== */}
        {!visitId && followUps.length > 0 && (
          <div className="mx-10 mb-8 rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-5 py-2.5 border-b border-slate-200">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Follow-up Schedule</h3>
            </div>
            <div className="p-5">
              <div className="space-y-2">
                {followUps.map((fu: any) => (
                  <div key={fu.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{formatDate(fu.dueDate)}</p>
                      <p className="text-[11px] font-semibold text-slate-500">{fu.reason} • Dr. {fu.doctorName}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      fu.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' :
                      fu.status === 'Pending' ? 'bg-amber-50 text-amber-700' :
                      'bg-red-50 text-red-700'
                    }`}>
                      {fu.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== FOOTER ===== */}
        <div className="px-10 py-6 border-t border-slate-200 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-semibold text-slate-400">
                This is a computer-generated clinical report from {clinicName}.
              </p>
              <p className="text-[9px] font-semibold text-slate-400">
                Please verify all clinical details with the attending doctor before making treatment decisions.
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-bold text-slate-500">File: {fileName}.pdf</p>
              <p className="text-[9px] font-semibold text-slate-400">{clinicName}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .report-content { box-shadow: none !important; border-radius: 0 !important; margin: 0 !important; max-width: 100% !important; }
          .visit-page-break { page-break-inside: avoid; page-break-before: auto; }
          .visit-page-break:not(:first-of-type) { page-break-before: always; }
        }
      `}</style>
    </div>
  );
};

export default ReportViewer;

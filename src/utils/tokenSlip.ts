/**
 * JIVA — Unified Care Platform
 * Token & Triage Slip PDF Generator
 *
 * Generates a printable PDF token/triage slip for patient appointments.
 * Uses jsPDF (already in package.json).
 */
import { jsPDF } from 'jspdf';
import type { Appointment, Patient } from '@/types/domain';

interface TokenSlipData {
  tokenNumber: number;
  patientName: string;
  patientId?: string;
  patientPhone?: string;
  dateTime: string;
  physicianName: string;
  reason: string;
  triagePriority: 'Normal' | 'Urgent' | 'Critical';
  clinicName?: string;
  notes?: string;
}

const PRIORITY_COLORS: Record<string, [number, number, number]> = {
  'Normal': [5, 150, 105],     // emerald-600
  'Urgent': [245, 158, 11],    // amber-500
  'Critical': [239, 68, 68],   // red-500
};

export function generateTokenSlip(data: TokenSlipData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [100, 160], // Compact slip format
  });

  const w = 100;
  const priorityColor = PRIORITY_COLORS[data.triagePriority] || PRIORITY_COLORS['Normal'];

  // Header bar
  doc.setFillColor(...priorityColor);
  doc.rect(0, 0, w, 18, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('JIVA', 6, 8);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Unified Care Platform', 6, 13);

  // Priority badge
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(data.triagePriority.toUpperCase(), w - 6, 11, { align: 'right' });

  // Token number (large)
  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFontSize(36);
  doc.setFont('helvetica', 'bold');
  doc.text(`#${data.tokenNumber}`, w / 2, 38, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('TOKEN NUMBER', w / 2, 44, { align: 'center' });

  // Divider
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.3);
  doc.line(10, 48, w - 10, 48);

  // Patient info section
  let y = 56;
  const labelX = 10;
  const valueX = 40;

  const addRow = (label: string, value: string) => {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(label, labelX, y);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8);
    doc.text(value, valueX, y);
    y += 8;
  };

  addRow('Patient:', data.patientName);
  if (data.patientId) addRow('ID:', data.patientId);
  if (data.patientPhone) addRow('Phone:', data.patientPhone);
  addRow('Physician:', data.physicianName);
  addRow('Reason:', data.reason.substring(0, 35));

  // Date/Time
  const dateObj = new Date(data.dateTime);
  const dateStr = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  addRow('Date:', dateStr);
  addRow('Time:', timeStr);

  if (data.notes) {
    y += 2;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 116, 139);
    doc.text(`Note: ${data.notes.substring(0, 50)}`, labelX, y);
    y += 6;
  }

  // Divider
  doc.line(10, y, w - 10, y);
  y += 6;

  // Triage section
  doc.setFillColor(...priorityColor);
  doc.roundedRect(10, y, w - 20, 14, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`TRIAGE: ${data.triagePriority.toUpperCase()}`, w / 2, y + 6, { align: 'center' });
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text('Present this slip at the consultation desk', w / 2, y + 11, { align: 'center' });

  y += 20;

  // Footer
  doc.setTextColor(148, 163, 184); // slate-400
  doc.setFontSize(5);
  doc.setFont('helvetica', 'normal');
  doc.text(data.clinicName || 'JIVA Clinic', w / 2, y, { align: 'center' });
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, w / 2, y + 4, { align: 'center' });

  // Open PDF in new tab
  doc.output('dataurlnewwindow');
}

/**
 * Generate a token slip from an appointment + patient
 */
export function printAppointmentToken(
  appointment: Appointment,
  patient?: Partial<Patient>,
  clinicName?: string
): void {
  generateTokenSlip({
    tokenNumber: appointment.tokenNumber || Math.floor(Math.random() * 900) + 100,
    patientName: appointment.patientName || patient?.name || 'N/A',
    patientId: patient?.displayId || patient?.id?.substring(0, 8),
    patientPhone: patient?.phone,
    dateTime: appointment.dateTime,
    physicianName: appointment.physicianName,
    reason: appointment.reason || 'Consultation',
    triagePriority: appointment.triagePriority || 'Normal',
    clinicName,
    notes: appointment.notes,
  });
}

/**
 * JIVA — Unified Care Platform
 * Type re-exports.
 *
 * New code should import from '@/types/domain'.
 * Legacy re-exports kept here for backward compatibility during migration.
 */
export type { UserRole, UserProfile, Patient, Appointment, AppointmentStatus, Clinic, Ambulance, AmbulanceStatus, EmergencyRequest, EmergencyPriority, EmergencyStatus, BloodInventoryItem, BloodRequest, BloodGroup, BloodComponent, Facility, DashboardKPI, ClinicNotification, ActivityLog, LabReport } from './domain';
export { ROLE_LABELS } from './domain';

// ─── Legacy types kept for remaining non-dental components ───────
export interface Vitals {
  bloodPressure?: string;
  pulse?: number;
  temperature?: number;
}

export interface TimelineEvent {
  id: string;
  patientId: string;
  dateTime: string;
  type: 'Appointment' | 'Visit' | 'Note' | 'FollowUp';
  title: string;
  description: string;
  referenceId: string;
}

export interface FollowUp {
  id: string;
  patientId: string;
  physicianId: string;
  physicianName: string;
  dueDate: string;
  reason: string;
  status: 'Pending' | 'Completed' | 'Overdue';
  specialtyType?: string;
  notes?: string;
}

export interface ClinicSettings {
  clinicCode?: string;
  id: string;
  name: string;
  logoUrl?: string;
  address: string;
  phone: string;
  email: string;
  workingDays: string[];
  openingTime: string;
  closingTime: string;
  appointmentDuration: number;
  holidays: string[];
  emergencyContact: string;
}

export type ImageCategory =
  | 'Clinical Photos'
  | 'Medical Documents'
  | 'Referral Letters'
  | 'Consent Forms'
  | 'Lab Reports'
  | 'Scan Results'
  | 'CT Scan'
  | 'MRI'
  | 'X-Ray'
  | 'Ultrasound';

export interface ImageRecord {
  id: string;
  patientId: string;
  title: string;
  category: ImageCategory;
  imageUrl: string;
  dateTime: string;
  notes?: string;
  physicianId?: string;
  physicianName?: string;
  annotations?: string;
}

export interface ClinicalNote {
  id: string;
  patientId: string;
  dateTime: string;
  physicianId: string;
  physicianName: string;
  noteType: 'Progress' | 'Surgical' | 'Referral' | 'General';
  content: string;
}

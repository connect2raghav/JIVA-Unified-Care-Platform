/**
 * JIVA — Unified Care Platform
 * Domain Types (Frozen Contract — Phase 0)
 *
 * These interfaces define the canonical data model for the platform.
 * DO NOT MODIFY after Phase 0 without agreement across all tracks.
 */

// ─── User Roles ──────────────────────────────────────────────────
export type UserRole =
  | 'SuperAdmin'
  | 'ClinicAdmin'
  | 'Physician'
  | 'Receptionist'
  | 'BloodBankManager'
  | 'AmbulanceDriver'
  | 'LabTechnician'
  | 'Patient';

// Human-readable role labels (no "Clinic" word for generic org)
export const ROLE_LABELS: Record<UserRole, string> = {
  SuperAdmin: 'Platform Admin',
  ClinicAdmin: 'Organization Admin',
  Physician: 'Physician / Doctor',
  Receptionist: 'Front Desk / Receptionist',
  BloodBankManager: 'Blood Bank Manager',
  AmbulanceDriver: 'Ambulance Driver',
  LabTechnician: 'Lab / Diagnostics',
  Patient: 'Patient',
};

// ─── Organization (formerly "Clinic") ────────────────────────────
export interface Clinic {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  logoUrl?: string;
  isActive: boolean;
  workingDays: string[];
  openingTime: string;
  closingTime: string;
  appointmentDurationMinutes: number;
  holidays: string[];
  emergencyContact: string;
  city?: string;
  orgType?: 'Hospital' | 'Clinic' | 'Blood Bank' | 'Ambulance Service' | 'Diagnostic Lab' | 'Pharmacy';
  createdAt: string;
  updatedAt: string;
}

// ─── Patient ─────────────────────────────────────────────────────
export interface Patient {
  id: string;
  clinicId: string;
  displayId?: string;
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: 'Male' | 'Female' | 'Other';
  bloodType?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  allergies?: string[];
  medicalHistory?: string[];
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  avatarUrl?: string;
  address?: string;
  city?: string;
  notes?: string;
  assignedPhysicianId?: string;
  assignedPhysicianName?: string;
  createdAt: string;
}

// ─── Appointment ─────────────────────────────────────────────────
export type AppointmentStatus =
  | 'Scheduled'
  | 'Waiting'
  | 'Checked-In'
  | 'In-Consultation'
  | 'Completed'
  | 'Cancelled'
  | 'No-Show';

export interface Appointment {
  id: string;
  clinicId: string;
  patientId: string;
  patientName: string;
  physicianId: string;
  physicianName: string;
  dateTime: string;
  durationMinutes: number;
  status: AppointmentStatus;
  reason: string;
  notes?: string;
  tokenNumber?: number;
  triagePriority?: 'Normal' | 'Urgent' | 'Critical';
  createdAt: string;
}

// ─── Ambulance ───────────────────────────────────────────────────
export type AmbulanceStatus =
  | 'Available'
  | 'Dispatched'
  | 'En-Route'
  | 'At-Scene'
  | 'Returning'
  | 'Out-of-Service';

export interface Ambulance {
  id: string;
  clinicId: string;
  vehicleNumber: string;
  driverName: string;
  driverPhone: string;
  status: AmbulanceStatus;
  currentLocation?: string;
  lastDispatchedAt?: string;
  equipmentLevel: 'Basic' | 'Advanced' | 'ICU';
  createdAt: string;
}

// ─── Emergency Request ──────────────────────────────────────────
export type EmergencyPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type EmergencyStatus =
  | 'Received'
  | 'Acknowledged'
  | 'Dispatched'
  | 'In-Transit'
  | 'Arrived'
  | 'Resolved'
  | 'Cancelled';

export interface EmergencyRequest {
  id: string;
  clinicId: string;
  callerName: string;
  callerPhone: string;
  patientId?: string;
  description: string;
  priority: EmergencyPriority;
  status: EmergencyStatus;
  assignedAmbulanceId?: string;
  assignedAmbulanceVehicle?: string;
  pickupLocation: string;
  pickupLat?: number;
  pickupLng?: number;
  destinationFacility?: string;
  dispatchedAt?: string;
  resolvedAt?: string;
  notes?: string;
  isBroadcast?: boolean;
  createdAt: string;
}

// ─── Blood Inventory ─────────────────────────────────────────────
export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
export type BloodComponent = 'Whole Blood' | 'Packed RBCs' | 'Platelets' | 'Plasma' | 'Cryoprecipitate';

export interface BloodInventoryItem {
  id: string;
  clinicId: string;
  bloodGroup: BloodGroup;
  component: BloodComponent;
  unitsAvailable: number;
  unitsReserved: number;
  expiryDate: string;
  donorName?: string;
  donorPhone?: string;
  collectionDate: string;
  status: 'Available' | 'Reserved' | 'Expired' | 'Used';
  updatedAt: string;
}

export interface BloodRequest {
  id: string;
  clinicId: string;
  patientId?: string;
  patientName: string;
  bloodGroup: BloodGroup;
  component: BloodComponent;
  unitsRequested: number;
  urgency: 'Routine' | 'Urgent' | 'Emergency';
  status: 'Pending' | 'Fulfilled' | 'Partially-Fulfilled' | 'Cancelled';
  requestedBy: string;
  notes?: string;
  createdAt: string;
}

// ─── Facility (nearby hospitals / trauma centers) ────────────────
export interface Facility {
  id: string;
  clinicId: string;
  name: string;
  type: 'Hospital' | 'Trauma Center' | 'ICU' | 'Blood Bank' | 'Pharmacy' | 'Diagnostic Lab';
  address: string;
  phone: string;
  email?: string;
  distance?: string;
  icuBedsAvailable?: number;
  emergencyCapable: boolean;
  operatingHours?: string;
  specialties?: string[];
  coordinates?: { lat: number; lng: number };
  createdAt: string;
}

// ─── Dashboard KPI ───────────────────────────────────────────────
export interface DashboardKPI {
  totalPatients: number;
  appointmentsToday: number;
  activeEmergencies: number;
  ambulancesAvailable: number;
  bloodUnitsLow: BloodGroup[];
  occupancyRate: number;
  totalBloodUnits: number;
  pendingBloodRequests: number;
  nearbyFacilities: number;
}

// ─── Common ──────────────────────────────────────────────────────
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  clinicId?: string;
  clinic_id?: string;
  phone?: string;
  avatarUrl?: string;
  createdAt: string;
  isActive?: boolean;
  is_active?: boolean;
  isLocked?: boolean;
  is_locked?: boolean;
  customPermissions?: string[];
  custom_permissions?: string[];
  lastLoginAt?: string | null;
  orgType?: string;
}

export interface ClinicNotification {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'emergency';
}

export interface ActivityLog {
  id: string;
  userId?: string;
  userEmail: string;
  userName: string;
  action: string;
  description: string;
  timestamp: string;
}

// ─── Lab / Diagnostic Report ─────────────────────────────────────
export interface LabReport {
  id: string;
  clinicId: string;
  patientId: string;
  patientName: string;
  physicianId?: string;
  physicianName?: string;
  labName: string;
  reportType: 'Blood Test' | 'Urine Test' | 'X-Ray' | 'CT Scan' | 'MRI' | 'Ultrasound' | 'ECG' | 'Other';
  status: 'Pending' | 'In-Progress' | 'Completed' | 'Delivered';
  reportUrl?: string;
  findings?: string;
  createdAt: string;
  completedAt?: string;
}

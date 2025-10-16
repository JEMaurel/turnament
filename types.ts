export interface Patient {
  id: string;
  name: string;
  dni?: string;
  insurance?: string;
  doctor?: string;
  treatment?: string;
  diagnosis?: string;
  observations?: string;
  driveUrl?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  date: string; // ISO string for date e.g., "2024-07-28"
  time: string; // e.g., "09:00"
  session: string; // e.g., "5/10"
}

// FIX: Centralized AppointmentWithDetails type to resolve type inference issues across components.
export type AppointmentWithDetails = Appointment & { patientName: string; observations?: string; };
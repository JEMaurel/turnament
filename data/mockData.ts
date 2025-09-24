
import type { Patient, Appointment } from '../types';

export const initialPatients: Patient[] = [
  { id: 'p1', name: 'Juan Perez', insurance: 'OSDE', doctor: 'Dr. Garcia', treatment: 'Terapia Cognitiva', diagnosis: 'Ansiedad', observations: 'Progreso favorable.' },
  { id: 'p2', name: 'Maria Lopez', insurance: 'Swiss Medical', doctor: 'Dr. Martinez', treatment: 'Psicoanálisis', diagnosis: 'Depresión', observations: 'Requiere seguimiento cercano.' },
  { id: 'p3', name: 'Carlos Sanchez', insurance: 'Galeno', doctor: 'Dr. Garcia', treatment: 'Terapia de Pareja', diagnosis: 'Conflictos de comunicación', observations: '' },
];

export const initialAppointments: Appointment[] = [
  { id: 'a1', patientId: 'p1', date: new Date().toISOString().split('T')[0], time: '09:00', session: '5/10' },
  { id: 'a2', patientId: 'p2', date: new Date().toISOString().split('T')[0], time: '10:00', session: '8/12' },
  { id: 'a3', patientId: 'p1', date: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString().split('T')[0], time: '09:00', session: '6/10' },
  { id: 'a4', patientId: 'p3', date: new Date(new Date().setDate(new Date().getDate() + 3)).toISOString().split('T')[0], time: '11:00', session: '2/8' },
];

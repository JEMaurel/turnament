
import type { Patient, Appointment } from '../types';

// NOTA: Los datos de pacientes y turnos ahora se gestionan a través del almacenamiento
// local del navegador (localStorage) para evitar que la información sensible se guarde
// en el control de versiones (GitHub). Estos arrays se dejan vacíos intencionadamente.
// La aplicación utilizará sus propios datos de ejemplo iniciales si el localStorage
// está vacío en la primera carga.
export const initialPatients: Patient[] = [];

export const initialAppointments: Appointment[] = [];

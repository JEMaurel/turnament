import React, { useMemo } from 'react';
// FIX: Imported the centralized AppointmentWithDetails type to ensure type consistency.
import type { Appointment, Patient, AppointmentWithDetails } from '../types';

interface AppointmentListProps {
  selectedDate: Date | null;
  appointments: AppointmentWithDetails[];
  onSelectAppointment: (appointment: AppointmentWithDetails) => void;
  onDeleteAppointment: (appointmentId: string) => void;
  onAddNewAppointment: (time?: string) => void;
  onHighlightPatient: (patientId: string, time: string) => void;
  onShowRecurringWeekAvailability: (time: string, date: Date) => void;
  recurringAvailableSlots?: string[];
  highlightedPatientId?: string | null;
}

const AppointmentRow: React.FC<{ 
  appointment: AppointmentWithDetails; 
  onSelectAppointment: (appointment: AppointmentWithDetails) => void; 
  onDeleteAppointment: (appointmentId: string) => void;
  onHighlightPatient: (patientId: string, time: string) => void;
  isHighlighted: boolean;
}> = ({ appointment, onSelectAppointment, onDeleteAppointment, onHighlightPatient, isHighlighted }) => {
  return (
    <div 
      className={`grid grid-cols-1 md:grid-cols-4 gap-2 items-center p-2 rounded-lg cursor-pointer transition-all duration-300 ${isHighlighted ? 'bg-slate-700 ring-2 ring-amber-400 shadow-lg shadow-amber-500/20' : 'bg-slate-800 hover:bg-slate-700'}`}
      onClick={() => onSelectAppointment(appointment)}
    >
      <div className="font-mono text-lg text-cyan-400">{appointment.time}</div>
      <div className="font-semibold text-amber-300 truncate text-lg">{appointment.patientName}</div>
      <div className="flex items-center gap-3 text-slate-400">
        <span className="text-base font-mono">{appointment.session}</span>
        {appointment.observations && (
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onSelectAppointment(appointment);
                }}
                className="p-1 rounded-full hover:bg-slate-600 transition-colors"
                aria-label={`Ver observación activa para ${appointment.patientName}`}
                title="Observación activa. Click para ver o editar."
            >
                <div className="w-4 h-4 bg-amber-600 rounded-full"></div>
            </button>
        )}
        <button
            onClick={(e) => {
                e.stopPropagation();
                onHighlightPatient(appointment.patientId, appointment.time);
            }}
            className="p-1 rounded-full hover:bg-slate-600 transition-colors"
            aria-label={`Resaltar turnos de ${appointment.patientName} y ver disponibilidad`}
            title={`Resaltar turnos del paciente y ver disponibilidad semanal para este horario.`}
        >
            <div className="w-4 h-4 bg-indigo-400 rounded-full"></div>
        </button>
      </div>
      <div className="flex justify-end items-center gap-2">
         <button 
          onClick={(e) => { e.stopPropagation(); onSelectAppointment(appointment); }} 
          className="p-2 rounded-full hover:bg-slate-600 transition-colors"
          aria-label="Editar Turno"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="http://www.w3.org/2000/svg" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onDeleteAppointment(appointment.id); }} 
          className="p-2 text-red-400 rounded-full hover:bg-red-900/50 transition-colors"
          aria-label="Eliminar Turno"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="http://www.w3.org/2000/svg" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
        </button>
      </div>
    </div>
  );
};

const EmptySlotRow: React.FC<{
  time: string; 
  onAddNewAppointment: (time: string) => void;
  isRecurringAvailable: boolean;
  onShowRecurringWeekAvailability: (time: string) => void;
}> = ({ time, onAddNewAppointment, isRecurringAvailable, onShowRecurringWeekAvailability }) => (
    <div
        className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center p-2 bg-slate-800/50 rounded-lg border-2 border-dashed border-slate-700 hover:border-cyan-500 hover:bg-slate-700/50 cursor-pointer transition-all"
        onClick={() => onAddNewAppointment(time)}
        role="button"
        aria-label={`Agendar turno a las ${time}`}
    >
        <div className="font-mono text-lg text-slate-500">{time}</div>
        <div className="text-slate-400">Disponible</div>
        <div className="flex items-center gap-3">
          {isRecurringAvailable && (
              <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onShowRecurringWeekAvailability(time);
                  }}
                  className="p-1 rounded-full hover:bg-slate-600 transition-colors"
                  aria-label={`Mostrar disponibilidad semanal para las ${time}`}
                  title="Mostrar disponibilidad semanal para este horario."
              >
                  <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              </button>
          )}
        </div>
        <div className="flex justify-end">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-500" fill="none" viewBox="http://www.w3.org/2000/svg" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
        </div>
    </div>
);

type ScheduledItem = { type: 'filled'; data: AppointmentWithDetails } | { type: 'empty'; time: string };

const AppointmentList: React.FC<AppointmentListProps> = ({ selectedDate, appointments, onSelectAppointment, onDeleteAppointment, onAddNewAppointment, onHighlightPatient, onShowRecurringWeekAvailability, recurringAvailableSlots = [], highlightedPatientId }) => {

  // FIX: Using a `for...of` loop to build the schedule. This resolves a subtle
  // TypeScript inference issue where the previous `map/filter` approach caused `item.data`
  // to be incorrectly typed as `unknown` in the render method, leading to a compile error.
  // This more direct approach ensures the type is correctly maintained.
  // FIX: Added an explicit return type to the useMemo hook to ensure TypeScript correctly infers the type of scheduledItems.
  const scheduledItems: ScheduledItem[] = useMemo((): ScheduledItem[] => {
    if (!selectedDate) return [];

    const scheduleStartHour = 11;
    const scheduleEndHour = 18;

    const baseSlots: string[] = [];
    // The loop now stops before 18:00, making 17:30 the last available slot.
    for (let h = scheduleStartHour; h < scheduleEndHour; h++) {
      baseSlots.push(`${String(h).padStart(2, '0')}:00`);
      baseSlots.push(`${String(h).padStart(2, '0')}:30`);
    }

    // FIX: Replaced .map() with for...of loops to avoid TypeScript inference issues.
    const appointmentsByTime = new Map<string, AppointmentWithDetails>();
    for (const app of appointments) {
      appointmentsByTime.set(app.time, app);
    }

    const allTimes = new Set(baseSlots);
    for (const app of appointments) {
      allTimes.add(app.time);
    }

    const sortedTimes = Array.from(allTimes).sort((a, b) => a.localeCompare(b));

    const items: ScheduledItem[] = [];
    for (const time of sortedTimes) {
        const appointment = appointmentsByTime.get(time);
        if (appointment) {
            items.push({ type: 'filled', data: appointment });
        } else if (baseSlots.includes(time)) {
            items.push({ type: 'empty', time });
        }
    }
    return items;
  }, [selectedDate, appointments]);

  return (
    <div className="p-4 bg-slate-800/50 rounded-lg shadow-lg h-full flex flex-col">
      <div className="flex justify-center items-center mb-4">
        <h2 className="text-xl font-bold">
          <span className="text-cyan-400">{selectedDate ? selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Ningún día seleccionado'}</span>
        </h2>
      </div>
      <div className="flex-grow overflow-y-auto space-y-2 no-scrollbar">
        {selectedDate && scheduledItems.length > 0 ? (
          // FIX: By explicitly typing `item` as `ScheduledItem` in the map callback,
          // we help the TypeScript compiler correctly narrow the discriminated union.
          // This resolves the error where `item.data` was being inferred as `unknown`.
          scheduledItems.map((item: ScheduledItem) => {
            if (item.type === 'filled') {
              return (
                <AppointmentRow
                  key={item.data.id}
                  appointment={item.data}
                  onSelectAppointment={onSelectAppointment}
                  onDeleteAppointment={onDeleteAppointment}
                  onHighlightPatient={onHighlightPatient}
                  isHighlighted={!!highlightedPatientId && item.data.patientId === highlightedPatientId}
                />
              );
            } else {
              const isRecurring = recurringAvailableSlots.includes(item.time);
              return (
                <EmptySlotRow
                  key={item.time}
                  time={item.time}
                  onAddNewAppointment={onAddNewAppointment}
                  isRecurringAvailable={isRecurring}
                  onShowRecurringWeekAvailability={(time) => {
                    if (selectedDate) {
                      onShowRecurringWeekAvailability(time, selectedDate);
                    }
                  }}
                />
              );
            }
          })
        ) : (
          <div className="text-center text-slate-400 py-8">
            <p>{selectedDate ? 'No hay turnos para este día.' : 'Seleccione un día para ver los turnos.'}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppointmentList;
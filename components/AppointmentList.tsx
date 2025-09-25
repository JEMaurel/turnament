import React, { useMemo } from 'react';
import type { Appointment, Patient } from '../types';

interface AppointmentListProps {
  selectedDate: Date | null;
  appointments: (Appointment & { patientName: string })[];
  // FIX: Updated the type to be more specific to the data passed within this component.
  onSelectAppointment: (appointment: Appointment & { patientName: string }) => void;
  onDeleteAppointment: (appointmentId: string) => void;
  onAddNewAppointment: (time?: string) => void;
  onHighlightPatient: (patientId: string) => void;
}

const AppointmentRow: React.FC<{ 
  appointment: Appointment & { patientName: string }; 
  // FIX: Updated the type to be more specific to the data passed within this component.
  onSelectAppointment: (appointment: Appointment & { patientName: string }) => void; 
  onDeleteAppointment: (appointmentId: string) => void;
  onHighlightPatient: (patientId: string) => void;
}> = ({ appointment, onSelectAppointment, onDeleteAppointment, onHighlightPatient }) => {
  return (
    <div 
      className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center p-2 bg-slate-800 rounded-lg hover:bg-slate-700 cursor-pointer transition-colors"
      onClick={() => onSelectAppointment(appointment)}
    >
      <div className="font-mono text-lg text-cyan-400">{appointment.time}</div>
      <div className="font-semibold text-white truncate">{appointment.patientName}</div>
      <div className="flex items-center gap-2 text-slate-400">
        <span>{appointment.session}</span>
        <button
            onClick={(e) => {
                e.stopPropagation();
                onHighlightPatient(appointment.patientId);
            }}
            className="p-1 rounded-full hover:bg-slate-600 transition-colors"
            aria-label={`Resaltar turnos de ${appointment.patientName}`}
            title={`Resaltar todos los turnos de ${appointment.patientName} en el calendario`}
        >
            <div className="w-2.5 h-2.5 bg-indigo-400 rounded-full"></div>
        </button>
      </div>
      <div className="flex justify-end items-center gap-2">
         <button 
          onClick={(e) => { e.stopPropagation(); onSelectAppointment(appointment); }} 
          className="p-2 rounded-full hover:bg-slate-600 transition-colors"
          aria-label="Editar Turno"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onDeleteAppointment(appointment.id); }} 
          className="p-2 text-red-400 rounded-full hover:bg-red-900/50 transition-colors"
          aria-label="Eliminar Turno"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
        </button>
      </div>
    </div>
  );
};

const EmptySlotRow: React.FC<{time: string; onAddNewAppointment: (time: string) => void}> = ({ time, onAddNewAppointment }) => (
    <div
        className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center p-2 bg-slate-800/50 rounded-lg border-2 border-dashed border-slate-700 hover:border-cyan-500 hover:bg-slate-700/50 cursor-pointer transition-all"
        onClick={() => onAddNewAppointment(time)}
        role="button"
        aria-label={`Agendar turno a las ${time}`}
    >
        <div className="font-mono text-lg text-slate-500">{time}</div>
        <div className="text-slate-400 col-span-2">Disponible</div>
        <div className="flex justify-end">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
        </div>
    </div>
);

// FIX: Define ScheduledItem type outside the component to be reusable and help with type inference.
type ScheduledItem = { type: 'filled'; data: Appointment & { patientName: string } } | { type: 'empty'; time: string };

const AppointmentList: React.FC<AppointmentListProps> = ({ selectedDate, appointments, onSelectAppointment, onDeleteAppointment, onAddNewAppointment, onHighlightPatient }) => {

  // FIX: Explicitly type `scheduledItems` to ensure correct type inference within the `map` function below.
  const scheduledItems: ScheduledItem[] = useMemo(() => {
    if (!selectedDate) return [];

    const scheduleStartHour = 11;
    const scheduleEndHour = 18;

    const baseSlots = [];
    for (let h = scheduleStartHour; h <= scheduleEndHour; h++) {
      baseSlots.push(`${String(h).padStart(2, '0')}:00`);
      if (h < scheduleEndHour) {
        baseSlots.push(`${String(h).padStart(2, '0')}:30`);
      }
    }

    const appointmentsByTime = new Map(appointments.map(app => [app.time, app]));
    const allTimes = new Set([...baseSlots, ...appointments.map(app => app.time)]);
    const sortedTimes = Array.from(allTimes).sort((a, b) => a.localeCompare(b));

    // FIX: Replaced a `reduce` implementation with `flatMap` to correct a type inference issue.
    // The previous implementation could lead to `unknown` types downstream. `flatMap` is more suitable
    // for this transformation and provides more stable type inference.
    return sortedTimes.flatMap((time): ScheduledItem[] => {
      const appointment = appointmentsByTime.get(time);
      if (appointment) {
        return [{ type: 'filled', data: appointment }];
      }
      if (baseSlots.includes(time)) {
        return [{ type: 'empty', time }];
      }
      return [];
    });

  }, [selectedDate, appointments]);

  return (
    <div className="p-4 bg-slate-800/50 rounded-lg shadow-lg h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">
          Turnos para: <span className="text-cyan-400">{selectedDate ? selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Ningún día seleccionado'}</span>
        </h2>
        {selectedDate && (
          <button onClick={() => onAddNewAppointment()} className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
            <span>Nuevo Turno</span>
          </button>
        )}
      </div>
      <div className="flex-grow overflow-y-auto space-y-2 pr-2">
        {selectedDate && scheduledItems.length > 0 ? (
          scheduledItems.map(item => {
            if (item.type === 'filled') {
              return (
                <AppointmentRow 
                  key={item.data.id} 
                  appointment={item.data} 
                  onSelectAppointment={onSelectAppointment}
                  onDeleteAppointment={onDeleteAppointment}
                  onHighlightPatient={onHighlightPatient}
                />
              );
            }
            return (
              <EmptySlotRow 
                key={item.time}
                time={item.time}
                onAddNewAppointment={onAddNewAppointment}
              />
            );
          })
        ) : (
          <div className="text-center text-slate-400 py-10">
            {selectedDate ? "No hay turnos para este día. Haz clic en un espacio para agregar uno." : "Selecciona un día en el calendario para ver los turnos."}
          </div>
        )}
      </div>
    </div>
  );
};

export default AppointmentList;

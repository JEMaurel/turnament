import React, { useMemo, useState } from 'react';
// FIX: Imported the centralized AppointmentWithDetails type to ensure type consistency.
import type { Appointment, Patient, AppointmentWithDetails, PedidoStatus } from '../types';

interface AppointmentListProps {
  selectedDate: Date | null;
  appointments: AppointmentWithDetails[];
  onSelectAppointment: (appointment: AppointmentWithDetails) => void;
  onDeleteAppointment: (appointmentId: string) => void;
  onAddNewAppointment: (time?: string) => void;
  onHighlightPatient: (patientId: string, time: string) => void;
  onShowRecurringWeekAvailability: (time: string, date: Date) => void;
  onShowQuickLinks: (patientId: string) => void;
  onUpdateAppointmentStatus: (appointmentId: string, newStatus: PedidoStatus) => void;
  recurringAvailableSlots?: string[];
  highlightedPatientId?: string | null;
  multiBookedPatientIds?: Set<string>;
  editingStatusFor: string | null;
  onSetEditingStatusFor: (appointmentId: string | null) => void;
}

const PedidoStatusIndicator: React.FC<{ status?: PedidoStatus }> = ({ status }) => {
  if (!status || (!status.rojo && !status.naranja && !status.verde)) {
    return null; // Don't render anything if no primary status is set
  }

  const dotColorClass = status.verde ? 'bg-green-500' :
                        status.naranja ? 'bg-orange-500' :
                        status.rojo ? 'bg-red-500' :
                        '';

  const haloColorClass = status.azul === 'refuerzo' ? 'ring-cyan-400' :
                         status.azul === 'refuerzo-en-tramite' ? 'ring-blue-500' :
                         '';
  
  if (!dotColorClass) return null;

  return (
    <div className="relative w-4 h-4" title="estado del pedido">
      <div className={`w-full h-full rounded-full ${dotColorClass} ${haloColorClass ? `ring-2 ring-offset-2 ring-offset-slate-800 ${haloColorClass}` : ''}`}></div>
    </div>
  );
};

const PedidoStatusEditor: React.FC<{
  appointment: AppointmentWithDetails;
  onUpdate: (appointmentId: string, newStatus: PedidoStatus) => void;
  onClose: () => void;
}> = ({ appointment, onUpdate, onClose }) => {
  const status = appointment.pedidoStatus || {};

  const handleToggle = (key: 'rojo' | 'naranja') => {
    onUpdate(appointment.id, { ...status, [key]: !status[key] });
  };
  
  const handleCycleVerde = () => {
    let newVerde: PedidoStatus['verde'];
    if (!status.verde) newVerde = 'autorizado';
    else if (status.verde === 'autorizado') newVerde = 'en-mano';
    else newVerde = undefined;
    onUpdate(appointment.id, { ...status, verde: newVerde });
  };

  const handleCycleAzul = () => {
    let newAzul: PedidoStatus['azul'];
    if (!status.azul) newAzul = 'refuerzo';
    else if (status.azul === 'refuerzo') newAzul = 'refuerzo-en-tramite';
    else newAzul = undefined;
    onUpdate(appointment.id, { ...status, azul: newAzul });
  };

  const StatusButton: React.FC<{ label: string; colorClass: string; isActive: boolean; onClick: () => void; }> = ({ label, colorClass, isActive, onClick }) => (
    <button onClick={onClick} className={`w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors ${isActive ? 'bg-slate-600' : 'bg-slate-700 hover:bg-slate-600'}`}>
      <div className={`w-4 h-4 rounded-full ${colorClass} ${isActive ? '' : 'opacity-40'}`}></div>
      <span>{label}</span>
    </button>
  );

  return (
    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 z-20 bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-lg shadow-2xl p-3">
      <div className="space-y-2">
        <StatusButton label="sin pedido" colorClass="bg-red-500" isActive={!!status.rojo} onClick={() => handleToggle('rojo')} />
        <StatusButton label="pedido en trámite" colorClass="bg-orange-500" isActive={!!status.naranja} onClick={() => handleToggle('naranja')} />
        
        <div className="w-full flex items-center gap-3 p-2 rounded-md bg-slate-700 hover:bg-slate-600 cursor-pointer" onClick={handleCycleVerde}>
            <div className={`w-4 h-4 rounded-full transition-colors ${status.verde === 'autorizado' ? 'bg-green-400' : status.verde === 'en-mano' ? 'bg-green-700' : 'bg-gray-500 opacity-40'}`}></div>
            <span>{status.verde === 'autorizado' ? 'pedido autorizado' : status.verde === 'en-mano' ? 'pedido en mano' : 'pedido (apagado)'}</span>
        </div>
        
         <div className="w-full flex items-center gap-3 p-2 rounded-md bg-slate-700 hover:bg-slate-600 cursor-pointer" onClick={handleCycleAzul}>
            <div className={`w-4 h-4 rounded-full transition-colors ${status.azul === 'refuerzo' ? 'bg-cyan-400' : status.azul === 'refuerzo-en-tramite' ? 'bg-blue-500' : 'bg-gray-500 opacity-40'}`}></div>
            <span>{status.azul === 'refuerzo' ? 'pedido de refuerzo' : status.azul === 'refuerzo-en-tramite' ? 'refuerzo en trámite' : 'refuerzo (apagado)'}</span>
        </div>
      </div>
    </div>
  );
};


const AppointmentRow: React.FC<{ 
  appointment: AppointmentWithDetails; 
  onSelectAppointment: (appointment: AppointmentWithDetails) => void; 
  onDeleteAppointment: (appointmentId: string) => void;
  onHighlightPatient: (patientId: string, time: string) => void;
  onShowQuickLinks: (patientId: string) => void;
  onUpdateAppointmentStatus: (appointmentId: string, newStatus: PedidoStatus) => void;
  isHighlighted: boolean;
  isMultiBooked: boolean;
  isStatusEditorOpen: boolean;
  onSetEditingStatusFor: (appointmentId: string | null) => void;
}> = ({ appointment, onSelectAppointment, onDeleteAppointment, onHighlightPatient, onShowQuickLinks, onUpdateAppointmentStatus, isHighlighted, isMultiBooked, isStatusEditorOpen, onSetEditingStatusFor }) => {
  
  const handleToggleEditor = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSetEditingStatusFor(isStatusEditorOpen ? null : appointment.id);
  };
  
  return (
    <div className="relative">
      <div 
        className={`grid grid-cols-1 md:grid-cols-4 gap-2 items-center p-2 rounded-lg cursor-pointer transition-all duration-300 ${isHighlighted ? 'bg-slate-700 ring-2 ring-amber-400 shadow-lg shadow-amber-500/20' : 'bg-slate-800 hover:bg-slate-700'}`}
        onClick={() => onSelectAppointment(appointment)}
      >
        <div className="font-mono text-lg text-cyan-400">{appointment.time}</div>
        <div className={`font-semibold truncate text-xl ${isMultiBooked ? 'text-red-400' : 'text-amber-300'}`}>{appointment.patientName}</div>
        <div className="flex items-center gap-3 text-slate-400">
          <PedidoStatusIndicator status={appointment.pedidoStatus} />
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
            onClick={handleToggleEditor}
            className="p-2 rounded-full hover:bg-slate-600 transition-colors"
            aria-label="gestionar estado del pedido"
            title="gestionar estado del pedido"
          >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C3.732 4.943 9.522 3 10 3s6.268 1.943 9.542 7c-3.274 5.057-9.064 7-9.542 7S3.732 15.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
          </button>
           <button
            onClick={(e) => { e.stopPropagation(); onShowQuickLinks(appointment.patientId); }}
            className="p-2 rounded-full hover:bg-slate-600 transition-colors"
            aria-label={`ver accesos directos de ${appointment.patientName}`}
            title="ver accesos directos"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </button>
           <button 
            onClick={(e) => { e.stopPropagation(); onSelectAppointment(appointment); }} 
            className="p-2 rounded-full hover:bg-slate-600 transition-colors"
            aria-label="Editar Turno"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="http://www.w3.org/2000/svg" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2-2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
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
       {isStatusEditorOpen && (
        <PedidoStatusEditor 
          appointment={appointment}
          onUpdate={onUpdateAppointmentStatus}
          onClose={() => onSetEditingStatusFor(null)}
        />
      )}
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

const AppointmentList: React.FC<AppointmentListProps> = ({ selectedDate, appointments, onSelectAppointment, onDeleteAppointment, onAddNewAppointment, onHighlightPatient, onShowRecurringWeekAvailability, onShowQuickLinks, onUpdateAppointmentStatus, recurringAvailableSlots = [], highlightedPatientId, multiBookedPatientIds = new Set(), editingStatusFor, onSetEditingStatusFor }) => {

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
                  onShowQuickLinks={onShowQuickLinks}
                  onUpdateAppointmentStatus={onUpdateAppointmentStatus}
                  isHighlighted={!!highlightedPatientId && item.data.patientId === highlightedPatientId}
                  isMultiBooked={multiBookedPatientIds.has(item.data.patientId)}
                  isStatusEditorOpen={editingStatusFor === item.data.id}
                  onSetEditingStatusFor={onSetEditingStatusFor}
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
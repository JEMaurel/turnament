import React, { useMemo, useState } from 'react';
import type { AppointmentWithDetails, PedidoStatus } from '../types';

const PedidoStatusIndicator: React.FC<{ status?: PedidoStatus }> = ({ status }) => {
  let dotColorClass = '';
  if (status) {
      // Priority: Verde > Naranja > Rojo
      if (status.verde === 'firmado') {
        dotColorClass = 'bg-green-900'; // Verde oscuro/firmado
      } else if (status.verde === 'en-mano') {
        dotColorClass = 'bg-green-700'; // Verde militar
      } else if (status.verde === 'autorizado') {
        dotColorClass = 'bg-green-400'; // Verde loro
      } else if (status.naranja) {
        dotColorClass = 'bg-orange-500';
      } else if (status.rojo) {
        dotColorClass = 'bg-red-500';
      }
  }

  // If there's no main color, we show a placeholder to keep layout consistent
  if (!dotColorClass) {
      return <div className="w-5 h-5" />;
  }
  
  const haloColorClass = status?.azul === 'refuerzo' ? 'ring-cyan-400' :
                         status?.azul === 'refuerzo-en-tramite' ? 'ring-blue-500' :
                         '';

  return (
    <div className="relative w-5 h-5" title="estado del pedido">
      <div className={`w-full h-full rounded-full flex items-center justify-center ${dotColorClass} ${haloColorClass ? `ring-2 ring-offset-2 ring-offset-slate-800 ${haloColorClass}` : ''}`}>
        {status?.verde === 'firmado' && (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
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
  onSetLastClickedPatientName: (name: string) => void;
  isHighlighted: boolean;
  isMultiBooked: boolean;
  isActive: boolean;
}> = ({ appointment, onSelectAppointment, onDeleteAppointment, onHighlightPatient, onShowQuickLinks, onSetLastClickedPatientName, isHighlighted, isMultiBooked, isActive }) => {
  
  const [dniCopied, setDniCopied] = useState(false);
  const [insuranceIdCopied, setInsuranceIdCopied] = useState(false);

  const treatmentIndicator = useMemo(() => {
    if (!appointment.treatment) return null;
    const lowerTreatment = appointment.treatment.toLowerCase();
    const kineKeywords = ['kinesiologia', 'kine', 'kinesio', 'kinesiolog', 'kin', 'kinesiol'];
    if (kineKeywords.some(keyword => lowerTreatment.includes(keyword))) {
      return { char: 'K' as const, title: 'kinesiología' };
    }
    if (lowerTreatment.includes('rpg')) {
      return { char: 'G' as const, title: 'rpg' };
    }
    return null;
  }, [appointment.treatment]);


  const handleCopyToClipboard = (text: string, type: 'dni' | 'insuranceId') => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      if (type === 'dni') {
        setDniCopied(true);
        setTimeout(() => setDniCopied(false), 2000);
      } else {
        setInsuranceIdCopied(true);
        setTimeout(() => setInsuranceIdCopied(false), 2000);
      }
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  };
  
  return (
    <div 
      className={`grid grid-cols-1 md:grid-cols-4 gap-2 items-center p-2 rounded-lg cursor-pointer transition-all duration-300 ${isActive ? 'bg-teal-800 ring-2 ring-teal-500 shadow-lg shadow-teal-500/20' : isHighlighted ? 'bg-slate-700 ring-2 ring-amber-400 shadow-lg shadow-amber-500/20' : 'bg-slate-800 hover:bg-slate-700'}`}
      onClick={() => { onSelectAppointment(appointment); onSetLastClickedPatientName(appointment.patientName); }}
    >
      <div className="flex items-baseline gap-6">
        <span className="font-mono text-lg text-cyan-400">{appointment.time}</span>
        {treatmentIndicator && (
          <span 
            className={`font-bold text-lg
              ${treatmentIndicator.char === 'K' ? 'text-sky-500' : 'text-fuchsia-500'}`}
            title={treatmentIndicator.title}
          >
            {treatmentIndicator.char}
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-3">
        <button
          onClick={(e) => { e.stopPropagation(); handleCopyToClipboard(appointment.dni || '', 'dni'); }}
          disabled={!appointment.dni}
          title={appointment.dni ? `Copiar DNI: ${appointment.dni}` : 'Paciente sin DNI'}
          className={`p-1.5 rounded-full transition-colors ${
            appointment.dni
              ? 'bg-slate-700 text-cyan-400 hover:bg-slate-600'
              : 'bg-slate-800 text-slate-600 opacity-50'
          }`}
          aria-label="Copiar DNI"
        >
          {dniCopied ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 4a1 1 0 100 2h3a1 1 0 100-2H6z" />
            </svg>
          )}
        </button>
        
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); handleCopyToClipboard(appointment.insuranceId || '', 'insuranceId'); }}
            disabled={!appointment.insuranceId}
            title={
              appointment.insuranceIdIsPriority 
                ? `prioritario - copiar n° afiliado: ${appointment.insuranceId}` 
                : (appointment.insuranceId ? `copiar n° afiliado: ${appointment.insuranceId}` : 'paciente sin n° de afiliado')
            }
            className={`p-1.5 rounded-full transition-colors ${
              appointment.insuranceId
                ? 'bg-slate-700 text-green-400 hover:bg-slate-600'
                : 'bg-slate-800 text-slate-600 opacity-50'
            }`}
             aria-label="copiar n° de afiliado"
          >
            {insuranceIdCopied ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5.09.052.052 0 002 5.142V11a1 1 0 001 1h16a1 1 0 001-1V5.142a.052.052 0 00-.166-.052A11.954 11.954 0 0110 1.944zM10 18c-3.314 0-6-2.686-6-6h12c0 3.314-2.686 6-6 6z" clipRule="evenodd" />
              </svg>
            )}
          </button>
          {appointment.insuranceIdIsPriority && appointment.insuranceId && (
            <span 
              className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-amber-400 ring-2 ring-slate-800"
              title="n° de afiliado es prioritario" 
            />
          )}
        </div>

        <div className={`font-semibold truncate text-xl ml-12 ${isMultiBooked ? 'text-red-400' : 'text-amber-300'}`}>{appointment.patientName}</div>
      </div>

      <div className="flex items-center gap-3 text-slate-400">
        <span className="text-base font-mono">{appointment.session}</span>
        {appointment.observations && (
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onSelectAppointment(appointment);
                    onSetLastClickedPatientName(appointment.patientName);
                }}
                className="p-1.5 rounded-full hover:bg-slate-600 transition-colors"
                aria-label={`Ver observación activa para ${appointment.patientName}`}
                title="Observación activa. Click para ver o editar."
            >
                <div className="w-5 h-5 bg-amber-600 rounded-full"></div>
            </button>
        )}
        <button
            onClick={(e) => {
                e.stopPropagation();
                onHighlightPatient(appointment.patientId, appointment.time);
                onSetLastClickedPatientName(appointment.patientName);
            }}
            className="p-1.5 rounded-full hover:bg-slate-600 transition-colors"
            aria-label={`Resaltar turnos de ${appointment.patientName} y ver disponibilidad`}
            title={`Resaltar turnos del paciente y ver disponibilidad semanal para este horario.`}
        >
            <div className="w-5 h-5 bg-indigo-400 rounded-full"></div>
        </button>
      </div>
      <div className="flex justify-end items-center gap-3">
          <PedidoStatusIndicator status={appointment.pedidoStatus} />
         <button
          onClick={(e) => { e.stopPropagation(); onShowQuickLinks(appointment.patientId); onSetLastClickedPatientName(appointment.patientName); }}
          className="p-2 rounded-full hover:bg-slate-600 transition-colors"
          aria-label={`ver accesos directos de ${appointment.patientName}`}
          title="ver accesos directos"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-400" viewBox="http://www.w3.org/2000/svg" fill="currentColor">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
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

export default AppointmentRow;

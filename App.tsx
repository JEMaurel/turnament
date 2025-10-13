import React, { useState, useMemo, useCallback, useEffect, useRef, useLayoutEffect } from 'react';
import Calendar from './components/Calendar';
import AppointmentList from './components/AppointmentList';
// FIX: Imported the centralized AppointmentWithDetails type to ensure type consistency.
import type { Patient, Appointment, AppointmentWithDetails } from './types';
import { getAiAssistance } from './services/geminiService';

// New types for the Patient Schedule Viewer
interface DaySchedule {
  date: Date;
  times: string[];
}
type WeekSchedule = (DaySchedule | null)[];
// New type for monthly grouping
interface MonthlySchedule {
    month: string;
    year: number;
    weeks: WeekSchedule[];
}


// Type for the state snapshot
interface AppState {
  patients: Patient[];
  appointments: Appointment[];
}


// Modal Components defined within App.tsx to easily access state and handlers

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-slate-800 rounded-lg shadow-2xl p-6 w-full max-w-2xl mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b border-slate-700 pb-3 mb-4">
          <h3 className="text-2xl font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
};

// New Stepper Input Component
const StepperInput: React.FC<{
    label: string;
    value: string;
    onChange: (newValue: string) => void;
    separator: string;
    steps: [number, number];
}> = ({ label, value, onChange, separator, steps }) => {
    const [activeIndex, setActiveIndex] = useState(0);

    const handleStep = (direction: 1 | -1) => {
        const parts = value.split(separator);
        const numericParts = parts.map(p => parseInt(p, 10) || 0);
        
        if (separator === ':') {
            const [hours, minutes] = numericParts;
            const step = steps[activeIndex];
            
            let totalMinutes = hours * 60 + minutes;
            if (activeIndex === 0) { // Stepping hours
                totalMinutes += direction * step * 60;
            } else { // Stepping minutes
                totalMinutes += direction * step;
            }

            const totalDayMinutes = 24 * 60;
            // Handle wrapping around midnight
            totalMinutes = (totalMinutes % totalDayMinutes + totalDayMinutes) % totalDayMinutes;

            const newHours = Math.floor(totalMinutes / 60);
            const newMinutes = totalMinutes % 60;

            onChange(`${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`);
            return;
        }
    
        // Original logic for session
        const step = steps[activeIndex];
        numericParts[activeIndex] += direction * step;
        numericParts[activeIndex] = Math.max(0, numericParts[activeIndex]);
        
        const finalParts = numericParts.map(String);
        onChange(finalParts.join(separator));
    };
    
    const handlePartChange = (index: number, newValue: string) => {
        const currentParts = value.split(separator);
        // Ensure we have two parts to avoid errors
        if (currentParts.length < 2) {
            currentParts.push('');
        }
        const newParts = [...currentParts];
        const numericValue = newValue.replace(/[^0-9]/g, '');
        
        if (separator === ':') {
            const parsedValue = parseInt(numericValue, 10);
            if (index === 0) { // hours
                newParts[index] = parsedValue > 23 ? '23' : numericValue;
            } else { // minutes
                newParts[index] = parsedValue > 59 ? '59' : numericValue;
            }
        } else {
            newParts[index] = numericValue;
        }
        onChange(newParts.join(separator));
    };

    const handleBlur = () => {
        const parts = value.split(separator);
        if (separator === ':') {
            const hours = parseInt(parts[0] || '0', 10);
            const minutes = parseInt(parts[1] || '0', 10);
            onChange(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
        } else {
            const p1 = parseInt(parts[0] || '0', 10);
            const p2 = parseInt(parts[1] || '0', 10);
            onChange(`${p1}/${p2}`);
        }
    };

    const parts = value.split(separator);
    const part1 = parts[0] || '';
    const part2 = parts[1] || '';

    return (
        <div>
            <label className="block text-sm font-medium text-slate-300">{label}</label>
            <div className="flex items-center gap-2 mt-1 w-full bg-slate-700 border border-slate-600 rounded-md p-2 focus-within:ring-2 focus-within:ring-cyan-500 focus-within:border-cyan-500">
                <div className="flex-grow font-mono text-xl text-center tracking-wider flex justify-center items-center">
                    <input
                        type="text"
                        value={part1}
                        onChange={e => handlePartChange(0, e.target.value)}
                        onFocus={() => setActiveIndex(0)}
                        onBlur={handleBlur}
                        className={`w-12 p-1 rounded text-center bg-transparent transition-colors outline-none ${activeIndex === 0 ? 'text-cyan-400 bg-slate-900/50' : 'text-white'}`}
                        maxLength={2}
                        aria-label={label + " (horas)"}
                    />
                    <span className="text-slate-500 mx-1">{separator}</span>
                    <input
                        type="text"
                        value={part2}
                        onChange={e => handlePartChange(1, e.target.value)}
                        onFocus={() => setActiveIndex(1)}
                        onBlur={handleBlur}
                        className={`w-12 p-1 rounded text-center bg-transparent transition-colors outline-none ${activeIndex === 1 ? 'text-cyan-400 bg-slate-900/50' : 'text-white'}`}
                        maxLength={2}
                        aria-label={label + " (minutos)"}
                    />
                </div>
                <div className="flex flex-col items-center">
                    <button onClick={() => handleStep(1)} className="px-2 text-slate-300 hover:text-white hover:bg-slate-600 rounded" aria-label="Aumentar valor">▲</button>
                    <button onClick={() => handleStep(-1)} className="px-2 text-slate-300 hover:text-white hover:bg-slate-600 rounded" aria-label="Disminuir valor">▼</button>
                </div>
            </div>
        </div>
    );
};


const AppointmentModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (appointmentData: Appointment, patientData: Patient, recurringDays: number[], recurringWeeks: number) => void;
  // FIX: Updated existingAppointment to use the centralized AppointmentWithDetails type.
  existingAppointment: AppointmentWithDetails | null;
  existingPatient: Patient | null;
  patients: Patient[];
  selectedDate: Date;
  defaultTime: string;
}> = ({ isOpen, onClose, onSave, existingAppointment, existingPatient, patients, selectedDate, defaultTime }) => {
    const [time, setTime] = useState('11:00');
    const [patientName, setPatientName] = useState('');
    const [patientId, setPatientId] = useState<string | null>(null);
    const [session, setSession] = useState('1/10');
    const [insurance, setInsurance] = useState('');
    const [dni, setDni] = useState('');
    const [doctor, setDoctor] = useState('');
    const [treatment, setTreatment] = useState('');
    const [diagnosis, setDiagnosis] = useState('');
    const [observations, setObservations] = useState('');
    const [recurringDays, setRecurringDays] = useState<number[]>([]);
    const [recurringWeeks, setRecurringWeeks] = useState(3);
    const observationsInputRef = useRef<HTMLTextAreaElement>(null);
    
    useEffect(() => {
        if (isOpen) {
            if (existingAppointment && existingPatient) {
                setTime(existingAppointment.time);
                setPatientName(existingPatient.name);
                setPatientId(existingPatient.id);
                setSession(existingAppointment.session);
                setInsurance(existingPatient.insurance || '');
                setDni(existingPatient.dni || '');
                setDoctor(existingPatient.doctor || '');
                setTreatment(existingPatient.treatment || '');
                setDiagnosis(existingPatient.diagnosis || '');
                setObservations(existingPatient.observations || '');
                setRecurringDays([]);
                setRecurringWeeks(0);
                if (existingPatient.observations) {
                    setTimeout(() => observationsInputRef.current?.focus(), 100);
                }
            } else {
                setTime(defaultTime);
                setPatientName('');
                setPatientId(null);
                setSession('1/10');
                setInsurance('');
                setDni('');
                setDoctor('');
                setTreatment('');
                setDiagnosis('');
                setObservations('');
                setRecurringDays([]);
                setRecurringWeeks(3);
            }
        }
    }, [existingAppointment, existingPatient, isOpen, defaultTime]);

    const handlePatientSelect = (name: string) => {
        setPatientName(name);
        const patient = patients.find(p => p && p.name && p.name.toLowerCase() === name.toLowerCase());
        if (patient) {
            setPatientId(patient.id);
            setInsurance(patient.insurance || '');
            setDni(patient.dni || '');
            setDoctor(patient.doctor || '');
            setTreatment(patient.treatment || '');
            setDiagnosis(patient.diagnosis || '');
            setObservations(patient.observations || '');
        } else {
            setPatientId(null);
        }
    }

    const handleSave = () => {
        const appointmentData: Appointment = {
            id: existingAppointment?.id || `app-${Date.now()}`,
            patientId: patientId || `pat-${Date.now()}`,
            date: selectedDate.toISOString().split('T')[0],
            time,
            session,
        };
        const patientData: Patient = {
            id: patientId || appointmentData.patientId,
            name: patientName,
            dni: dni.trim(),
            insurance, doctor, treatment, diagnosis, observations,
        };
        onSave(appointmentData, patientData, recurringDays, recurringWeeks);
        onClose();
    };

    const toggleRecurringDay = (day: number) => {
        setRecurringDays(prev => 
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const weekDays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={existingAppointment ? 'Editar Turno' : 'Nuevo Turno'}>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                <h4 className="text-lg font-semibold text-cyan-400 border-b border-slate-700 pb-2">Datos del Turno</h4>
                <div className="grid grid-cols-2 gap-4">
                    <StepperInput
                        label="Hora"
                        value={time}
                        onChange={setTime}
                        separator=":"
                        steps={[1, 15]}
                    />
                    <StepperInput
                        label="Sesión (ej. 5/10)"
                        value={session}
                        onChange={setSession}
                        separator="/"
                        steps={[1, 1]}
                    />
                </div>

                {!existingAppointment && (
                    <div className="space-y-4">
                        <label className="block text-sm font-medium text-slate-300">Repetir semanalmente</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-slate-900/50 p-3 rounded-md">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-2">Los días:</label>
                                <div className="flex gap-2">
                                    {weekDays.map((day, index) => {
                                        const jsDay = index === 6 ? 0 : index + 1;
                                        return (
                                            <button key={index} onClick={() => toggleRecurringDay(jsDay)}
                                                className={`w-8 h-8 rounded-full font-bold transition-colors ${recurringDays.includes(jsDay) ? 'bg-cyan-500 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>
                                                {day}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-2">Repetir por:</label>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="number" 
                                        min="0" 
                                        value={recurringWeeks} 
                                        onChange={e => setRecurringWeeks(Math.max(0, Number(e.target.value)))} 
                                        className="w-20 bg-slate-700 border border-slate-600 rounded-md p-2 mt-1"
                                    />
                                    <span className="text-slate-300">{recurringWeeks === 1 ? 'semana' : 'semanas'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                
                <h4 className="text-lg font-semibold text-cyan-400 border-b border-slate-700 pb-2 pt-4">Datos del Paciente</h4>
                <div>
                    <label className="block text-sm font-medium text-slate-300">Nombre del Paciente</label>
                    <input type="text" list="patients-list" value={patientName} onChange={e => handlePatientSelect(e.target.value)} placeholder="Escriba o seleccione un paciente" className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 mt-1 focus:ring-cyan-500 focus:border-cyan-500"/>
                    <datalist id="patients-list">
                        {patients.map(p => <option key={p.id} value={p.name} />)}
                    </datalist>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300">Obra Social</label>
                        <input type="text" value={insurance} onChange={e => setInsurance(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 mt-1"/>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-300">DNI</label>
                        <input type="text" value={dni} onChange={e => setDni(e.target.value)} placeholder="N° de Documento" className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 mt-1"/>
                    </div>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-slate-300">Tratamiento</label>
                    <textarea value={treatment} onChange={e => setTreatment(e.target.value)} rows={2} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 mt-1"></textarea>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300">Médico Derivante</label>
                    <input type="text" value={doctor} onChange={e => setDoctor(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 mt-1"/>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300">Diagnóstico (Dx)</label>
                    <textarea value={diagnosis} onChange={e => setDiagnosis(e.target.value)} rows={2} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 mt-1"/>
                </div>

                 <div>
                    <label className="block text-sm font-medium text-slate-300">Observaciones (Obs)</label>
                    <textarea ref={observationsInputRef} value={observations} onChange={e => setObservations(e.target.value)} rows={2} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 mt-1"/>
                </div>

            </div>
            <div className="flex justify-end pt-4 mt-4 border-t border-slate-700">
                <button onClick={onClose} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-lg transition-colors mr-2">Cancelar</button>
                <button onClick={handleSave} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">Guardar</button>
            </div>
        </Modal>
    );
};

const PatientRegistryModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  patients: Patient[];
  onDeletePatient: (patientId: string) => void;
}> = ({ isOpen, onClose, patients, onDeletePatient }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

    const filteredPatients = useMemo(() => {
        const trimmedSearch = searchTerm.trim();
        if (!trimmedSearch) {
            return patients;
        }
        const lowerCaseSearchTerm = trimmedSearch.toLowerCase();
        return patients.filter(patient =>
            (patient?.name && patient.name.toLowerCase().includes(lowerCaseSearchTerm)) ||
            (patient?.dni && patient.dni === trimmedSearch)
        );
    }, [patients, searchTerm]);
    
    useEffect(() => {
        if (!isOpen) {
            setSearchTerm('');
            setSelectedPatient(null);
        }
    }, [isOpen]);

    const PatientDetail: React.FC<{label: string; value?: string}> = ({ label, value }) => (
        <div>
            <p className="text-sm font-medium text-slate-400">{label}</p>
            <p className="text-lg text-white whitespace-pre-wrap">{value || <span className="text-slate-500">No especificado</span>}</p>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={selectedPatient ? "Detalles del Paciente" : "Registro de Pacientes"}>
            {selectedPatient ? (
                <>
                    <div className="max-h-[60vh] overflow-y-auto pr-2">
                        <button onClick={() => setSelectedPatient(null)} className="flex items-center gap-2 mb-4 text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="http://www.w3.org/2000/svg" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                            <span>Volver a la lista</span>
                        </button>
                        <div className="space-y-4">
                            <h3 className="text-3xl font-bold text-amber-300 border-b border-slate-700 pb-2">{selectedPatient.name}</h3>
                            <PatientDetail label="DNI" value={selectedPatient.dni} />
                            <PatientDetail label="Obra Social" value={selectedPatient.insurance} />
                            <PatientDetail label="Médico Derivante" value={selectedPatient.doctor} />
                            <PatientDetail label="Tratamiento" value={selectedPatient.treatment} />
                            <PatientDetail label="Diagnóstico (Dx)" value={selectedPatient.diagnosis} />
                            <PatientDetail label="Observaciones (Obs)" value={selectedPatient.observations} />
                        </div>
                    </div>
                    <div className="flex justify-end pt-4 mt-4 border-t border-slate-700">
                        <button
                            onClick={() => {
                                onDeletePatient(selectedPatient.id);
                                setSelectedPatient(null);
                            }}
                            className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
                            aria-label={`Eliminar permanentemente a ${selectedPatient.name}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="http://www.w3.org/2000/svg" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                            <span>Eliminar Paciente</span>
                        </button>
                    </div>
                </>
            ) : (
                <>
                    <div className="mb-4 relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" viewBox="http://www.w3.org/2000/svg" fill="currentColor">
                                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                            </svg>
                        </span>
                        <input
                            type="text"
                            placeholder="Buscar paciente por nombre o DNI..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 pl-10 pr-4 focus:ring-cyan-500 focus:border-cyan-500"
                            aria-label="Buscar Paciente"
                        />
                    </div>
                    <div className="max-h-[50vh] overflow-y-auto pr-2">
                        {filteredPatients.length > 0 ? (
                            <ul className="space-y-2">
                                {filteredPatients.map(patient => (
                                    <li 
                                        key={patient.id} 
                                        className="flex justify-between items-center p-3 bg-slate-700 rounded-md hover:bg-slate-600 transition-colors"
                                    >
                                      <span
                                        className="flex-grow cursor-pointer font-semibold text-amber-300"
                                        onClick={() => setSelectedPatient(patient)}
                                        role="button"
                                        tabIndex={0}
                                        onKeyPress={(e) => e.key === 'Enter' && setSelectedPatient(patient)}
                                      >
                                        {patient.name}
                                      </span>
                                      <button
                                          onClick={(e) => {
                                              e.stopPropagation();
                                              onDeletePatient(patient.id);
                                          }}
                                          className="p-2 text-red-400 rounded-full hover:bg-red-900/50 transition-colors flex-shrink-0 ml-2"
                                          aria-label={`Eliminar a ${patient.name}`}
                                          title={`Eliminar a ${patient.name} y todos sus turnos`}
                                      >
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="http://www.w3.org/2000/svg" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                      </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-slate-400 text-center py-4">No se encontraron pacientes.</p>
                        )}
                    </div>
                </>
            )}
        </Modal>
    );
};

const AiAssistantModal: React.FC<{isOpen: boolean; onClose: () => void; patients: Patient[]; appointments: Appointment[];}> = ({isOpen, onClose, patients, appointments}) => {
    const [question, setQuestion] = useState('');
    const [response, setResponse] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleAsk = async () => {
        if (!question.trim()) return;
        setIsLoading(true);
        setResponse('');
        const aiResponse = await getAiAssistance(patients, appointments, question);
        setResponse(aiResponse);
        setIsLoading(false);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Asistente IA">
            <div className="space-y-4">
                <div className="bg-slate-700 p-4 rounded-md min-h-[150px] max-h-[40vh] overflow-y-auto">
                    {isLoading ? <p className="text-cyan-400 animate-pulse">Pensando...</p> : <p className="whitespace-pre-wrap">{response || "Hola, ¿en qué puedo ayudarte hoy?"}</p>}
                </div>
                <div className="flex gap-2">
                    <input type="text" value={question} onChange={e => setQuestion(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleAsk()} placeholder="Ej: ¿Qué días viene Juan Perez?" className="flex-grow bg-slate-700 border border-slate-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500"/>
                    <button onClick={handleAsk} disabled={isLoading} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-slate-500">
                        {isLoading ? '...' : 'Preguntar'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

const DeleteAppointmentOptionsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  patientName: string;
  onDeleteSingle: () => void;
  onDeleteWeek: () => void;
  onChangeSchedule: () => void;
  onDeleteColumn: () => void;
  onExtendWeek: () => void;
  onExtendColumn: () => void;
  onAnnihilate: () => void;
}> = ({ isOpen, onClose, patientName, onDeleteSingle, onDeleteWeek, onChangeSchedule, onDeleteColumn, onExtendWeek, onExtendColumn, onAnnihilate }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Modificar Turno">
      <div className="space-y-4">
        <p>Ha seleccionado un turno de <span className="font-bold text-cyan-400">{patientName}</span>. ¿Qué desea hacer?</p>
      </div>
      <div className="flex flex-wrap justify-end gap-3 pt-4 mt-4 border-t border-slate-700">
        <button onClick={onClose} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">Cancelar</button>
        <button onClick={onExtendWeek} className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">Extender Semana</button>
        <button onClick={onExtendColumn} className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">Extender Columna</button>
        <button onClick={onChangeSchedule} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">Cambiar Horario</button>
        <button onClick={onDeleteSingle} className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">Eliminar este turno</button>
        <button onClick={onDeleteWeek} className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">Eliminar turnos de la semana</button>
        <button onClick={onDeleteColumn} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">Eliminar Columna</button>
        <button onClick={onAnnihilate} className="bg-red-800 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors border-2 border-red-500">Aniquilar</button>
      </div>
    </Modal>
  );
};

const RecurringSlotsViewer: React.FC<{
  date: Date;
  slots: string[];
  onClose: () => void;
}> = ({ date, slots, onClose }) => {
  const dayName = date.toLocaleString('es-ES', { weekday: 'long' });

  return (
    <div className="p-4 bg-slate-800 rounded-lg shadow-lg relative h-full flex flex-col">
      <button 
        onClick={onClose} 
        className="absolute top-2 right-2 text-slate-400 hover:text-white z-10 p-1 text-2xl"
        aria-label="Cerrar vista de turnos recurrentes"
      >
        &times;
      </button>
      <h3 className="text-xl font-bold capitalize text-center mb-4">
        Disponibles los <span className="text-cyan-400">{dayName}</span>
      </h3>
      <div className="flex-grow overflow-y-auto no-scrollbar pr-2">
        {slots.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
            {slots.map(slot => (
              <div key={slot} className="p-2 bg-slate-700 rounded-md font-mono text-white">
                {slot}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-slate-400 pt-8">
            No hay horarios recurrentes 100% libres para los próximos 3 meses.
          </p>
        )}
      </div>
    </div>
  );
};

const PatientScheduleViewer: React.FC<{
  patientName: string;
  schedule: MonthlySchedule[];
  onClose: () => void;
  onAppointmentClick: (date: Date) => void;
  currentDate: Date;
}> = ({ patientName, schedule, onClose, onAppointmentClick, currentDate }) => {
  const WEEK_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const monthRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useLayoutEffect(() => {
    if (schedule.length > 0 && scrollContainerRef.current) {
      const targetYear = currentDate.getFullYear();
      const targetMonthName = currentDate.toLocaleString('es-ES', { month: 'long' });
      const targetKey = `${targetYear}-${targetMonthName}`;
      
      const targetElement = monthRefs.current.get(targetKey);

      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: 'auto',
          block: 'start',
        });
      }
    }
  }, [schedule, currentDate]);


  return (
    <div className="p-4 bg-slate-800 rounded-lg shadow-lg relative h-full flex flex-col">
       <button 
        onClick={onClose} 
        className="absolute top-2 right-2 text-slate-400 hover:text-white z-20 p-1 text-2xl"
        aria-label="Cerrar vista de horarios del paciente"
      >
        &times;
      </button>
      <h3 className="text-xl font-bold capitalize text-center mb-2">
        Horarios de <span className="text-indigo-400">{patientName}</span>
      </h3>

      <div className="grid grid-cols-7 gap-1 text-center text-sm font-semibold text-slate-400 mb-2 px-2">
        {WEEK_DAYS.map(day => <div key={day}>{day}</div>)}
      </div>

      <div ref={scrollContainerRef} className="flex-grow overflow-y-auto no-scrollbar pr-2 space-y-1">
        {schedule.length > 0 ? (
            schedule.map((monthly) => {
              const monthKey = `${monthly.year}-${monthly.month}`;
              return (
                <div 
                  key={monthKey}
                  ref={(el) => {
                    if (el) monthRefs.current.set(monthKey, el);
                    else monthRefs.current.delete(monthKey);
                  }}
                >
                  <h4 className="text-lg font-bold text-center text-cyan-400 capitalize my-2 sticky top-0 bg-slate-800 py-1 z-10">
                    {monthly.month} {monthly.year}
                  </h4>
                  {monthly.weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="grid grid-cols-7 gap-1 min-h-[4rem]">
                        {week.map((day, dayIndex) => {
                            const isWeekend = dayIndex >= 5;
                            return (
                                <div key={dayIndex} className={`p-1 rounded-md transition-colors ${isWeekend ? 'bg-slate-900/50' : 'bg-slate-700/50'}`}>
                                    {day && day.times.length > 0 && (
                                        <>
                                            <span className="text-xs font-bold text-slate-500 flex justify-center items-center h-4 w-4 rounded-full bg-slate-800/50 mx-auto mb-1">
                                                {day.date.getDate()}
                                            </span>
                                            <div className="space-y-1 text-center">
                                                {day.times.map(time => (
                                                    <button
                                                        key={time}
                                                        onClick={() => day && onAppointmentClick(day.date)}
                                                        className="w-full bg-indigo-500 hover:bg-indigo-400 text-white text-base font-bold rounded px-2 py-1 whitespace-nowrap transition-colors text-center"
                                                    >
                                                        {time}
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                  ))}
                </div>
              );
            })
        ) : (
             <p className="text-center text-slate-400 pt-8">
                Este paciente no tiene turnos agendados.
            </p>
        )}
      </div>
    </div>
  );
};


const DniConflictBanner: React.FC<{
  conflictCount: number;
  onResolve: () => void;
}> = ({ conflictCount, onResolve }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-amber-500 text-slate-900 p-4 shadow-lg z-40 flex justify-between items-center animate-pulse">
      <div className="flex items-center gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="http://www.w3.org/2000/svg" fill="currentColor">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 3.001-1.742 3.001H4.42c-1.53 0-2.493-1.667-1.743-3.001l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <span className="font-semibold">
          Alerta: Se {conflictCount === 1 ? 'ha detectado 1 paciente' : `han detectado ${conflictCount} pares de pacientes`} con el mismo DNI pero nombres distintos.
        </span>
      </div>
      <button
        onClick={onResolve}
        className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
      >
        Revisar y Unificar
      </button>
    </div>
  );
};

const DniConflictModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  conflict: [Patient, Patient] | null;
  onUnify: (patientToKeep: Patient, patientToRemove: Patient) => void;
}> = ({ isOpen, onClose, conflict, onUnify }) => {
  const [idToKeep, setIdToKeep] = useState<string | null>(null);

  useEffect(() => {
    if (conflict) {
      // Pre-select the first patient by default
      setIdToKeep(conflict[0].id);
    }
  }, [conflict]);

  if (!isOpen || !conflict) return null;

  const [patientA, patientB] = conflict;

  const handleUnifyClick = () => {
    if (!idToKeep) return;
    const patientToKeep = idToKeep === patientA.id ? patientA : patientB;
    const patientToRemove = idToKeep === patientA.id ? patientB : patientA;
    onUnify(patientToKeep, patientToRemove);
  };

  const PatientCard: React.FC<{ patient: Patient; isSelected: boolean; onSelect: () => void; }> = ({ patient, isSelected, onSelect }) => (
    <div
      onClick={onSelect}
      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${isSelected ? 'border-cyan-500 bg-slate-700' : 'border-slate-600 bg-slate-800 hover:bg-slate-700'}`}
    >
      <div className="flex items-center mb-3">
        <input
          type="radio"
          name="patient-conflict"
          checked={isSelected}
          onChange={onSelect}
          className="w-5 h-5 text-cyan-600 bg-gray-700 border-gray-600 focus:ring-cyan-500"
        />
        <h4 className="text-xl font-bold ml-3">{patient.name}</h4>
      </div>
      <div className="space-y-2 text-sm pl-8">
        <p><span className="font-semibold text-slate-400">Obra Social:</span> {patient.insurance || 'N/A'}</p>
        <p><span className="font-semibold text-slate-400">Tratamiento:</span> {patient.treatment || 'N/A'}</p>
      </div>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Resolver Conflicto de DNI">
      <div className="space-y-4">
        <p>Se encontraron dos pacientes con el DNI <span className="font-bold text-cyan-400">{patientA.dni}</span> pero con nombres diferentes. Seleccione el registro que desea conservar. Todos los turnos se asignarán al paciente seleccionado.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <PatientCard patient={patientA} isSelected={idToKeep === patientA.id} onSelect={() => setIdToKeep(patientA.id)} />
          <PatientCard patient={patientB} isSelected={idToKeep === patientB.id} onSelect={() => setIdToKeep(patientB.id)} />
        </div>
      </div>
      <div className="flex justify-end pt-4 mt-4 border-t border-slate-700">
        <button onClick={onClose} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-lg transition-colors mr-2">Cancelar</button>
        <button onClick={handleUnifyClick} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">Unificar Pacientes</button>
      </div>
    </Modal>
  );
};

const StorageIndicator: React.FC<{
  usedBytes: number;
  maxBytes: number;
  percentage: number;
}> = ({ usedBytes, maxBytes, percentage }) => {
  const usedMB = (usedBytes / (1024 * 1024)).toFixed(2);
  const maxMB = (maxBytes / (1024 * 1024)).toFixed(1);
  const barColor =
    percentage > 90 ? 'bg-red-600' :
    percentage > 75 ? 'bg-amber-500' :
    'bg-green-500';

  return (
    <div className="w-48 bg-slate-700 p-2 rounded-lg" title={`Usando ${usedMB} MB de ${maxMB} MB`}>
      <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
        <span>Almacenamiento Local</span>
        <span>{percentage.toFixed(0)}%</span>
      </div>
      <div className="w-full bg-slate-800 rounded-full h-2.5">
        <div
          className={`${barColor} h-2.5 rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

const StorageWarningBanner: React.FC<{ onClose: () => void, onExport: () => void }> = ({ onClose, onExport }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-red-600 text-white p-4 shadow-lg z-40 flex justify-between items-center animate-pulse">
      <div className="flex items-center gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="http://www.w3.org/2000/svg" fill="currentColor">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 3.001-1.742 3.001H4.42c-1.53 0-2.493-1.667-1.743-3.001l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <span className="font-semibold">
          ¡Atención! El almacenamiento local está casi lleno. Se recomienda exportar una copia de seguridad.
        </span>
      </div>
      <div className="flex items-center gap-4">
        <button onClick={onExport} className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
          Exportar ahora
        </button>
        <button onClick={onClose} className="text-2xl hover:text-slate-200" aria-label="Cerrar advertencia">&times;</button>
      </div>
    </div>
  );
};


// Helper function to get the Monday of a given date
const getMonday = (d: Date): Date => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(date.setDate(diff));
    monday.setHours(0, 0, 0, 0); // Normalize to the start of the day
    return monday;
};

const MAX_HISTORY_SIZE = 15;

export default function App() {
  // State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  
  // Undo/Redo State Management
  const [history, setHistory] = useState<AppState[]>(() => {
    try {
      const savedPatients = window.localStorage.getItem('consultorio-patients');
      const savedAppointments = window.localStorage.getItem('consultorio-appointments');
      const patients = savedPatients ? JSON.parse(savedPatients) as Patient[] : [];
      const appointments = savedAppointments ? JSON.parse(savedAppointments) as Appointment[] : [];
      return [{ patients, appointments }];
    } catch (error) {
      console.error("Error loading initial state from localStorage:", error);
      return [{ patients: [], appointments: [] }];
    }
  });
  const [historyIndex, setHistoryIndex] = useState(0);

  const { patients, appointments } = history[historyIndex];
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Function to update state and record history
  const updateState = useCallback((newState: AppState) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    
    if (newHistory.length > MAX_HISTORY_SIZE) {
        newHistory.shift();
    }
    
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);
  
  const handleUndo = useCallback(() => {
    if (canUndo) {
        setHistoryIndex(historyIndex - 1);
    }
  }, [canUndo, historyIndex]);

  const handleRedo = useCallback(() => {
      if (canRedo) {
          setHistoryIndex(historyIndex + 1);
      }
  }, [canRedo, historyIndex]);

  // Effect to save current state to localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem('consultorio-patients', JSON.stringify(patients));
      window.localStorage.setItem('consultorio-appointments', JSON.stringify(appointments));
    } catch (error) {
      console.error("Error saving state to localStorage:", error);
    }
  }, [patients, appointments]);

  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  // Resizing State
  const [calendarWidth, setCalendarWidth] = useState(420);
  const [isResizing, setIsResizing] = useState(false);
  const mainContentRef = useRef<HTMLDivElement>(null);

  // Modal States
  const [isAppointmentModalOpen, setAppointmentModalOpen] = useState(false);
  // FIX: Updated state to use the centralized AppointmentWithDetails type.
  const [editingAppointment, setEditingAppointment] = useState<AppointmentWithDetails | null>(null);
  const [isPatientRegistryOpen, setPatientRegistryOpen] = useState(false);
  const [isAiModalOpen, setAiModalOpen] = useState(false);
  const [defaultAppointmentTime, setDefaultAppointmentTime] = useState('11:00');
  const [isDeleteOptionsModalOpen, setDeleteOptionsModalOpen] = useState(false);
  const [dateForDeletion, setDateForDeletion] = useState<Date | null>(null);
  
  // New state for recurring slots viewer
  const [recurringSlotsView, setRecurringSlotsView] = useState<{ date: Date; slots: string[] } | null>(null);
  const [recurringHighlightDays, setRecurringHighlightDays] = useState<string[]>([]);

  // DNI Conflict State
  const [dniConflicts, setDniConflicts] = useState<[Patient, Patient][]>([]);
  const [isDniConflictModalOpen, setDniConflictModalOpen] = useState(false);
  const [showStorageWarning, setShowStorageWarning] = useState(false);

  // Patient Search State
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const patientSearchRef = useRef<HTMLDivElement>(null);

  // Storage Usage Calculation
  const storageUsage = useMemo(() => {
    const MAX_STORAGE_BYTES = 5 * 1024 * 1024; // 5 MB
    try {
        const patientsStr = JSON.stringify(patients);
        const appointmentsStr = JSON.stringify(appointments);
        // Using Blob size for a more accurate byte count
        const usedBytes = new Blob([patientsStr, appointmentsStr]).size;
        const percentage = (usedBytes / MAX_STORAGE_BYTES) * 100;
        return { usedBytes, maxBytes: MAX_STORAGE_BYTES, percentage };
    } catch (e) {
        console.error("Could not calculate storage usage:", e);
        return { usedBytes: 0, maxBytes: MAX_STORAGE_BYTES, percentage: 0 };
    }
  }, [patients, appointments]);

  // Effect to show storage warning
  useEffect(() => {
      if (storageUsage.percentage > 90) {
          setShowStorageWarning(true);
      }
  }, [storageUsage.percentage]);

  // Effect to detect DNI conflicts
  useEffect(() => {
    const findConflicts = () => {
      const dniMap = new Map<string, Patient[]>();
      // Group patients by DNI
      for (const patient of patients) {
        if (patient.dni && patient.dni.trim()) {
          const dni = patient.dni.trim();
          if (!dniMap.has(dni)) {
            dniMap.set(dni, []);
          }
          dniMap.get(dni)!.push(patient);
        }
      }

      const conflicts: [Patient, Patient][] = [];
      // Find groups with more than one patient and different names
      for (const patientGroup of dniMap.values()) {
        if (patientGroup.length > 1) {
          // This handles all pairs within a group of duplicates
          for (let i = 0; i < patientGroup.length; i++) {
            for (let j = i + 1; j < patientGroup.length; j++) {
              const name1 = patientGroup[i].name.toLowerCase().trim().replace(/\s+/g, ' ');
              const name2 = patientGroup[j].name.toLowerCase().trim().replace(/\s+/g, ' ');
              if (name1 !== name2) {
                conflicts.push([patientGroup[i], patientGroup[j]]);
              }
            }
          }
        }
      }
      setDniConflicts(conflicts);
    };
    findConflicts();
  }, [patients]);
  
  // Memoized derived state
  // FIX: Refactored to use a for...of loop instead of .map() to prevent a subtle TypeScript 
  // inference issue where the returned array elements were being typed as `unknown`.
  const appointmentsForSelectedDay = useMemo((): AppointmentWithDetails[] => {
    if (!selectedDate) return [];
    const dateStr = selectedDate.toISOString().split('T')[0];
    
    const result: AppointmentWithDetails[] = [];
    // FIX: Explicitly typing the `app` parameter as `Appointment` resolves a TypeScript
    // inference error where it was being treated as `unknown`.
    const filteredApps = appointments.filter((app: Appointment) => app.date === dateStr);

    for (const app of filteredApps) {
      const patient = patients.find(p => p.id === app.patientId);
      result.push({
        ...app,
        patientName: patient?.name || 'Desconocido',
        observations: patient?.observations
      });
    }
    return result.sort((a,b) => a.time.localeCompare(b.time));
  }, [selectedDate, appointments, patients]);

  const highlightedPatientDays = useMemo(() => {
    if (!selectedPatientId) return [];
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    const nextMonth = (month + 1) % 12;
    const nextYear = month === 11 ? year + 1 : year;
    
    return appointments
      // FIX: Explicitly typing `app` prevents TypeScript from inferring it as `unknown`.
      .filter((app: Appointment) => {
        const appDate = new Date(`${app.date}T12:00:00`); // Use midday to avoid timezone issues
        return app.patientId === selectedPatientId && 
               ((appDate.getMonth() === month && appDate.getFullYear() === year) || 
                (appDate.getMonth() === nextMonth && appDate.getFullYear() === nextYear));
      })
      // FIX: Explicitly typing `app` prevents TypeScript from inferring it as `unknown`.
      .map((app: Appointment) => app.date);
  }, [selectedPatientId, appointments, currentDate]);
  
  const highlightedPatientName = useMemo(() => {
    if (!selectedPatientId) return '';
    return patients.find(p => p.id === selectedPatientId)?.name || 'Desconocido';
  }, [selectedPatientId, patients]);

  const highlightedPatientSchedule = useMemo((): MonthlySchedule[] => {
    if (!selectedPatientId) return [];

    const patientAppointments = appointments
        .filter((app: Appointment) => app.patientId === selectedPatientId)
        .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
    
    if (patientAppointments.length === 0) return [];

    const weeksMap = new Map<string, WeekSchedule>();

    for (const app of patientAppointments) {
        const appDate = new Date(`${app.date}T12:00:00`);
        const monday = getMonday(appDate);
        const mondayString = monday.toISOString().split('T')[0];
        
        if (!weeksMap.has(mondayString)) {
            weeksMap.set(mondayString, Array(7).fill(null));
        }

        const weekSchedule = weeksMap.get(mondayString)!;
        const dayIndex = (appDate.getDay() + 6) % 7; // Monday = 0

        if (weekSchedule[dayIndex] === null) {
            weekSchedule[dayIndex] = { date: appDate, times: [] };
        }
        (weekSchedule[dayIndex] as DaySchedule).times.push(app.time);
    }
    
    const sortedWeeks = Array.from(weeksMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([mondayString, week]) => ({ mondayString, week }));

    const monthlySchedules: MonthlySchedule[] = [];
    if (sortedWeeks.length === 0) return [];

    let currentMonth = -1;
    let currentYear = -1;
    
    for (const { mondayString, week } of sortedWeeks) {
        // Find the first day with an appointment to correctly identify the week's month,
        // especially for weeks spanning two months.
        const firstDayInWeek = week.find(d => d !== null) as DaySchedule | undefined;
        // If no appointments this week (shouldn't happen with this logic but as a fallback), use Monday.
        const representativeDate = firstDayInWeek ? firstDayInWeek.date : new Date(`${mondayString}T12:00:00`);
        
        const month = representativeDate.getMonth();
        const year = representativeDate.getFullYear();

        if (month !== currentMonth || year !== currentYear) {
            currentMonth = month;
            currentYear = year;
            monthlySchedules.push({
                month: representativeDate.toLocaleString('es-ES', { month: 'long' }),
                year: year,
                weeks: []
            });
        }
        monthlySchedules[monthlySchedules.length - 1].weeks.push(week);
    }

    return monthlySchedules;

  }, [selectedPatientId, appointments]);

  const nextMonthDate = useMemo(() => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + 1, 1);
    return d;
  }, [currentDate]);

  // Patient Search Results
  const filteredPatientsForSearch = useMemo(() => {
      const trimmedSearch = patientSearchTerm.trim();
      if (!trimmedSearch) {
          return [];
      }
      const lowerCaseSearchTerm = trimmedSearch.toLowerCase();
      return patients
          .filter(p => 
            (p?.name && p.name.toLowerCase().includes(lowerCaseSearchTerm)) ||
            (p?.dni && p.dni === trimmedSearch)
          )
          .slice(0, 5); // Limit results to 5
  }, [patientSearchTerm, patients]);


  // Handlers
   const calculateRecurringSlots = useCallback((clickedDate: Date): string[] => {
    const searchWeeks = 12; // Check for the next 3 months
    const availableSlots: string[] = [];

    const scheduleStartHour = 11;
    const scheduleEndHour = 18;
    const standardSlots: string[] = [];
    // The loop now stops before 18:00, making 17:30 the last available slot.
    for (let h = scheduleStartHour; h < scheduleEndHour; h++) {
        standardSlots.push(`${String(h).padStart(2, '0')}:00`);
        standardSlots.push(`${String(h).padStart(2, '0')}:30`);
    }

    const appointmentsLookup = new Set(
        // FIX: Explicitly typing `app` prevents TypeScript from inferring it as `unknown`.
        appointments.map((app: Appointment) => `${app.date}|${app.time}`)
    );

    for (const slot of standardSlots) {
        let isSlotConsistentlyAvailable = true;
        for (let week = 0; week < searchWeeks; week++) {
            const dateToCheck = new Date(clickedDate);
            dateToCheck.setDate(dateToCheck.getDate() + (week * 7));
            const dateString = dateToCheck.toISOString().split('T')[0];

            if (appointmentsLookup.has(`${dateString}|${slot}`)) {
                isSlotConsistentlyAvailable = false;
                break;
            }
        }

        if (isSlotConsistentlyAvailable) {
            availableSlots.push(slot);
        }
    }

    return availableSlots;
  }, [appointments]);

  const handleDateClick = useCallback((date: Date) => {
    setRecurringHighlightDays([]); // Clear green highlights on any date click
    const dateString = date.toISOString().split('T')[0];

    if (selectedPatientId && highlightedPatientDays.includes(dateString)) {
        setDateForDeletion(date);
        setDeleteOptionsModalOpen(true);
        return; 
    }
    
    // Toggle recurring slots view if clicking the same day
    if (recurringSlotsView && recurringSlotsView.date.toISOString().split('T')[0] === dateString) {
        setRecurringSlotsView(null);
    } else {
        const availableRecurringSlots = calculateRecurringSlots(date);
        setRecurringSlotsView({ date, slots: availableRecurringSlots });
    }

    setSelectedDate(date);
    if (!selectedPatientId) {
       // Only clear highlight if we are not in highlight mode
       setSelectedPatientId(null);
    }
    // If we are in highlight mode, clicking a non-highlighted day will switch context
    // and this condition will be false, so the highlight remains until explicitly cleared.
    // Clicking a highlighted day is handled by the block above.
    if(selectedPatientId && !highlightedPatientDays.includes(dateString)) {
       setSelectedPatientId(null);
    }


  }, [selectedPatientId, highlightedPatientDays, recurringSlotsView, calculateRecurringSlots]);
  
  const isSlotRecurring = useCallback((time: string, dateForDayOfWeek: Date): boolean => {
    const searchWeeks = 12;
    const appointmentsLookup = new Set(
        appointments.map((app: Appointment) => `${app.date}|${app.time}`)
    );
    for (let week = 0; week < searchWeeks; week++) {
        const dateToCheck = new Date(dateForDayOfWeek);
        dateToCheck.setDate(dateToCheck.getDate() + (week * 7));
        const dateString = dateToCheck.toISOString().split('T')[0];
        if (appointmentsLookup.has(`${dateString}|${time}`)) {
            return false;
        }
    }
    return true;
  }, [appointments]);

  const handleShowRecurringWeekAvailability = useCallback((time: string, baseDate: Date) => {
    const monday = getMonday(baseDate);
    const availableDays: string[] = [];

    // Iterate from Monday (i=0) to Friday (i=4)
    for (let i = 0; i < 5; i++) {
        const dayToCheck = new Date(monday);
        dayToCheck.setDate(monday.getDate() + i);
        if (isSlotRecurring(time, dayToCheck)) {
            availableDays.push(dayToCheck.toISOString().split('T')[0]);
        }
    }
    setRecurringHighlightDays(availableDays);
    setSelectedPatientId(null);
    setRecurringSlotsView(null);
  }, [isSlotRecurring]);

  // FIX: Updated handler to use the centralized AppointmentWithDetails type.
  const handleSelectAppointment = useCallback((appointment: AppointmentWithDetails) => {
      setSelectedPatientId(appointment.patientId);
      setEditingAppointment(appointment);
      setAppointmentModalOpen(true);
  }, []);

  const handleHighlightPatient = useCallback((patientId: string, time: string) => {
    // If clicking the same patient, toggle off all highlights
    if (selectedPatientId === patientId) {
        setSelectedPatientId(null);
        setRecurringHighlightDays([]);
        return;
    }

    // Set patient highlight (indigo globes)
    setSelectedPatientId(patientId);
    
    // Also, calculate and set recurring availability for the clicked time (green globes)
    if (selectedDate) {
        const monday = getMonday(selectedDate);
        const availableDays: string[] = [];
        for (let i = 0; i < 5; i++) {
            const dayToCheck = new Date(monday);
            dayToCheck.setDate(monday.getDate() + i);
            if (isSlotRecurring(time, dayToCheck)) {
                availableDays.push(dayToCheck.toISOString().split('T')[0]);
            }
        }
        setRecurringHighlightDays(availableDays);
    }
    
    setRecurringSlotsView(null); // Close recurring view
  }, [selectedPatientId, selectedDate, isSlotRecurring]);

  const handleOpenNewAppointment = useCallback((time?: string) => {
    if (!selectedDate) return;
    setEditingAppointment(null);
    setDefaultAppointmentTime(time || '11:00');
    setAppointmentModalOpen(true);
  }, [selectedDate]);

  const handleSaveAppointment = (appointmentData: Appointment, patientData: Patient, recurringDays: number[], recurringWeeks: number) => {
      let currentPatients = [...patients];
      let currentAppointments = [...appointments];

      // --- ROBUST CHECK FOR SAME NAME, DIFFERENT DNI ---
      const patientNameLower = patientData.name.toLowerCase().trim();
      const newDni = patientData.dni?.trim() || null;
      
      // Find a DIFFERENT patient with the same name but a different DNI.
      const conflictingPatient = currentPatients.find(p => 
          p.id !== patientData.id && // Exclude the patient being edited from the search.
          p.name.toLowerCase().trim() === patientNameLower &&
          (p.dni?.trim() || null) !== newDni
      );

      if (conflictingPatient) {
          const confirmation = window.confirm(
              `ADVERTENCIA: Ya existe otro paciente llamado '${conflictingPatient.name}' con un DNI diferente (${conflictingPatient.dni || 'ninguno'}).\n\n` +
              `Si continúa, se creará un registro de paciente completamente nuevo para '${patientData.name}'.\n\n` +
              `Haga clic en 'Aceptar' para crear un NUEVO paciente, o 'Cancelar' para revisar los datos.`
          );

          if (confirmation) {
              // User confirmed to create a new patient, so we generate a new ID for them.
              const newPatientId = `pat-${Date.now()}`;
              patientData.id = newPatientId;
              appointmentData.patientId = newPatientId;
          } else {
              return; // User cancelled, abort the save operation.
          }
      }
      
      const trimmedDni = patientData.dni?.trim();

      // --- UNIFICATION LOGIC (for existing appointments only) ---
      if (editingAppointment) {
        const originalPatientId = editingAppointment.patientId;
        if (originalPatientId && trimmedDni) {
          const targetPatientByDni = currentPatients.find(p => p.dni === trimmedDni && p.id !== originalPatientId);
          if (targetPatientByDni) {
            const sourcePatientName = currentPatients.find(p => p.id === originalPatientId)?.name || 'Desconocido';
            const confirmationMessage = `Se encontró al paciente "${targetPatientByDni.name}" con el mismo DNI. ¿Desea unificar todos los turnos de "${sourcePatientName}" con este paciente? Se usarán los datos del formulario actual para actualizar el registro.`;

            if (window.confirm(confirmationMessage)) {
              const newPatients = currentPatients
                .map(p =>
                  p.id === targetPatientByDni.id ? { ...patientData, id: targetPatientByDni.id } : p
                ).filter(p => p.id !== originalPatientId);

              const newAppointments = currentAppointments.map((app: Appointment) =>
                  app.patientId === originalPatientId
                    ? { ...app, patientId: targetPatientByDni.id }
                    : app,
                );
              updateState({ patients: newPatients, appointments: newAppointments });
              return; // Stop further execution
            }
          }
        }
      }

      // --- REGULAR SAVE LOGIC (if no unification happened) ---
      const patientExists = currentPatients.some(p => p.id === patientData.id);
      if (patientExists) {
          currentPatients = currentPatients.map(p => p.id === patientData.id ? patientData : p);
      } else {
          currentPatients = [...currentPatients, patientData];
      }

      const renumberFutureSessions = (
          allAppointments: Appointment[],
          triggerAppointment: Appointment
      ): Appointment[] => {
          const { patientId, date: startDate, time: startTime, session: startSession } = triggerAppointment;

          const sessionMatch = startSession.match(/^(\d+)(.*)$/);
          if (!sessionMatch) return allAppointments;

          let currentSessionNumber = parseInt(sessionMatch[1], 10);
          const sessionSuffix = sessionMatch[2] || '';

          const futureAppointments = allAppointments
              .filter(app =>
                  app.patientId === patientId &&
                  (app.date > startDate || (app.date === startDate && app.time > startTime))
              )
              .sort((a, b) => {
                  if (a.date !== b.date) return a.date.localeCompare(b.date);
                  return a.time.localeCompare(b.time);
              });

          const updatedAppointmentsMap = new Map(allAppointments.map(app => [app.id, { ...app }]));

          for (const appToUpdate of futureAppointments) {
              currentSessionNumber++;
              const updatedApp = { ...appToUpdate, session: `${currentSessionNumber}${sessionSuffix}` };
              updatedAppointmentsMap.set(appToUpdate.id, updatedApp);
          }

          return Array.from(updatedAppointmentsMap.values());
      };

      // FIX: Explicitly typing `a` prevents TypeScript from inferring it as `unknown`.
      const appointmentExists = currentAppointments.some((a: Appointment) => a.id === appointmentData.id);
      
      if (appointmentExists) {
          // FIX: Explicitly typing `a` prevents TypeScript from inferring it as `unknown`.
          const updatedAppointments = currentAppointments.map((a: Appointment) => a.id === appointmentData.id ? appointmentData : a);
          const renumberedAppointments = renumberFutureSessions(updatedAppointments, appointmentData);
          updateState({ patients: currentPatients, appointments: renumberedAppointments });
      } else {
          let newAppointments: Appointment[] = [];
          
          if (recurringDays.length > 0 && selectedDate && recurringWeeks >= 0) {
              const startWeekMonday = getMonday(selectedDate);
              const totalDaysToScan = (recurringWeeks + 1) * 7;

              for (let i = 0; i < totalDaysToScan; i++) {
                  const potentialDate = new Date(startWeekMonday);
                  potentialDate.setDate(startWeekMonday.getDate() + i);

                  if (recurringDays.includes(potentialDate.getDay())) {
                      newAppointments.push({
                          ...appointmentData,
                          id: `app-${Date.now()}-${potentialDate.toISOString()}-${i}`,
                          date: potentialDate.toISOString().split('T')[0],
                      });
                  }
              }
          } else {
              newAppointments.push(appointmentData);
          }

          if (newAppointments.length > 1) {
              const sessionMatch = newAppointments[0].session.match(/^(\d+)(.*)$/);
              if (sessionMatch) {
                  let sessionCounter = parseInt(sessionMatch[1], 10);
                  const sessionSuffix = sessionMatch[2] || '';
                  
                  newAppointments.sort((a,b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
                  
                  newAppointments[0].session = `${sessionCounter}${sessionSuffix}`;
                  for (let i = 1; i < newAppointments.length; i++) {
                      sessionCounter++;
                      newAppointments[i].session = `${sessionCounter}${sessionSuffix}`;
                  }
              }
          }

          // FIX: Explicitly typing `app` prevents TypeScript from inferring it as `unknown`.
          const existingAppointmentsByDateTime = new Map(currentAppointments.map((app: Appointment) => [`${app.date}|${app.time}`, app]));
          const conflicts = newAppointments.filter(newApp => existingAppointmentsByDateTime.has(`${newApp.date}|${newApp.time}`));

          if (conflicts.length > 0) {
              const conflictDetailsList: string[] = [];
              for (const c of conflicts) {
                  const existing = existingAppointmentsByDateTime.get(`${c.date}|${c.time}`);
                  if (existing) {
                      // FIX: Property 'patientId' does not exist on type 'unknown'. Cast `existing` from a Map.get() result to the expected `Appointment` type.
                      const patientName = currentPatients.find(p => p.id === (existing as Appointment).patientId)?.name || 'Desconocido';
                      conflictDetailsList.push(`- ${new Date(c.date + 'T12:00:00').toLocaleDateString('es-ES', {day: '2-digit', month: '2-digit'})} a las ${c.time} con ${patientName}`);
                  }
              }
              const conflictDetails = conflictDetailsList.join('\n');

              if (!window.confirm(`Atención: Los siguientes turnos se sobrescribirán:\n${conflictDetails}\n\n¿Desea continuar?`)) {
                  return;
              }

              const conflictKeys = new Set(conflicts.map(c => `${c.date}|${c.time}`));
              // FIX: Explicitly typing `app` prevents TypeScript from inferring it as `unknown`.
              const nonConflictingAppointments = currentAppointments.filter((app: Appointment) => !conflictKeys.has(`${app.date}|${app.time}`));
              updateState({ patients: currentPatients, appointments: [...nonConflictingAppointments, ...newAppointments] });
          } else {
              // FIX: Explicitly typing `prev` prevents TypeScript from inferring it as `unknown[]`.
              updateState({ patients: currentPatients, appointments: [...currentAppointments, ...newAppointments] });
          }
      }
  };


  const handleDeleteAppointment = useCallback((appointmentId: string) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar este turno?")) {
      // FIX: Explicitly typing `a` prevents TypeScript from inferring it as `unknown`.
      const newAppointments = appointments.filter((a: Appointment) => a.id !== appointmentId);
      updateState({ patients, appointments: newAppointments });
    }
  }, [patients, appointments, updateState]);

  const handleDeletePatient = useCallback((patientId: string) => {
    const patientToDelete = patients.find(p => p.id === patientId);
    if (!patientToDelete) return;

    const confirmMessage = `¡Atención! Esta acción eliminará al paciente '${patientToDelete.name}' y TODOS sus turnos agendados. Esta acción no se puede deshacer.\n\n¿Desea continuar?`;
    
    if (window.confirm(confirmMessage)) {
      const newPatients = patients.filter(p => p.id !== patientId);
      const newAppointments = appointments.filter(app => app.patientId !== patientId);
      updateState({ patients: newPatients, appointments: newAppointments });
    }
  }, [patients, appointments, updateState]);

  const handleDeleteSingle = () => {
    if (!dateForDeletion || !selectedPatientId) return;
    const dateString = dateForDeletion.toISOString().split('T')[0];
    // FIX: Explicitly typing `app` prevents TypeScript from inferring it as `unknown`.
    const newAppointments = appointments.filter((app: Appointment) => 
      !(app.patientId === selectedPatientId && app.date === dateString)
    );
    updateState({ patients, appointments: newAppointments });
    setDeleteOptionsModalOpen(false);
    setDateForDeletion(null);
  };

  const handleDeleteWeek = () => {
    if (!dateForDeletion || !selectedPatientId) return;

    const targetDate = new Date(dateForDeletion);
    const dayOfWeek = targetDate.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    // The calendar starts on Monday. We calculate the offset to find the start of the week (Monday).
    const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1; 
    
    const startOfWeek = new Date(targetDate);
    startOfWeek.setDate(targetDate.getDate() - offset);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // FIX: Explicitly typing `app` prevents TypeScript from inferring it as `unknown`.
    const newAppointments = appointments.filter((app: Appointment) => {
      if (app.patientId !== selectedPatientId) {
        return true; // Keep appointments for other patients
      }
      const appDate = new Date(`${app.date}T12:00:00`); // Use midday to avoid timezone issues
      return !(appDate >= startOfWeek && appDate <= endOfWeek);
    });

    updateState({ patients, appointments: newAppointments });
    setDeleteOptionsModalOpen(false);
    setDateForDeletion(null);
  };

  const handleDeleteColumn = () => {
    if (!dateForDeletion || !selectedPatientId) return;
    
    const targetDate = new Date(dateForDeletion);
    targetDate.setHours(0, 0, 0, 0); // Normalize for comparison

    const targetDateString = targetDate.toISOString().split('T')[0];
    const targetDayOfWeek = targetDate.getDay();

    // FIX: Explicitly typing `app` prevents TypeScript from inferring it as `unknown`.
    const newAppointments = appointments.filter((app: Appointment) => {
        if (app.patientId !== selectedPatientId) {
            return true;
        }
        
        const appDate = new Date(`${app.date}T12:00:00`);
        const isFutureDate = app.date > targetDateString;
        const isSameDayOfWeek = appDate.getDay() === targetDayOfWeek;

        if (isFutureDate && isSameDayOfWeek) {
            return false;
        }
        
        return true;
    });

    updateState({ patients, appointments: newAppointments });
    setDeleteOptionsModalOpen(false);
    setDateForDeletion(null);
    setSelectedPatientId(null);
  };

  const handleAnnihilate = useCallback(() => {
    if (!dateForDeletion || !selectedPatientId || !highlightedPatientName) return;

    const confirmMessage = `¡Atención! Esta acción eliminará TODOS los turnos futuros de "${highlightedPatientName}" a partir de mañana y durante los próximos 3 meses.\n\nEsta acción no se puede deshacer. ¿Desea continuar?`;

    if (window.confirm(confirmMessage)) {
        const startDate = new Date(dateForDeletion);
        startDate.setDate(startDate.getDate() + 1); // From tomorrow
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 3); // For the next 3 months
        endDate.setHours(23, 59, 59, 999);

        const newAppointments = appointments.filter((app: Appointment) => {
            if (app.patientId !== selectedPatientId) {
                return true;
            }
            
            const appDate = new Date(`${app.date}T12:00:00`);
            const isInRange = appDate >= startDate && appDate <= endDate;
            return !isInRange;
        });

        updateState({ patients, appointments: newAppointments });
        setDeleteOptionsModalOpen(false);
        setDateForDeletion(null);
        setSelectedPatientId(null);
        alert(`Se han eliminado los turnos futuros de ${highlightedPatientName}.`);
    }
  }, [dateForDeletion, selectedPatientId, highlightedPatientName, appointments, patients, updateState]);


  // FIX: Wrapped handler in useCallback to stabilize its reference, which can help prevent subtle type inference issues in child components.
  const handleExtendWeek = useCallback(() => {
    if (!dateForDeletion || !selectedPatientId) return;

    const targetDate = new Date(dateForDeletion);
    const dayOfWeek = targetDate.getDay();
    const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1; 
    
    const startOfWeek = new Date(targetDate);
    startOfWeek.setDate(targetDate.getDate() - offset);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const appointmentsInWeek = appointments.filter((app: Appointment) => {
        if (app.patientId !== selectedPatientId) return false;
        const appDate = new Date(`${app.date}T12:00:00`);
        return appDate >= startOfWeek && appDate <= endOfWeek;
    });

    if (appointmentsInWeek.length === 0) {
        alert("No se encontraron turnos para este paciente en la semana seleccionada para extender.");
        setDeleteOptionsModalOpen(false);
        setDateForDeletion(null);
        return;
    }

    const latestAppointment = appointments
      .filter((a: Appointment) => a.patientId === selectedPatientId)
      .sort((a: Appointment, b: Appointment) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return b.time.localeCompare(a.time);
      })[0];
      
    let baseSessionNumber = 0;
    let sessionSuffix = '';
    
    if (latestAppointment) {
      const match = latestAppointment.session.match(/^(\d+)(.*)$/);
      if (match) {
        baseSessionNumber = parseInt(match[1], 10);
        sessionSuffix = match[2] || '';
      }
    } else if (appointmentsInWeek.length > 0) {
      const match = appointmentsInWeek[0].session.match(/^(\d+)(.*)$/);
      if (match) {
        baseSessionNumber = parseInt(match[1], 10) - appointmentsInWeek.length;
        sessionSuffix = match[2] || '';
      }
    }
    
    const appointmentsToCreate = appointmentsInWeek
        .map((app: Appointment) => {
            const nextWeekDate = new Date(`${app.date}T12:00:00`);
            nextWeekDate.setDate(nextWeekDate.getDate() + 7);
            return {
                ...app,
                id: `app-${Date.now()}-${nextWeekDate.toISOString()}-${Math.random()}`,
                date: nextWeekDate.toISOString().split('T')[0],
            };
        })
        .sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(a.date);
            return a.time.localeCompare(b.time);
        });

    let sessionCounter = baseSessionNumber;
    const newAppointmentsToAdd = appointmentsToCreate.map(app => {
      sessionCounter++;
      return { ...app, session: `${sessionCounter}${sessionSuffix}` };
    });

    const existingAppointmentsByDateTime = new Map(appointments.map((app: Appointment) => [`${app.date}|${app.time}`, app]));
    const conflicts = newAppointmentsToAdd.filter(newApp => existingAppointmentsByDateTime.has(`${newApp.date}|${newApp.time}`));

    if (conflicts.length > 0) {
        const conflictDetailsList: string[] = [];
        for (const c of conflicts) {
            const existing = existingAppointmentsByDateTime.get(`${c.date}|${c.time}`);
            if (existing) {
                // FIX: Property 'patientId' does not exist on type 'unknown'. Cast `existing` from a Map.get() result to the expected `Appointment` type.
                const patientName = patients.find(p => p.id === (existing as Appointment).patientId)?.name || 'Desconocido';
                conflictDetailsList.push(`- ${new Date(c.date + 'T12:00:00').toLocaleDateString('es-ES', {day: '2-digit', month: '2-digit'})} a las ${c.time} con ${patientName}`);
            }
        }
        const conflictDetails = conflictDetailsList.join('\n');

        if (!window.confirm(`Atención: Los siguientes turnos se sobrescribirán:\n${conflictDetails}\n\n¿Desea continuar?`)) {
            setDeleteOptionsModalOpen(false);
            setDateForDeletion(null);
            return;
        }

        const conflictKeys = new Set(conflicts.map(c => `${c.date}|${c.time}`));
        const nonConflictingAppointments = appointments.filter((app: Appointment) => !conflictKeys.has(`${app.date}|${app.time}`));
        updateState({patients, appointments: [...nonConflictingAppointments, ...newAppointmentsToAdd]});
    } else {
        updateState({patients, appointments: [...appointments, ...newAppointmentsToAdd]});
    }

    setDeleteOptionsModalOpen(false);
    setDateForDeletion(null);
    setSelectedPatientId(null);
  }, [dateForDeletion, selectedPatientId, appointments, patients, updateState]);
  
  const handleExtendColumn = useCallback(() => {
    if (!dateForDeletion || !selectedPatientId) return;

    const dateString = dateForDeletion.toISOString().split('T')[0];

    const appointmentsOnDay = appointments.filter((app: Appointment) => {
        return app.patientId === selectedPatientId && app.date === dateString;
    });

    if (appointmentsOnDay.length === 0) {
        alert("No se encontraron turnos para este paciente en el día seleccionado para extender.");
        setDeleteOptionsModalOpen(false);
        setDateForDeletion(null);
        return;
    }
    
    appointmentsOnDay.sort((a,b) => a.time.localeCompare(b.time));

    // FIX: Explicitly typing the parameters in `filter` and `sort` resolves a TypeScript inference issue where they were being treated as `unknown`.
    const latestAppointment = appointments
        .filter((a: Appointment) => a.patientId === selectedPatientId)
        .sort((a: Appointment, b: Appointment) => {
            if (a.date !== b.date) return b.date.localeCompare(a.date);
            return b.time.localeCompare(a.time);
        })[0];
    
    let baseSessionNumber = 0;
    let sessionSuffix = '';
    
    if (latestAppointment) {
        const match = latestAppointment.session.match(/^(\d+)(.*)$/);
        if (match) {
            baseSessionNumber = parseInt(match[1], 10);
            sessionSuffix = match[2] || '';
        }
    } else {
        const match = appointmentsOnDay[0].session.match(/^(\d+)(.*)$/);
        if (match) {
            baseSessionNumber = parseInt(match[1], 10);
            sessionSuffix = match[2] || '';
        }
    }

    const newAppointmentsToAdd = appointmentsOnDay.map((app: Appointment, index) => {
        const nextWeekDate = new Date(`${app.date}T12:00:00`);
        nextWeekDate.setDate(nextWeekDate.getDate() + 7);
        
        const newSessionNumber = baseSessionNumber + 1 + index;
        
        return {
            ...app,
            id: `app-${Date.now()}-${nextWeekDate.toISOString()}-${index}`,
            date: nextWeekDate.toISOString().split('T')[0],
            session: `${newSessionNumber}${sessionSuffix}`,
        };
    });

    const existingAppointmentsByDateTime = new Map(appointments.map((app: Appointment) => [`${app.date}|${app.time}`, app]));
    const conflicts = newAppointmentsToAdd.filter(newApp => existingAppointmentsByDateTime.has(`${newApp.date}|${newApp.time}`));

    if (conflicts.length > 0) {
        const conflictDetailsList: string[] = [];
        for (const c of conflicts) {
            const existing = existingAppointmentsByDateTime.get(`${c.date}|${c.time}`);
            if (existing) {
                // FIX: Property 'patientId' does not exist on type 'unknown'. Cast `existing` from a Map.get() result to the expected `Appointment` type.
                const patientName = patients.find(p => p.id === (existing as Appointment).patientId)?.name || 'Desconocido';
                conflictDetailsList.push(`- ${new Date(c.date + 'T12:00:00').toLocaleDateString('es-ES', {day: '2-digit', month: '2-digit'})} a las ${c.time} con ${patientName}`);
            }
        }
        const conflictDetails = conflictDetailsList.join('\n');

        if (!window.confirm(`Atención: Los siguientes turnos se sobrescribirán:\n${conflictDetails}\n\n¿Desea continuar?`)) {
            setDeleteOptionsModalOpen(false);
            setDateForDeletion(null);
            return;
        }

        const conflictKeys = new Set(conflicts.map(c => `${c.date}|${c.time}`));
        const nonConflictingAppointments = appointments.filter((app: Appointment) => !conflictKeys.has(`${app.date}|${app.time}`));
        updateState({patients, appointments: [...nonConflictingAppointments, ...newAppointmentsToAdd]});
    } else {
        updateState({patients, appointments: [...appointments, ...newAppointmentsToAdd]});
    }

    setDeleteOptionsModalOpen(false);
    setDateForDeletion(null);
    setSelectedPatientId(null);
  }, [dateForDeletion, selectedPatientId, appointments, patients, updateState]);

  const handleUnifyConflict = useCallback((patientToKeep: Patient, patientToRemove: Patient) => {
    // FIX: Explicitly typing `app` as `Appointment` resolves an issue where its type
    // was inferred as `unknown` within the `.map` callback.
    const newAppointments = appointments.map((app: Appointment) => {
        if (app.patientId === patientToRemove.id) {
          return { ...app, patientId: patientToKeep.id };
        }
        return app;
    });
  
    const newPatients = patients.filter(p => p.id !== patientToRemove.id);
    updateState({ patients: newPatients, appointments: newAppointments });

    const remainingConflicts = dniConflicts.filter(
      pair => pair[0].id !== patientToKeep.id && pair[1].id !== patientToKeep.id &&
              pair[0].id !== patientToRemove.id && pair[1].id !== patientToRemove.id
    );
  
    if (remainingConflicts.length === 0) {
      setDniConflictModalOpen(false);
    }
  }, [dniConflicts, patients, appointments, updateState]);


  const handleOpenScheduleForDay = () => {
    if (!dateForDeletion) return;
    setSelectedDate(dateForDeletion);
    setDeleteOptionsModalOpen(false);
    setDateForDeletion(null);
  };

    const handleExportData = () => {
        const exportData = (data: any[], fileName: string) => {
            const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
                JSON.stringify(data, null, 2)
            )}`;
            const link = document.createElement("a");
            link.href = jsonString;
            link.download = fileName;
            link.click();
        };

        exportData(patients, "pacientes.json");
        exportData(appointments, "turnos.json");
    };

    const handleImportData = (dataType: 'patients' | 'appointments') => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (event) => {
            const file = (event.target as HTMLInputElement).files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const content = e.target?.result;
                        if (typeof content === 'string') {
                            const data = JSON.parse(content);
                            const confirmationMessage = `¿Estás seguro de que quieres reemplazar tus ${dataType === 'patients' ? 'pacientes' : 'turnos'} actuales con los datos de este archivo? Esta acción no se puede deshacer.`;
                            if (window.confirm(confirmationMessage)) {
                                if (dataType === 'patients') {
                                    updateState({ patients: data as Patient[], appointments });
                                } else {
                                    updateState({ patients, appointments: data as Appointment[] });
                                }
                                alert('Datos importados correctamente.');
                            }
                        }
                    } catch (error) {
                        console.error("Error al importar el archivo:", error);
                        alert("Error: El archivo no es un JSON válido.");
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    };

  // Resizing handlers
    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsResizing(true);
    };

    const handleMouseUp = () => {
        setIsResizing(false);
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (isResizing && mainContentRef.current) {
            const container = mainContentRef.current;
            const newWidth = e.clientX - container.getBoundingClientRect().left;
            const minWidth = 320;
            const maxWidth = container.clientWidth * 0.6; // No more than 60% of the container
            
            if (newWidth > minWidth && newWidth < maxWidth) {
                setCalendarWidth(newWidth);
            }
        }
    }, [isResizing]);

    useEffect(() => {
        if (isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, handleMouseMove]);
    
      // Patient search handlers
    const handleSelectPatientFromSearch = (patientId: string) => {
        setSelectedPatientId(patientId);
        setPatientSearchTerm(''); // Clear search and hide dropdown
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (patientSearchRef.current && !patientSearchRef.current.contains(event.target as Node)) {
                setPatientSearchTerm('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

  const handleAppointmentClickFromViewer = useCallback((date: Date) => {
    setCurrentDate(new Date(date));
    setSelectedDate(new Date(date));
    setSelectedPatientId(null);
  }, []);


  const existingPatientForModal = useMemo((): Patient | null => {
    if (!editingAppointment) {
      return null;
    }
    // FIX: Property 'patientId' does not exist on type 'unknown'. Explicitly cast `editingAppointment` to resolve incorrect type inference.
    const patientId = (editingAppointment as AppointmentWithDetails).patientId;
    const patient = patients.find((p: Patient) => p.id === patientId);
    return patient || null;
  }, [editingAppointment, patients]);

  return (
    <div className="h-screen bg-slate-900 text-white p-4 sm:p-6 lg:p-8 flex flex-col overflow-hidden">
      <header className="flex flex-wrap justify-between items-center mb-6 gap-4 flex-shrink-0">
        <h1 className="text-3xl font-bold text-cyan-400">Consultorio Virtual</h1>
        <div className="flex items-center flex-wrap gap-3">
            <div className="flex items-center gap-1">
                <button onClick={handleUndo} disabled={!canUndo} title="Deshacer (Ctrl+Z)" className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="http://www.w3.org/2000/svg" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                </button>
                 <button onClick={handleRedo} disabled={!canRedo} title="Rehacer (Ctrl+Y)" className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="http://www.w3.org/2000/svg" fill="currentColor"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </button>
            </div>
            <div ref={patientSearchRef} className="relative w-64">
                 <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" viewBox="http://www.w3.org/2000/svg" fill="currentColor">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                </span>
                <input
                    type="text"
                    placeholder="Buscar paciente por nombre o DNI..."
                    value={patientSearchTerm}
                    onChange={e => setPatientSearchTerm(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 pl-10 pr-4 focus:ring-cyan-500 focus:border-cyan-500"
                />
                {filteredPatientsForSearch.length > 0 && (
                    <ul className="absolute z-20 w-full mt-1 bg-slate-800 border border-slate-600 rounded-md shadow-lg max-h-60 overflow-auto">
                        {filteredPatientsForSearch.map(patient => (
                            <li
                                key={patient.id}
                                onClick={() => handleSelectPatientFromSearch(patient.id)}
                                className="px-4 py-2 text-white cursor-pointer hover:bg-slate-600"
                                role="button"
                                tabIndex={0}
                                onKeyPress={(e) => e.key === 'Enter' && handleSelectPatientFromSearch(patient.id)}
                            >
                                {patient.name}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            <div className="flex items-center gap-3 border-l border-slate-700 pl-3">
                <StorageIndicator {...storageUsage} />
                <button onClick={handleExportData} title="Exportar Pacientes y Turnos a JSON" className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="http://www.w3.org/2000/svg" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    <span className="hidden sm:inline">Exportar</span>
                </button>
                 <button onClick={() => handleImportData('patients')} title="Importar Pacientes desde JSON" className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="http://www.w3.org/2000/svg" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                    <span className="hidden sm:inline">Imp. Pacientes</span>
                </button>
                 <button onClick={() => handleImportData('appointments')} title="Importar Turnos desde JSON" className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="http://www.w3.org/2000/svg" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                    <span className="hidden sm:inline">Imp. Turnos</span>
                </button>
            </div>
            <button onClick={() => setPatientRegistryOpen(true)} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="http://www.w3.org/2000/svg" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0115 11h1c.414 0 .79.122 1.11.325a6.002 6.002 0 015.74 4.901A1 1 0 0121.82 18H15.07a3.001 3.001 0 01-2.14 2H10a1 1 0 01-1-1v-1a1 1 0 011-1h2.071a3.001 3.001 0 01-.141-1z" /></svg>
                <span>Pacientes</span>
            </button>
            <button onClick={() => setAiModalOpen(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="http://www.w3.org/2000/svg" fill="currentColor"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
                <span>Asistente IA</span>
            </button>
        </div>
      </header>

      <main ref={mainContentRef} className="flex-1 flex flex-row gap-0 min-h-0">
        <div style={{ width: `${calendarWidth}px` }} className="flex-shrink-0 h-full flex flex-col">
          <div className="flex-shrink-0">
            <Calendar
              currentDate={currentDate}
              selectedDate={selectedDate}
              onDateClick={handleDateClick}
              highlightedDays={highlightedPatientDays}
              recurringHighlightDays={recurringHighlightDays}
              onMonthChange={setCurrentDate}
            />
          </div>
          <div className="mt-4 pt-4 border-t border-slate-700 flex-1 min-h-0 flex flex-col gap-4">
            <div className="flex-shrink-0">
              <Calendar
                currentDate={nextMonthDate}
                selectedDate={selectedDate}
                onDateClick={handleDateClick}
                highlightedDays={highlightedPatientDays}
                recurringHighlightDays={recurringHighlightDays}
                onMonthChange={() => {}} 
                weeksToShow={3}
                showNavigation={false}
              />
            </div>
             <div className="flex-grow min-h-0">
              {selectedPatientId ? (
                  <PatientScheduleViewer 
                    patientName={highlightedPatientName}
                    schedule={highlightedPatientSchedule}
                    onClose={() => setSelectedPatientId(null)}
                    onAppointmentClick={handleAppointmentClickFromViewer}
                    currentDate={currentDate}
                  />
              ) : recurringSlotsView ? (
                  <RecurringSlotsViewer 
                    date={recurringSlotsView.date}
                    slots={recurringSlotsView.slots}
                    onClose={() => setRecurringSlotsView(null)}
                  />
              ) : null}
            </div>
          </div>
        </div>
        
        <div
          onMouseDown={handleMouseDown}
          className="w-2 cursor-col-resize flex items-center justify-center group flex-shrink-0"
        >
            <div className="w-0.5 h-1/2 bg-slate-700 group-hover:bg-cyan-500 transition-colors rounded-full"></div>
        </div>

        <div className="flex-1 min-h-0 min-w-0">
          <AppointmentList
            selectedDate={selectedDate}
            appointments={appointmentsForSelectedDay}
            onSelectAppointment={handleSelectAppointment}
            onDeleteAppointment={handleDeleteAppointment}
            onAddNewAppointment={handleOpenNewAppointment}
            onHighlightPatient={handleHighlightPatient}
            onShowRecurringWeekAvailability={handleShowRecurringWeekAvailability}
            recurringAvailableSlots={recurringSlotsView && selectedDate && recurringSlotsView.date.toISOString().split('T')[0] === selectedDate.toISOString().split('T')[0] ? recurringSlotsView.slots : []}
          />
        </div>
      </main>

      {/* Modals */}
      <AppointmentModal 
        isOpen={isAppointmentModalOpen}
        onClose={() => setAppointmentModalOpen(false)}
        onSave={handleSaveAppointment}
        existingAppointment={editingAppointment}
        existingPatient={existingPatientForModal}
        patients={patients}
        selectedDate={selectedDate || new Date()}
        defaultTime={defaultAppointmentTime}
      />
      <PatientRegistryModal 
        isOpen={isPatientRegistryOpen}
        onClose={() => setPatientRegistryOpen(false)}
        patients={patients}
        onDeletePatient={handleDeletePatient}
      />
      <AiAssistantModal 
        isOpen={isAiModalOpen}
        onClose={() => setAiModalOpen(false)}
        patients={patients}
        appointments={appointments}
      />
      <DeleteAppointmentOptionsModal
        isOpen={isDeleteOptionsModalOpen}
        onClose={() => {
          setDeleteOptionsModalOpen(false);
          setDateForDeletion(null);
        }}
        patientName={highlightedPatientName}
        onDeleteSingle={handleDeleteSingle}
        onDeleteWeek={handleDeleteWeek}
        onChangeSchedule={handleOpenScheduleForDay}
        onDeleteColumn={handleDeleteColumn}
        onExtendWeek={handleExtendWeek}
        onExtendColumn={handleExtendColumn}
        onAnnihilate={handleAnnihilate}
      />
      <DniConflictModal
        isOpen={isDniConflictModalOpen}
        onClose={() => setDniConflictModalOpen(false)}
        conflict={dniConflicts[0] || null}
        onUnify={handleUnifyConflict}
      />

      {/* Banners */}
      {dniConflicts.length > 0 && (
        <DniConflictBanner
          conflictCount={dniConflicts.length}
          onResolve={() => setDniConflictModalOpen(true)}
        />
      )}
      {showStorageWarning && (
        <StorageWarningBanner onClose={() => setShowStorageWarning(false)} onExport={handleExportData} />
      )}
    </div>
  );
}
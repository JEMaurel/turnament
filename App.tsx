import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Calendar from './components/Calendar';
import AppointmentList from './components/AppointmentList';
// FIX: Imported the centralized AppointmentWithDetails type to ensure type consistency.
import type { Patient, Appointment, AppointmentWithDetails } from './types';
import { getAiAssistance } from './services/geminiService';

// Modal Components defined within App.tsx to easily access state and handlers

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-slate-800 rounded-lg shadow-2xl p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b border-slate-700 pb-3 mb-4">
          <h3 className="text-2xl font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">&times;</button>
        </div>
        {children}
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
    const [doctor, setDoctor] = useState('');
    const [treatment, setTreatment] = useState('');
    const [diagnosis, setDiagnosis] = useState('');
    const [observations, setObservations] = useState('');
    const [recurringDays, setRecurringDays] = useState<number[]>([]);
    const [recurringWeeks, setRecurringWeeks] = useState(4);
    const observationsInputRef = useRef<HTMLTextAreaElement>(null);
    
    useEffect(() => {
        if (isOpen) {
            if (existingAppointment && existingPatient) {
                setTime(existingAppointment.time);
                setPatientName(existingPatient.name);
                setPatientId(existingPatient.id);
                setSession(existingAppointment.session);
                setInsurance(existingPatient.insurance || '');
                setDoctor(existingPatient.doctor || '');
                setTreatment(existingPatient.treatment || '');
                setDiagnosis(existingPatient.diagnosis || '');
                setObservations(existingPatient.observations || '');
                setRecurringDays([]);
                setRecurringWeeks(4);
                if (existingPatient.observations) {
                    setTimeout(() => observationsInputRef.current?.focus(), 100);
                }
            } else {
                setTime(defaultTime);
                setPatientName('');
                setPatientId(null);
                setSession('1/10');
                setInsurance('');
                setDoctor('');
                setTreatment('');
                setDiagnosis('');
                setObservations('');
                setRecurringDays([]);
                setRecurringWeeks(4);
            }
        }
    }, [existingAppointment, existingPatient, isOpen, defaultTime]);

    const handlePatientSelect = (name: string) => {
        setPatientName(name);
        const patient = patients.find(p => p && p.name && p.name.toLowerCase() === name.toLowerCase());
        if (patient) {
            setPatientId(patient.id);
            setInsurance(patient.insurance || '');
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
                    <div>
                        <label className="block text-sm font-medium text-slate-300">Hora</label>
                        <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 mt-1 focus:ring-cyan-500 focus:border-cyan-500"/>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-300">Sesión (ej. 5/10)</label>
                        <input type="text" value={session} onChange={e => setSession(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 mt-1 focus:ring-cyan-500 focus:border-cyan-500"/>
                    </div>
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
                                <label className="block text-xs font-medium text-slate-400 mb-2">Durante:</label>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="number" 
                                        min="1" 
                                        value={recurringWeeks} 
                                        onChange={e => setRecurringWeeks(Math.max(1, Number(e.target.value)))} 
                                        className="w-20 bg-slate-700 border border-slate-600 rounded-md p-2 mt-1"
                                    />
                                    <span className="text-slate-300">semanas</span>
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
                        <label className="block text-sm font-medium text-slate-300">Médico Derivante</label>
                        <input type="text" value={doctor} onChange={e => setDoctor(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 mt-1"/>
                    </div>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-slate-300">Tratamiento</label>
                    <input type="text" value={treatment} onChange={e => setTreatment(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 mt-1"/>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300">Diagnóstico (Dx)</label>
                    <textarea value={diagnosis} onChange={e => setDiagnosis(e.target.value)} rows={2} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 mt-1"/>
                </div>

                 <div>
                    <label className="block text-sm font-medium text-slate-300">Observaciones (Obs)</label>
                    <textarea ref={observationsInputRef} value={observations} onChange={e => setObservations(e.target.value)} rows={3} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 mt-1"/>
                </div>

            </div>
            <div className="flex justify-end pt-4 mt-4 border-t border-slate-700">
                <button onClick={onClose} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-lg transition-colors mr-2">Cancelar</button>
                <button onClick={handleSave} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">Guardar</button>
            </div>
        </Modal>
    );
};

const PatientRegistryModal: React.FC<{isOpen: boolean; onClose: () => void; patients: Patient[]}> = ({ isOpen, onClose, patients }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

    const filteredPatients = useMemo(() => {
        if (!searchTerm) {
            return patients;
        }
        return patients.filter(patient =>
            patient && patient.name && patient.name.toLowerCase().includes(searchTerm.toLowerCase())
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
                <div className="max-h-[60vh] overflow-y-auto pr-2">
                    <button onClick={() => setSelectedPatient(null)} className="flex items-center gap-2 mb-4 text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                        <span>Volver a la lista</span>
                    </button>
                    <div className="space-y-4">
                        <h3 className="text-3xl font-bold text-white border-b border-slate-700 pb-2">{selectedPatient.name}</h3>
                        <PatientDetail label="Obra Social" value={selectedPatient.insurance} />
                        <PatientDetail label="Médico Derivante" value={selectedPatient.doctor} />
                        <PatientDetail label="Tratamiento" value={selectedPatient.treatment} />
                        <PatientDetail label="Diagnóstico (Dx)" value={selectedPatient.diagnosis} />
                        <PatientDetail label="Observaciones (Obs)" value={selectedPatient.observations} />
                    </div>
                </div>
            ) : (
                <>
                    <div className="mb-4 relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                            </svg>
                        </span>
                        <input
                            type="text"
                            placeholder="Buscar paciente..."
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
                                        className="p-3 bg-slate-700 rounded-md cursor-pointer hover:bg-slate-600 transition-colors"
                                        onClick={() => setSelectedPatient(patient)}
                                        role="button"
                                        tabIndex={0}
                                        onKeyPress={(e) => e.key === 'Enter' && setSelectedPatient(patient)}
                                    >
                                        {patient.name}
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
}> = ({ isOpen, onClose, patientName, onDeleteSingle, onDeleteWeek, onChangeSchedule, onDeleteColumn, onExtendWeek }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Modificar Turno">
      <div className="space-y-4">
        <p>Ha seleccionado un turno de <span className="font-bold text-cyan-400">{patientName}</span>. ¿Qué desea hacer?</p>
      </div>
      <div className="flex flex-wrap justify-end gap-3 pt-4 mt-4 border-t border-slate-700">
        <button onClick={onClose} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">Cancelar</button>
        <button onClick={onExtendWeek} className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">Extender Semana</button>
        <button onClick={onChangeSchedule} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">Cambiar Horario</button>
        <button onClick={onDeleteSingle} className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">Eliminar este turno</button>
        <button onClick={onDeleteWeek} className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">Eliminar turnos de la semana</button>
        <button onClick={onDeleteColumn} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">Eliminar Columna</button>
      </div>
    </Modal>
  );
};


export default function App() {
  // State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  
  // Data is now stored in localStorage to protect patient privacy
  const [patients, setPatients] = useState<Patient[]>(() => {
    try {
      const saved = window.localStorage.getItem('consultorio-patients');
      // Load saved data or default to an empty array.
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error("Error loading patients from localStorage:", error);
      // If there's an error, start with an empty list to prevent app crash.
      return [];
    }
  });

  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    try {
      const saved = window.localStorage.getItem('consultorio-appointments');
      // Load saved data or default to an empty array.
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error("Error loading appointments from localStorage:", error);
      // If there's an error, start with an empty list to prevent app crash.
      return [];
    }
  });

  // Effect to save data to localStorage whenever it changes
  useEffect(() => {
    try {
      window.localStorage.setItem('consultorio-patients', JSON.stringify(patients));
    } catch (error) {
      console.error("Error saving patients to localStorage:", error);
    }
  }, [patients]);

  useEffect(() => {
    try {
      window.localStorage.setItem('consultorio-appointments', JSON.stringify(appointments));
    } catch (error) {
      console.error("Error saving appointments to localStorage:", error);
    }
  }, [appointments]);

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

  // Memoized derived state
  // FIX: Refactored to use a for...of loop instead of .map() to prevent a subtle TypeScript 
  // inference issue where the returned array elements were being typed as `unknown`.
  const appointmentsForSelectedDay = useMemo((): AppointmentWithDetails[] => {
    if (!selectedDate) return [];
    const dateStr = selectedDate.toISOString().split('T')[0];
    
    const result: AppointmentWithDetails[] = [];
    const filteredApps = appointments.filter(app => app.date === dateStr);

    for (const app of filteredApps) {
      const patient = patients.find(p => p.id === app.patientId);
      result.push({
        ...app,
        patientName: patient?.name || 'Desconocido',
        observations: patient?.observations
      });
    }
    return result;
  }, [selectedDate, appointments, patients]);

  const highlightedPatientDays = useMemo(() => {
    if (!selectedPatientId) return [];
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    const nextMonth = (month + 1) % 12;
    const nextYear = month === 11 ? year + 1 : year;
    
    return appointments
      .filter(app => {
        const appDate = new Date(`${app.date}T12:00:00`); // Use midday to avoid timezone issues
        return app.patientId === selectedPatientId && 
               ((appDate.getMonth() === month && appDate.getFullYear() === year) || 
                (appDate.getMonth() === nextMonth && appDate.getFullYear() === nextYear));
      })
      .map(app => app.date);
  }, [selectedPatientId, appointments, currentDate]);
  
  const highlightedPatientName = useMemo(() => {
    if (!selectedPatientId) return '';
    return patients.find(p => p.id === selectedPatientId)?.name || 'Desconocido';
  }, [selectedPatientId, patients]);

  const nextMonthDate = useMemo(() => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + 1, 1);
    return d;
  }, [currentDate]);


  // Handlers
  const handleDateClick = useCallback((date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    if (selectedPatientId && highlightedPatientDays.includes(dateString)) {
      setDateForDeletion(date);
      setDeleteOptionsModalOpen(true);
    } else {
      setSelectedDate(date);
      setSelectedPatientId(null);
    }
  }, [selectedPatientId, highlightedPatientDays]);
  
  // FIX: Updated handler to use the centralized AppointmentWithDetails type.
  const handleSelectAppointment = useCallback((appointment: AppointmentWithDetails) => {
      setSelectedPatientId(appointment.patientId);
      setEditingAppointment(appointment);
      setAppointmentModalOpen(true);
  }, []);

  const handleHighlightPatient = useCallback((patientId: string) => {
    setSelectedPatientId(prevId => (prevId === patientId ? null : patientId));
  }, []);

  const handleOpenNewAppointment = useCallback((time?: string) => {
    if (!selectedDate) return;
    setEditingAppointment(null);
    setDefaultAppointmentTime(time || '11:00');
    setAppointmentModalOpen(true);
  }, [selectedDate]);

  const handleSaveAppointment = (appointmentData: Appointment, patientData: Patient, recurringDays: number[], recurringWeeks: number) => {
      // Update or create patient
      const patientExists = patients.some(p => p.id === patientData.id);
      if (patientExists) {
          setPatients(prev => prev.map(p => p.id === patientData.id ? patientData : p));
      } else {
          setPatients(prev => [...prev, patientData]);
      }

      // Update or create appointment
      const appointmentExists = appointments.some(a => a.id === appointmentData.id);
      if (appointmentExists) {
          setAppointments(prev => prev.map(a => a.id === appointmentData.id ? appointmentData : a));
      } else {
          let newAppointments: Appointment[] = [appointmentData];
          if (recurringDays.length > 0 && selectedDate && recurringWeeks > 0) {
              const appointmentsToCreate: Appointment[] = [];
              const endDate = new Date(selectedDate);
              endDate.setDate(selectedDate.getDate() + (recurringWeeks * 7));
              
              let currentDatePointer = new Date(selectedDate);
              currentDatePointer.setDate(currentDatePointer.getDate() + 1);

              while(currentDatePointer < endDate) {
                  if (recurringDays.includes(currentDatePointer.getDay())) {
                      appointmentsToCreate.push({
                          ...appointmentData,
                          id: `app-${Date.now()}-${currentDatePointer.toISOString()}`,
                          date: currentDatePointer.toISOString().split('T')[0]
                      });
                  }
                  currentDatePointer.setDate(currentDatePointer.getDate() + 1);
              }
              newAppointments.push(...appointmentsToCreate);
          }
          
          const existingAppointmentsByDateTime = new Map(appointments.map(app => [`${app.date}|${app.time}`, app]));
          const conflicts = newAppointments.filter(newApp => existingAppointmentsByDateTime.has(`${newApp.date}|${newApp.time}`));

          if (conflicts.length > 0) {
              // FIX: Replaced .map() with a for...of loop to resolve a TypeScript inference issue where `existing` was being typed as `unknown`.
              const conflictDetailsList: string[] = [];
              for (const c of conflicts) {
                  const existing = existingAppointmentsByDateTime.get(`${c.date}|${c.time}`);
                  if (existing) {
                      const patientName = patients.find(p => p.id === existing.patientId)?.name || 'Desconocido';
                      conflictDetailsList.push(`- ${new Date(c.date + 'T12:00:00').toLocaleDateString('es-ES', {day: '2-digit', month: '2-digit'})} a las ${c.time} con ${patientName}`);
                  }
              }
              const conflictDetails = conflictDetailsList.join('\n');

              if (!window.confirm(`Atención: Los siguientes turnos se sobrescribirán:\n${conflictDetails}\n\n¿Desea continuar?`)) {
                  return; // Abort if user cancels
              }

              const conflictKeys = new Set(conflicts.map(c => `${c.date}|${c.time}`));
              const nonConflictingAppointments = appointments.filter(app => !conflictKeys.has(`${app.date}|${app.time}`));
              setAppointments([...nonConflictingAppointments, ...newAppointments]);
          } else {
              setAppointments(prev => [...prev, ...newAppointments]);
          }
      }
  };


  const handleDeleteAppointment = useCallback((appointmentId: string) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar este turno?")) {
      setAppointments(prev => prev.filter(a => a.id !== appointmentId));
    }
  }, []);

  const handleDeleteSingle = () => {
    if (!dateForDeletion || !selectedPatientId) return;
    const dateString = dateForDeletion.toISOString().split('T')[0];
    // FIX: Explicitly type the `app` parameter in the `filter` callback to prevent
    // it from being inferred as `unknown`, which causes a compile error.
    setAppointments(prev => prev.filter((app: Appointment) => 
      !(app.patientId === selectedPatientId && app.date === dateString)
    ));
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

    setAppointments(prev => prev.filter(app => {
      if (app.patientId !== selectedPatientId) {
        return true; // Keep appointments for other patients
      }
      const appDate = new Date(`${app.date}T12:00:00`); // Use midday to avoid timezone issues
      return !(appDate >= startOfWeek && appDate <= endOfWeek);
    }));

    setDeleteOptionsModalOpen(false);
    setDateForDeletion(null);
  };

  const handleDeleteColumn = () => {
    if (!dateForDeletion || !selectedPatientId) return;
    
    const targetDate = new Date(dateForDeletion);
    targetDate.setHours(0, 0, 0, 0); // Normalize for comparison

    const targetDateString = targetDate.toISOString().split('T')[0];
    const targetDayOfWeek = targetDate.getDay();

    setAppointments(prev => prev.filter(app => {
        // Keep appointments if they don't belong to the selected patient
        if (app.patientId !== selectedPatientId) {
            return true;
        }
        
        const appDate = new Date(`${app.date}T12:00:00`); // Use midday to avoid timezone issues for getDay()

        // Check if the appointment is after the target date AND on the same day of the week
        const isFutureDate = app.date > targetDateString;
        const isSameDayOfWeek = appDate.getDay() === targetDayOfWeek;

        // If both conditions are true, we filter out (delete) this appointment
        if (isFutureDate && isSameDayOfWeek) {
            return false;
        }
        
        // Otherwise, keep the appointment
        return true;
    }));

    // Reset state after the operation
    setDeleteOptionsModalOpen(false);
    setDateForDeletion(null);
    setSelectedPatientId(null); // Clear highlight for better UX feedback
  };

  const handleExtendWeek = () => {
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

    const appointmentsInWeek = appointments.filter(app => {
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

    const incrementSession = (session: string): string => {
      const match = session.match(/^(\d+)(\s*\/.*)?$/);
      if (match) {
        const num = parseInt(match[1], 10);
        const rest = match[2] || '';
        return `${num + 1}${rest}`;
      }
      return session;
    };

    const newAppointments = appointmentsInWeek.map(app => {
        const nextWeekDate = new Date(`${app.date}T12:00:00`);
        nextWeekDate.setDate(nextWeekDate.getDate() + 7);
        return {
            ...app,
            id: `app-${Date.now()}-${nextWeekDate.toISOString()}`,
            date: nextWeekDate.toISOString().split('T')[0],
            session: incrementSession(app.session),
        };
    });

    const existingAppointmentsByDateTime = new Map(appointments.map(app => [`${app.date}|${app.time}`, app]));
    const conflicts = newAppointments.filter(newApp => existingAppointmentsByDateTime.has(`${newApp.date}|${newApp.time}`));

    if (conflicts.length > 0) {
        const conflictDetailsList: string[] = [];
        for (const c of conflicts) {
            const existing = existingAppointmentsByDateTime.get(`${c.date}|${c.time}`);
            if (existing) {
                const patientName = patients.find(p => p.id === existing.patientId)?.name || 'Desconocido';
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
        const nonConflictingAppointments = appointments.filter(app => !conflictKeys.has(`${app.date}|${app.time}`));
        setAppointments([...nonConflictingAppointments, ...newAppointments]);
    } else {
        setAppointments(prev => [...prev, ...newAppointments]);
    }

    setDeleteOptionsModalOpen(false);
    setDateForDeletion(null);
    setSelectedPatientId(null);
  };

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
                                    setPatients(data as Patient[]);
                                } else {
                                    setAppointments(data as Appointment[]);
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

  const existingPatientForModal = useMemo((): Patient | null => {
    // FIX: Restructured to be more robust against type inference failure. By casting
    // `editingAppointment` to a typed variable and then performing a null check, we ensure
    // TypeScript correctly understands the type before property access.
    const appointment = editingAppointment as AppointmentWithDetails | null;
    if (!appointment) {
      return null;
    }
    return patients.find(p => p.id === appointment.patientId) || null;
  }, [editingAppointment, patients]);

  return (
    <div className="h-screen bg-slate-900 text-white p-4 sm:p-6 lg:p-8 flex flex-col overflow-hidden">
      <header className="flex flex-wrap justify-between items-center mb-6 gap-4 flex-shrink-0">
        <h1 className="text-3xl font-bold text-cyan-400">Consultorio Virtual</h1>
        <div className="flex items-center flex-wrap gap-3">
            <div className="flex items-center gap-3 border-r border-slate-700 pr-3">
                <button onClick={handleExportData} title="Exportar Pacientes y Turnos a JSON" className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    <span>Exportar</span>
                </button>
                 <button onClick={() => handleImportData('patients')} title="Importar Pacientes desde JSON" className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                    <span>Imp. Pacientes</span>
                </button>
                 <button onClick={() => handleImportData('appointments')} title="Importar Turnos desde JSON" className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                    <span>Imp. Turnos</span>
                </button>
            </div>
            <button onClick={() => setPatientRegistryOpen(true)} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0115 11h1c.414 0 .79.122 1.11.325a6.002 6.002 0 015.74 4.901A1 1 0 0121.82 18H15.07a3.001 3.001 0 01-2.14 2H10a1 1 0 01-1-1v-1a1 1 0 011-1h2.071a3.001 3.001 0 01-.141-1z" /></svg>
                <span>Pacientes</span>
            </button>
            <button onClick={() => setAiModalOpen(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
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
              onMonthChange={setCurrentDate}
            />
          </div>
          <div className="mt-4 pt-4 border-t border-slate-700 flex-shrink-0">
             <Calendar
                currentDate={nextMonthDate}
                selectedDate={selectedDate}
                onDateClick={handleDateClick}
                highlightedDays={highlightedPatientDays}
                onMonthChange={() => {}} 
                weeksToShow={3}
                showNavigation={false}
              />
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
      />
    </div>
  );
}
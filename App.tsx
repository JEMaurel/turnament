
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Calendar from './components/Calendar';
import AppointmentList from './components/AppointmentList';
import type { Patient, Appointment } from './types';
import { initialPatients, initialAppointments } from './data/mockData';
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
  onSave: (appointmentData: any, patientData: any, recurringDays: number[]) => void;
  existingAppointment: Appointment | null;
  existingPatient: Patient | null;
  patients: Patient[];
  selectedDate: Date;
}> = ({ isOpen, onClose, onSave, existingAppointment, existingPatient, patients, selectedDate }) => {
    const [time, setTime] = useState('09:00');
    const [patientName, setPatientName] = useState('');
    const [patientId, setPatientId] = useState<string | null>(null);
    const [session, setSession] = useState('1/10');
    const [insurance, setInsurance] = useState('');
    const [doctor, setDoctor] = useState('');
    const [treatment, setTreatment] = useState('');
    const [diagnosis, setDiagnosis] = useState('');
    const [observations, setObservations] = useState('');
    const [recurringDays, setRecurringDays] = useState<number[]>([]);
    
    useEffect(() => {
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
        } else {
            setTime('09:00');
            setPatientName('');
            setPatientId(null);
            setSession('1/10');
            setInsurance('');
            setDoctor('');
            setTreatment('');
            setDiagnosis('');
            setObservations('');
            setRecurringDays([]);
        }
    }, [existingAppointment, existingPatient, isOpen]);

    const handlePatientSelect = (name: string) => {
        setPatientName(name);
        const patient = patients.find(p => p.name.toLowerCase() === name.toLowerCase());
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
        const appointmentData = {
            id: existingAppointment?.id || `app-${Date.now()}`,
            patientId: patientId || `pat-${Date.now()}`,
            date: selectedDate.toISOString().split('T')[0],
            time,
            session,
        };
        const patientData = {
            id: patientId || appointmentData.patientId,
            name: patientName,
            insurance, doctor, treatment, diagnosis, observations,
        };
        onSave(appointmentData, patientData, recurringDays);
        onClose();
    };

    const toggleRecurringDay = (dayIndex: number) => {
        setRecurringDays(prev => 
            prev.includes(dayIndex) ? prev.filter(d => d !== dayIndex) : [...prev, dayIndex]
        );
    };

    const weekDays = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

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
                    <div>
                        <label className="block text-sm font-medium text-slate-300">Repetir semanalmente los días:</label>
                        <div className="flex gap-2 mt-2">
                            {weekDays.map((day, index) => (
                                <button key={index} onClick={() => toggleRecurringDay(index)}
                                    className={`w-8 h-8 rounded-full font-bold transition-colors ${recurringDays.includes(index) ? 'bg-cyan-500 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>
                                    {day}
                                </button>
                            ))}
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
                    <textarea value={observations} onChange={e => setObservations(e.target.value)} rows={3} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 mt-1"/>
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

    const filteredPatients = useMemo(() => {
        if (!searchTerm) {
            return patients;
        }
        return patients.filter(patient =>
            patient.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [patients, searchTerm]);
    
    useEffect(() => {
        if (!isOpen) {
            setSearchTerm('');
        }
    }, [isOpen]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Registro de Pacientes">
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
                            <li key={patient.id} className="p-3 bg-slate-700 rounded-md">
                                {patient.name}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-slate-400 text-center py-4">No se encontraron pacientes.</p>
                )}
            </div>
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


export default function App() {
  // State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [patients, setPatients] = useState<Patient[]>(initialPatients);
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  // Modal States
  const [isAppointmentModalOpen, setAppointmentModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [isPatientRegistryOpen, setPatientRegistryOpen] = useState(false);
  const [isAiModalOpen, setAiModalOpen] = useState(false);
  
  // Memoized derived state
  const appointmentsForSelectedDay = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = selectedDate.toISOString().split('T')[0];
    return appointments
      .filter(app => app.date === dateStr)
      .map(app => ({
        ...app,
        patientName: patients.find(p => p.id === app.patientId)?.name || 'Desconocido'
      }));
  }, [selectedDate, appointments, patients]);

  const highlightedPatientDays = useMemo(() => {
    if (!selectedPatientId) return [];
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    return appointments
      .filter(app => {
        const appDate = new Date(app.date);
        return app.patientId === selectedPatientId && appDate.getMonth() === month && appDate.getFullYear() === year;
      })
      .map(app => app.date);
  }, [selectedPatientId, appointments, currentDate]);

  // Handlers
  const handleDateClick = useCallback((date: Date) => {
    setSelectedDate(date);
    setSelectedPatientId(null);
  }, []);
  
  const handleSelectAppointment = useCallback((appointment: Appointment) => {
      setSelectedPatientId(appointment.patientId);
      setEditingAppointment(appointment);
      setAppointmentModalOpen(true);
  }, []);

  const handleOpenNewAppointment = () => {
    if (!selectedDate) return;
    setEditingAppointment(null);
    setAppointmentModalOpen(true);
  };

  const handleSaveAppointment = (appointmentData: Appointment, patientData: Patient, recurringDays: number[]) => {
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
          let newAppointments = [appointmentData];
          if (recurringDays.length > 0 && selectedDate) {
              const endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0); // End of current month
              let currentDatePointer = new Date(selectedDate);
              currentDatePointer.setDate(currentDatePointer.getDate() + 1);

              while(currentDatePointer <= endDate) {
                  if (recurringDays.includes(currentDatePointer.getDay())) {
                      newAppointments.push({
                          ...appointmentData,
                          id: `app-${Date.now()}-${currentDatePointer.toISOString()}`,
                          date: currentDatePointer.toISOString().split('T')[0]
                      });
                  }
                  currentDatePointer.setDate(currentDatePointer.getDate() + 1);
              }
          }
          setAppointments(prev => [...prev, ...newAppointments]);
      }
  };


  const handleDeleteAppointment = (appointmentId: string) => {
    if(window.confirm("¿Estás seguro de que quieres eliminar este turno?")) {
        setAppointments(prev => prev.filter(a => a.id !== appointmentId));
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-cyan-400">Consultorio Virtual</h1>
        <div className="flex items-center gap-3">
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

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Calendar
            currentDate={currentDate}
            selectedDate={selectedDate}
            onDateClick={handleDateClick}
            highlightedDays={highlightedPatientDays}
            onMonthChange={setCurrentDate}
          />
        </div>
        <div className="lg:col-span-2">
          <AppointmentList
            selectedDate={selectedDate}
            appointments={appointmentsForSelectedDay}
            onSelectAppointment={handleSelectAppointment}
            onDeleteAppointment={handleDeleteAppointment}
            onAddNewAppointment={handleOpenNewAppointment}
          />
        </div>
      </main>

      {/* Modals */}
      <AppointmentModal 
        isOpen={isAppointmentModalOpen}
        onClose={() => setAppointmentModalOpen(false)}
        onSave={handleSaveAppointment}
        existingAppointment={editingAppointment}
        existingPatient={editingAppointment ? patients.find(p => p.id === editingAppointment.patientId) || null : null}
        patients={patients}
        selectedDate={selectedDate || new Date()}
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
    </div>
  );
}

import { GoogleGenAI } from '@google/genai';
import type { Patient, Appointment } from '../types';

export const getAiAssistance = async (
  patients: Patient[],
  appointments: Appointment[],
  question: string
): Promise<string> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.error("Gemini API Key is not configured.");
      return "Error: La clave de API para el asistente de IA no está configurada.";
    }

    const ai = new GoogleGenAI({ apiKey });

    const formattedData = appointments.map(app => {
        const patient = patients.find(p => p.id === app.patientId);
        return {
          fecha: app.date,
          hora: app.time,
          paciente: patient ? patient.name : 'Desconocido',
          sesion: app.session,
          tratamiento: patient?.treatment,
          diagnostico: patient?.diagnosis,
        };
    });

    const systemInstruction = `Eres un asistente de un consultorio médico. Tienes acceso a la lista de pacientes y sus turnos. La fecha de hoy es ${new Date().toLocaleDateString('es-ES')}. Por favor, responde la siguiente pregunta del profesional de la salud de manera concisa y clara en español.`;
    const contents = `Aquí están los datos actuales en formato JSON:\n${JSON.stringify(formattedData, null, 2)}\n\nPregunta: ${question}`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: {
            systemInstruction: systemInstruction,
        }
    });
    
    const text = response.text;
    return text;

  } catch (error) {
    console.error("Error al contactar al asistente de IA:", error);
    if (error instanceof Error) {
        return `Error: ${error.message}`;
    }
    return "Hubo un error al procesar tu solicitud. Por favor, intenta de nuevo.";
  }
};
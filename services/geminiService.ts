
import { GoogleGenAI } from "@google/genai";
import type { Patient, Appointment } from '../types';

export const getAiAssistance = async (
  patients: Patient[],
  appointments: Appointment[],
  question: string
): Promise<string> => {
  if (!process.env.API_KEY) {
    return "Error: API_KEY no está configurada. Por favor, asegúrate de que la variable de entorno API_KEY esté disponible.";
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

  const context = `
    Eres un asistente de un consultorio médico. Tienes acceso a la lista de pacientes y sus turnos.
    La fecha de hoy es ${new Date().toLocaleDateString('es-ES')}.
    Aquí están los datos actuales en formato JSON:
    ${JSON.stringify(formattedData, null, 2)}
    
    Por favor, responde la siguiente pregunta del profesional de la salud de manera concisa y clara en español.
  `;

  try {
    // FIX: Pass context only in systemInstruction and question in contents for correct API usage.
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: question,
      config: {
        systemInstruction: context,
      }
    });
    return response.text;
  } catch (error) {
    console.error("Error al contactar a la API de Gemini:", error);
    return "Hubo un error al procesar tu solicitud. Por favor, intenta de nuevo.";
  }
};

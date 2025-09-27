import type { Patient, Appointment } from '../types';

export const getAiAssistance = async (
  patients: Patient[],
  appointments: Appointment[],
  question: string
): Promise<string> => {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ patients, appointments, question }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Error from AI assistant API:", data.error);
      return `Error: ${data.error || 'Hubo un error al procesar tu solicitud.'}`;
    }
    
    return data.response;

  } catch (error) {
    console.error("Error al contactar al asistente de IA:", error);
    if (error instanceof Error) {
        return `Error: ${error.message}`;
    }
    return "Hubo un error al procesar tu solicitud. Por favor, intenta de nuevo.";
  }
};
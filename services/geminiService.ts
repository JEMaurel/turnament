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

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Error desconocido del servidor.' }));
      throw new Error(errorData.error || `El servidor respondió con el estado: ${response.status}`);
    }

    const data = await response.json();
    return data.response;

  } catch (error) {
    console.error("Error al contactar al asistente de IA:", error);
    if (error instanceof Error) {
        return `Error: ${error.message}`;
    }
    return "Hubo un error al procesar tu solicitud. Por favor, intenta de nuevo.";
  }
};
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
      // Try to parse the error message from the backend
      const errorData = await response.json().catch(() => ({ error: 'Error desconocido del servidor.' }));
      // Use the specific error from the backend if available
      throw new Error(errorData.error || `Error del servidor: ${response.status}`);
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error("Error al contactar al asistente de IA:", error);
    // Now, this will display the specific message from the server, like "El servidor tiene un error de configuración."
    if (error instanceof Error) {
        return `Error: ${error.message}`;
    }
    return "Hubo un error al procesar tu solicitud. Por favor, intenta de nuevo.";
  }
};

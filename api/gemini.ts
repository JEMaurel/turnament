import { GoogleGenAI } from "@google/genai";

// Redefining types here to keep the serverless function self-contained
// and avoid potential path issues in the Vercel environment.
interface Patient {
  id: string;
  name: string;
  insurance?: string;
  doctor?: string;
  treatment?: string;
  diagnosis?: string;
  observations?: string;
}

interface Appointment {
  id: string;
  patientId: string;
  date: string;
  time: string;
  session: string;
}

interface RequestBody {
  patients: Patient[];
  appointments: Appointment[];
  question: string;
}

// This is the standard Vercel Serverless Function signature. 
// `req` and `res` are Node.js-like objects.
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { patients, appointments, question } = req.body as RequestBody;

    if (!process.env.API_KEY) {
        console.error("Gemini API Key is not configured in environment variables.");
        return res.status(500).json({ error: "El servidor tiene un error de configuración. Contacte al administrador." });
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

    // FIX: Separated system instruction from the main prompt content for clarity and better model performance.
    const systemInstruction = `Eres un asistente de un consultorio médico. Tienes acceso a la lista de pacientes y sus turnos.
La fecha de hoy es ${new Date().toLocaleDateString('es-ES')}.
Por favor, responde la siguiente pregunta del profesional de la salud de manera concisa y clara en español.`;

    const contents = `Aquí están los datos actuales en formato JSON:
${JSON.stringify(formattedData, null, 2)}

Pregunta: ${question}`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: {
            systemInstruction: systemInstruction,
        }
    });
    
    const text = response.text;

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ response: text });

  } catch (error) {
    console.error("Error in Gemini API proxy function:", error);
    // Avoid sending detailed error messages to the client for security.
    return res.status(500).json({ error: "Hubo un error al procesar tu solicitud." });
  }
}

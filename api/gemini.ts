// FIX: Switched from CommonJS (require/module.exports) to ES Modules (import/export default)
// to resolve type errors and align with modern TypeScript standards.
import { GoogleGenAI } from "@google/genai";
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Redefining types here to keep the serverless function self-contained
// and avoid potential path issues in the Vercel environment.
interface Patient {
  id: string;
  name: string;
  dni?: string;
  insurance?: string;
  insuranceId?: string;
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log("INFO: /api/gemini function started.");

  if (req.method !== 'POST') {
    console.warn("WARN: Received non-POST request.");
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        console.error("FATAL: Gemini API Key (API_KEY) is not configured in environment variables.");
        return res.status(500).json({ error: "El servidor tiene un error de configuración. Contacte al administrador." });
    }
    console.log("INFO: API Key found.");

    const { patients, appointments, question } = req.body as RequestBody;
    if (!question) {
        console.warn("WARN: Request received without a question.");
        return res.status(400).json({ error: "La pregunta no puede estar vacía." });
    }
    console.log(`INFO: Received question: "${question}"`);
    
    const ai = new GoogleGenAI({ apiKey });
    
    const formattedData = appointments.map(app => {
        const patient = patients.find(p => p.id === app.patientId);
        return {
          fecha: app.date,
          hora: app.time,
          paciente: patient ? patient.name : 'Desconocido',
          dni: patient?.dni,
          numero_afiliado: patient?.insuranceId,
          sesion: app.session,
          tratamiento: patient?.treatment,
          diagnostico: patient?.diagnosis,
        };
    });

    const systemInstruction = `Eres un asistente de un consultorio médico. Tienes acceso a la lista de pacientes y sus turnos. La fecha de hoy es ${new Date().toLocaleDateString('es-ES')}. Por favor, responde la siguiente pregunta del profesional de la salud de manera concisa y clara en español.`;
    const contents = `Aquí están los datos actuales en formato JSON:\n${JSON.stringify(formattedData, null, 2)}\n\nPregunta: ${question}`;

    console.log("INFO: Calling Gemini API...");
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: {
            systemInstruction: systemInstruction,
        }
    });
    
    const text = response.text;
    console.log("INFO: Successfully received response from Gemini API.");

    return res.status(200).json({ response: text });

  } catch (error) {
    console.error("ERROR: An error occurred in the Gemini API proxy function:", error);
    return res.status(500).json({ error: "Hubo un error al contactar al servicio de IA." });
  }
}
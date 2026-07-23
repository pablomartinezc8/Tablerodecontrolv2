import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-loaded Gemini AI client helper
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined. Please configure it in your environment variables.');
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// 1. API ROUTES FIRST
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', keyConfigured: !!process.env.GEMINI_API_KEY });
});

// Chatbot endpoint with RAG context from the Knowledge Base
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history, kbContext, currentSection, projectContext } = req.body;

    if (!message) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    // Lazy load and validate the client
    let ai;
    try {
      ai = getAiClient();
    } catch (err: any) {
      res.status(400).json({ 
        error: 'Falta configurar la clave API', 
        message: 'Para utilizar el Chatbot con Inteligencia Artificial, por favor configure la variable GEMINI_API_KEY en las configuraciones o archivo .env.' 
      });
      return;
    }

    // Build standard system prompt that details the assistant role and uses the knowledge base context
    const systemPrompt = `Eres un Asistente Virtual Inteligente experto en Control de Gestión, integrado en la plataforma de control de contratos de "Taging Ingeniería".
Tu objetivo es responder de manera clara, amable, profesional y precisa a las consultas de los usuarios sobre cómo utilizar la aplicación, entender las distintas secciones y resolver dudas basadas en la información cargada en la "Base de Conocimiento" y el contexto del proyecto activo.

INFORMACIÓN DE CONTEXTO DE LA BASE DE CONOCIMIENTO:
${kbContext || 'No hay información adicional cargada en la base de conocimiento en este momento.'}

CONTEXTO DE LA SECCIÓN ACTUAL:
El usuario está visualizando actualmente el módulo: "${currentSection || 'Desconocido'}"

DATOS DEL PROYECTO SELECCIONADO:
${projectContext ? JSON.stringify(projectContext) : 'No hay datos del proyecto activo.'}

Pautas para responder:
1. Sé conciso y directo en tus explicaciones. Usa formato Markdown con negritas, listas o tablas si es oportuno para facilitar la lectura.
2. Si el usuario te pregunta cómo hacer algo (ej: "cómo cargar información", "cómo registrar un costo", "cómo calcular el atraso"), guíalo paso a paso explicando qué botones presionar y qué sección visitar basándote en la información de arriba.
3. Si la respuesta está en el contexto de la "Base de Conocimiento" provista, prioriza esa información frente a tu conocimiento general.
4. Responde siempre en español de forma profesional pero cercana.
5. Si no sabes la respuesta o no está en la base de conocimiento ni en las funcionalidades, indícalo cortésmente y sugiere al usuario cargar esa información en la sección de administración "Base de Conocimiento".
`;

    // Map conversation history to Gemini SDK format
    // The history should be array of: { role: 'user' | 'model', parts: [{ text: string }] }
    const contents: any[] = [];
    if (history && Array.isArray(history)) {
      history.forEach((h: any) => {
        contents.push({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }]
        });
      });
    }

    // Add current user message
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    // Call the Gemini model
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.3, // low temperature for precise factual responses
      }
    });

    const reply = response.text || 'Lo siento, no he podido generar una respuesta.';

    res.json({ reply });
  } catch (err: any) {
    console.error('Error in chatbot endpoint:', err);
    res.status(500).json({ 
      error: 'Error al procesar la solicitud en el servidor', 
      message: err.message || 'Error desconocido' 
    });
  }
});

// 2. VITE OR STATIC MIDDLEWARE SETUP
async function initServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

initServer().catch((err) => {
  console.error('Failed to start server:', err);
});

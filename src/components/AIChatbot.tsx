import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, X, Send, Bot, User, Sparkles, AlertCircle, HelpCircle, 
  ArrowRight, BookOpen, Minimize2, CheckCircle, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getKnowledgeBase } from '../utils/storage';
import { Project } from '../types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isError?: boolean;
}

interface AIChatbotProps {
  activeTab: string;
  activeProject: Project | null;
}

const TAB_DESCRIPTIONS: Record<string, { title: string; desc: string }> = {
  dashboard: {
    title: 'Dashboard (KPIs y Control)',
    desc: 'Muestra indicadores clave del proyecto (KPIs), el estado de avance planificado vs real, costos acumulados, presupuesto BAC, y un listado detallado de alertas y tareas con desvío.'
  },
  actividades: {
    title: 'Base de Actividades',
    desc: 'Es el cronograma centralizado. Permite listar todas las tareas, hitos y subtareas del proyecto, ver sus avances, responsables, disciplinas, fechas planificadas, e identificar aquellas tareas en la ruta crítica.'
  },
  gantt: {
    title: 'Cronograma Gantt',
    desc: 'Es una representación visual del cronograma interactivo. Muestra las barras de tiempo para cada tarea según su duración planificada, y dibuja líneas indicando el progreso actual, permitiendo detectar cuellos de botella de manera gráfica.'
  },
  costos: {
    title: 'Control de Costos',
    desc: 'Módulo confidencial para la empresa. Permite presupuestar costos directos e indirectos, registrar el real acumulado (AC) y comprometido, estimar el EAC (Estimate at Completion) y calcular desvíos contra el presupuesto base (BAC).'
  },
  certificaciones: {
    title: 'Certificaciones / Cobros',
    desc: 'Permite registrar los estados de pago o facturas mensuales, detallando montos presentados a certificar, montos aprobados por el cliente, facturados y finalmente cobrados, con estados de avance específicos.'
  },
  progreso: {
    title: 'Curva S de Progreso',
    desc: 'Grafica la acumulación del progreso físico en el tiempo. Muestra la curva del planificado acumulado original contra la curva del real acumulado, facilitando el análisis visual de desviaciones en la ejecución física.'
  },
  'carga-masiva': {
    title: 'Carga Masiva de Actividades',
    desc: 'Módulo técnico para importar cronogramas completos desde Excel. Cuenta con descarga de plantilla, validador de errores de formato y confirmación de importación directa a la base de datos local.'
  },
  configuracion: {
    title: 'Configuración Contrato',
    desc: 'Permite editar metadatos generales del contrato, como nombres del proyecto, cliente, moneda, márgenes de utilidad esperados, fechas límites y catálogos de disciplinas, etapas y responsables.'
  },
  'base-conocimiento': {
    title: 'Base de Conocimiento',
    desc: 'Es el repositorio donde se configuran los manuales, guías y procedimientos internos de la empresa. El chatbot se nutre de esta información para contestar preguntas sobre el funcionamiento organizacional.'
  }
};

export default function AIChatbot({ activeTab, activeProject }: AIChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  // Welcome message and suggested questions
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeText = '¡Hola! Soy tu **Asistente Virtual Taging**. Estoy aquí para ayudarte a entender el funcionamiento de la plataforma, resolver dudas operativas y consultar la información cargada en la **Base de Conocimiento**. \n\n¿En qué te puedo asesorar hoy?';
      setMessages([{ role: 'assistant', content: welcomeText }]);
    }
  }, []);

  // Update suggested questions dynamically based on active section
  useEffect(() => {
    const questions = [
      `¿Cómo funciona la sección de "${TAB_DESCRIPTIONS[activeTab]?.title || activeTab}"?`,
      '¿Cómo cargo información de forma masiva?',
      '¿Qué hace esta aplicación de Control de Gestión?'
    ];
    setSuggestedQuestions(questions);
  }, [activeTab]);

  // Mini-markdown parser inside component (safe and compiled easily)
  const renderMessageContent = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      // Bullet points
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const itemText = line.trim().slice(2);
        return (
          <li key={i} className="ml-4 list-disc mb-1 leading-relaxed">
            {parseInlineStyles(itemText)}
          </li>
        );
      }
      // Step numbers
      const numberedMatch = line.trim().match(/^(\d+)\.\s(.*)/);
      if (numberedMatch) {
        return (
          <li key={i} className="ml-5 list-decimal mb-1 leading-relaxed">
            {parseInlineStyles(numberedMatch[2])}
          </li>
        );
      }
      
      return (
        <p key={i} className="mb-2 leading-relaxed whitespace-pre-wrap">
          {parseInlineStyles(line)}
        </p>
      );
    });
  };

  const parseInlineStyles = (text: string) => {
    const parts = [];
    let currentIndex = 0;
    const boldRegex = /\*\*(.*?)\*\*/g;
    let match;

    while ((match = boldRegex.exec(text)) !== null) {
      // Add text before bold
      if (match.index > currentIndex) {
        parts.push(text.slice(currentIndex, match.index));
      }
      // Add bold text
      parts.push(
        <strong key={match.index} className="font-extrabold text-slate-900">
          {match[1]}
        </strong>
      );
      currentIndex = boldRegex.lastIndex;
    }

    if (currentIndex < text.length) {
      parts.push(text.slice(currentIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: textToSend };
    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Load current local knowledge base documents as context
      const kbItems = getKnowledgeBase();
      const kbContext = kbItems.map(item => (
        `[Categoría: ${item.categoria}] Título: ${item.titulo}\nContenido:\n${item.contenido}`
      )).join('\n\n---\n\n');

      const currentSectionInfo = TAB_DESCRIPTIONS[activeTab] 
        ? `${TAB_DESCRIPTIONS[activeTab].title}: ${TAB_DESCRIPTIONS[activeTab].desc}` 
        : activeTab;

      // Prepare payload
      const payload = {
        message: textToSend,
        history: messages.filter(m => !m.isError), // send previous messages
        kbContext,
        currentSection: currentSectionInfo,
        projectContext: activeProject ? {
          nombre: activeProject.nombreProyecto,
          cliente: activeProject.cliente,
          codigo: activeProject.codigoContrato,
          avanceFisico: activeProject.avanceFisicoAcumulado,
          atrasoDias: activeProject.diasAtrasoTotal,
          moneda: activeProject.moneda,
          presupuestoBAC: activeProject.montoPresupuestoBAC,
          costoRealAC: activeProject.montoRealAC,
          desvio: activeProject.desvioTotal
        } : null
      };

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific config/API key error visually
        if (data.error === 'Falta configurar la clave API') {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `### 🔑 Configuración Requerida\n\nNo se ha detectado la clave API de **Gemini** (\`GEMINI_API_KEY\`).\n\nPara activar el chatbot inteligente:\n1. Ve a la pestaña **Settings / Variables de Entorno**.\n2. Agrega la variable \`GEMINI_API_KEY\` con tu clave de Google AI Studio.\n3. O agrégala en el archivo \`.env\` de tu entorno local.\n\n*Mientras tanto, puedes cargar manuales y preguntas en la pestaña **Base de Conocimiento**.*`,
            isError: true
          }]);
        } else {
          throw new Error(data.message || 'Error del servidor');
        }
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      }
    } catch (err: any) {
      console.error('Error sending chat message:', err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⚠️ **Error de Conexión:** No se pudo conectar con el servidor de Inteligencia Artificial.\n\nDetalle: ${err.message || 'Error de red'}. Por favor, verifique el servidor.`,
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-80 sm:w-96 h-[500px] flex flex-col overflow-hidden mb-4"
          >
            {/* Header */}
            <div className="bg-indigo-600 text-white p-4 flex items-center justify-between shadow-md shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
                  <Bot className="w-5 h-5 text-indigo-100" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs flex items-center space-x-1.5">
                    <span>Asistente Taging IA</span>
                    <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
                  </h4>
                  <span className="text-[9px] text-indigo-100 font-semibold uppercase tracking-wider block">Conectado a Base de Conocimiento</span>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <button 
                  onClick={() => setIsOpen(false)} 
                  className="p-1 hover:bg-white/10 rounded-lg transition text-indigo-100 hover:text-white"
                  title="Minimizar Chat"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chat Messages Panel */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
              {messages.map((msg, idx) => {
                const isAssistant = msg.role === 'assistant';
                return (
                  <div 
                    key={idx} 
                    className={`flex items-start gap-2.5 max-w-[85%] ${
                      isAssistant ? 'self-start' : 'self-end ml-auto flex-row-reverse'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                      isAssistant 
                        ? 'bg-indigo-50 border-indigo-100 text-indigo-600' 
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}>
                      {isAssistant ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>

                    <div className={`rounded-2xl p-3 text-xs leading-relaxed ${
                      isAssistant 
                        ? msg.isError 
                          ? 'bg-rose-50 text-rose-800 border border-rose-150 rounded-tl-none'
                          : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none shadow-sm'
                        : 'bg-indigo-600 text-white rounded-tr-none'
                    }`}>
                      {renderMessageContent(msg.content)}
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex items-start gap-2.5 max-w-[80%]">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-white rounded-2xl rounded-tl-none p-3.5 border border-slate-200 shadow-sm flex items-center space-x-1.5">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Suggested prompts / Questions */}
            {suggestedQuestions.length > 0 && !isLoading && (
              <div className="p-2.5 bg-white border-t border-slate-100 flex flex-col gap-1.5 shrink-0 max-h-32 overflow-y-auto">
                <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider pl-1.5 mb-0.5">Preguntas Sugeridas</span>
                {suggestedQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(q)}
                    className="text-left bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 font-bold p-1.5 px-2.5 rounded-lg text-[10px] transition border border-slate-150 flex items-center justify-between"
                  >
                    <span className="truncate">{q}</span>
                    <ChevronRight className="w-3 h-3 text-slate-450 shrink-0 ml-1" />
                  </button>
                ))}
              </div>
            )}

            {/* Input Form Footer */}
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputMessage); }}
              className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2 shrink-0"
            >
              <input
                type="text"
                placeholder="Escriba su consulta aquí..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                disabled={isLoading}
                className="flex-1 bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 outline-none text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white transition"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isLoading}
                className={`p-2.5 rounded-xl transition ${
                  inputMessage.trim() && !isLoading
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-indigo-500/20 transition-all transform hover:scale-105"
        title="Consultar Asistente de IA"
        id="ai-chatbot-toggle-btn"
      >
        {isOpen ? <X className="w-6 h-6 animate-spin-once" /> : <MessageSquare className="w-5 h-5" />}
      </button>
    </div>
  );
}

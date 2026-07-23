import { Project, Activity, CostDirect, CostIndirect, Certification, DateCorteProgress, User, KnowledgeBaseItem, ProjectDocument } from '../types';
import { initialProjects, initialActivities, initialCostsDirect, initialCostsIndirect, initialCertifications, initialProgress } from '../data/initialData';
import { initialDocuments } from '../data/initialDocuments';
import { cloudSync, isFirebaseActive } from './firebase';

const KEYS = {
  PROJECTS: 'taging_projects',
  ACTIVE_PROJECT_ID: 'taging_active_project_id',
  ACTIVE_USER: 'taging_active_user',
  ACTIVITIES: 'taging_activities',
  COSTS_DIRECT: 'taging_costs_direct',
  COSTS_INDIRECT: 'taging_costs_indirect',
  CERTIFICATIONS: 'taging_certifications',
  PROGRESS: 'taging_progress',
  KNOWLEDGE_BASE: 'taging_knowledge_base',
  DOCUMENTS: 'taging_documents'
};

const initialKnowledgeBase: KnowledgeBaseItem[] = [
  {
    id: 'kb-1',
    titulo: '¿Cómo funciona esta aplicación de Control de Gestión de Contratos?',
    categoria: 'General',
    contenido: 'Esta plataforma desarrollada por Taging Ingeniería permite realizar un control físico y financiero exhaustivo de los contratos de ingeniería y construcción. Cuenta con módulos integrados de Dashboard (KPIs, desvíos y alertas), Base de Actividades, Cronograma Gantt interactivo, Control de Costos (Directos e Indirectos), Certificaciones o Cobros del período y la Curva S de progreso acumulado proyectado vs real.',
    fechaCreacion: '2026-07-20'
  },
  {
    id: 'kb-2',
    titulo: '¿Cómo funciona la Base de Actividades?',
    categoria: 'Manuales de Uso',
    contenido: 'La sección de "Base de Actividades" permite visualizar, ordenar, filtrar y buscar tareas del contrato de ingeniería. Cada tarea tiene un código WBS que determina su jerarquía, un tipo de registro (Título, Tarea, Subtarea, Hito), disciplina asociada, etapa, responsable, porcentaje de avance real y planificado, fechas, y duración en días. Se puede editar o eliminar cualquier registro si se tiene el rol adecuado.',
    fechaCreacion: '2026-07-20'
  },
  {
    id: 'kb-3',
    titulo: '¿Cómo cargar información de forma masiva?',
    categoria: 'Instrucciones de Trabajo',
    contenido: 'Para cargar información de manera masiva:\n1. Diríjase a la sección "Carga Masiva de Actividades" en el menú lateral.\n2. Descargue la plantilla de Excel provista presionando el botón "Descargar Plantilla Excel".\n3. Complete la planilla con los datos de las tareas (WBS, nombre, tipo, disciplina, etapa, responsable, fechas planificadas, valor, avance real, etc.) respetando el formato exacto.\n4. Arrastre y suelte el archivo completado en el área de carga o selecciónelo desde su computadora.\n5. El sistema validará los datos y, de estar correctos, le permitirá presionar "Confirmar e Importar" para actualizar toda la base de datos.',
    fechaCreacion: '2026-07-20'
  },
  {
    id: 'kb-4',
    titulo: '¿Cómo se calcula el atraso total del proyecto?',
    categoria: 'Reglas de Negocio',
    contenido: 'El atraso total del proyecto se calcula dinámicamente comparando el avance real general acumulado frente al avance planificado general acumulado a la Fecha de Corte. Si el avance real es menor al planificado (o el SPI es menor a 1.0), se determina una desviación basada en:\n1. La brecha física (gap) proyectada en días de duración del proyecto.\n2. Los atrasos individuales de las tareas activas pendientes que se encuentran en la ruta crítica o cuyo plazo ya venció.\nEl cálculo es conservador y busca representar el retraso potencial en la fecha de término del contrato de ingeniería.',
    fechaCreacion: '2026-07-20'
  },
  {
    id: 'kb-5',
    titulo: '¿Cómo funciona la sección de Control de Costos?',
    categoria: 'Manuales de Uso',
    contenido: 'El módulo "Control de Costos" se divide en Costos Directos y Costos Indirectos. Los Costos Directos se sincronizan automáticamente con el valor y presupuesto asignado a cada tarea en la Base de Actividades. En esta sección se puede registrar el costo Real Acumulado y el Monto Comprometido. El sistema calcula automáticamente el EAC (Estimate at Completion) y el Desvío (Presupuesto BAC - EAC). Solo el rol Empresa tiene acceso a este módulo para garantizar la confidencialidad financiera.',
    fechaCreacion: '2026-07-20'
  },
  {
    id: 'kb-6',
    titulo: '¿Qué es la Fecha de Corte y cómo se utiliza?',
    categoria: 'Reglas de Negocio',
    contenido: 'La Fecha de Corte es una fecha global de cálculo (configurable en el encabezado superior) que determina la fecha para la cual se miden todos los KPIs y el avance planificado. Al cambiar la Fecha de Corte, la aplicación recalcula instantáneamente los porcentajes de avance que debieran tener las tareas según su cronograma planificado lineal, detecta qué tareas están vencidas, estima los atrasos de forma dinámica y actualiza la Curva S.',
    fechaCreacion: '2026-07-20'
  },
  {
    id: 'kb-7',
    titulo: '¿Cómo se administran las Certificaciones o Estados de Pago?',
    categoria: 'Procedimientos Internos',
    contenido: 'El proceso para la certificación de avances y cobros mensuales consta de:\n1. Ir a la pestaña "Certificaciones / Cobros".\n2. Presionar "Crear Nueva Certificación".\n3. Seleccionar la tarea a certificar, el número de estado de pago, el período de cobro, y los montos a certificar, aprobar, facturar o cobrar.\n4. El estado del registro puede ser Borrador, Presentado, Aprobado, Facturado o Cobrado.\n5. El sistema consolida estos datos en gráficos dentro del Dashboard para comparar la curva de facturación vs la de presupuesto y costos.',
    fechaCreacion: '2026-07-20'
  },
  {
    id: 'kb-8',
    titulo: '¿Cómo utilizar la Curva S de Progreso?',
    categoria: 'Manuales de Uso',
    contenido: 'La sección "Curva S de Progreso" muestra de forma gráfica la evolución del proyecto en el tiempo. Permite registrar hitos de avance mensual o quincenal (fechas de corte de progreso) especificando el porcentaje proyectado acumulado y el porcentaje real acumulado. El gráfico de líneas de Recharts muestra de forma limpia la Curva S Planificada (proyectada) vs la Curva S Real, permitiendo visualizar visualmente si el contrato de ingeniería está adelantado o retrasado en su curva acumulada de ejecución física.',
    fechaCreacion: '2026-07-20'
  }
];

export const initializeStorage = () => {
  if (!localStorage.getItem(KEYS.PROJECTS)) {
    localStorage.setItem(KEYS.PROJECTS, JSON.stringify(initialProjects));
  }
  if (!localStorage.getItem(KEYS.ACTIVE_PROJECT_ID)) {
    localStorage.setItem(KEYS.ACTIVE_PROJECT_ID, JSON.stringify(initialProjects[0].idProyecto));
  }
  if (!localStorage.getItem(KEYS.ACTIVITIES)) {
    localStorage.setItem(KEYS.ACTIVITIES, JSON.stringify(initialActivities));
  }
  if (!localStorage.getItem(KEYS.COSTS_DIRECT)) {
    localStorage.setItem(KEYS.COSTS_DIRECT, JSON.stringify(initialCostsDirect));
  }
  if (!localStorage.getItem(KEYS.COSTS_INDIRECT)) {
    localStorage.setItem(KEYS.COSTS_INDIRECT, JSON.stringify(initialCostsIndirect));
  }
  if (!localStorage.getItem(KEYS.CERTIFICATIONS)) {
    localStorage.setItem(KEYS.CERTIFICATIONS, JSON.stringify(initialCertifications));
  }
  if (!localStorage.getItem(KEYS.PROGRESS)) {
    localStorage.setItem(KEYS.PROGRESS, JSON.stringify(initialProgress));
  }
  if (!localStorage.getItem(KEYS.KNOWLEDGE_BASE)) {
    localStorage.setItem(KEYS.KNOWLEDGE_BASE, JSON.stringify(initialKnowledgeBase));
  }
  if (!localStorage.getItem(KEYS.DOCUMENTS)) {
    localStorage.setItem(KEYS.DOCUMENTS, JSON.stringify(initialDocuments));
  }
};

// Generic helper methods
const getFromStorage = <T>(key: string, defaultValue: T): T => {
  const data = localStorage.getItem(key);
  if (!data) return defaultValue;
  try {
    return JSON.parse(data) as T;
  } catch (e) {
    console.error('Error parsing storage for key', key, e);
    return defaultValue;
  }
};

const saveToStorage = <T>(key: string, data: T) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Entity-specific helper methods
export const getProjects = (): Project[] => getFromStorage<Project[]>(KEYS.PROJECTS, []);
export const saveProjects = (projects: Project[]) => {
  saveToStorage(KEYS.PROJECTS, projects);
  cloudSync.projects(projects).catch(err => console.error('Cloud projects sync failed', err));
};

export const getActiveProjectId = (): string => getFromStorage<string>(KEYS.ACTIVE_PROJECT_ID, 'casposo-clasificacion');
export const saveActiveProjectId = (id: string) => saveToStorage(KEYS.ACTIVE_PROJECT_ID, id);

export const getActiveUser = (): User | null => getFromStorage<User | null>(KEYS.ACTIVE_USER, null);
export const saveActiveUser = (user: User) => saveToStorage(KEYS.ACTIVE_USER, user);
export const clearActiveUser = () => localStorage.removeItem(KEYS.ACTIVE_USER);

export const getActivities = (): Activity[] => getFromStorage<Activity[]>(KEYS.ACTIVITIES, []);
export const saveActivities = (activities: Activity[]) => {
  saveToStorage(KEYS.ACTIVITIES, activities);
  cloudSync.activities(activities).catch(err => console.error('Cloud activities sync failed', err));
};

export const getCostsDirect = (): CostDirect[] => getFromStorage<CostDirect[]>(KEYS.COSTS_DIRECT, []);
export const saveCostsDirect = (costs: CostDirect[]) => {
  saveToStorage(KEYS.COSTS_DIRECT, costs);
  cloudSync.costsDirect(costs).catch(err => console.error('Cloud costsDirect sync failed', err));
};

export const getCostsIndirect = (): CostIndirect[] => getFromStorage<CostIndirect[]>(KEYS.COSTS_INDIRECT, []);
export const saveCostsIndirect = (costs: CostIndirect[]) => {
  saveToStorage(KEYS.COSTS_INDIRECT, costs);
  cloudSync.costsIndirect(costs).catch(err => console.error('Cloud costsIndirect sync failed', err));
};

export const getCertifications = (): Certification[] => getFromStorage<Certification[]>(KEYS.CERTIFICATIONS, []);
export const saveCertifications = (certs: Certification[]) => {
  saveToStorage(KEYS.CERTIFICATIONS, certs);
  cloudSync.certifications(certs).catch(err => console.error('Cloud certifications sync failed', err));
};

export const getProgress = (): DateCorteProgress[] => getFromStorage<DateCorteProgress[]>(KEYS.PROGRESS, []);
export const saveProgress = (progress: DateCorteProgress[]) => {
  saveToStorage(KEYS.PROGRESS, progress);
  cloudSync.progress(progress).catch(err => console.error('Cloud progress sync failed', err));
};

export const getKnowledgeBase = (): KnowledgeBaseItem[] => getFromStorage<KnowledgeBaseItem[]>(KEYS.KNOWLEDGE_BASE, []);
export const saveKnowledgeBase = (kb: KnowledgeBaseItem[]) => {
  saveToStorage(KEYS.KNOWLEDGE_BASE, kb);
  cloudSync.knowledgeBase(kb).catch(err => console.error('Cloud knowledgeBase sync failed', err));
};

export const restoreKnowledgeBaseDefaults = async (): Promise<void> => {
  saveToStorage(KEYS.KNOWLEDGE_BASE, initialKnowledgeBase);
  if (isFirebaseActive()) {
    try {
      await cloudSync.knowledgeBase(initialKnowledgeBase);
    } catch (err) {
      console.error('Failed to sync restored knowledge base defaults to cloud:', err);
    }
  }
};

export const getDocuments = (): ProjectDocument[] => getFromStorage<ProjectDocument[]>(KEYS.DOCUMENTS, initialDocuments);
export const saveDocuments = (docs: ProjectDocument[]) => {
  saveToStorage(KEYS.DOCUMENTS, docs);
};


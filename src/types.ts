export interface Project {
  idProyecto: string;
  nombreProyecto: string;
  codigoContrato: string;
  cliente: string;
  jefeProyecto: string;
  fechaInicioPlan: string;
  fechaFinPlan: string;
  estadoProyecto: 'En Curso' | 'Completado' | 'Pausado' | 'Planificado';
  descripcion: string;
  fechaUltimaActualizacion: string;
  
  // Custom configuration per project
  responsables: string[];
  disciplinas: string[];
  etapas: string[];
  utilidadEsperada: number; // percentage
  moneda: string; // e.g., "USD" or "ARS"
  frecuenciaCorte: string; // e.g., "15 días"
  frecuenciaCertificacion: string; // e.g., "Mensual"
  nombreEmpresa: string;
  nombreComercialApp: string;

  // Calculated metrics appended at runtime
  avanceFisicoAcumulado?: number;
  diasAtrasoTotal?: number;
  montoPresupuestoBAC?: number;
  montoRealAC?: number;
  montoComprometido?: number;
  montoEAC?: number;
  desvioTotal?: number;
}

export interface Activity {
  id: string;
  idProyecto: string;
  wbs: string;
  tipoRegistro: 'Título' | 'Tarea' | 'Subtarea' | 'Hito';
  tarea: string;
  disciplina: string;
  etapa: string;
  responsable: string;
  critica: 'Sí' | 'No';
  prioridad: 'Alta' | 'Media' | 'Baja';
  estado: 'No Iniciada' | 'En Curso' | 'Pausada' | 'Completada' | 'Cancelada';
  inicioPlanificado: string; // YYYY-MM-DD
  finPlanificado: string; // YYYY-MM-DD
  duracionPlanificada: number; // calculated
  inicioReal?: string; // YYYY-MM-DD
  finReal?: string; // YYYY-MM-DD
  duracionReal?: number; // calculated
  atrasoDias: number; // calculated
  valorTarea: number;
  avancePorcentajeValor: number; // calculated (valorTarea / totalValorProyecto * 100)
  entregables: 'Sí' | 'No';
  observaciones: string;
  avancePlanificado: number; // 0-100 calculated
  avanceReal: number; // 0-100 input
  createdAt: string;
  updatedAt: string;
}

export interface CostDirect {
  idCosto: string;
  idProyecto: string;
  idActividad?: string; // Linked activity ID if any
  wbsReferencia?: string;
  tarea: string;
  unidad: string;
  cantidad: number;
  precioUnitario: number;
  valorTarea: number; // cantidad * precioUnitario
  realAcumulado: number;
  comprometido: number;
  eac: number; // realAcumulado + comprometido or manual
  desvio: number; // valorTarea (presupuesto) - eac
  porcentajeEjecutado: number; // realAcumulado / valorTarea * 100
}

export interface CostIndirect {
  idCostoIndirecto: string;
  idProyecto: string;
  concepto: string;
  presupuesto: number;
  realAcumulado: number;
  comprometido: number;
  eac: number;
  desvio: number; // presupuesto - eac
  porcentajeEjecutado: number; // realAcumulado / presupuesto * 100
}

export interface Certification {
  idCertificacion: string;
  idProyecto: string;
  numero: number;
  fechaPeriodo: string; // e.g. "Julio 2026"
  tareaCertificar: string;
  fechaPresentacion: string;
  fechaAprobacion?: string;
  valorTarea: number;
  certificado: number;
  aprobado: number;
  facturado: number;
  cobrado: number;
  estado: 'Borrador' | 'Presentado' | 'Aprobado' | 'Facturado' | 'Cobrado' | 'Pendiente';
  observaciones: string;
}

export interface DateCorteProgress {
  idProgreso: string;
  idProyecto: string;
  fechaCorte: string; // YYYY-MM-DD
  proyectadoAcumulado: number; // 0-100%
  realAcumulado: number; // 0-100%
  outlook: number; // 0-100% projection
  comentarios?: string;
}

export type UserRole = 'Empresa' | 'Cliente' | 'Control de Proyecto';

export interface User {
  username: string;
  role: UserRole;
}

export interface KnowledgeBaseItem {
  id: string;
  titulo: string;
  categoria: string;
  contenido: string;
  fechaCreacion: string;
  idProyecto?: string; // Optional: can be specific to a project or global
}

export interface ProjectDocument {
  id: string;
  idProyecto: string;
  wbs?: string; // e.g. "1", "1.1", "1.2", "2", "2.1"
  item: string; // e.g. "1", "2", "100", "-"
  tipoDocumento: 'DOC' | 'DWG' | 'ACT' | 'Título' | string;
  codificacion: string; // e.g. "0526-G-IN-0001", "S/N"
  descripcion: string;
  etapa: string; // e.g. "ETAPA 1", "ETAPA 2"
  seccion?: string; // e.g. "Paquete Electromecánico", "Ingeniería Básica", "Ingeniería de Detalle"
  disciplina: string; // e.g. "Procesos", "Civil", "Cañerías", "Electromecánica", "Electricidad", "Instrumentación"
  revision: string; // e.g. "A", "B", "0"
  estado: 'Aprobado' | 'En Revisión' | 'Emitido' | 'Pendiente' | string;
  observaciones?: string;
  createdAt?: string;
  updatedAt?: string;
}


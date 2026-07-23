import { Activity, CostDirect, CostIndirect, Certification, DateCorteProgress } from '../types';

// Anchor current date as July 17, 2026, as specified by system metadata
export const HOY = '2026-07-17';

export const parseDate = (dStr: string | undefined): Date | null => {
  if (!dStr) return null;
  const d = new Date(dStr + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
};

export const calcularDuracion = (inicio: string, fin: string): number => {
  const d1 = parseDate(inicio);
  const d2 = parseDate(fin);
  if (!d1 || !d2) return 0;
  const diff = d2.getTime() - d1.getTime();
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)) + 1);
};

export const calcularAvancePlanificado = (inicio: string, fin: string, hoyStr: string = HOY): number => {
  const dInicio = parseDate(inicio);
  const dFin = parseDate(fin);
  const dHoy = parseDate(hoyStr);

  if (!dInicio || !dFin || !dHoy) return 0;

  if (dHoy.getTime() < dInicio.getTime()) {
    return 0;
  }
  if (dHoy.getTime() > dFin.getTime()) {
    return 100;
  }

  const totalDays = calcularDuracion(inicio, fin);
  const elapsedDays = calcularDuracion(inicio, hoyStr);

  if (totalDays <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));
};

export const calcularAtrasoDias = (
  finPlanificado: string,
  finReal?: string,
  estado?: string,
  hoyStr: string = HOY
): number => {
  if (estado === 'Completada') {
    if (!finReal) return 0;
    const dFinPlan = parseDate(finPlanificado);
    const dFinReal = parseDate(finReal);
    if (!dFinPlan || !dFinReal) return 0;
    const diff = dFinReal.getTime() - dFinPlan.getTime();
    const days = Math.round(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  } else if (estado === 'Cancelada') {
    return 0;
  } else {
    // Check if overdue
    const dFinPlan = parseDate(finPlanificado);
    const dHoy = parseDate(hoyStr);
    if (!dFinPlan || !dHoy) return 0;

    if (dHoy.getTime() > dFinPlan.getTime()) {
      const diff = dHoy.getTime() - dFinPlan.getTime();
      return Math.round(diff / (1000 * 60 * 60 * 24));
    }
    return 0;
  }
};

export interface DashboardMetrics {
  totalActividades: number;
  completadas: number;
  enCurso: number;
  noIniciada: number;
  pausada: number;
  cancelada: number;
  atrasadas: number;
  porcentajeCompletadas: number;
  avancePlanificadoGeneral: number;
  avanceRealGeneral: number;
  desvio: number;
  actividadesCriticas: number;
  actividadesConEntregables: number;
  spi: number; // Schedule Performance Index
  
  // Cost metrics
  presupuestoTotal: number; // Sum of task values (planned costs)
  costoRealAcumulado: number;
  comprometido: number;
  eac: number;
  desvioCostos: number;
  
  // Certifications metrics
  montoCertificadoAcumulado: number;
  porcentajeCertificado: number;
  montoFacturado: number;
  montoCobrado: number;
  saldoPorCertificar: number;
  saldoPorCobrar: number;
}

export const syncActivitiesToCostsDirect = (
  activities: Activity[],
  costsDirect: CostDirect[]
): CostDirect[] => {
  const manualCosts = costsDirect.filter(c => !c.idActividad);
  const existingSyncedCosts = costsDirect.filter(c => !!c.idActividad);

  const syncedMap = new Map<string, CostDirect>();
  existingSyncedCosts.forEach(c => {
    syncedMap.set(c.idActividad!, c);
  });

  const updatedSynced: CostDirect[] = [];

  activities.forEach(a => {
    // Only sync real tasks or subtasks with economic value
    if (a.tipoRegistro !== 'Título' && a.tipoRegistro !== 'Hito' && a.valorTarea > 0) {
      const existing = syncedMap.get(a.id);
      if (existing) {
        const updatedCost = { ...existing };
        updatedCost.tarea = a.tarea;
        updatedCost.wbsReferencia = a.wbs;
        updatedCost.idProyecto = a.idProyecto;
        
        // Automatic update of task value
        if (updatedCost.valorTarea !== a.valorTarea) {
          updatedCost.cantidad = 1;
          updatedCost.precioUnitario = a.valorTarea;
          updatedCost.valorTarea = a.valorTarea;
        }

        updatedCost.eac = updatedCost.realAcumulado + updatedCost.comprometido;
        updatedCost.desvio = updatedCost.valorTarea - updatedCost.eac;
        updatedCost.porcentajeEjecutado = updatedCost.valorTarea > 0 ? (updatedCost.realAcumulado / updatedCost.valorTarea) * 100 : 0;

        updatedSynced.push(updatedCost);
      } else {
        const newCost: CostDirect = {
          idCosto: `cd-sync-${a.id}`,
          idProyecto: a.idProyecto,
          idActividad: a.id,
          wbsReferencia: a.wbs,
          tarea: a.tarea,
          unidad: 'GL',
          cantidad: 1,
          precioUnitario: a.valorTarea,
          valorTarea: a.valorTarea,
          realAcumulado: 0,
          comprometido: 0,
          eac: 0,
          desvio: a.valorTarea,
          porcentajeEjecutado: 0
        };
        updatedSynced.push(newCost);
      }
    }
  });

  return [...manualCosts, ...updatedSynced];
};

export const calcularMetricasProyecto = (
  activities: Activity[],
  costsDirect: CostDirect[],
  costsIndirect: CostIndirect[],
  certifications: Certification[],
  idProyecto: string,
  utilidadEsperada: number,
  hoyStr: string = HOY
): DashboardMetrics => {
  const projectActivities = activities.filter(a => a.idProyecto === idProyecto);
  const projectCostsDirect = costsDirect.filter(c => c.idProyecto === idProyecto);
  const projectCostsIndirect = costsIndirect.filter(c => c.idProyecto === idProyecto);
  const projectCertifications = certifications.filter(c => c.idProyecto === idProyecto);

  // 1. Actividades counts (only Tareas and Subtareas, excluding Títulos and Hitos)
  const calcActivities = projectActivities.filter(a => a.tipoRegistro !== 'Título' && a.tipoRegistro !== 'Hito');
  const totalActividades = calcActivities.length;
  const completadas = calcActivities.filter(a => a.estado === 'Completada').length;
  const enCurso = calcActivities.filter(a => a.estado === 'En Curso').length;
  const noIniciada = calcActivities.filter(a => a.estado === 'No Iniciada').length;
  const pausada = calcActivities.filter(a => a.estado === 'Pausada').length;
  const cancelada = calcActivities.filter(a => a.estado === 'Cancelada').length;
  
  const actividadesCriticas = calcActivities.filter(a => a.critica === 'Sí').length;
  const actividadesConEntregables = calcActivities.filter(a => a.entregables === 'Sí').length;

  // Overdue activities
  const dHoy = parseDate(hoyStr);
  const atrasadas = calcActivities.filter(a => {
    if (a.estado === 'Completada' || a.estado === 'Cancelada') return false;
    const dFinPlan = parseDate(a.finPlanificado);
    if (!dFinPlan || !dHoy) return false;
    return dHoy.getTime() > dFinPlan.getTime();
  }).length;

  const porcentajeCompletadas = totalActividades > 0 ? (completadas / totalActividades) * 100 : 0;

  // 2. Avances Generales (Simple average of Tareas and Subtareas)
  const activeActivities = projectActivities.filter(a => a.tipoRegistro !== 'Título' && a.tipoRegistro !== 'Hito');
  const sumPlan = activeActivities.reduce((acc, a) => {
    const plan = a.avancePlanificado !== undefined ? a.avancePlanificado : calcularAvancePlanificado(a.inicioPlanificado, a.finPlanificado, hoyStr);
    return acc + plan;
  }, 0);
  const sumReal = activeActivities.reduce((acc, a) => acc + (a.avanceReal || 0), 0);

  const avancePlanificadoGeneral = activeActivities.length > 0 ? (sumPlan / activeActivities.length) : 0;
  const avanceRealGeneral = activeActivities.length > 0 ? (sumReal / activeActivities.length) : 0;
  const desvio = avanceRealGeneral - avancePlanificadoGeneral;

  // Schedule Performance Index (SPI) = Real % / Planned %
  const spi = avancePlanificadoGeneral > 0 ? (avanceRealGeneral / avancePlanificadoGeneral) : 1.0;

  // 3. Costos
  const presupuestoDirecto = projectCostsDirect.reduce((acc, c) => acc + (c.valorTarea || 0), 0);
  const presupuestoIndirecto = projectCostsIndirect.reduce((acc, c) => acc + (c.presupuesto || 0), 0);
  const presupuestoTotal = presupuestoDirecto + presupuestoIndirecto;

  const costoRealDirecto = projectCostsDirect.reduce((acc, c) => acc + (c.realAcumulado || 0), 0);
  const costoRealIndirecto = projectCostsIndirect.reduce((acc, c) => acc + (c.realAcumulado || 0), 0);
  const costoRealAcumulado = costoRealDirecto + costoRealIndirecto;

  const comprometidoDirecto = projectCostsDirect.reduce((acc, c) => acc + (c.comprometido || 0), 0);
  const comprometidoIndirecto = projectCostsIndirect.reduce((acc, c) => acc + (c.comprometido || 0), 0);
  const comprometido = comprometidoDirecto + comprometidoIndirecto;

  const eacDirecto = projectCostsDirect.reduce((acc, c) => acc + (c.eac || 0), 0);
  const eacIndirecto = projectCostsIndirect.reduce((acc, c) => acc + (c.eac || 0), 0);
  const eac = eacDirecto + eacIndirecto;

  const desvioCostos = presupuestoTotal - eac;

  // 4. Certificaciones
  const montoCertificadoAcumulado = projectCertifications.reduce((acc, c) => {
    if (c.estado !== 'Borrador') {
      return acc + (c.certificado || 0);
    }
    return acc;
  }, 0);

  const totalMontoContrato = presupuestoTotal * (1 + (utilidadEsperada / 100));
  const porcentajeCertificado = totalMontoContrato > 0 ? (montoCertificadoAcumulado / totalMontoContrato) * 100 : 0;

  const montoFacturado = projectCertifications.reduce((acc, c) => {
    if (c.estado === 'Facturado' || c.estado === 'Cobrado') {
      return acc + (c.facturado || 0);
    }
    return acc;
  }, 0);

  const montoCobrado = projectCertifications.reduce((acc, c) => {
    if (c.estado === 'Cobrado') {
      return acc + (c.cobrado || 0);
    }
    return acc;
  }, 0);

  const saldoPorCertificar = Math.max(0, totalMontoContrato - montoCertificadoAcumulado);
  const saldoPorCobrar = Math.max(0, montoFacturado - montoCobrado);

  return {
    totalActividades,
    completadas,
    enCurso,
    noIniciada,
    pausada,
    cancelada,
    atrasadas,
    porcentajeCompletadas,
    avancePlanificadoGeneral,
    avanceRealGeneral,
    desvio,
    actividadesCriticas,
    actividadesConEntregables,
    spi,
    
    presupuestoTotal,
    costoRealAcumulado,
    comprometido,
    eac,
    desvioCostos,
    
    montoCertificadoAcumulado,
    porcentajeCertificado,
    montoFacturado,
    montoCobrado,
    saldoPorCertificar,
    saldoPorCobrar
  };
};

export const recalculateProjectMetrics = (
  idProyecto: string,
  projects: any[],
  activities: Activity[],
  costsDirect: CostDirect[],
  costsIndirect: CostIndirect[],
  certifications: Certification[],
  progressCuts: DateCorteProgress[],
  hoyStr: string = HOY
) => {
  const proj = projects.find(p => p.idProyecto === idProyecto);
  const u = proj ? proj.utilidadEsperada : 15;
  const metrics = calcularMetricasProyecto(activities, costsDirect, costsIndirect, certifications, idProyecto, u, hoyStr);
  
  // Calculate delay in days taking into account plan dates, real dates, progress, status, SPI
  const projActs = activities.filter(a => a.idProyecto === idProyecto);
  
  let overallDelay = 0;
  
  if (metrics.avanceRealGeneral >= metrics.avancePlanificadoGeneral || metrics.spi >= 1.0) {
    overallDelay = 0;
  } else {
    // Project is behind schedule
    const dInicioProj = proj?.fechaInicioPlan || '2026-01-01';
    const dFinProj = proj?.fechaFinPlan || '2026-12-31';
    const duracionProyecto = calcularDuracion(dInicioProj, dFinProj) || 365;

    // 1. Lag based on physical progress
    const gapFisico = metrics.avancePlanificadoGeneral - metrics.avanceRealGeneral;
    const atrasoPorAvance = (gapFisico / 100) * duracionProyecto;

    // 2. Active overdue or late completed tasks
    const delayedActs = projActs.filter(a => a.tipoRegistro !== 'Título' && a.tipoRegistro !== 'Hito' && (a.atrasoDias || 0) > 0);
    const criticalDelayed = delayedActs.filter(a => a.critica === 'Sí');
    const vencidasDelayed = delayedActs.filter(a => a.estado !== 'Completada' && a.estado !== 'Cancelada');
    
    const maxAtrasoCritico = criticalDelayed.length > 0 
      ? Math.max(...criticalDelayed.map(a => a.atrasoDias)) 
      : 0;
    
    const maxAtrasoGeneral = delayedActs.length > 0
      ? Math.max(...delayedActs.map(a => a.atrasoDias))
      : 0;

    const promedioAtrasoVencidos = vencidasDelayed.length > 0
      ? vencidasDelayed.reduce((sum, a) => sum + a.atrasoDias, 0) / vencidasDelayed.length
      : 0;

    if (maxAtrasoCritico > 0) {
      overallDelay = Math.round(maxAtrasoCritico);
    } else if (promedioAtrasoVencidos > 0) {
      overallDelay = Math.round((atrasoPorAvance + promedioAtrasoVencidos) / 2);
    } else {
      overallDelay = Math.round(atrasoPorAvance);
    }

    // Must be at least 1 and cannot exceed maximum task delay
    overallDelay = Math.max(1, Math.min(overallDelay, maxAtrasoGeneral));
  }

  return {
    avanceFisicoAcumulado: metrics.avanceRealGeneral,
    diasAtrasoTotal: overallDelay,
    montoPresupuestoBAC: metrics.presupuestoTotal,
    montoRealAC: metrics.costoRealAcumulado,
    montoComprometido: metrics.comprometido,
    montoEAC: metrics.eac,
    desvioTotal: metrics.desvioCostos
  };
};

export const recalcularActividades = (
  activities: Activity[],
  hoyStr: string = HOY
): Activity[] => {
  return activities.map(a => {
    if (a.tipoRegistro === 'Título') {
      return {
        ...a,
        duracionPlanificada: calcularDuracion(a.inicioPlanificado, a.finPlanificado),
        duracionReal: 0,
        avancePlanificado: 0,
        avanceReal: 0,
        atrasoDias: 0
      };
    }

    const duracionPlanificada = calcularDuracion(a.inicioPlanificado, a.finPlanificado);
    let estado = a.estado;
    let avanceReal = a.avanceReal ?? 0;
    let inicioReal = a.inicioReal;
    let finReal = a.finReal;

    // Completed status rules
    if (avanceReal >= 100 && estado !== 'Cancelada') {
      estado = 'Completada';
      avanceReal = 100;
    }

    if (estado === 'Completada') {
      if (!inicioReal) inicioReal = a.inicioPlanificado;
      if (!finReal) finReal = a.finPlanificado;
    }

    const duracionReal = (inicioReal && finReal) ? calcularDuracion(inicioReal, finReal) : duracionPlanificada;
    const avancePlanificado = calcularAvancePlanificado(a.inicioPlanificado, a.finPlanificado, hoyStr);
    const atrasoDias = calcularAtrasoDias(a.finPlanificado, finReal, estado, hoyStr);

    return {
      ...a,
      inicioReal,
      finReal,
      duracionPlanificada,
      duracionReal,
      estado,
      avancePlanificado,
      avanceReal,
      atrasoDias
    };
  });
};

export interface CurvaSPoint {
  idProgreso?: string;
  fechaCorte: string;
  fechaCorteFormatted: string;
  proyectadoAcumulado: number;
  realAcumulado: number | null;
  outlook: number;
  isCutDate: boolean;
  comentarios?: string;
}

export function calcularCurvaSConOutlook(
  projectCuts: DateCorteProgress[],
  hoyStr: string = HOY
): CurvaSPoint[] {
  if (!projectCuts || projectCuts.length === 0) return [];

  const sortedCuts = [...projectCuts].sort((a, b) => a.fechaCorte.localeCompare(b.fechaCorte));

  // Find the last cut date where cut <= hoy AND real progress was recorded
  let lastRealCutIndex = -1;
  for (let i = 0; i < sortedCuts.length; i++) {
    const cut = sortedCuts[i];
    if (cut.fechaCorte <= hoyStr && (cut.realAcumulado > 0 || i === 0)) {
      lastRealCutIndex = i;
    }
  }

  // Fallback if none found before hoy
  if (lastRealCutIndex === -1) {
    for (let i = 0; i < sortedCuts.length; i++) {
      if (sortedCuts[i].realAcumulado > 0) {
        lastRealCutIndex = i;
      }
    }
  }

  let rLast = 0;
  let pLast = 0;
  if (lastRealCutIndex >= 0) {
    rLast = sortedCuts[lastRealCutIndex].realAcumulado;
    pLast = sortedCuts[lastRealCutIndex].proyectadoAcumulado;
  }

  const pFinal = sortedCuts[sortedCuts.length - 1]?.proyectadoAcumulado || 100;
  const remainingPlan = pFinal - pLast;
  const remainingReal = 100 - rLast;
  const scaleFactor = remainingPlan > 0 ? remainingReal / remainingPlan : 1;

  return sortedCuts.map((cut, idx) => {
    const isPastOrCurrent = idx <= lastRealCutIndex;
    let outlookVal: number;

    if (isPastOrCurrent) {
      // Up to Fecha de Cálculo, Outlook strictly matches real progress
      outlookVal = cut.realAcumulado;
    } else {
      // From Fecha de Cálculo onwards, project seamlessly along planned curve
      const deltaPlan = cut.proyectadoAcumulado - pLast;
      outlookVal = Math.min(100, Math.max(0, Math.round(rLast + deltaPlan * scaleFactor)));
    }

    return {
      idProgreso: cut.idProgreso,
      fechaCorte: cut.fechaCorte,
      fechaCorteFormatted: cut.fechaCorte,
      proyectadoAcumulado: cut.proyectadoAcumulado,
      realAcumulado: isPastOrCurrent ? cut.realAcumulado : null,
      outlook: outlookVal,
      isCutDate: cut.fechaCorte === hoyStr,
      comentarios: cut.comentarios
    };
  });
}

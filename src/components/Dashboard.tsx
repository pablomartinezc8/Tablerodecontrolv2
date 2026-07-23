import { useState } from 'react';
import { Project, Activity, CostDirect, CostIndirect, Certification, DateCorteProgress } from '../types';
import { calcularMetricasProyecto, calcularAvancePlanificado, calcularAtrasoDias, calcularCurvaSConOutlook } from '../utils/projectCalculations';
import { formatearMoneda, formatearPorcentaje, formatearFecha } from '../utils/formato';
import KpiCard from './KpiCard';
import TagingLogo from './TagingLogo';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, LineChart, Line, AreaChart, Area 
} from 'recharts';
import { 
  Activity as ActIcon, CheckCircle2, AlertTriangle, TrendingUp, DollarSign, 
  Award, Briefcase, Calendar, Clock, ChevronRight, User, Settings, Printer, Percent, Flag 
} from 'lucide-react';
import { motion } from 'motion/react';

interface DashboardProps {
  project: Project;
  activities: Activity[];
  costsDirect: CostDirect[];
  costsIndirect: CostIndirect[];
  certifications: Certification[];
  progress: DateCorteProgress[];
  onNavigateToSection: (section: string) => void;
  onOpenPrintReport?: () => void;
  currentUserRole?: string;
  fechaCorte: string;
  onChangeFechaCorte?: (newFecha: string) => void;
}

export default function Dashboard({
  project,
  activities,
  costsDirect,
  costsIndirect,
  certifications,
  progress,
  onNavigateToSection,
  onOpenPrintReport,
  currentUserRole = 'Empresa',
  fechaCorte,
  onChangeFechaCorte
}: DashboardProps) {
  const [daysRange, setDaysRange] = useState<7 | 15 | 30>(15);

  const metricas = calcularMetricasProyecto(
    activities,
    costsDirect,
    costsIndirect,
    certifications,
    project.idProyecto,
    project.utilidadEsperada,
    fechaCorte
  );

  const projectActivities = activities.filter(a => a.idProyecto === project.idProyecto);
  const projectProgress = progress.filter(p => p.idProyecto === project.idProyecto);

  // --- RECHARTS DATA PREPARATION ---

  // 1. Pie Chart - Estado de Actividades
  const estadoData = [
    { name: 'No Iniciada', value: metricas.noIniciada, color: '#94a3b8' },
    { name: 'En Curso', value: metricas.enCurso, color: '#38bdf8' },
    { name: 'Pausada', value: metricas.pausada, color: '#fbbf24' },
    { name: 'Completada', value: metricas.completadas, color: '#10b981' },
    { name: 'Cancelada', value: metricas.cancelada, color: '#f87171' }
  ].filter(d => d.value > 0);

  // Filter real tasks (excluding headers and milestones for task charts/counts)
  const realTaskActivities = projectActivities.filter(a => a.tipoRegistro !== 'Título' && a.tipoRegistro !== 'Hito');

  // 2. Bar Chart - Responsables
  const responsableCounts: { [key: string]: { completas: number, pendientes: number } } = {};
  project.responsables.forEach(r => {
    responsableCounts[r] = { completas: 0, pendientes: 0 };
  });
  realTaskActivities.forEach(a => {
    const resp = a.responsable || 'Sin Asignar';
    if (!responsableCounts[resp]) {
      responsableCounts[resp] = { completas: 0, pendientes: 0 };
    }
    if (a.estado === 'Completada') {
      responsableCounts[resp].completas += 1;
    } else if (a.estado !== 'Cancelada') {
      responsableCounts[resp].pendientes += 1;
    }
  });
  const responsableData = Object.entries(responsableCounts).map(([name, counts]) => ({
    name,
    Completadas: counts.completas,
    Pendientes: counts.pendientes
  })).filter(d => d.Completadas > 0 || d.Pendientes > 0);

  // 3. Bar Chart - Disciplinas
  const disciplinaCounts: { [key: string]: number } = {};
  realTaskActivities.forEach(a => {
    disciplinaCounts[a.disciplina] = (disciplinaCounts[a.disciplina] || 0) + 1;
  });
  const disciplinaData = Object.entries(disciplinaCounts).map(([name, value]) => ({
    name,
    Actividades: value
  })).sort((a, b) => b.Actividades - a.Actividades);

  // 4. Bar Chart - Etapas
  const etapaCounts: { [key: string]: number } = {};
  realTaskActivities.forEach(a => {
    etapaCounts[a.etapa] = (etapaCounts[a.etapa] || 0) + 1;
  });
  const etapaData = Object.entries(etapaCounts).map(([name, value]) => ({
    name,
    Actividades: value
  }));

  // 5. Bar Chart - Prioridad
  const prioridadCounts: { [key: string]: number } = {};
  realTaskActivities.forEach(a => {
    prioridadCounts[a.prioridad] = (prioridadCounts[a.prioridad] || 0) + 1;
  });
  const prioridadData = [
    { name: 'Alta', Cantidad: prioridadCounts['Alta'] || 0, fill: '#ef4444' },
    { name: 'Media', Cantidad: prioridadCounts['Media'] || 0, fill: '#fbbf24' },
    { name: 'Baja', Cantidad: prioridadCounts['Baja'] || 0, fill: '#10b981' }
  ];

  // 6. Costos Chart (Presupuesto vs Real vs Comprometido vs EAC)
  const costosChartData = [
    {
      name: 'Estructura Económica',
      Presupuesto: metricas.presupuestoTotal,
      'Costo Real': metricas.costoRealAcumulado,
      Comprometido: metricas.comprometido,
      EAC: metricas.eac
    }
  ];

  // 7. Mini S-Curve Line Chart (Seamless Outlook projection)
  const sCurvePoints = calcularCurvaSConOutlook(projectProgress, fechaCorte);
  const progressChartData = sCurvePoints.map(p => ({
    name: formatearFecha(p.fechaCorte),
    'Planificado %': p.proyectadoAcumulado,
    'Real %': p.realAcumulado,
    'Outlook %': p.outlook
  }));

  // --- OVERDUE ACTIVITIES ---
  const overdueActivities = realTaskActivities.filter(a => {
    if (a.estado === 'Completada' || a.estado === 'Cancelada') return false;
    return a.finPlanificado < fechaCorte;
  }).map(a => ({
    ...a,
    atraso: calcularAtrasoDias(a.finPlanificado, a.finReal, a.estado, fechaCorte)
  })).sort((a, b) => b.atraso - a.atraso);

  // --- UPCOMING DEADLINES ---
  // finPlanificado between fechaCorte and fechaCorte + daysRange, and state !== Completada
  const upcomingDeadlines = realTaskActivities.filter(a => {
    if (a.estado === 'Completada' || a.estado === 'Cancelada') return false;
    const diff = calcularAtrasoDias(fechaCorte, a.finPlanificado, 'No Iniciada', fechaCorte);
    // if diff is positive or zero, it means finPlanificado >= fechaCorte
    // wait, if finPlanificado >= fechaCorte, then dFin >= dHoy
    const dFin = new Date(a.finPlanificado + 'T00:00:00');
    const dHoy = new Date(fechaCorte + 'T00:00:00');
    const diffDays = Math.ceil((dFin.getTime() - dHoy.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= daysRange;
  }).sort((a, b) => a.finPlanificado.localeCompare(b.finPlanificado));

  // --- HISTORICAL ACTIVITIES WITH DEVIATION ---
  const tasksWithDeviation = realTaskActivities.filter(a => {
    const isCompleted = a.estado === 'Completada';
    if (isCompleted) {
      // Completed task: only has a deviation if it finished after finPlanificado
      return Boolean(a.finReal && a.finReal > a.finPlanificado);
    }
    if (a.estado === 'Cancelada') return false;
    
    // Pending or ongoing task: overdue if finPlanificado < fechaCorte, or progress behind plan
    const isOverdue = a.finPlanificado < fechaCorte;
    const isBehindProgress = a.avanceReal < a.avancePlanificado;
    return isOverdue || isBehindProgress;
  }).map(a => {
    const isCompleted = a.estado === 'Completada';
    let delayDays = 0;
    let statusText = "Desvío Menor";
    let statusColor = "bg-slate-100 text-slate-700 border-slate-200";

    if (isCompleted) {
      delayDays = calcularAtrasoDias(a.finPlanificado, a.finReal, 'Completada', fechaCorte);
      statusText = "Terminada con Atraso";
      statusColor = "bg-amber-50 text-amber-700 border-amber-200";
    } else {
      delayDays = calcularAtrasoDias(a.finPlanificado, undefined, a.estado, fechaCorte);
      const isOverdue = a.finPlanificado < fechaCorte;
      const isBehindProgress = a.avanceReal < a.avancePlanificado;

      if (isOverdue) {
        statusText = a.critica === 'Sí' ? "Vencida (Crítica)" : "Vencida";
        statusColor = a.critica === 'Sí' ? "bg-red-100 text-red-700 border-red-200 animate-pulse" : "bg-red-50 text-red-700 border-red-150";
      } else if (isBehindProgress) {
        statusText = "Atraso en Progreso";
        statusColor = "bg-orange-50 text-orange-700 border-orange-200";
      }
    }

    return {
      ...a,
      delayDays,
      statusText,
      statusColor
    };
  }).sort((a, b) => b.delayDays - a.delayDays || b.avancePlanificado - b.avanceReal);

  // Custom tooltips
  const formatTooltipValue = (value: any) => {
    if (typeof value === 'number') {
      if (value > 100) return formatearMoneda(value, project.moneda);
      return formatearPorcentaje(value);
    }
    return value;
  };

  const isCliente = currentUserRole === 'Cliente';

  if (isCliente) {
    return (
      <div className="space-y-6 select-none font-sans text-xs">
        {/* Client Welcome Banner */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 md:p-8 shadow-md relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_right,rgba(99,102,241,0.15)_0%,transparent_70%)] z-0" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:16px_16px] z-0" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <TagingLogo variant="full" theme="dark" size="sm" />
                <span className="bg-indigo-500/10 text-indigo-400 font-mono text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-lg border border-indigo-500/20">
                  Mandante: {project.cliente}
                </span>
                <span className="bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-lg border border-emerald-500/20">
                  Código: {project.codigoContrato}
                </span>
              </div>
              <h2 className="text-xl font-black tracking-tight text-white">{project.nombreProyecto}</h2>
              <p className="text-[11px] text-slate-400 max-w-xl font-medium leading-relaxed">
                Portal de Monitoreo de Mandante. Acceso exclusivo para el seguimiento del progreso físico, hitos críticos, cronograma contractual y curvas S de avance acumulado.
              </p>
            </div>

            <div className="flex items-center space-x-3 shrink-0">
              {onOpenPrintReport && (
                <button
                  onClick={onOpenPrintReport}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center space-x-2 shadow-lg shadow-indigo-600/15"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir Reporte</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Client KPI Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <KpiCard
            title="Avance Real"
            value={formatearPorcentaje(metricas.avanceRealGeneral)}
            icon={TrendingUp}
            description="Promedio físico simple"
            color="emerald"
            id="client-kpi-avance-real"
          />

          <KpiCard
            title="Avance Planificado"
            value={formatearPorcentaje(metricas.avancePlanificadoGeneral)}
            icon={Clock}
            description="Teórico a fecha de corte"
            color="indigo"
            id="client-kpi-avance-planificado"
          />

          <KpiCard
            title="Desviación"
            value={metricas.desvio >= 0 ? `+${Math.round(metricas.desvio)}%` : `${Math.round(metricas.desvio)}%`}
            icon={Percent}
            description="Físico (Real - Planificado)"
            color={metricas.desvio >= 0 ? 'emerald' : 'rose'}
            id="client-kpi-desvio"
          />

          <KpiCard
            title="Control de Tareas"
            value={`${metricas.completadas} / ${metricas.totalActividades}`}
            icon={CheckCircle2}
            description={`En curso: ${metricas.enCurso}, Vencidas: ${metricas.atrasadas}`}
            color={metricas.atrasadas > 0 ? 'rose' : 'emerald'}
            id="client-kpi-tareas"
          />

          <KpiCard
            title="Presupuesto (BAC)"
            value={formatearMoneda(metricas.presupuestoTotal, project.moneda)}
            icon={DollarSign}
            description="Costos directos + indirectos"
            color={metricas.desvioCostos >= 0 ? 'emerald' : 'rose'}
            id="client-kpi-presupuesto"
          />
        </div>

        {/* Client Graphs Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Curva S */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Curva S de Avance Físico</h3>
                <p className="text-xs text-slate-500">Curva de avance acumulado Real vs Planificado</p>
              </div>
              <button
                onClick={() => onNavigateToSection('progreso')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center"
              >
                <span>Ver Curva S</span>
                <ChevronRight className="w-4 h-4 ml-0.5" />
              </button>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={progressChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="clientColorPlan" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="clientColorReal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <YAxis unit="%" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="Planificado %" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#clientColorPlan)" isAnimationActive={false} />
                  <Area type="monotone" dataKey="Real %" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#clientColorReal)" connectNulls isAnimationActive={false} />
                  <Line type="monotone" dataKey="Outlook %" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Estado de Actividades */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Distribución de Actividades</h3>
              <p className="text-xs text-slate-500">Cantidad de tareas del proyecto por estado</p>
            </div>
            <div className="h-56 relative flex items-center justify-center">
              {estadoData.length === 0 ? (
                <p className="text-xs text-slate-400">Sin datos de tareas</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={estadoData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                      isAnimationActive={false}
                    >
                      {estadoData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [`${v} tareas`, 'Cantidad']} />
                  </PieChart>
                </ResponsiveContainer>
              )}
              
              <div className="absolute text-center flex flex-col justify-center items-center pointer-events-none">
                <span className="text-2xl font-black text-slate-800 leading-none">{metricas.totalActividades}</span>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-1">Actividades</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-3">
              {estadoData.map((d) => (
                <div key={d.name} className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="text-slate-600 truncate">{d.name} ({d.value})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom widgets specifically for Client */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Summary of Certified percentages */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Estado General de Certificaciones</h3>
              <p className="text-xs text-slate-500">Avance acumulado visado/certificado por la inspección técnica</p>
            </div>

            <div className="my-6 space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1 text-xs">
                  <span className="font-semibold text-slate-600">Porcentaje Certificado Acumulado</span>
                  <span className="font-bold text-indigo-600">{Math.round(metricas.porcentajeCertificado ?? 0)}%</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${metricas.porcentajeCertificado}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs pt-4 border-t border-slate-100">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="block text-slate-400 font-bold text-[9px] uppercase tracking-wider">Hitos Completados</span>
                  <span className="text-base font-extrabold text-slate-800 mt-1 block">
                    {projectActivities.filter(a => a.tipoRegistro === 'Hito' && a.estado === 'Completada').length} de {projectActivities.filter(a => a.tipoRegistro === 'Hito').length}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="block text-slate-400 font-bold text-[9px] uppercase tracking-wider">Desvío de Cronograma</span>
                  <span className={`text-base font-extrabold mt-1 block ${metricas.desvio >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {metricas.desvio >= 0 ? `+${Math.round(metricas.desvio)}%` : `${Math.round(metricas.desvio)}%`}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigateToSection('certificaciones')}
              className="w-full text-center py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-xs rounded-xl transition"
            >
              Ver Detalle de Certificaciones
            </button>
          </div>

          {/* Upcoming critical activities list (no monetary amounts) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="font-bold text-slate-800 text-base mb-1">Próximos Vencimientos Clave</h3>
            <p className="text-xs text-slate-500 mb-4 font-medium">Actividades con término planificado en los próximos {daysRange} días</p>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {upcomingDeadlines.length === 0 ? (
                <p className="text-xs text-slate-450 italic py-8 text-center">No hay actividades críticas programadas para finalizar pronto.</p>
              ) : (
                upcomingDeadlines.slice(0, 5).map(a => {
                  const dFin = new Date(a.finPlanificado + 'T00:00:00');
                  const dHoy = new Date(fechaCorte + 'T00:00:00');
                  const daysLeft = Math.ceil((dFin.getTime() - dHoy.getTime()) / (1000 * 60 * 60 * 24));
                  
                  let badgeClass = "bg-emerald-50 text-emerald-700 border border-emerald-100";
                  let badgeText = `${daysLeft} días`;
                  if (daysLeft < 0) {
                    badgeClass = "bg-rose-50 text-rose-700 border border-rose-100 animate-pulse";
                    badgeText = `Atrasado ${Math.abs(daysLeft)} ${Math.abs(daysLeft) === 1 ? 'día' : 'días'}`;
                  } else if (daysLeft <= 7) {
                    badgeClass = "bg-amber-50 text-amber-700 border border-amber-200";
                    badgeText = daysLeft === 0 ? "Hoy" : `${daysLeft} ${daysLeft === 1 ? 'día' : 'días'}`;
                  }

                  return (
                    <div key={a.id} className="p-2.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-150 rounded-xl flex items-center justify-between text-xs transition">
                      <div className="space-y-0.5 truncate pr-2">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[9px] font-bold font-mono text-slate-400 bg-slate-200 px-1 py-0.2 rounded">{a.wbs}</span>
                          <span className="font-bold text-slate-850 truncate">{a.tarea}</span>
                        </div>
                        <span className="text-[10px] text-slate-450 block">{a.disciplina} • Término: {formatearFecha(a.finPlanificado)}</span>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${badgeClass}`}>
                          {badgeText}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {a.avanceReal}% real
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
        
        {/* Historial de Tareas con Desvío */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-indigo-500" />
              <div>
                <h3 className="font-bold text-slate-800 text-base">Historial de Tareas con Desvío</h3>
                <p className="text-xs text-slate-500">Listado histórico de todas las tareas que han presentado desvíos en plazo o avance físico.</p>
              </div>
            </div>
            <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-2.5 py-1 rounded-full border border-slate-200">
              {tasksWithDeviation.length} tareas identificadas
            </span>
          </div>

          {tasksWithDeviation.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-600">¡Sin historial de desvíos!</p>
              <p className="text-[11px] text-slate-400">Todas las tareas se han ejecutado y mantenido de acuerdo a la planificación.</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-80 overflow-y-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-50 z-10">
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 uppercase tracking-wider font-bold">
                    <th className="p-3">WBS</th>
                    <th className="p-3">Tarea</th>
                    <th className="p-3">Disciplina</th>
                    <th className="p-3">Responsable</th>
                    <th className="p-3">Fin Plan</th>
                    <th className="p-3 text-center">Avance Plan vs Real</th>
                    <th className="p-3 text-center">Atraso</th>
                    <th className="p-3 text-right">Clasificación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {tasksWithDeviation.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-500">{a.wbs}</td>
                      <td className="p-3 font-semibold text-slate-800 truncate max-w-[180px]" title={a.tarea}>{a.tarea}</td>
                      <td className="p-3 text-slate-500">{a.disciplina}</td>
                      <td className="p-3">{a.responsable}</td>
                      <td className="p-3 font-mono text-slate-500">{formatearFecha(a.finPlanificado)}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center space-x-1 font-semibold">
                          <span className="text-indigo-600">{a.avancePlanificado}%</span>
                          <span className="text-slate-400">vs</span>
                          <span className={a.avanceReal >= a.avancePlanificado ? "text-emerald-600" : "text-rose-500"}>
                            {a.avanceReal}%
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-center font-mono">
                        {a.delayDays > 0 ? (
                          <span className="bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded text-[10px]">
                            +{a.delayDays} d
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-bold">0 d</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${a.statusColor}`}>
                          {a.statusText}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none">
      {/* Project Banner Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 md:p-8 shadow-md relative overflow-hidden">
        {/* Decorative architectural layout lines in header */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_right,rgba(99,102,241,0.15)_0%,transparent_70%)] z-0" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:16px_16px] z-0" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <TagingLogo variant="full" theme="dark" size="md" />
              <span className="bg-indigo-500/10 text-indigo-400 font-mono text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-lg border border-indigo-500/20">
                Contrato: {project.codigoContrato}
              </span>
              <span className="bg-slate-800 text-slate-300 font-sans text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-700">
                Cliente: {project.cliente}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              {project.nombreProyecto}
            </h1>
            <p className="text-sm text-slate-400 font-light max-w-2xl leading-relaxed">
              {project.descripcion}
            </p>
            {onOpenPrintReport && (
              <button
                onClick={onOpenPrintReport}
                className="mt-4 px-4.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition flex items-center space-x-2 border border-indigo-500/20 shadow-lg shadow-indigo-650/15"
              >
                <Printer className="w-4 h-4" />
                <span>Generar Reporte en PDF / Imprimir</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 md:border-l md:border-slate-800 md:pl-8 shrink-0">
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Líder del Proyecto</span>
              <span className="text-sm font-semibold text-slate-200 mt-1 block">{project.jefeProyecto}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Moneda / Margen</span>
              <span className="text-sm font-semibold text-slate-200 mt-1 block">{project.moneda} / +{project.utilidadEsperada}%</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Inicio Plan</span>
              <span className="text-sm font-semibold text-slate-200 mt-1 block">{formatearFecha(project.fechaInicioPlan)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Fin Plan</span>
              <span className="text-sm font-semibold text-slate-200 mt-1 block">{formatearFecha(project.fechaFinPlan)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard
          title="Avance Real"
          value={formatearPorcentaje(metricas.avanceRealGeneral)}
          icon={TrendingUp}
          description="Promedio físico simple"
          color="emerald"
          id="kpi-avance-real"
        />

        <KpiCard
          title="Avance Planificado"
          value={formatearPorcentaje(metricas.avancePlanificadoGeneral)}
          icon={Clock}
          description="Teórico a fecha de corte"
          color="indigo"
          id="kpi-avance-planificado"
        />

        <KpiCard
          title="Desviación"
          value={metricas.desvio >= 0 ? `+${Math.round(metricas.desvio)}%` : `${Math.round(metricas.desvio)}%`}
          icon={Percent}
          description="Físico (Real - Planificado)"
          color={metricas.desvio >= 0 ? 'emerald' : 'rose'}
          id="kpi-desvio"
        />

        <KpiCard
          title="Control de Tareas"
          value={`${metricas.completadas} / ${metricas.totalActividades}`}
          icon={CheckCircle2}
          description={`En curso: ${metricas.enCurso}, Vencidas: ${metricas.atrasadas}`}
          color={metricas.atrasadas > 0 ? 'rose' : 'emerald'}
          id="kpi-tareas-estado"
        />

        {currentUserRole === 'Empresa' ? (
          <KpiCard
            title="Presupuesto (BAC)"
            value={formatearMoneda(metricas.presupuestoTotal, project.moneda)}
            icon={DollarSign}
            description="Costos directos + indirectos"
            color={metricas.desvioCostos >= 0 ? 'emerald' : 'rose'}
            id="kpi-presupuesto"
          />
        ) : (
          <KpiCard
            title="Presupuesto (BAC)"
            value={formatearMoneda(metricas.presupuestoTotal, project.moneda)}
            icon={DollarSign}
            description="Costos directos + indirectos"
            color="emerald"
            id="kpi-presupuesto-gen"
          />
        )}
      </div>

      {/* Primary Graphs Row (Avance Curva S & Estado Tareas) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Curva S */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Curva S: Progreso Planificado vs Real</h3>
              <p className="text-xs text-slate-500">Curva acumulada de avance del proyecto</p>
            </div>
            <button
              onClick={() => onNavigateToSection('Progreso')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center"
            >
              <span>Ver detalles</span>
              <ChevronRight className="w-4 h-4 ml-0.5" />
            </button>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={progressChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPlan" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <YAxis unit="%" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <Tooltip formatter={(value) => `${value}%`} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="Planificado %" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorPlan)" isAnimationActive={false} />
                <Area type="monotone" dataKey="Real %" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorReal)" connectNulls isAnimationActive={false} />
                <Line type="monotone" dataKey="Outlook %" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Estado de Actividades */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-base">Distribución por Estado</h3>
            <p className="text-xs text-slate-500">Cantidad de tareas en cada etapa de avance</p>
          </div>
          <div className="h-56 relative flex items-center justify-center">
            {estadoData.length === 0 ? (
              <p className="text-xs text-slate-400">Sin datos de tareas</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={estadoData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    isAnimationActive={false}
                  >
                    {estadoData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v} tareas`, 'Cantidad']} />
                </PieChart>
              </ResponsiveContainer>
            )}
            
            {/* Center Absolute Label */}
            <div className="absolute text-center flex flex-col justify-center items-center pointer-events-none">
              <span className="text-2xl font-black text-slate-800 leading-none">{metricas.totalActividades}</span>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-1">Actividades</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-3">
            {estadoData.map((d) => (
              <div key={d.name} className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                <span className="text-slate-600 truncate">{d.name} ({d.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Secondary Graphs Row (Costs and Certifications) */}
      {currentUserRole === 'Empresa' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cost Matrix (EAC vs Budget vs Real) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Estructura Económica y Proyección</h3>
                <p className="text-xs text-slate-500">Evolución de costos directos + indirectos</p>
              </div>
              <button
                onClick={() => onNavigateToSection('Costos')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center"
              >
                <span>Ver costos</span>
                <ChevronRight className="w-4 h-4 ml-0.5" />
              </button>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costosChartData} barGap={12}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={(v) => `$${v/1000}k`} stroke="#94a3b8" tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(value) => formatearMoneda(Number(value), project.moneda)} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Presupuesto" fill="#818cf8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Costo Real" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Comprometido" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="EAC" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Certificaciones y Facturación */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Certificación, Facturación y Cobro</h3>
                <p className="text-xs text-slate-500">Monto total contrato: {formatearMoneda(metricas.presupuestoTotal * (1 + (project.utilidadEsperada/100)), project.moneda)}</p>
              </div>
              <button
                onClick={() => onNavigateToSection('Certificaciones')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center"
              >
                <span>Ver certs.</span>
                <ChevronRight className="w-4 h-4 ml-0.5" />
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-3 mb-6 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="text-center">
                <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">Certificado</span>
                <span className="text-sm font-bold text-slate-800 block mt-0.5">{formatearMoneda(metricas.montoCertificadoAcumulado, project.moneda)}</span>
                <span className="text-[10px] text-indigo-600 font-semibold">{formatearPorcentaje(metricas.porcentajeCertificado)}</span>
              </div>
              <div className="text-center border-x border-slate-200">
                <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">Facturado</span>
                <span className="text-sm font-bold text-slate-800 block mt-0.5">{formatearMoneda(metricas.montoFacturado, project.moneda)}</span>
                <span className="text-[10px] text-indigo-600 font-semibold">{formatearPorcentaje(metricas.montoCertificadoAcumulado > 0 ? (metricas.montoFacturado / metricas.montoCertificadoAcumulado) * 100 : 0)} del cert.</span>
              </div>
              <div className="text-center">
                <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">Cobrado</span>
                <span className="text-sm font-bold text-slate-800 block mt-0.5">{formatearMoneda(metricas.montoCobrado, project.moneda)}</span>
                <span className="text-[10px] text-emerald-600 font-semibold">{formatearPorcentaje(metricas.montoFacturado > 0 ? (metricas.montoCobrado / metricas.montoFacturado) * 100 : 0)} de fact.</span>
              </div>
            </div>

            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  {
                    name: 'Flujos de Caja',
                    'Certificado': metricas.montoCertificadoAcumulado,
                    'Facturado': metricas.montoFacturado,
                    'Cobrado': metricas.montoCobrado,
                  }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={(v) => `$${v/1000}k`} stroke="#94a3b8" tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(value) => formatearMoneda(Number(value), project.moneda)} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Certificado" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Facturado" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Cobrado" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Distribution Analytics (Disciplinas, Responsables & Etapas) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Responsables */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Carga por Responsable</h3>
            <p className="text-[11px] text-slate-500">Cantidad de actividades por profesional</p>
          </div>
          <div className="h-48 mt-4">
            {responsableData.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-12">Sin tareas asignadas</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={responsableData} layout="vertical" margin={{ left: -10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 9 }} />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" tick={{ fontSize: 9 }} width={80} />
                  <Tooltip />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 9 }} />
                  <Bar dataKey="Completadas" stackId="a" fill="#10b981" />
                  <Bar dataKey="Pendientes" stackId="a" fill="#818cf8" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Disciplinas */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Actividades por Disciplina</h3>
            <p className="text-[11px] text-slate-500">Distribución técnica de los entregables</p>
          </div>
          <div className="h-48 mt-4">
            {disciplinaData.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-12">Sin tareas de disciplina</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={disciplinaData} margin={{ bottom: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 8 }} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 9 }} />
                  <Tooltip />
                  <Bar dataKey="Actividades" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Etapas */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Distribución por Etapa</h3>
            <p className="text-[11px] text-slate-500">Tareas en cada fase del ciclo de vida</p>
          </div>
          <div className="h-48 mt-4">
            {etapaData.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-12">Sin datos de etapas</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={etapaData} margin={{ bottom: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 8 }} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 9 }} />
                  <Tooltip />
                  <Bar dataKey="Actividades" fill="#a855f7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Tables Row: Upcoming Deadlines Expanded */}
      <div className="w-full">
        {/* Proximos Vencimientos */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-indigo-500" />
              <h3 className="font-bold text-slate-800 text-base">Próximos Vencimientos</h3>
            </div>
            
            {/* Filter Range Selector tabs */}
            <div className="bg-slate-100 p-1 rounded-xl flex border border-slate-200 self-start sm:self-auto text-[10px] font-bold uppercase tracking-wider">
              {[7, 15, 30].map((days) => (
                <button
                  key={days}
                  onClick={() => setDaysRange(days as 7 | 15 | 30)}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    daysRange === days ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {days} Días
                </button>
              ))}
            </div>
          </div>

          {upcomingDeadlines.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
              <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-600">No hay vencimientos próximos</p>
              <p className="text-[11px] text-slate-400">No hay entregas planificadas en los próximos {daysRange} días.</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-72 overflow-y-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 uppercase tracking-wider font-bold">
                    <th className="p-3">WBS</th>
                    <th className="p-3">Tarea</th>
                    <th className="p-3">Responsable</th>
                    <th className="p-3">Fin Plan</th>
                    <th className="p-3">Días faltantes</th>
                    <th className="p-3 text-right">Avance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {upcomingDeadlines.map((a) => {
                    const dFin = new Date(a.finPlanificado + 'T00:00:00');
                    const dHoy = new Date(fechaCorte + 'T00:00:00');
                    const daysLeft = Math.ceil((dFin.getTime() - dHoy.getTime()) / (1000 * 60 * 60 * 24));
                    
                    let badgeClass = "bg-emerald-50 text-emerald-700 border border-emerald-100";
                    let badgeText = `${daysLeft} días`;
                    if (daysLeft < 0) {
                      badgeClass = "bg-rose-50 text-rose-700 border border-rose-100 animate-pulse";
                      badgeText = `Atrasado ${Math.abs(daysLeft)} ${Math.abs(daysLeft) === 1 ? 'día' : 'días'}`;
                    } else if (daysLeft <= 7) {
                      badgeClass = "bg-amber-50 text-amber-700 border border-amber-200";
                      badgeText = daysLeft === 0 ? "Hoy" : `${daysLeft} ${daysLeft === 1 ? 'día' : 'días'}`;
                    }

                    return (
                      <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-mono font-bold text-slate-500">{a.wbs}</td>
                        <td className="p-3 font-semibold text-slate-800 truncate max-w-[150px]" title={a.tarea}>{a.tarea}</td>
                        <td className="p-3">{a.responsable}</td>
                        <td className="p-3 text-indigo-600 font-semibold">{formatearFecha(a.finPlanificado)}</td>
                        <td className="p-3 font-medium">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${badgeClass}`}>
                            {badgeText}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <span className={`font-bold ${a.avanceReal > 50 ? 'text-emerald-600' : 'text-slate-500'}`}>
                            {a.avanceReal}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Historial de Tareas con Desvío */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-indigo-500" />
            <div>
              <h3 className="font-bold text-slate-800 text-base">Historial de Tareas con Desvío</h3>
              <p className="text-xs text-slate-500">Listado histórico de todas las tareas que han presentado desvíos en plazo o avance físico.</p>
            </div>
          </div>
          <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-2.5 py-1 rounded-full border border-slate-200">
            {tasksWithDeviation.length} tareas identificadas
          </span>
        </div>

        {tasksWithDeviation.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-600">¡Sin historial de desvíos!</p>
            <p className="text-[11px] text-slate-400">Todas las tareas se han ejecutado y mantenido de acuerdo a la planificación.</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-80 overflow-y-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-50 z-10">
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 uppercase tracking-wider font-bold">
                  <th className="p-3">WBS</th>
                  <th className="p-3">Tarea</th>
                  <th className="p-3">Disciplina</th>
                  <th className="p-3">Responsable</th>
                  <th className="p-3">Fin Plan</th>
                  <th className="p-3 text-center">Avance Plan vs Real</th>
                  <th className="p-3 text-center">Atraso</th>
                  <th className="p-3 text-right">Clasificación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {tasksWithDeviation.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-500">{a.wbs}</td>
                    <td className="p-3 font-semibold text-slate-800 truncate max-w-[180px]" title={a.tarea}>{a.tarea}</td>
                    <td className="p-3 text-slate-500">{a.disciplina}</td>
                    <td className="p-3">{a.responsable}</td>
                    <td className="p-3 font-mono text-slate-500">{formatearFecha(a.finPlanificado)}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center space-x-1 font-semibold">
                        <span className="text-indigo-600">{a.avancePlanificado}%</span>
                        <span className="text-slate-400">vs</span>
                        <span className={a.avanceReal >= a.avancePlanificado ? "text-emerald-600" : "text-rose-500"}>
                          {a.avanceReal}%
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-center font-mono">
                      {a.delayDays > 0 ? (
                        <span className="bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded text-[10px]">
                          +{a.delayDays} d
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-bold">0 d</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${a.statusColor}`}>
                        {a.statusText}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

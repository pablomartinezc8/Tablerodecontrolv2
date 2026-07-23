import React, { useState, useMemo } from 'react';
import { Project, Activity, CostDirect, CostIndirect, Certification, DateCorteProgress } from '../types';
import { HOY, calcularMetricasProyecto, calcularCurvaSConOutlook } from '../utils/projectCalculations';
import { formatearMoneda, formatearPorcentaje, formatearFecha } from '../utils/formato';
import TagingLogo from './TagingLogo';
import { 
  Printer, Award, Calendar, FileText, BarChart3, 
  TrendingUp, DollarSign, ClipboardList, ArrowLeft, Settings, Info, Sparkles, AlertTriangle
} from 'lucide-react';
import { 
  ResponsiveContainer, LineChart, Line, AreaChart, Area, 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';

interface PrintReportViewProps {
  project: Project;
  activities: Activity[];
  costsDirect: CostDirect[];
  costsIndirect: CostIndirect[];
  certifications: Certification[];
  progress: DateCorteProgress[];
  onClose: () => void;
  currentUserRole?: string;
}

export default function PrintReportView({
  project,
  activities,
  costsDirect,
  costsIndirect,
  certifications,
  progress,
  onClose,
  currentUserRole = 'Empresa'
}: PrintReportViewProps) {
  const isCliente = currentUserRole === 'Cliente';
  const hideFinancials = currentUserRole === 'Cliente' || currentUserRole === 'Control de Proyecto';

  // Report sections selection state
  const [sections, setSections] = useState({
    cover: true,
    dashboard: true,
    activities: true,
    gantt: true,
    costs: !hideFinancials,
    certifications: true,
    progress: true
  });

  // Custom report metadata
  const [preparedBy, setPreparedBy] = useState('Ing. Director de Control');
  const [targetAudience, setTargetAudience] = useState('Mandante / Comité Ejecutivo');
  const [notes, setNotes] = useState(() => hideFinancials 
    ? 'Informe de control de gestión del contrato con fecha de corte de hoy. Avances ponderados por avance físico y control de desvíos temporales.'
    : 'Informe de control de gestión del contrato con fecha de corte de hoy. Avances ponderados por costo planificado y control de desvíos temporales / financieros.'
  );
  const [isPrintActivated, setIsPrintActivated] = useState(false);

  const metrics = useMemo(() => {
    return calcularMetricasProyecto(
      activities,
      costsDirect,
      costsIndirect,
      certifications,
      project.idProyecto,
      project.utilidadEsperada,
      HOY
    );
  }, [activities, costsDirect, costsIndirect, certifications, project]);

  const projectActivities = useMemo(() => {
    return activities
      .filter(a => a.idProyecto === project.idProyecto)
      .sort((a, b) => {
        // Sort by WBS hierarchy
        const partsA = (a.wbs || '').split('.').map(Number);
        const partsB = (b.wbs || '').split('.').map(Number);
        for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
          const valA = isNaN(partsA[i]) ? 0 : partsA[i];
          const valB = isNaN(partsB[i]) ? 0 : partsB[i];
          if (valA !== valB) return valA - valB;
        }
        return 0;
      });
  }, [activities, project.idProyecto]);

  // Paginate project activities for the Gantt Chart report view (20 activities per page for A3 landscape format)
  const ganttPages = useMemo(() => {
    if (projectActivities.length === 0) return [];
    const ITEMS_PER_PAGE = 20;
    const pages: (typeof projectActivities)[] = [];
    for (let i = 0; i < projectActivities.length; i += ITEMS_PER_PAGE) {
      pages.push(projectActivities.slice(i, i + ITEMS_PER_PAGE));
    }
    return pages;
  }, [projectActivities]);

  // Calculate dynamic timeline window covering all projectActivities and HOY
  const ganttTimelineScale = useMemo(() => {
    const hoyD = new Date(HOY + 'T00:00:00');
    let minTime = new Date(hoyD.getFullYear(), hoyD.getMonth() - 1, 1);
    let maxTime = new Date(hoyD.getFullYear(), hoyD.getMonth() + 2, 0, 23, 59, 59);

    // Expand scale if activities start earlier or end later
    projectActivities.forEach(a => {
      if (a.inicioPlanificado) {
        const dS = new Date(a.inicioPlanificado + 'T00:00:00');
        if (!isNaN(dS.getTime()) && dS < minTime) minTime = new Date(dS.getFullYear(), dS.getMonth(), 1);
      }
      if (a.finPlanificado) {
        const dE = new Date(a.finPlanificado + 'T00:00:00');
        if (!isNaN(dE.getTime()) && dE > maxTime) maxTime = new Date(dE.getFullYear(), dE.getMonth() + 1, 0, 23, 59, 59);
      }
    });

    const totalDays = Math.max(1, Math.round((maxTime.getTime() - minTime.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    // Build the month columns
    const monthsList: { key: string; name: string; span: number; isCurrent: boolean }[] = [];
    const tempDate = new Date(minTime);
    while (tempDate <= maxTime) {
      const mYear = tempDate.getFullYear();
      const mMonth = tempDate.getMonth();
      const mEnd = new Date(mYear, mMonth + 1, 0);
      const mDays = Math.min(mEnd.getDate(), Math.round((maxTime.getTime() - tempDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      const mName = tempDate.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }).toUpperCase();
      const isCurr = mYear === hoyD.getFullYear() && mMonth === hoyD.getMonth();

      monthsList.push({
        key: `m-${mYear}-${mMonth}`,
        name: isCurr ? `${mName} (HOY)` : mName,
        span: (mDays / totalDays) * 100,
        isCurrent: isCurr
      });

      tempDate.setMonth(tempDate.getMonth() + 1);
      tempDate.setDate(1);
    }

    const hoyOffsetDays = Math.round((hoyD.getTime() - minTime.getTime()) / (1000 * 60 * 60 * 24));
    const hoyLeftPercent = Math.max(0, Math.min(100, (hoyOffsetDays / totalDays) * 100));

    return {
      minTime,
      maxTime,
      totalDays,
      monthsList,
      hoyLeftPercent,
      isHoyVisible: hoyD >= minTime && hoyD <= maxTime
    };
  }, [projectActivities]);

  const getGanttBarPos = (startStr: string, endStr: string) => {
    const dStart = new Date(startStr + 'T00:00:00');
    const dEnd = new Date(endStr + 'T00:00:00');
    if (isNaN(dStart.getTime()) || isNaN(dEnd.getTime())) return { left: 0, width: 0, isOutside: true };

    const windowMin = ganttTimelineScale.minTime.getTime();
    const windowMax = ganttTimelineScale.maxTime.getTime();

    // Check if task is outside this 3-month window
    if (dEnd.getTime() < windowMin || dStart.getTime() > windowMax) {
      return { left: 0, width: 0, isOutside: true };
    }

    // Clamp start and end to 3-month window
    const clampedStart = Math.max(dStart.getTime(), windowMin);
    const clampedEnd = Math.min(dEnd.getTime(), windowMax);

    const offsetDays = (clampedStart - windowMin) / (1000 * 60 * 60 * 24);
    const durationDays = Math.max(1, (clampedEnd - clampedStart) / (1000 * 60 * 60 * 24) + 1);

    const left = Math.max(0, (offsetDays / ganttTimelineScale.totalDays) * 100);
    const width = Math.min(100 - left, Math.max(2, (durationDays / ganttTimelineScale.totalDays) * 100));

    return { left, width, isOutside: false };
  };

  const realTaskActivities = useMemo(() => {
    return projectActivities.filter(a => a.tipoRegistro !== 'Título' && a.tipoRegistro !== 'Hito');
  }, [projectActivities]);

  const responsableData = useMemo(() => {
    const responsableCounts: { [key: string]: { completas: number, pendientes: number } } = {};
    (project.responsables || []).forEach(r => {
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
    return Object.entries(responsableCounts).map(([name, counts]) => ({
      name,
      Completadas: counts.completas,
      Pendientes: counts.pendientes
    })).filter(d => d.Completadas > 0 || d.Pendientes > 0);
  }, [project.responsables, realTaskActivities]);

  const disciplinaData = useMemo(() => {
    const disciplinaCounts: { [key: string]: number } = {};
    realTaskActivities.forEach(a => {
      if (a.disciplina) {
        disciplinaCounts[a.disciplina] = (disciplinaCounts[a.disciplina] || 0) + 1;
      }
    });
    return Object.entries(disciplinaCounts).map(([name, value]) => ({
      name,
      Actividades: value
    })).sort((a, b) => b.Actividades - a.Actividades);
  }, [realTaskActivities]);

  const etapaData = useMemo(() => {
    const etapaCounts: { [key: string]: number } = {};
    realTaskActivities.forEach(a => {
      if (a.etapa) {
        etapaCounts[a.etapa] = (etapaCounts[a.etapa] || 0) + 1;
      }
    });
    return Object.entries(etapaCounts).map(([name, value]) => ({
      name,
      Actividades: value
    }));
  }, [realTaskActivities]);

  const overdueActivities = useMemo(() => {
    return realTaskActivities.filter(a => {
      if (a.estado === 'Completada' || a.estado === 'Cancelada') return false;
      return a.finPlanificado < HOY;
    }).map(a => {
      const dFin = new Date(a.finPlanificado + 'T00:00:00');
      const dHoy = new Date(HOY + 'T00:00:00');
      const atraso = Math.max(1, Math.ceil((dHoy.getTime() - dFin.getTime()) / (1000 * 60 * 60 * 24)));
      return { ...a, atraso };
    }).sort((a, b) => b.atraso - a.atraso);
  }, [realTaskActivities]);

  const upcomingDeadlines = useMemo(() => {
    return realTaskActivities.filter(a => {
      if (a.estado === 'Completada' || a.estado === 'Cancelada') return false;
      const dFin = new Date(a.finPlanificado + 'T00:00:00');
      const dHoy = new Date(HOY + 'T00:00:00');
      const diffDays = Math.ceil((dFin.getTime() - dHoy.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 30;
    }).sort((a, b) => a.finPlanificado.localeCompare(b.finPlanificado));
  }, [realTaskActivities]);

  const projectCuts = useMemo(() => {
    const rawCuts = progress.filter(p => p.idProyecto === project.idProyecto);
    return calcularCurvaSConOutlook(rawCuts, HOY);
  }, [progress, project.idProyecto]);

  const progressChartData = useMemo(() => {
    return projectCuts.map(p => ({
      name: formatearFecha(p.fechaCorte),
      'Planificado %': p.proyectadoAcumulado,
      'Real %': p.realAcumulado,
      'Outlook %': p.outlook
    }));
  }, [projectCuts]);

  const estadoData = useMemo(() => [
    { name: 'Completadas', value: metrics.completadas, color: '#10b981' },
    { name: 'En Curso', value: metrics.enCurso, color: '#6366f1' },
    { name: 'No Iniciadas', value: metrics.noIniciada, color: '#94a3b8' },
    { name: 'Atrasadas', value: metrics.atrasadas, color: '#e11d48' },
  ], [metrics]);

  const costosChartData = useMemo(() => [
    {
      name: 'Directos',
      Presupuesto: metrics.presupuestoDirecto,
      'Costo Real': metrics.costoDirectoReal,
    },
    {
      name: 'Indirectos',
      Presupuesto: metrics.presupuestoIndirecto,
      'Costo Real': metrics.costoIndirectoReal,
    }
  ], [metrics]);

  // Handle printing trigger
  const triggerPrint = () => {
    setIsPrintActivated(true);
    setTimeout(() => {
      try {
        window.focus();
        window.print();
      } catch (err) {
        console.error("Fallo al invocar la ventana de impresión:", err);
      }
      setIsPrintActivated(false);
    }, 600);
  };

  const totalDirectReal = useMemo(() => {
    return costsDirect
      .filter(d => d.idProyecto === project.idProyecto)
      .reduce((acc, curr) => acc + curr.realAcumulado, 0);
  }, [costsDirect, project.idProyecto]);

  const totalIndirectReal = useMemo(() => {
    return costsIndirect
      .filter(i => i.idProyecto === project.idProyecto)
      .reduce((acc, curr) => acc + curr.realAcumulado, 0);
  }, [costsIndirect, project.idProyecto]);

  return (
    <div className={`min-h-screen ${isPrintActivated ? 'bg-white p-0' : 'bg-slate-100 pb-16'} font-sans text-slate-800 transition-colors`}>
      {/* 1. SELECTION & CONFIGURATION HEADER (Hidden when printing) */}
      {!isPrintActivated && (
        <div className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm print:hidden">
          <div className="max-w-6xl mx-auto px-4 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <button 
                onClick={onClose} 
                className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-xl transition"
                title="Volver"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-sm font-black text-slate-900 flex items-center space-x-2">
                  <span>Generador de Reporte Ejecutivo PDF</span>
                  <span className="bg-indigo-50 text-indigo-700 font-extrabold text-[9px] px-2 py-0.5 rounded-full uppercase border border-indigo-150">PRO</span>
                </h1>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Seleccione las hojas del reporte, modifique la información y envíe a la impresora o guarde como PDF.</p>
              </div>
            </div>

            <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end">
              <button 
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-650 hover:bg-slate-50 rounded-xl transition border border-slate-200"
              >
                Cancelar
              </button>
              <button 
                onClick={triggerPrint}
                className="px-5 py-2.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-md shadow-indigo-600/15 flex items-center space-x-2"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir / Exportar a PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. TWO-COLUMN WORKSPACE: LEFT IS CONFIG, RIGHT IS PREVIEW (Hidden when printing) */}
      {!isPrintActivated ? (
        <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 print:hidden">
          
          {/* LEFT PANEL: CONFIGURATION */}
          <div className="lg:col-span-4 space-y-5">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center space-x-2">
                <Settings className="w-3.5 h-3.5 text-indigo-600" />
                <span>Estructura del Reporte</span>
              </h2>

              <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">Tilde las secciones del contrato que desea incluir en el informe impreso:</p>

              <div className="space-y-2 pt-1">
                {[
                  { id: 'cover', label: 'Portada de Presentación', icon: FileText },
                  { id: 'dashboard', label: 'Dashboard (KPIs)', icon: BarChart3 },
                  { id: 'activities', label: 'Cronograma (Tabla de Actividades)', icon: ClipboardList },
                  { id: 'gantt', label: 'Cronograma Gantt Simplificado', icon: Calendar },
                  ...(!hideFinancials ? [{ id: 'costs', label: 'Control de Costos (Directo/Indirecto)', icon: DollarSign }] : []),
                  { id: 'certifications', label: hideFinancials ? 'Certificaciones de Avance de Obra' : 'Certificaciones / Cobros de Pago', icon: Award },
                  { id: 'progress', label: 'Curva S de Avance Ponderado', icon: TrendingUp }
                ].map((sec) => (
                  <label key={sec.id} className="flex items-center space-x-3 p-2 hover:bg-slate-50 rounded-xl border border-slate-150 cursor-pointer transition select-none">
                    <input 
                      type="checkbox" 
                      checked={(sections as any)[sec.id]} 
                      onChange={(e) => setSections({...sections, [sec.id]: e.target.checked})}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    <sec.icon className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-xs font-bold text-slate-700">{sec.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center space-x-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Metadatos del Informe</span>
              </h3>

              <div className="space-y-3.5 text-xs font-sans">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Preparado Por</label>
                  <input 
                    type="text" 
                    value={preparedBy} 
                    onChange={(e) => setPreparedBy(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 outline-none font-bold text-slate-800 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Destinado A</label>
                  <input 
                    type="text" 
                    value={targetAudience} 
                    onChange={(e) => setTargetAudience(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 outline-none font-bold text-slate-800 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Notas / Observaciones</label>
                  <textarea 
                    rows={4}
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 outline-none text-slate-700 text-[11px] leading-relaxed resize-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {window.self !== window.top && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4.5 text-[11px] text-amber-850 leading-relaxed font-semibold flex items-start space-x-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <strong>Aviso de Previsualización:</strong> Estás usando el visor de AI Studio. Los navegadores bloquean las ventanas de impresión (<code className="bg-amber-100/60 px-1 py-0.2 rounded font-mono">window.print()</code>) dentro de un iframe por seguridad.
                  <br /><br />
                  Para poder imprimir o exportar a PDF, haz clic en el botón <strong>"Open in new tab"</strong> (Abrir en pestaña nueva) situado en la esquina superior derecha de la barra de AI Studio. ¡Allí funcionará de inmediato!
                </div>
              </div>
            )}

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 text-[11px] text-slate-500 leading-relaxed font-semibold flex items-start space-x-2.5">
              <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <strong>Consejo de Impresión (Formato A3):</strong> Para exportar a PDF de forma óptima, en la ventana de impresión de su navegador seleccione el tamaño de papel <strong>A3 (Horizontal / Landscape)</strong> y recuerde marcar la opción <strong>"Imprimir gráficos de fondo"</strong> (o "Background graphics") para conservar todos los colores y barras del cronograma.
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: LIVE LAYOUT PREVIEW */}
          <div className="lg:col-span-8 space-y-6">
            <span className="block text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Vista Previa de la Hojas de Impresión</span>
            
            <div className="bg-white border border-slate-300 rounded-2xl shadow-xl overflow-hidden divide-y divide-slate-150 relative max-w-[800px] mx-auto scale-95 origin-top">
              {renderFullReportContent()}
            </div>
          </div>

        </div>
      ) : (
        /* 3. FINAL FULL PRINT RENDER (Visible when printing) */
        <div className="bg-white text-black min-h-screen text-xs select-text">
          {renderFullReportContent()}
        </div>
      )}
    </div>
  );

  // Render all active components in logical sequence with visual page break borders for user convenience
  function renderFullReportContent() {
    const hideFinancials = currentUserRole === 'Cliente' || currentUserRole === 'Control de Proyecto';

    // List of active sections to dynamically calculate page numbers and contiguous section numbers
    const activeSections = [
      sections.cover ? 'cover' : null,
      sections.dashboard ? 'dashboard' : null,
      sections.activities ? 'activities' : null,
      sections.gantt ? 'gantt' : null,
      (!hideFinancials && sections.costs) ? 'costs' : null,
      sections.certifications ? 'certifications' : null,
      sections.progress ? 'progress' : null
    ].filter(Boolean) as string[];

    const getPageNum = (secId: string) => {
      const idx = activeSections.indexOf(secId);
      return idx !== -1 ? idx + 1 : 1;
    };

    const numberedSectionsList = [
      { id: 'dashboard', title: 'Dashboard' },
      { id: 'activities', title: 'Base de Actividades' },
      { id: 'gantt', title: 'Diagrama Gantt' },
      { id: 'costs', title: 'Control de Costos' },
      { id: 'certifications', title: 'Certificaciones' },
      { id: 'progress', title: 'Curva S de Avance' }
    ].filter(item => {
      if (item.id === 'costs' && hideFinancials) return false;
      return (sections as any)[item.id];
    });

    const getSectionNumStr = (secId: string) => {
      const idx = numberedSectionsList.findIndex(s => s.id === secId);
      return idx !== -1 ? `Sección 0${idx + 1}` : '';
    };

    return (
      <div className="font-sans antialiased bg-white text-slate-900 print-document select-text">
        
        {/* --- PAGE 1: COVER PAGE (REDISEÑADA Y PRESENTABLE) --- */}
        {sections.cover && (
          <div className="p-10 min-h-[960px] flex flex-col justify-between bg-white relative page-break break-after-page border-b border-slate-200">
            {/* Top Bar Header */}
            <div>
              <div className="flex justify-between items-center pb-6 border-b-2 border-slate-900">
                <div className="flex items-center space-x-3">
                  <TagingLogo variant="full" theme="light" size="lg" />
                </div>
                <div className="text-right flex flex-col items-end">
                  <span className="text-[10px] bg-slate-900 text-white font-extrabold px-3 py-1 rounded-md uppercase tracking-wider">
                    Dossier Ejecutivo de Control
                  </span>
                  <span className="text-[9px] text-slate-500 font-bold mt-1">
                    Fecha de Corte: {formatearFecha(HOY)}
                  </span>
                </div>
              </div>

              {/* Main Banner Box */}
              <div className="mt-8 bg-slate-900 text-white rounded-2xl p-7 relative overflow-hidden shadow-lg border border-slate-800">
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-3 py-1 rounded-full">
                      INFORME DE AVANCE DE CONTRATO
                    </span>
                    <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border ${
                      metrics.desvio < 0 
                        ? 'bg-rose-500/20 text-rose-300 border-rose-400/30' 
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                    }`}>
                      {metrics.desvio < 0 ? 'Estado: En Desvío / Atraso' : 'Estado: A Tiempo / Conforme'}
                    </span>
                  </div>

                  <h1 className="text-2xl font-black tracking-tight text-white leading-tight">
                    {project.nombreProyecto}
                  </h1>

                  <p className="text-slate-300 text-xs font-medium leading-relaxed max-w-2xl border-l-2 border-indigo-500 pl-3">
                    {project.descripcion || 'Informe consolidado de seguimiento físico, cronograma contractual, presupuestos, certificación y matriz de desvíos técnicos.'}
                  </p>
                </div>
              </div>

              {/* Project Info Matrix Grid (6 Spec Cards) */}
              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Mandante / Cliente</span>
                  <span className="text-xs font-black text-slate-800 block truncate">{project.cliente || 'No especificado'}</span>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">ID del Proyecto / Código</span>
                  <span className="text-xs font-black text-slate-800 block font-mono">{project.idProyecto} {project.codigoContrato ? `(${project.codigoContrato})` : ''}</span>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Empresa Ejecutora</span>
                  <span className="text-xs font-black text-slate-800 block">Taging S.A.</span>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Fecha de Inicio</span>
                  <span className="text-xs font-black text-slate-800 block">{formatearFecha(project.fechaInicioPlan)}</span>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Fecha Término Planificada</span>
                  <span className="text-xs font-black text-slate-800 block">{formatearFecha(project.fechaFinPlan)}</span>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Moneda del Contrato</span>
                  <span className="text-xs font-black text-slate-800 block">{project.moneda}</span>
                </div>
              </div>

              {/* Cover Executive Metric Cards */}
              <div className="mt-6">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-2">Resumen Ejecutivo de Indicadores Clave</span>
                <div className="grid grid-cols-4 gap-3">
                  <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-center">
                    <span className="text-[8px] font-extrabold text-indigo-600 uppercase block">Avance Real</span>
                    <span className="text-lg font-black text-indigo-900 block mt-0.5">{formatearPorcentaje(metrics.avanceRealGeneral)}</span>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                    <span className="text-[8px] font-extrabold text-slate-500 uppercase block">Avance Planificado</span>
                    <span className="text-lg font-black text-slate-800 block mt-0.5">{formatearPorcentaje(metrics.avancePlanificadoGeneral)}</span>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                    <span className="text-[8px] font-extrabold text-slate-500 uppercase block">Desviación Físico</span>
                    <span className={`text-lg font-black block mt-0.5 ${metrics.desvio < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {metrics.desvio > 0 ? '+' : ''}{formatearPorcentaje(metrics.desvio)}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                    <span className="text-[8px] font-extrabold text-slate-500 uppercase block">Ruta Crítica</span>
                    <span className="text-lg font-black text-red-600 block mt-0.5">{metrics.actividadesCriticas} tareas</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Signatures and Formal Details */}
            <div className="pt-6 border-t border-slate-200 space-y-4">
              <div className="grid grid-cols-3 gap-4 text-[10px] text-slate-600">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-widest mb-0.5">Emitido Por</span>
                  <span className="text-slate-900 font-black block">{preparedBy}</span>
                  <span className="text-[8px] text-slate-400 font-semibold block">Oficina Técnica / Control de Gestión</span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-widest mb-0.5">Aprobado / Recibido Por</span>
                  <span className="text-slate-900 font-black block">{targetAudience}</span>
                  <span className="text-[8px] text-slate-400 font-semibold block">Representante de Mandante</span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-right">
                  <span className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-widest mb-0.5">Fecha y Ciudad</span>
                  <span className="text-slate-900 font-black block">{formatearFecha(HOY)}</span>
                  <span className="text-[8px] text-slate-400 font-semibold block">Santiago, Chile</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-[8px] text-slate-400 font-bold border-t border-slate-100 pt-2">
                <span>Plataforma TAGING - Sistema Integral de Control de Proyectos</span>
                <span>Documento Confidencial</span>
              </div>
            </div>
          </div>
        )}

        {/* --- PAGE 2: EXECUTIVE SUMMARY & KPIs --- */}
        {sections.dashboard && (
          <div className="p-8 w-full max-w-[420mm] mx-auto min-h-[297mm] flex flex-col justify-between bg-white relative page-break break-after-page border-b border-slate-200">
            <div>
              {/* Header */}
              <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{getSectionNumStr('dashboard')}: Dashboard</span>
                <span className="text-[10px] font-bold text-slate-400">{project.nombreProyecto}</span>
              </div>

              {/* Title */}
              <h2 className="text-xl font-black text-slate-900 mt-4 mb-1">Dashboard de KPIs Ejecutivos</h2>
              <p className="text-xs text-slate-500 leading-relaxed font-medium mb-4">Métricas consolidadas de avance físico, distribución técnica y control de desvíos.</p>

              {/* KPI Cards Grid */}
              <div className="grid grid-cols-6 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Avance Real General</span>
                  <span className="text-base font-black text-indigo-600 block">{formatearPorcentaje(metrics.avanceRealGeneral)}</span>
                  <p className="text-[8px] text-slate-500 mt-0.5 leading-relaxed">Ponderado por tarea.</p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Avance Planificado</span>
                  <span className="text-base font-black text-slate-800 block">{formatearPorcentaje(metrics.avancePlanificadoGeneral)}</span>
                  <p className="text-[8px] text-slate-500 mt-0.5 leading-relaxed">Avance teórico.</p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Desviación de Avance</span>
                  <span className={`text-base font-black block ${metrics.desvio < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {metrics.desvio > 0 ? '+' : ''}{formatearPorcentaje(metrics.desvio)}
                  </span>
                  <p className="text-[8px] text-slate-500 mt-0.5 leading-relaxed">Real vs Planificado.</p>
                </div>

                {hideFinancials ? (
                  <>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                      <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Hitos de Contrato</span>
                      <span className="text-base font-black text-slate-800 block">
                        {projectActivities.filter(a => a.tipoRegistro === 'Hito' && a.estado === 'Completada').length} de {projectActivities.filter(a => a.tipoRegistro === 'Hito').length}
                      </span>
                      <p className="text-[8px] text-slate-500 mt-0.5 leading-relaxed">Hitos completados.</p>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                      <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Porcentaje Certificado</span>
                      <span className="text-base font-black text-emerald-600 block">{formatearPorcentaje(metrics.porcentajeCertificado)}</span>
                      <p className="text-[8px] text-slate-500 mt-0.5 leading-relaxed">Avance certificado.</p>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                      <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Ruta Crítica</span>
                      <span className="text-base font-black text-red-600 block">{metrics.actividadesCriticas} tareas</span>
                      <p className="text-[8px] text-slate-500 mt-0.5 leading-relaxed">Holgura cero.</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                      <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Presupuesto Contrato</span>
                      <span className="text-base font-black text-slate-800 block">{formatearMoneda(metrics.presupuestoTotal, project.moneda)}</span>
                      <p className="text-[8px] text-slate-500 mt-0.5 leading-relaxed">Suma asignada.</p>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                      <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Costo Real Acumulado</span>
                      <span className="text-base font-black text-slate-800 block">{formatearMoneda(metrics.costoRealAcumulado, project.moneda)}</span>
                      <p className="text-[8px] text-slate-500 mt-0.5 leading-relaxed">Gastos acumulados.</p>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                      <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Monto Certificado</span>
                      <span className="text-base font-black text-emerald-600 block">{formatearMoneda(metrics.montoCertificadoAcumulado, project.moneda)}</span>
                      <p className="text-[8px] text-slate-500 mt-0.5 leading-relaxed">Aprobado para cobro.</p>
                    </div>
                  </>
                )}
              </div>

              {/* Status Breakdown, Task Distribution & S-Curve Grid */}
              <div className="mt-4 grid grid-cols-3 gap-4 min-w-0">
                {/* Status Breakdown Numerical Summary */}
                <div className="p-3.5 border border-slate-200 rounded-xl bg-slate-50 flex flex-col justify-between break-inside-avoid min-w-0 overflow-hidden" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                  <div>
                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-wider mb-0.5">Estado del Cronograma</h4>
                    <p className="text-[8.5px] text-slate-500 font-medium mb-2">Conteo de tareas por etapa</p>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-center my-2">
                    <div className="p-1.5 bg-white border border-slate-200 rounded-lg">
                      <span className="text-[8px] text-slate-400 block font-bold">Completadas</span>
                      <span className="text-sm font-black text-emerald-600 block mt-0.5">{metrics.completadas}</span>
                    </div>
                    <div className="p-1.5 bg-white border border-slate-200 rounded-lg">
                      <span className="text-[8px] text-slate-400 block font-bold">En Curso</span>
                      <span className="text-sm font-black text-indigo-600 block mt-0.5">{metrics.enCurso}</span>
                    </div>
                    <div className="p-1.5 bg-white border border-slate-200 rounded-lg">
                      <span className="text-[8px] text-slate-400 block font-bold">No Iniciadas</span>
                      <span className="text-sm font-black text-slate-700 block mt-0.5">{metrics.noIniciada}</span>
                    </div>
                    <div className="p-1.5 bg-white border border-slate-200 rounded-lg">
                      <span className="text-[8px] text-slate-400 block font-bold">Atrasadas</span>
                      <span className="text-sm font-black text-rose-600 block mt-0.5">{metrics.atrasadas}</span>
                    </div>
                  </div>
                  <div className="mt-1 p-1.5 bg-red-50 border border-red-100 rounded-lg text-center">
                    <span className="text-[8.5px] font-bold text-red-700">Ruta Crítica: {metrics.actividadesCriticas} tareas en riesgo</span>
                  </div>
                </div>

                {/* Distribution Pie Chart */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between break-inside-avoid min-w-0 overflow-hidden" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                  <div>
                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-wider">Distribución de Tareas</h4>
                    <p className="text-[8.5px] text-slate-500 font-medium">{metrics.totalActividades} actividades en total</p>
                  </div>
                  <div className="h-28 relative flex items-center justify-center my-1 w-full overflow-hidden">
                    <PieChart width={180} height={110}>
                      <Pie
                        data={estadoData}
                        cx="50%"
                        cy="50%"
                        innerRadius={28}
                        outerRadius={48}
                        paddingAngle={3}
                        dataKey="value"
                        isAnimationActive={false}
                      >
                        {estadoData.map((entry, index) => (
                          <Cell key={`print-pie-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                    <div className="absolute text-center flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-sm font-black text-slate-800 leading-none">{metrics.totalActividades}</span>
                      <span className="text-[7px] text-slate-400 font-bold uppercase">Total</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[8px] font-semibold border-t border-slate-200 pt-1.5">
                    {estadoData.map((d) => (
                      <div key={d.name} className="flex items-center space-x-1 truncate">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-slate-600 truncate text-[7.5px]">{d.name}: <strong className="text-slate-900">{d.value}</strong></span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* S-Curve Chart Overview */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between break-inside-avoid min-w-0 overflow-hidden" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                  <div>
                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-wider mb-0.5">Curva S de Avance Físico</h4>
                    <p className="text-[8.5px] text-slate-500 font-medium mb-1">Plan vs Real vs Outlook</p>
                  </div>
                  <div className="h-28 w-full min-h-[110px] overflow-hidden">
                    <ResponsiveContainer width="100%" height={110} minHeight={110}>
                      <AreaChart data={progressChartData} margin={{ top: 5, right: 12, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="pColorPlan" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="pColorReal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 7.5 }} stroke="#64748b" interval="preserveStartEnd" />
                        <YAxis unit="%" tick={{ fontSize: 7.5 }} stroke="#64748b" domain={[0, 100]} />
                        <Area type="monotone" dataKey="Planificado %" stroke="#6366f1" strokeWidth={1.5} fillOpacity={1} fill="url(#pColorPlan)" isAnimationActive={false} />
                        <Area type="monotone" dataKey="Real %" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#pColorReal)" connectNulls isAnimationActive={false} />
                        <Line type="monotone" dataKey="Outlook %" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="3 3" dot={false} isAnimationActive={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center space-x-2 text-[8px] font-bold text-slate-600 pt-1.5 border-t border-slate-200">
                    <span className="text-indigo-600">Plan: {formatearPorcentaje(metrics.avancePlanificadoGeneral)}</span>
                    <span>•</span>
                    <span className="text-emerald-600">Real: {formatearPorcentaje(metrics.avanceRealGeneral)}</span>
                  </div>
                </div>
              </div>

              {/* ADDITIONAL CHARTS FROM DASHBOARD (Disciplinas, Responsables & Etapas) */}
              <div className="mt-4 grid grid-cols-3 gap-4 min-w-0 break-inside-avoid" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                {/* Actividades por Disciplina */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between min-w-0 overflow-hidden">
                  <div>
                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-wider mb-0.5">Actividades por Disciplina</h4>
                    <p className="text-[8.5px] text-slate-500 font-medium mb-1">Distribución técnica</p>
                  </div>
                  <div className="h-32 w-full">
                    {disciplinaData.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-8">Sin datos</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={120}>
                        <BarChart data={disciplinaData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 7.5 }} />
                          <YAxis stroke="#64748b" tick={{ fontSize: 7.5 }} />
                          <Bar dataKey="Actividades" fill="#4f46e5" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Carga por Responsable */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between min-w-0 overflow-hidden">
                  <div>
                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-wider mb-0.5">Carga por Responsable</h4>
                    <p className="text-[8.5px] text-slate-500 font-medium mb-1">Completadas vs Pendientes</p>
                  </div>
                  <div className="h-32 w-full">
                    {responsableData.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-8">Sin tareas</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={120}>
                        <BarChart data={responsableData} layout="vertical" margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                          <XAxis type="number" stroke="#64748b" tick={{ fontSize: 7.5 }} />
                          <YAxis dataKey="name" type="category" stroke="#64748b" tick={{ fontSize: 7.5 }} width={75} />
                          <Bar dataKey="Completadas" stackId="a" fill="#10b981" isAnimationActive={false} />
                          <Bar dataKey="Pendientes" stackId="a" fill="#818cf8" isAnimationActive={false} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Distribución por Etapa */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between min-w-0 overflow-hidden">
                  <div>
                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-wider mb-0.5">Distribución por Etapa</h4>
                    <p className="text-[8.5px] text-slate-500 font-medium mb-1">Fases de ciclo de vida</p>
                  </div>
                  <div className="h-32 w-full">
                    {etapaData.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-8">Sin datos</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={120}>
                        <BarChart data={etapaData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 7.5 }} />
                          <YAxis stroke="#64748b" tick={{ fontSize: 7.5 }} />
                          <Bar dataKey="Actividades" fill="#a855f7" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>

              {/* TABLES FROM DASHBOARD (Próximos Vencimientos - Expanded Full Width) */}
              <div className="mt-4 break-inside-avoid" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-wider">Próximos Vencimientos (30 Días)</h4>
                    <span className="text-[8.5px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">
                      {upcomingDeadlines.length} próximas
                    </span>
                  </div>
                  {upcomingDeadlines.length === 0 ? (
                    <p className="text-xs text-slate-400 font-medium text-center py-3 bg-white rounded-lg border border-slate-200">
                      Sin entregas programadas en los próximos 30 días.
                    </p>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
                      <table className="w-full text-left text-[9px] border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 font-extrabold uppercase">
                            <th className="p-2">WBS</th>
                            <th className="p-2">Tarea / Entregable</th>
                            <th className="p-2">Disciplina</th>
                            <th className="p-2">Responsable</th>
                            <th className="p-2 text-center">Término Plan.</th>
                            <th className="p-2 text-center">Días Restantes</th>
                            <th className="p-2 text-right">Avance Real</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                          {upcomingDeadlines.slice(0, 10).map((a) => {
                            const dFin = new Date(a.finPlanificado + 'T00:00:00');
                            const dHoy = new Date(HOY + 'T00:00:00');
                            const daysLeft = Math.ceil((dFin.getTime() - dHoy.getTime()) / (1000 * 60 * 60 * 24));
                            
                            let badgeClass = "bg-indigo-50 text-indigo-700 border border-indigo-200";
                            let badgeText = daysLeft === 0 ? "Hoy" : `${daysLeft}d`;
                            if (daysLeft <= 7) {
                              badgeClass = "bg-amber-50 text-amber-700 border border-amber-200";
                            }

                            return (
                              <tr key={a.id} className="hover:bg-slate-50">
                                <td className="p-2 font-mono font-bold text-slate-500">{a.wbs}</td>
                                <td className="p-2 font-bold text-slate-900 truncate max-w-[300px]" title={a.tarea}>{a.tarea}</td>
                                <td className="p-2 text-slate-500">{a.disciplina || '-'}</td>
                                <td className="p-2 text-slate-600">{a.responsable || 'Sin Asignar'}</td>
                                <td className="p-2 text-center text-indigo-600 font-bold">{formatearFecha(a.finPlanificado)}</td>
                                <td className="p-2 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold ${badgeClass}`}>
                                    {badgeText}
                                  </span>
                                </td>
                                <td className="p-2 text-right font-black text-slate-800">{a.avanceReal}%</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Certifications and Cash Flow Progress (if not hideFinancials) */}
              {!hideFinancials && (
                <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between break-inside-avoid" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                  <div>
                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-wider mb-0.5">Certificación, Facturación y Cobro</h4>
                    <p className="text-[9px] text-slate-500 font-medium mb-1">Monto total contrato: {formatearMoneda(metrics.presupuestoTotal * (1 + (project.utilidadEsperada/100)), project.moneda)}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 my-1">
                    {/* Progress 1: Certificado */}
                    <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                      <div className="flex justify-between text-[8px] font-bold mb-1">
                        <span className="text-slate-600 uppercase">Monto Certificado</span>
                        <span className="text-slate-900">{formatearPorcentaje(metrics.porcentajeCertificado)}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${Math.min(100, metrics.porcentajeCertificado)}%` }}></div>
                      </div>
                      <span className="text-[9px] font-black text-indigo-700 block mt-1">{formatearMoneda(metrics.montoCertificadoAcumulado, project.moneda)}</span>
                    </div>
                    {/* Progress 2: Facturado */}
                    <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                      <div className="flex justify-between text-[8px] font-bold mb-1">
                        <span className="text-slate-600 uppercase">Monto Facturado</span>
                        <span className="text-slate-900">{formatearPorcentaje(metrics.montoCertificadoAcumulado > 0 ? (metrics.montoFacturado / metrics.montoCertificadoAcumulado) * 100 : 0)}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, metrics.montoCertificadoAcumulado > 0 ? (metrics.montoFacturado / metrics.montoCertificadoAcumulado) * 100 : 0)}%` }}></div>
                      </div>
                      <span className="text-[9px] font-black text-blue-700 block mt-1">{formatearMoneda(metrics.montoFacturado, project.moneda)}</span>
                    </div>
                    {/* Progress 3: Cobrado */}
                    <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                      <div className="flex justify-between text-[8px] font-bold mb-1">
                        <span className="text-slate-600 uppercase">Monto Cobrado</span>
                        <span className="text-slate-900">{formatearPorcentaje(metrics.montoFacturado > 0 ? (metrics.montoCobrado / metrics.montoFacturado) * 100 : 0)}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, metrics.montoFacturado > 0 ? (metrics.montoCobrado / metrics.montoFacturado) * 100 : 0)}%` }}></div>
                      </div>
                      <span className="text-[9px] font-black text-emerald-700 block mt-1">{formatearMoneda(metrics.montoCobrado, project.moneda)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes & Observations */}
              {notes && (
                <div className="mt-4 p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-0.5">
                  <h4 className="text-[9px] font-black text-indigo-900 uppercase tracking-widest">Observaciones y Notas Técnicas</h4>
                  <p className="text-[10px] text-slate-600 leading-relaxed font-semibold">{notes}</p>
                </div>
              )}
            </div>

            {/* Footer page number */}
            <div className="flex justify-between text-[9px] text-slate-400 border-t border-slate-150 pt-3 mt-4">
              <span>{getSectionNumStr('dashboard')}: Dashboard</span>
              <span>Página {getPageNum('dashboard')}</span>
            </div>
          </div>
        )}

        {/* --- PAGE 3: CHRONOGRAM TABLE --- */}
        {sections.activities && (
          <div className="p-12 min-h-[960px] flex flex-col justify-between bg-white relative page-break break-after-page border-b border-slate-200">
            <div>
              {/* Header */}
              <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">{getSectionNumStr('activities')}: Base de Actividades</span>
                <span className="text-[9px] font-bold text-slate-400">{project.nombreProyecto}</span>
              </div>

              {/* Title */}
              <h2 className="text-lg font-black text-slate-900 mt-6 mb-2">Base de Actividades del Proyecto</h2>
              <p className="text-[10px] text-slate-500 leading-relaxed font-medium mb-6">Listado detallado de actividades con fechas de ejecución, avance físico y detalles del cronograma.</p>

              {/* Activities table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-[10px] font-sans text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Código</th>
                      <th className="py-2.5 px-3">Nombre Actividad</th>
                      <th className="py-2.5 px-3">Disciplina</th>
                      <th className="py-2.5 px-3 text-center">F. Inicio</th>
                      <th className="py-2.5 px-3 text-center">F. Término</th>
                      <th className="py-2.5 px-3 text-center">Avance</th>
                      <th className="py-2.5 px-3 text-center">Estado</th>
                      {!hideFinancials && <th className="py-2.5 px-3 text-right">Valor Contrato</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {projectActivities.map((act) => {
                      const isCritical = act.critica === 'Sí';
                      return (
                        <tr key={act.id} className={`hover:bg-slate-50 transition ${isCritical ? 'bg-red-50/20' : ''}`}>
                          <td className="py-2 px-3 font-bold text-slate-700">{act.wbs}</td>
                          <td className="py-2 px-3 font-semibold text-slate-850">
                            <div className="flex items-center space-x-1.5">
                              <span>{act.tarea}</span>
                              {isCritical && (
                                <span className="bg-red-100 text-red-700 text-[8px] px-1.5 py-0.2 rounded font-black tracking-wider uppercase shrink-0">Crítica</span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-slate-500 font-medium">{act.disciplina}</td>
                          <td className="py-2 px-3 text-center font-medium text-slate-600">{formatearFecha(act.inicioPlanificado)}</td>
                          <td className="py-2 px-3 text-center font-medium text-slate-600">{formatearFecha(act.finPlanificado)}</td>
                          <td className="py-2 px-3 text-center font-bold text-slate-800">{formatearPorcentaje(act.avanceReal)}</td>
                          <td className="py-2 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold ${
                              act.estado === 'Completada' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              act.estado === 'En Progreso' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                              act.estado === 'No Iniciada' ? 'bg-slate-50 text-slate-600 border border-slate-200' :
                              'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {act.estado}
                            </span>
                          </td>
                          {!hideFinancials && (
                            <td className="py-2 px-3 text-right font-black text-slate-800">{formatearMoneda(act.valorTarea || 0, project.moneda)}</td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer page number */}
            <div className="flex justify-between text-[8px] text-slate-400 border-t border-slate-150 pt-3 mt-6">
              <span>{getSectionNumStr('activities')}: Base de Actividades</span>
              <span>Página {getPageNum('activities')}</span>
            </div>
          </div>
        )}

        {/* --- PAGE 4: GANTT CHART REPORT VIEW --- */}
        {sections.gantt && ganttPages.map((pageActivities, pageIdx) => (
          <div 
            key={`gantt-page-${pageIdx}`}
            className="p-8 w-full max-w-[420mm] mx-auto min-h-[297mm] flex flex-col justify-between bg-white relative page-break break-after-page border-b border-slate-200 overflow-hidden"
          >
            <div>
              {/* Header */}
              <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                  {getSectionNumStr('gantt')}: Diagrama Gantt {ganttPages.length > 1 ? `(${pageIdx + 1}/${ganttPages.length})` : ''}
                </span>
                <span className="text-[9px] font-bold text-slate-400">{project.nombreProyecto}</span>
              </div>

              {/* Title & Legend */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between mt-3 mb-3 gap-2">
                <div>
                  <h2 className="text-base font-black text-slate-900">Cronograma de Barras Gantt (Formato A3)</h2>
                  <p className="text-[9.5px] text-slate-500 font-medium mt-0.5">
                    Cronograma completo de actividades del proyecto ({projectActivities.length} actividades en total).
                  </p>
                </div>
                {/* Visual Legend */}
                <div className="flex items-center space-x-2.5 text-[8.5px] font-bold bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg shrink-0">
                  <div className="flex items-center space-x-1">
                    <span className="w-2.5 h-1.5 bg-sky-200 border border-sky-300 rounded-xs inline-block"></span>
                    <span className="text-slate-600">Planificado</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="w-2.5 h-1.5 bg-emerald-500 rounded-xs inline-block"></span>
                    <span className="text-slate-600">Avance Real</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="w-2.5 h-1.5 bg-rose-500 rounded-xs inline-block"></span>
                    <span className="text-slate-600">Atraso</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="w-2 h-2 bg-indigo-500 rotate-45 inline-block"></span>
                    <span className="text-slate-600">Hito</span>
                  </div>
                  <div className="flex items-center space-x-1 border-l border-slate-200 pl-2">
                    <span className="border-l-2 border-dashed border-slate-900 h-2 inline-block"></span>
                    <span className="text-slate-900 font-extrabold">HOY ({formatearFecha(HOY)})</span>
                  </div>
                </div>
              </div>

              {/* Gantt Table Container */}
              <div className="border border-slate-300 rounded-xl overflow-hidden shadow-xs bg-white">
                {/* Table Header: Column titles & Timeline Months */}
                <div className="flex bg-slate-900 text-white font-bold text-[8.5px] uppercase tracking-wider border-b border-slate-800">
                  <div className="w-5/12 p-2 border-r border-slate-800 flex items-center">
                    <span>WBS • Actividad / Entregable</span>
                  </div>
                  <div className="w-7/12 flex relative">
                    {ganttTimelineScale.monthsList.map((m) => (
                      <div 
                        key={m.key} 
                        style={{ width: `${m.span}%` }}
                        className="py-2 text-center border-r border-slate-800/80 truncate px-0.5 text-slate-200"
                      >
                        {m.name}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Table Body */}
                <div className="divide-y divide-slate-200/80">
                  {pageActivities.map((act) => {
                    const isTitle = act.tipoRegistro === 'Título';
                    const isHito = act.tipoRegistro === 'Hito';
                    const isCompleted = act.estado === 'Completada';
                    const isCritical = act.critica === 'Sí';
                    const isOverdue = act.atrasoDias > 0 && !isCompleted && act.estado !== 'Cancelada';

                    const posPlan = getGanttBarPos(act.inicioPlanificado, act.finPlanificado);
                    const progressWidth = posPlan.width * (act.avanceReal / 100);

                    if (isTitle) {
                      return (
                        <div key={act.id} className="flex bg-slate-100 font-extrabold text-[8.5px] text-slate-800 py-1 px-2.5 border-y border-slate-300">
                          <span className="font-mono text-slate-500 mr-2">{act.wbs}</span>
                          <span className="uppercase tracking-wide">{act.tarea}</span>
                        </div>
                      );
                    }

                    return (
                      <div key={act.id} className={`flex items-center text-[8.5px] font-sans min-h-[30px] ${isCritical ? 'bg-red-50/15' : 'bg-white'}`}>
                        {/* Left Info Column */}
                        <div className="w-5/12 p-1.5 pr-2.5 border-r border-slate-200 flex items-center justify-between">
                          <div className="truncate pr-2">
                            <div className="flex items-center space-x-1 truncate">
                              <span className="font-mono font-bold text-slate-400 shrink-0 text-[8px]">{act.wbs}</span>
                              {isCritical && <span className="bg-red-100 text-red-700 text-[6.5px] px-1 rounded font-black uppercase shrink-0">C</span>}
                              {isHito && <span className="text-indigo-600 font-extrabold text-[8px] mr-0.5">◆</span>}
                              <span className="font-bold text-slate-800 truncate" title={act.tarea}>
                                {act.tarea}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1.5 text-[7.5px] text-slate-400 mt-0.5 font-medium">
                              <span>{act.responsable || 'Sin Asignar'}</span>
                              <span>•</span>
                              <span className={`font-semibold ${
                                isCompleted ? 'text-emerald-600' : isOverdue ? 'text-rose-600' : 'text-slate-500'
                              }`}>
                                {act.estado}
                              </span>
                            </div>
                          </div>

                          {/* Progress pill */}
                          {!isHito ? (
                            <span className={`shrink-0 font-mono text-[7.5px] font-extrabold px-1.5 py-0.2 rounded-full border ${
                              isCompleted
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : act.avanceReal > 0
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                : 'bg-slate-50 text-slate-400 border-slate-200'
                            }`}>
                              {act.avanceReal}%
                            </span>
                          ) : (
                            <span className="shrink-0 font-mono text-[7.5px] font-extrabold px-1.5 py-0.2 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                              Hito
                            </span>
                          )}
                        </div>

                        {/* Right Timeline Bar Column */}
                        <div className="w-7/12 relative h-full min-h-[30px] flex items-center py-1">
                          {/* Vertical month guidelines */}
                          <div className="absolute inset-0 flex pointer-events-none">
                            {ganttTimelineScale.monthsList.map((m) => (
                              <div key={m.key} style={{ width: `${m.span}%` }} className="h-full border-r border-slate-150/60" />
                            ))}
                          </div>

                          {/* HOY dashed line */}
                          {ganttTimelineScale.isHoyVisible && (
                            <div 
                              className="absolute top-0 bottom-0 border-l-2 border-dashed border-slate-900 z-20 pointer-events-none"
                              style={{ left: `${ganttTimelineScale.hoyLeftPercent}%` }}
                            >
                              <span className="absolute top-0 -translate-x-1/2 bg-slate-900 text-white font-mono text-[6px] font-extrabold px-1 py-0.2 rounded shadow-xs leading-none">
                                HOY
                              </span>
                            </div>
                          )}

                          {/* Bars */}
                          <div className="relative w-full h-5 flex flex-col justify-center">
                            {posPlan.isOutside ? (
                              <div className="text-[7.5px] font-medium text-slate-400 italic px-2 truncate">
                                Fuera de periodo ({formatearFecha(act.inicioPlanificado)} al {formatearFecha(act.finPlanificado)})
                              </div>
                            ) : isHito ? (
                              <div 
                                className="absolute w-3 h-3 bg-indigo-600 rotate-45 border border-indigo-800 shadow-xs z-10"
                                style={{ left: `calc(${posPlan.left}% - 6px)` }}
                                title={`Hito: ${act.tarea} (${formatearFecha(act.inicioPlanificado)})`}
                              />
                            ) : (
                              <>
                                {/* Planned bar */}
                                <div 
                                  className="absolute top-0 h-2 bg-sky-100 border border-sky-300 rounded-xs z-10"
                                  style={{ left: `${posPlan.left}%`, width: `${posPlan.width}%` }}
                                  title={`Plan: ${formatearFecha(act.inicioPlanificado)} a ${formatearFecha(act.finPlanificado)}`}
                                />

                                {/* Real progress bar */}
                                {act.avanceReal > 0 ? (
                                  <div 
                                    className={`absolute bottom-0 h-2.5 rounded-xs z-10 shadow-2xs flex items-center justify-end pr-1 text-[7px] font-mono font-bold text-white transition-all ${
                                      isCompleted
                                        ? 'bg-emerald-500 border border-emerald-600'
                                        : isOverdue
                                        ? 'bg-rose-500 border border-rose-600'
                                        : 'bg-indigo-600 border border-indigo-700'
                                    }`}
                                    style={{ left: `${posPlan.left}%`, width: `${progressWidth}%` }}
                                  >
                                    {progressWidth > 8 && <span>{act.avanceReal}%</span>}
                                  </div>
                                ) : (
                                  <div 
                                    className="absolute bottom-0 h-2.5 rounded-xs bg-slate-100 border border-slate-200 z-10"
                                    style={{ left: `${posPlan.left}%`, width: `${posPlan.width}%` }}
                                  />
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Note / Footer info */}
              <div className="text-center pt-2 text-[8.5px] text-slate-400 italic font-medium">
                * Mostrando actividades {pageIdx * 20 + 1} a {Math.min((pageIdx + 1) * 20, projectActivities.length)} de {projectActivities.length} totales del proyecto.
              </div>
            </div>

            {/* Footer page number */}
            <div className="flex justify-between text-[8px] text-slate-400 border-t border-slate-150 pt-2.5 mt-3">
              <span>{getSectionNumStr('gantt')}: Diagrama Gantt</span>
              <span>Página {getPageNum('gantt')}{ganttPages.length > 1 ? ` (${pageIdx + 1}/${ganttPages.length})` : ''}</span>
            </div>
          </div>
        ))}

        {/* --- PAGE 5: CONTROL DE COSTOS --- */}
        {(!hideFinancials && sections.costs) && (
          <div className="p-12 min-h-[960px] flex flex-col justify-between bg-white relative page-break break-after-page border-b border-slate-200">
            <div>
              {/* Header */}
              <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">{getSectionNumStr('costs')}: Control de Costos</span>
                <span className="text-[9px] font-bold text-slate-400">{project.nombreProyecto}</span>
              </div>

              {/* Title */}
              <h2 className="text-lg font-black text-slate-900 mt-6 mb-2">Control de Costos de Ejecución</h2>
              <p className="text-[10px] text-slate-500 leading-relaxed font-medium mb-6">Comparativa de costos planificados vs reales acumulados para análisis de desviación presupuestaria.</p>

              {/* Cost Summary Info Boxes */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-4 border border-slate-200 rounded-xl bg-slate-50">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Costos Directos</h4>
                  <div className="flex justify-between text-xs font-bold text-slate-700 py-1 border-b border-slate-150">
                    <span>Presupuesto Planificado Tareas:</span>
                    <span>{formatearMoneda(metrics.presupuestoTotal, project.moneda)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 py-1">
                    <span>Costo Real Registrado:</span>
                    <span className="text-indigo-650">{formatearMoneda(totalDirectReal, project.moneda)}</span>
                  </div>
                </div>

                <div className="p-4 border border-slate-200 rounded-xl bg-slate-50">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Costos Indirectos</h4>
                  <div className="flex justify-between text-xs font-bold text-slate-700 py-1 border-b border-slate-150">
                    <span>Margen / Utilidad Esperada:</span>
                    <span>{project.utilidadEsperada}%</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 py-1">
                    <span>Gastos Indirectos Real:</span>
                    <span className="text-indigo-650">{formatearMoneda(totalIndirectReal, project.moneda)}</span>
                  </div>
                </div>
              </div>

              {/* Direct Costs Table */}
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3">Planilla de Control de Presupuesto Directo</h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
                <table className="w-full text-[10px] text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 font-extrabold uppercase text-slate-600">
                    <tr>
                      <th className="py-2 px-3">Item / Tarea</th>
                      <th className="py-2 px-3 text-center">Unidad</th>
                      <th className="py-2 px-3 text-center">Cantidad</th>
                      <th className="py-2 px-3 text-right">P. Unitario</th>
                      <th className="py-2 px-3 text-right">Presupuesto</th>
                      <th className="py-2 px-3 text-right">Real Acumulado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {costsDirect.filter(d => d.idProyecto === project.idProyecto).slice(0, 10).map((d) => (
                      <tr key={d.idCosto} className="hover:bg-slate-50">
                        <td className="py-1.5 px-3 font-semibold text-slate-800">{d.tarea}</td>
                        <td className="py-1.5 px-3 text-center text-slate-500 font-bold">{d.unidad}</td>
                        <td className="py-1.5 px-3 text-center font-bold text-slate-750">{d.cantidad}</td>
                        <td className="py-1.5 px-3 text-right text-slate-600">{formatearMoneda(d.precioUnitario, project.moneda)}</td>
                        <td className="py-1.5 px-3 text-right font-bold text-slate-800">{formatearMoneda(d.valorTarea, project.moneda)}</td>
                        <td className="py-1.5 px-3 text-right font-black text-indigo-600">{formatearMoneda(d.realAcumulado, project.moneda)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer page number */}
            <div className="flex justify-between text-[8px] text-slate-400 border-t border-slate-150 pt-3 mt-6">
              <span>{getSectionNumStr('costs')}: Control de Costos</span>
              <span>Página {getPageNum('costs')}</span>
            </div>
          </div>
        )}

        {/* --- PAGE 6: CERTIFICACIONES --- */}
        {sections.certifications && (
          <div className="p-12 min-h-[960px] flex flex-col justify-between bg-white relative page-break break-after-page border-b border-slate-200">
            <div>
              {/* Header */}
              <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">{getSectionNumStr('certifications')}: Certificaciones</span>
                <span className="text-[9px] font-bold text-slate-400">{project.nombreProyecto}</span>
              </div>

              {/* Title */}
              <h2 className="text-lg font-black text-slate-900 mt-6 mb-2">Estados de Pago y Certificaciones de Obras</h2>
              <p className="text-[10px] text-slate-500 leading-relaxed font-medium mb-6">Auditoría física de estados de pago presentados, aprobados y porcentaje de avance certificado por inspección.</p>

              {hideFinancials ? (
                /* Client non-monetary KPIs */
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-8 text-center">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[9px] font-bold text-slate-400 block uppercase">Porcentaje Certificado</span>
                    <span className="text-sm font-black text-indigo-600 mt-0.5 block">{formatearPorcentaje(metrics.porcentajeCertificado)}</span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[9px] font-bold text-slate-400 block uppercase">Saldo por Certificar</span>
                    <span className="text-sm font-black text-slate-800 mt-0.5 block">{formatearPorcentaje(Math.max(0, 100 - metrics.porcentajeCertificado))}</span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[9px] font-bold text-slate-400 block uppercase">EDPs Presentados</span>
                    <span className="text-sm font-black text-slate-850 mt-0.5 block">
                      {certifications.filter(c => c.idProyecto === project.idProyecto && c.estado !== 'Borrador').length}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[9px] font-bold text-slate-400 block uppercase">EDPs Aprobados</span>
                    <span className="text-sm font-black text-emerald-600 mt-0.5 block">
                      {certifications.filter(c => c.idProyecto === project.idProyecto && ['Aprobado', 'Facturado', 'Cobrado'].includes(c.estado)).length}
                    </span>
                  </div>
                </div>
              ) : (
                /* Company financial KPIs */
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-8 text-center">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[9px] font-bold text-slate-400 block uppercase">Certificado</span>
                    <span className="text-sm font-black text-slate-850 mt-0.5 block">{formatearMoneda(metrics.montoCertificadoAcumulado, project.moneda)}</span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[9px] font-bold text-slate-400 block uppercase">Facturado</span>
                    <span className="text-sm font-black text-indigo-650 mt-0.5 block">{formatearMoneda(metrics.montoFacturado, project.moneda)}</span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[9px] font-bold text-slate-400 block uppercase">Cobrado / Ingresado</span>
                    <span className="text-sm font-black text-emerald-600 mt-0.5 block">{formatearMoneda(metrics.montoCobrado, project.moneda)}</span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[9px] font-bold text-slate-400 block uppercase">Saldo por Cobrar</span>
                    <span className="text-sm font-black text-rose-600 mt-0.5 block">{formatearMoneda(metrics.saldoPorCobrar, project.moneda)}</span>
                  </div>
                </div>
              )}

              {/* Certifications list */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                {hideFinancials ? (
                  /* Client non-monetary table */
                  <table className="w-full text-[10px] text-left font-sans">
                    <thead className="bg-slate-50 border-b border-slate-200 font-extrabold uppercase text-slate-650">
                      <tr>
                        <th className="py-2.5 px-3">Nº EDP</th>
                        <th className="py-2.5 px-3">Período</th>
                        <th className="py-2.5 px-3">Concepto a Certificar</th>
                        <th className="py-2.5 px-3 text-center">Estado Documento</th>
                        <th className="py-2.5 px-3 text-right">Avance Certificado %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {certifications.filter(c => c.idProyecto === project.idProyecto).map((cert) => {
                        const pctIndividual = cert.valorTarea > 0 ? (cert.certificado / cert.valorTarea) * 100 : 0;
                        return (
                          <tr key={cert.idCertificacion} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-bold text-slate-800">EDP #{cert.numero}</td>
                            <td className="py-2 px-3 font-semibold text-slate-600">{cert.fechaPeriodo}</td>
                            <td className="py-2 px-3 font-medium text-slate-700 truncate max-w-[200px]" title={cert.tareaCertificar}>{cert.tareaCertificar}</td>
                            <td className="py-2 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold ${
                                cert.estado === 'Cobrado' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                cert.estado === 'Facturado' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                                cert.estado === 'Aprobado' ? 'bg-indigo-50 text-indigo-650 border border-indigo-150' :
                                cert.estado === 'Presentado' ? 'bg-amber-50 text-amber-700 border border-amber-150' :
                                'bg-slate-50 text-slate-600 border border-slate-200'
                              }`}>
                                {cert.estado}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-indigo-600">{Math.round(pctIndividual)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  /* Company financial table */
                  <table className="w-full text-[10px] text-left font-sans">
                    <thead className="bg-slate-50 border-b border-slate-200 font-extrabold uppercase text-slate-650">
                      <tr>
                        <th className="py-2.5 px-3">Nº EDP</th>
                        <th className="py-2.5 px-3">Período</th>
                        <th className="py-2.5 px-3 text-center">Estado Documento</th>
                        <th className="py-2.5 px-3 text-right">Monto Certificado</th>
                        <th className="py-2.5 px-3 text-right">Monto Cobrado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {certifications.filter(c => c.idProyecto === project.idProyecto).map((cert) => (
                        <tr key={cert.idCertificacion} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-bold text-slate-800">EDP #{cert.numero}</td>
                          <td className="py-2 px-3 font-semibold text-slate-600">{cert.fechaPeriodo}</td>
                          <td className="py-2 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold ${
                              cert.estado === 'Cobrado' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              cert.estado === 'Facturado' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                              'bg-slate-50 text-slate-600 border border-slate-200'
                            }`}>
                              {cert.estado}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-slate-800">{formatearMoneda(cert.certificado, project.moneda)}</td>
                          <td className="py-2 px-3 text-right font-black text-emerald-650">{formatearMoneda(cert.cobrado || 0, project.moneda)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Footer page number */}
            <div className="flex justify-between text-[8px] text-slate-400 border-t border-slate-150 pt-3 mt-6">
              <span>{getSectionNumStr('certifications')}: Certificaciones</span>
              <span>Página {getPageNum('certifications')}</span>
            </div>
          </div>
        )}

        {/* --- PAGE 7: PROGRESS S-CURVE --- */}
        {sections.progress && (
          <div className="p-12 min-h-[960px] flex flex-col justify-between bg-white relative page-break break-after-page border-b border-slate-200">
            <div>
              {/* Header */}
              <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">{getSectionNumStr('progress')}: Curva S de Avance</span>
                <span className="text-[9px] font-bold text-slate-400">{project.nombreProyecto}</span>
              </div>

              {/* Title */}
              <h2 className="text-lg font-black text-slate-900 mt-6 mb-2">Curva S de Avance Físico Ponderado</h2>
              <p className="text-[10px] text-slate-500 leading-relaxed font-medium mb-6">Comparativa de desviaciones temporales Planificado vs Avance Real Acumulado.</p>

              {/* S-Curve Chart and Table */}
              <div className="p-5 border border-slate-200 rounded-xl bg-slate-50 space-y-4">
                <div className="flex items-center justify-center space-x-6 text-[10px] font-bold pb-2 border-b border-slate-200">
                  <div className="flex items-center space-x-1.5">
                    <div className="w-3.5 h-0.5 bg-indigo-600"></div>
                    <span>Avance Planificado (%)</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <div className="w-3.5 h-0.5 bg-emerald-500"></div>
                    <span>Avance Real (%)</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <div className="w-3.5 h-0.5 border-t-2 border-dashed border-amber-500"></div>
                    <span>Proyección Outlook (%)</span>
                  </div>
                </div>

                {/* S-curve line chart */}
                <div className="h-44 w-full bg-white border border-slate-200 rounded-lg p-2 flex items-center justify-center break-inside-avoid" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                  {projectCuts.length === 0 ? (
                    <span className="text-[10px] text-slate-400">Sin datos de avance.</span>
                  ) : (
                    <ResponsiveContainer width="100%" height={160} minHeight={160}>
                      <LineChart data={projectCuts} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis 
                          dataKey="fechaCorte" 
                          stroke="#94a3b8" 
                          tick={{ fontSize: 8 }}
                          tickFormatter={(v) => {
                            const d = new Date(v);
                            return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
                          }} 
                        />
                        <YAxis 
                          stroke="#94a3b8" 
                          tick={{ fontSize: 8 }} 
                          domain={[0, 100]}
                          tickFormatter={(v) => `${v}%`}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="proyectadoAcumulado" 
                          stroke="#6366f1" 
                          strokeWidth={2} 
                          dot={{ stroke: '#6366f1', strokeWidth: 1.5, r: 2.5 }}
                          isAnimationActive={false}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="realAcumulado" 
                          stroke="#10b981" 
                          strokeWidth={2.5} 
                          dot={{ stroke: '#10b981', strokeWidth: 1.5, r: 3 }}
                          isAnimationActive={false}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="outlook" 
                          stroke="#f59e0b" 
                          strokeWidth={2} 
                          strokeDasharray="3 3"
                          dot={false}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* S-curve custom table cuts */}
                <div className="overflow-x-auto border border-slate-200 bg-white rounded-lg">
                  <table className="w-full text-[9px] text-left">
                    <thead className="bg-slate-50 border-b border-slate-150 font-bold text-slate-600">
                      <tr>
                        <th className="py-2 px-2.5">Fecha de Corte</th>
                        <th className="py-2 px-2.5 text-center">Planificado (%)</th>
                        <th className="py-2 px-2.5 text-center">Real Acumulado (%)</th>
                        <th className="py-2 px-2.5 text-center">Estado de Desvío</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {projectCuts.map((cut) => {
                        const dev = (cut.realAcumulado || 0) - cut.proyectadoAcumulado;
                        return (
                          <tr key={cut.idProgreso}>
                            <td className="py-1.5 px-2.5 font-bold text-slate-700">{formatearFecha(cut.fechaCorte)}</td>
                            <td className="py-1.5 px-2.5 text-center text-indigo-650 font-black">{formatearPorcentaje(cut.proyectadoAcumulado)}</td>
                            <td className="py-1.5 px-2.5 text-center text-emerald-600 font-black">
                              {cut.realAcumulado !== null ? formatearPorcentaje(cut.realAcumulado) : 'Sin medición'}
                            </td>
                            <td className="py-1.5 px-2.5 text-center">
                              {cut.realAcumulado !== null ? (
                                <span className={`font-bold ${dev < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                  {dev < 0 ? 'Atraso' : 'Al día'} ({formatearPorcentaje(Math.abs(dev))})
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer page number */}
            <div className="flex justify-between text-[8px] text-slate-400 border-t border-slate-150 pt-3 mt-6">
              <span>{getSectionNumStr('progress')}: Curva S de Avance</span>
              <span>Página {getPageNum('progress')}</span>
            </div>
          </div>
        )}

      </div>
    );
  }
}

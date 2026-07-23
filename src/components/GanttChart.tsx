import { useState, useMemo } from 'react';
import { Project, Activity } from '../types';
import { parseDate, calcularDuracion, HOY } from '../utils/projectCalculations';
import { formatearFecha } from '../utils/formato';
import { Calendar, Users, SlidersHorizontal, Flag, AlertTriangle, ArrowLeftRight, ZoomIn } from 'lucide-react';

interface GanttChartProps {
  project: Project;
  activities: Activity[];
}

export default function GanttChart({ project, activities }: GanttChartProps) {
  const [filterResp, setFilterResp] = useState('');
  const [filterEst, setFilterEst] = useState('');
  const [filterEt, setFilterEt] = useState('');
  const [zoomMode, setZoomMode] = useState<'mensual' | 'semanal'>('mensual');

  // Filter activities
  const projectActivities = useMemo(() => {
    return activities.filter(a => a.idProyecto === project.idProyecto)
      .sort((a, b) => {
        // Sort by WBS hierarchy
        const partsA = a.wbs.split('.').map(Number);
        const partsB = b.wbs.split('.').map(Number);
        for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
          const valA = partsA[i] || 0;
          const valB = partsB[i] || 0;
          if (valA !== valB) return valA - valB;
        }
        return 0;
      });
  }, [activities, project.idProyecto]);

  const filteredActivities = useMemo(() => {
    return projectActivities.filter(a => {
      const matchResp = filterResp ? a.responsable === filterResp : true;
      const matchEst = filterEst ? a.estado === filterEst : true;
      const matchEt = filterEt ? a.etapa === filterEt : true;
      return matchResp && matchEst && matchEt;
    });
  }, [projectActivities, filterResp, filterEst, filterEt]);

  // Determine timeline boundary dates
  const { startProj, endProj, totalProjDays, timelineMonths } = useMemo(() => {
    // Fallback to project's contract dates
    let minDate = parseDate(project.fechaInicioPlan) || new Date('2026-05-01T00:00:00');
    let maxDate = parseDate(project.fechaFinPlan) || new Date('2026-10-31T00:00:00');

    // Adjust boundaries to catch any early/late activity
    projectActivities.forEach(a => {
      const dIn = parseDate(a.inicioPlanificado);
      const dFi = parseDate(a.finPlanificado);
      if (dIn && dIn < minDate) minDate = dIn;
      if (dFi && dFi > maxDate) maxDate = dFi;
    });

    // Add pad of 2 days on each end
    minDate.setDate(minDate.getDate() - 2);
    maxDate.setDate(maxDate.getDate() + 2);

    const totalDays = Math.max(1, Math.round((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    // Build month headers in-between
    const monthsList: { key: string, name: string, span: number, daysCount: number }[] = [];
    const tempDate = new Date(minDate);
    while (tempDate <= maxDate) {
      const mLabel = tempDate.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
      const currentMonth = tempDate.getMonth();
      let monthDays = 0;
      
      const startOfMonth = new Date(tempDate);
      while (tempDate <= maxDate && tempDate.getMonth() === currentMonth) {
        monthDays++;
        tempDate.setDate(tempDate.getDate() + 1);
      }
      
      monthsList.push({
        key: mLabel,
        name: mLabel.charAt(0).toUpperCase() + mLabel.slice(1),
        daysCount: monthDays,
        span: monthDays / totalDays * 100
      });
    }

    return {
      startProj: minDate,
      endProj: maxDate,
      totalProjDays: totalDays,
      timelineMonths: monthsList
    };
  }, [project, projectActivities]);

  // Helper to position bars
  const getBarPosition = (startStr: string, endStr: string) => {
    const dStart = parseDate(startStr);
    const dEnd = parseDate(endStr);
    if (!dStart || !dEnd) return { left: 0, width: 0 };

    // Calculate delta days from startProj
    const offsetTime = dStart.getTime() - startProj.getTime();
    const offsetDays = Math.round(offsetTime / (1000 * 60 * 60 * 24));
    
    const duration = calcularDuracion(startStr, endStr);

    const left = Math.max(0, (offsetDays / totalProjDays) * 100);
    const width = Math.min(100 - left, (duration / totalProjDays) * 100);

    return { left, width };
  };

  const handleResetFilters = () => {
    setFilterResp('');
    setFilterEst('');
    setFilterEt('');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5 select-none">
      {/* Header toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-800 text-base">Cronograma Integrado de Gantt</h3>
          <p className="text-xs text-slate-500">Visualización temporal comparativa Planificado (Azul) vs Real (Verde/Rojo)</p>
        </div>

        {/* Filters bar */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {/* Zoom Selector */}
          <div className="bg-slate-100 p-1 rounded-xl flex border border-slate-200">
            <button
              onClick={() => setZoomMode('mensual')}
              className={`px-3 py-1 rounded-lg transition-all font-bold flex items-center space-x-1 ${
                zoomMode === 'mensual' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <ZoomIn className="w-3.5 h-3.5" />
              <span>Mensual</span>
            </button>
            <button
              onClick={() => setZoomMode('semanal')}
              className={`px-3 py-1 rounded-lg transition-all font-bold flex items-center space-x-1 ${
                zoomMode === 'semanal' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Semanal (Gantt Expandido)</span>
            </button>
          </div>

          {/* Responsable dropdown */}
          <select
            value={filterResp}
            onChange={(e) => setFilterResp(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl py-1.5 px-3 outline-none text-slate-700"
          >
            <option value="">Responsables (Todos)</option>
            {project.responsables.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          {/* Estado dropdown */}
          <select
            value={filterEst}
            onChange={(e) => setFilterEst(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl py-1.5 px-3 outline-none text-slate-700"
          >
            <option value="">Estados (Todos)</option>
            <option value="No Iniciada">No Iniciada</option>
            <option value="En Curso">En Curso</option>
            <option value="Pausada">Pausada</option>
            <option value="Completada">Completada</option>
            <option value="Cancelada">Cancelada</option>
          </select>

          {/* Etapa dropdown */}
          <select
            value={filterEt}
            onChange={(e) => setFilterEt(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl py-1.5 px-3 outline-none text-slate-700"
          >
            <option value="">Etapas (Todos)</option>
            {project.etapas.map(et => (
              <option key={et} value={et}>{et}</option>
            ))}
          </select>

          {(filterResp || filterEst || filterEt) && (
            <button
              onClick={handleResetFilters}
              className="text-rose-600 hover:text-rose-700 font-bold underline"
            >
              Restablecer
            </button>
          )}
        </div>
      </div>

      {/* Gantt Matrix Chart Container */}
      {filteredActivities.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <h4 className="text-sm font-semibold text-slate-700">Sin tareas coincidentes</h4>
          <p className="text-xs text-slate-400">Modifique los filtros seleccionados arriba para graficar el Gantt.</p>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-xl shadow-inner bg-slate-50 overflow-auto max-h-[580px] relative">
          <div className={`flex flex-col ${zoomMode === 'semanal' ? 'min-w-[1800px] sm:min-w-[2200px]' : 'min-w-[1100px] sm:min-w-[1300px]'}`}>
            
            {/* Timeline header */}
            <div className="flex border-b border-slate-800 bg-slate-900 text-white font-semibold text-[10px] uppercase tracking-wider sticky top-0 z-30">
              {/* Task Names header column */}
              <div className="w-72 sm:w-80 shrink-0 p-3 border-r border-slate-800 flex items-center bg-slate-950 font-bold sticky left-0 z-40 text-white shadow-[4px_0_8px_-4px_rgba(0,0,0,0.3)]">
                WBS • ACTIVIDAD / ENTREGABLE
              </div>
              
              {/* Months scale header row */}
              <div className="flex-1 relative flex items-center h-10 overflow-hidden bg-slate-900">
                {timelineMonths.map((m) => (
                  <div
                    key={m.key}
                    className="h-full border-r border-slate-800 flex flex-col justify-center items-center text-center font-bold font-sans text-slate-300"
                    style={{ width: `${m.span}%` }}
                  >
                    <span className="truncate px-1 text-[10.5px]">{m.name}</span>
                    {zoomMode === 'semanal' && (
                      <div className="flex w-full border-t border-slate-800/80 text-[7.5px] text-slate-400 font-normal mt-0.5 pt-0.5 justify-around">
                        <span>S1</span><span>S2</span><span>S3</span><span>S4</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Grid Rows body list */}
            <div className="divide-y divide-slate-200">
              {filteredActivities.map((a) => {
                const isTitle = a.tipoRegistro === 'Título';
                const isHito = a.tipoRegistro === 'Hito';
                const isCritical = a.critica === 'Sí';
                const isCompleted = a.estado === 'Completada';
                
                // Planned and real bar calculations
                const posPlan = getBarPosition(a.inicioPlanificado, a.finPlanificado);
                const posReal = a.inicioReal ? getBarPosition(a.inicioReal, a.finReal || HOY) : null;
                
                const isOverdue = a.atrasoDias > 0 && !isCompleted && a.estado !== 'Cancelada';

                return (
                   <div
                    key={a.id}
                    className={`flex group transition-colors min-h-[52px] text-xs ${
                      isTitle 
                        ? 'bg-slate-100 font-extrabold border-b-2 border-slate-300' 
                        : isHito 
                          ? 'bg-purple-50/40 text-purple-950' 
                          : isCritical 
                            ? 'bg-red-50/20' 
                            : 'bg-white'
                    } hover:bg-slate-50`}
                  >
                    {/* Task label column - STICKY LEFT WITH SOLID BACKGROUND */}
                    <div className={`w-72 sm:w-80 shrink-0 p-3 border-r border-slate-200 flex flex-col justify-center sticky left-0 z-20 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)] ${
                      isTitle 
                        ? 'bg-slate-100 font-extrabold' 
                        : isHito 
                          ? 'bg-purple-50' 
                          : isCritical 
                            ? 'bg-red-50/90' 
                            : 'bg-white'
                    }`}>
                      <div className="flex items-center space-x-1.5 truncate">
                        <span className="font-mono font-bold text-slate-400 shrink-0 text-[10px]">{a.wbs}</span>
                        
                        {isCritical && <Flag className="w-3.5 h-3.5 text-rose-500 shrink-0 fill-rose-500" title="Ruta Crítica" />}
                        {isHito && <span className="text-purple-600 font-extrabold text-[10px] mr-1">◆</span>}
                        
                        <span 
                          className={`truncate ${
                            isTitle ? 'text-slate-900 font-extrabold uppercase' : 'text-slate-700 font-medium'
                          }`} 
                          title={a.tarea}
                        >
                          {a.tarea}
                        </span>
                      </div>

                      {!isTitle && (
                        <div className="flex items-center space-x-3 text-[10px] text-slate-400 font-medium mt-1">
                          <span className="truncate">{a.responsable}</span>
                          <span>•</span>
                          <span className={`font-semibold ${
                            isCompleted ? 'text-emerald-600' : isOverdue ? 'text-rose-600' : 'text-slate-500'
                          }`}>{a.estado}</span>
                        </div>
                      )}
                    </div>

                    {/* Gantt bar chart row panel */}
                    <div className="flex-1 relative min-h-[52px] flex flex-col justify-center py-2">
                      
                      {/* Month Vertical Guidelines lines inside grid row */}
                      <div className="absolute inset-0 flex">
                        {timelineMonths.map((m) => (
                          <div
                            key={m.key}
                            className="h-full border-r border-slate-150/60"
                            style={{ width: `${m.span}%` }}
                          />
                        ))}
                      </div>

                      {/* Today marker vertical dashed line indicator */}
                      {startProj <= parseDate(HOY)! && parseDate(HOY)! <= endProj && (
                        <div 
                          className="absolute top-0 bottom-0 border-l-2 border-dashed border-slate-900 z-10"
                          style={{ left: `${((parseDate(HOY)!.getTime() - startProj.getTime()) / (1000 * 60 * 60 * 24)) / totalProjDays * 100}%` }}
                          title={`Fecha de hoy: ${formatearFecha(HOY)}`}
                        >
                          <span className="absolute top-0 -translate-x-1/2 bg-slate-900 text-white font-mono text-[7.5px] font-bold px-1.5 py-0.5 rounded shadow-sm leading-none">HOY</span>
                        </div>
                      )}

                      {/* Dual timeline bars inside container */}
                      <div className="relative h-9 w-full">
                        {!isTitle && (
                          <>
                            {/* PLANNED BAR */}
                            {isHito ? (
                              <div 
                                className="absolute top-1 w-3.5 h-3.5 bg-indigo-500 rotate-45 border border-indigo-700 shadow-sm z-10"
                                style={{ left: `calc(${posPlan.left}% - 7px)` }}
                                title={`Hito Planificado: ${formatearFecha(a.inicioPlanificado)}`}
                              />
                            ) : (
                              <div
                                className="absolute top-0.5 h-3.5 bg-sky-200/90 hover:bg-sky-300 border border-sky-300 rounded-md transition shadow-[0_1px_3px_rgba(14,165,233,0.08)] flex items-center justify-end px-1.5"
                                style={{ left: `${posPlan.left}%`, width: `${posPlan.width}%` }}
                                title={`Planificado: del ${formatearFecha(a.inicioPlanificado)} al ${formatearFecha(a.finPlanificado)} (${a.duracionPlanificada} días)`}
                              >
                                {posPlan.width > 5 && (
                                  <span className="text-[8px] text-sky-800 font-bold select-none leading-none">
                                    {a.avancePlanificado}%
                                  </span>
                                )}
                              </div>
                            )}

                            {/* REAL PERFORMANCE BAR */}
                            {posReal && !isHito && (
                              <div
                                className={`absolute bottom-0.5 h-3.5 rounded-md border shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition-all flex items-center px-1.5 justify-end ${
                                  isCompleted 
                                    ? 'bg-emerald-500 hover:bg-emerald-600 border-emerald-600 text-white' 
                                    : isOverdue 
                                      ? 'bg-rose-500 hover:bg-rose-600 border-rose-600 text-white animate-pulse' 
                                      : 'bg-teal-400 hover:bg-teal-500 border-teal-500 text-teal-950'
                                }`}
                                style={{ left: `${posReal.left}%`, width: `${posReal.width}%` }}
                                title={`Real: del ${formatearFecha(a.inicioReal)} al ${a.finReal ? formatearFecha(a.finReal) : 'Hoy'} (${a.avanceReal}% real completado)`}
                              >
                                {posReal.width > 5 && (
                                  <span className="text-[8px] font-black leading-none">
                                    {a.avanceReal}%
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Overdue alert triangle flag if late */}
                            {isOverdue && (
                              <div 
                                className="absolute bottom-3.5 flex items-center text-rose-600 z-15"
                                style={{ left: `calc(${posPlan.left + posPlan.width}% + 4px)` }}
                              >
                                <AlertTriangle className="w-3.5 h-3.5" title={`Atraso detectado de +${a.atrasoDias} días!`} />
                              </div>
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
        </div>
      )}

      {/* Visual Color Legend Guide card */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap gap-4 items-center justify-between text-xs text-slate-500">
        <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Guía de Convenciones:</span>
        <div className="flex items-center space-x-2">
          <span className="w-5 h-3 bg-sky-200 rounded border border-sky-300" />
          <span>Barra Planificada (Progreso Esperado)</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-5 h-3 bg-emerald-500 rounded border border-emerald-600" />
          <span>Tarea Completada (100% Real)</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-5 h-3 bg-teal-400 rounded border border-teal-500" />
          <span>Tarea En Curso</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-5 h-3 bg-rose-500 rounded border border-rose-600" />
          <span>Tarea Atrasada (Excedió Fin Plan)</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3.5 h-3.5 bg-indigo-500 rotate-45 border border-indigo-700" />
          <span>Hito de Progreso (Duración 0 o 1)</span>
        </div>
      </div>
    </div>
  );
}

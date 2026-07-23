import React, { useState, useMemo } from 'react';
import { Project, DateCorteProgress } from '../types';
import { formatearFecha, formatearPorcentaje } from '../utils/formato';
import { HOY, calcularCurvaSConOutlook } from '../utils/projectCalculations';
import { 
  TrendingUp, Calendar, Plus, Edit, Trash2, X, ClipboardList, Info, 
  TrendingDown, AlertTriangle, CheckCircle2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface ProgressCurveProps {
  project: Project;
  progressCuts: DateCorteProgress[];
  onAddProgressCut: (cut: DateCorteProgress) => void;
  onEditProgressCut: (cut: DateCorteProgress) => void;
  onDeleteProgressCut: (id: string) => void;
  currentUserRole: 'Empresa' | 'Cliente';
}

export default function ProgressCurve({
  project,
  progressCuts,
  onAddProgressCut,
  onEditProgressCut,
  onDeleteProgressCut,
  currentUserRole
}: ProgressCurveProps) {
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingCut, setEditingCut] = useState<DateCorteProgress | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form inputs
  const [fechaCorte, setFechaCorte] = useState('2026-07-31');
  const [avancePlanificado, setAvancePlanificado] = useState(0);
  const [avanceReal, setAvanceReal] = useState(0);
  const [formError, setFormError] = useState('');

  // Filter and sort cut dates by date chronological order
  const projectCuts = useMemo(() => {
    return progressCuts.filter(c => c.idProyecto === project.idProyecto)
      .sort((a, b) => a.fechaCorte.localeCompare(b.fechaCorte));
  }, [progressCuts, project.idProyecto]);

  // Processed chart cuts with seamless S-curve Outlook calculation
  const chartCuts = useMemo(() => {
    return calcularCurvaSConOutlook(projectCuts, HOY);
  }, [projectCuts]);

  // --- COMPUTE KPIs FROM LATEST INSPECTION CUT ---
  const latestCut = useMemo(() => {
    if (projectCuts.length === 0) return null;
    // We only take cuts where realAcumulado > 0, or just the very last entered cut
    // Let's take the latest entered cut that actually has a measurement (realAcumulado > 0)
    const cutsWithMeasurements = projectCuts.filter(c => c.realAcumulado > 0);
    if (cutsWithMeasurements.length > 0) {
      return cutsWithMeasurements[cutsWithMeasurements.length - 1];
    }
    return projectCuts[0];
  }, [projectCuts]);

  const deviation = useMemo(() => {
    if (!latestCut) return 0;
    return latestCut.realAcumulado - latestCut.proyectadoAcumulado;
  }, [latestCut]);

  // --- MODAL ACTION HANDLERS ---
  const handleOpenModal = (cut: DateCorteProgress | null = null) => {
    setFormError('');
    if (cut) {
      setEditingCut(cut);
      setFechaCorte(cut.fechaCorte);
      setAvancePlanificado(cut.proyectadoAcumulado);
      setAvanceReal(cut.realAcumulado);
    } else {
      setEditingCut(null);
      // Auto suggest next date based on latest
      if (latestCut) {
        const lastDate = new Date(latestCut.fechaCorte);
        lastDate.setDate(lastDate.getDate() + 15); // suggest 15 days later
        setFechaCorte(lastDate.toISOString().split('T')[0]);
        setAvancePlanificado(Math.min(100, Math.round(latestCut.proyectadoAcumulado + 10)));
        setAvanceReal(Math.min(100, Math.round(latestCut.realAcumulado + 8)));
      } else {
        setFechaCorte('2026-05-15');
        setAvancePlanificado(10);
        setAvanceReal(8);
      }
    }
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!fechaCorte) {
      setFormError('La fecha de corte es obligatoria.');
      return;
    }
    if (avancePlanificado < 0 || avancePlanificado > 100 || avanceReal < 0 || avanceReal > 100) {
      setFormError('Los porcentajes acumulados deben estar entre 0% y 100%.');
      return;
    }

    // Check if date already exists in project for duplicate prevention (only when creating new)
    if (!editingCut) {
      const duplicate = projectCuts.find(c => c.fechaCorte === fechaCorte);
      if (duplicate) {
        setFormError('Ya existe un registro de inspección para esta fecha.');
        return;
      }
    }

    const saved: DateCorteProgress = {
      idProgreso: editingCut ? editingCut.idProgreso : `cut-${Date.now()}`,
      idProyecto: project.idProyecto,
      fechaCorte,
      proyectadoAcumulado: Number(avancePlanificado),
      realAcumulado: Number(avanceReal),
      outlook: Number(avanceReal) // default outlook is matching real
    };

    if (editingCut) {
      onEditProgressCut(saved);
    } else {
      onAddProgressCut(saved);
    }
    setShowModal(false);
  };

  return (
    <div className="space-y-6 select-none font-sans text-xs">
      {/* 1. TOP DYNAMIC KPIs GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Último Corte</span>
          <h4 className="text-xl font-extrabold text-slate-800 tracking-tight mt-1">
            {latestCut ? formatearFecha(latestCut.fechaCorte) : 'No Registrado'}
          </h4>
          <span className="text-[10px] text-slate-400 mt-2 block">Fecha de última medición física</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Avance Planificado Acum.</span>
          <h4 className="text-xl font-extrabold text-indigo-600 tracking-tight mt-1">
            {latestCut ? `${latestCut.proyectadoAcumulado}%` : '0%'}
          </h4>
          <span className="text-[10px] text-slate-400 mt-2 block">Progreso contractual esperado</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Avance Real Físico Acum.</span>
          <h4 className="text-xl font-extrabold text-emerald-600 tracking-tight mt-1">
            {latestCut ? `${latestCut.realAcumulado}%` : '0%'}
          </h4>
          <span className="text-[10px] text-emerald-600 font-bold mt-2 block">Progreso físico ponderado real</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Desvío de Curva</span>
          <div className="flex items-center space-x-1.5 mt-1">
            {latestCut ? (
              deviation >= 0 ? (
                <>
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                  <h4 className="text-xl font-extrabold text-emerald-600">+{Math.round(deviation)}%</h4>
                </>
              ) : (
                <>
                  <TrendingDown className="w-5 h-5 text-rose-500" />
                  <h4 className="text-xl font-extrabold text-rose-600">{Math.round(deviation)}%</h4>
                </>
              )
            ) : (
              <h4 className="text-xl font-extrabold text-slate-400">0%</h4>
            )}
          </div>
          <span className={`text-[10px] font-bold mt-2 block ${latestCut && deviation >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
            {latestCut ? (deviation >= 0 ? 'Proyecto Adelantado' : 'Proyecto Atrasado') : 'Esperando datos'}
          </span>
        </div>
      </div>

      {/* 2. CHRONOLOGICAL S-CURVE GRAPHIC */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Curva S chart render */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Curva S de Avance Físico Ponderado</h4>
              <p className="text-[10px] text-slate-400">Control visual de desviaciones temporales Planificado vs Real</p>
            </div>
            
            {/* Legend indicators */}
            <div className="flex items-center space-x-4 text-[10px] font-bold">
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-0.5 bg-indigo-400 inline-block" />
                <span className="text-slate-500">Avance Planificado</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3.5 h-0.5 bg-emerald-500 inline-block" />
                <span className="text-slate-500">Avance Real</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3.5 h-0.5 border-t-2 border-dashed border-amber-500 inline-block" />
                <span className="text-slate-500">Proyección Outlook</span>
              </div>
            </div>
          </div>

          <div className="h-64">
            {projectCuts.length === 0 ? (
              <div className="text-center py-20 bg-slate-50 border border-dashed border-slate-100 rounded-xl">
                <TrendingUp className="w-10 h-10 text-slate-350 mx-auto mb-2" />
                <p className="text-slate-400 font-medium">Sin datos de avance. Ingrese cortes quincenales para graficar la curva S.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartCuts} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis 
                    dataKey="fechaCorte" 
                    stroke="#94a3b8" 
                    tick={{ fontSize: 9 }}
                    tickFormatter={(v) => {
                      const d = new Date(v);
                      return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
                    }} 
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    tick={{ fontSize: 9 }} 
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip 
                    labelFormatter={(v) => `Fecha de Corte: ${formatearFecha(v)}`}
                    formatter={(value) => [`${value}%`, 'Avance Acumulado']} 
                  />
                  <Line 
                    type="monotone" 
                    name="Avance Planificado Acumulado"
                    dataKey="proyectadoAcumulado" 
                    stroke="#6366f1" 
                    strokeWidth={2.5} 
                    dot={{ stroke: '#6366f1', strokeWidth: 2, r: 3 }}
                  />
                  <Line 
                    type="monotone" 
                    name="Avance Real Físico Acumulado"
                    dataKey="realAcumulado" 
                    stroke="#10b981" 
                    strokeWidth={3} 
                    dot={{ stroke: '#10b981', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    name="Proyección Outlook %"
                    dataKey="outlook" 
                    stroke="#f59e0b" 
                    strokeWidth={2} 
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Informative tutorial explanation */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-slate-800 text-sm">¿Cómo interpretar la Curva S?</h4>
            <p className="text-slate-400 text-[10px]">Indicaciones metodológicas de control</p>
          </div>

          <div className="space-y-3 my-4 text-[11px] text-slate-600 leading-relaxed">
            <p>
              La <strong>Curva S</strong> representa el progreso acumulativo del proyecto a lo largo del tiempo. Se denomina "S" porque el avance suele comenzar lento, se acelera en las etapas medias y se ralentiza cerca del cierre.
            </p>
            <div className="flex items-start space-x-2 bg-emerald-50 text-emerald-700 p-2.5 rounded-xl border border-emerald-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Adelanto:</strong> Si la línea real (verde) se posiciona por <strong>encima</strong> de la teórica (azul). Indica rendimiento superior al planificado.</span>
            </div>
            <div className="flex items-start space-x-2 bg-rose-50 text-rose-700 p-2.5 rounded-xl border border-rose-100">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span><strong>Atraso:</strong> Si la línea real (verde) se posiciona por <strong>debajo</strong> de la teórica (azul). Exige planes de mitigación o inyección de recursos.</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl text-slate-500 text-[10px] flex items-center space-x-2">
            <Info className="w-4 h-4 text-slate-400 shrink-0" />
            <span>Actualizado en base a informes de fiscalización quincenal.</span>
          </div>
        </div>
      </div>

      {/* 3. HISTORICAL REGISTRATION LIST TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-900 px-5 py-3 flex items-center justify-between text-white border-b border-slate-800 flex-wrap gap-3">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-indigo-450" />
            <h4 className="font-bold text-sm">Historial de Registros de Corte de Avance</h4>
          </div>

          {currentUserRole === 'Empresa' && (
            <button
              onClick={() => handleOpenModal()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-lg transition flex items-center space-x-1 shadow-md shadow-indigo-650/10"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Registrar Punto de Avance</span>
            </button>
          )}
        </div>

        <div className="overflow-auto max-h-[450px]">
          {projectCuts.length === 0 ? (
            <div className="text-center py-16">
              <ClipboardList className="w-12 h-12 text-slate-200 mx-auto mb-2" />
              <h5 className="font-bold text-slate-600">No hay registros de inspección cargados</h5>
              <p className="text-slate-400">Haga clic en "Registrar Punto de Avance" para ingresar datos acumulados.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="sticky top-0 z-20 bg-slate-100 text-slate-700 font-bold uppercase tracking-wider shadow-sm border-b border-slate-200">
                <tr>
                  <th className="p-3 sticky top-0 z-20 bg-slate-100">Fecha de Corte</th>
                  <th className="p-3 text-center sticky top-0 z-20 bg-slate-100">Avance Planificado Acumulado</th>
                  <th className="p-3 text-center sticky top-0 z-20 bg-slate-100">Avance Real Acumulado</th>
                  <th className="p-3 text-center sticky top-0 z-20 bg-slate-100">Desvío Porcentual</th>
                  <th className="p-3 text-center sticky top-0 z-20 bg-slate-100">Estado del Hito</th>
                  <th className="p-3 text-center sticky top-0 z-20 bg-slate-100">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
                {projectCuts.map((c) => {
                  const cutDev = c.realAcumulado - c.proyectadoAcumulado;
                  return (
                    <tr key={c.idProgreso} className="hover:bg-slate-50/50">
                      <td className="p-3 font-bold text-slate-800 font-mono">{formatearFecha(c.fechaCorte)}</td>
                      <td className="p-3 text-center font-bold text-indigo-600 font-mono">{c.proyectadoAcumulado}%</td>
                      <td className="p-3 text-center font-bold text-emerald-600 font-mono">{c.realAcumulado}%</td>
                      <td className={`p-3 text-center font-bold font-mono ${cutDev >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {cutDev >= 0 ? `+${Math.round(cutDev)}%` : `${Math.round(cutDev)}%`}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          cutDev >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {cutDev >= 0 ? 'Rendimiento Superior' : 'Rendimiento Crítico'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {currentUserRole === 'Empresa' ? (
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              onClick={() => handleOpenModal(c)}
                              className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(c.idProgreso)}
                              className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[10px]">Solo lectura</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* --- FORM MODAL FOR CUT REGISTRATION --- */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-200"
            >
              <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
                <h4 className="font-bold text-sm">{editingCut ? 'Editar Registro de Avance' : 'Nuevo Registro de Avance Acumulado'}</h4>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleSave} className="p-5 space-y-4">
                {formError && <div className="p-2.5 bg-red-50 text-red-600 font-bold rounded-lg">{formError}</div>}

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Fecha del Corte de Inspección *</label>
                  <input
                    type="date"
                    value={fechaCorte}
                    onChange={(e) => setFechaCorte(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 outline-none text-slate-800 font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Avance Planificado Acumulado (%) *</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={avancePlanificado}
                    onChange={(e) => setAvancePlanificado(Number(e.target.value))}
                    placeholder="Ej: 45.5"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 outline-none text-slate-800 font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Avance Real Acumulado (%) *</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={avanceReal}
                    onChange={(e) => setAvanceReal(Number(e.target.value))}
                    placeholder="Ej: 42.1"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 outline-none text-slate-800 font-bold"
                    required
                  />
                </div>

                <div className="p-3 bg-slate-50 rounded-xl text-[10px] text-slate-500 font-medium leading-relaxed">
                  <strong>Ponderación del punto registrado:</strong><br />
                  La desviación de avance calculada para este hito de inspección será de <span className="font-bold text-slate-800">{Math.round(avanceReal - avancePlanificado)}%</span>.
                </div>

                <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-150">
                  <button type="button" onClick={() => setShowModal(false)} className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-xl transition">Cancelar</button>
                  <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-md shadow-indigo-500/10">Guardar</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation delete modal */}
      <AnimatePresence>
        {confirmDeleteId && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full border border-slate-200 text-center"
            >
              <Trash2 className="w-12 h-12 text-rose-500 mx-auto mb-4" />
              <h3 className="font-bold text-slate-800 text-base">¿Eliminar registro de corte?</h3>
              <p className="text-slate-500 text-xs mt-2 leading-relaxed">Se recalculará la tendencia de la Curva S y sus desviaciones asociadas.</p>
              
              <div className="flex items-center justify-center space-x-3 mt-6">
                <button onClick={() => setConfirmDeleteId(null)} className="px-4 py-2 bg-slate-100 text-slate-600 font-semibold rounded-xl transition">Cancelar</button>
                <button onClick={() => { onDeleteProgressCut(confirmDeleteId); setConfirmDeleteId(null); }} className="px-4 py-2 bg-rose-600 text-white font-bold rounded-xl transition shadow-md shadow-rose-500/10">Sí, eliminar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

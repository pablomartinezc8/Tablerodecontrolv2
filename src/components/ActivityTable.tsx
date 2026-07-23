import { useState } from 'react';
import { Project, Activity, UserRole } from '../types';
import { formatearMoneda, formatearPorcentaje, formatearFecha } from '../utils/formato';
import { 
  Search, Edit, Trash2, SlidersHorizontal, AlertTriangle, CheckCircle2, 
  HelpCircle, ChevronDown, ChevronUp, Flag, ShieldAlert, FileText, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { calcularMetricasProyecto } from '../utils/projectCalculations';

interface ActivityTableProps {
  project: Project;
  activities: Activity[];
  onEdit: (activity: Activity) => void;
  onDelete: (id: string) => void;
  currentUserRole: UserRole;
  fechaCorte: string;
}

type SortField = 'wbs' | 'inicioPlanificado' | 'finPlanificado' | 'valorTarea';
type SortOrder = 'asc' | 'desc';

export default function ActivityTable({
  project,
  activities,
  onEdit,
  onDelete,
  currentUserRole,
  fechaCorte
}: ActivityTableProps) {
  // Filters
  const [searchText, setSearchText] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterResponsable, setFilterResponsable] = useState('');
  const [filterDisciplina, setFilterDisciplina] = useState('');
  const [filterEtapa, setFilterEtapa] = useState('');
  const [filterPrioridad, setFilterPrioridad] = useState('');
  const [filterCritica, setFilterCritica] = useState('');
  
  // Sort
  const [sortField, setSortField] = useState<SortField>('wbs');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Deletion Confirmation Modal
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Toggle advanced filters section
  const [showFilters, setShowFilters] = useState(false);

  // Filter activities
  const projectActivities = activities.filter(a => a.idProyecto === project.idProyecto);

  const filteredActivities = projectActivities.filter(a => {
    const matchesSearch = 
      a.tarea.toLowerCase().includes(searchText.toLowerCase()) ||
      a.wbs.includes(searchText) ||
      (a.observaciones && a.observaciones.toLowerCase().includes(searchText.toLowerCase()));

    const matchesEstado = filterEstado ? a.estado === filterEstado : true;
    const matchesResponsable = filterResponsable ? a.responsable === filterResponsable : true;
    const matchesDisciplina = filterDisciplina ? a.disciplina === filterDisciplina : true;
    const matchesEtapa = filterEtapa ? a.etapa === filterEtapa : true;
    const matchesPrioridad = filterPrioridad ? a.prioridad === filterPrioridad : true;
    const matchesCritica = filterCritica ? a.critica === filterCritica : true;

    return matchesSearch && matchesEstado && matchesResponsable && matchesDisciplina && matchesEtapa && matchesPrioridad && matchesCritica;
  });

  // Calculate WBS order rating (e.g. "1" -> [1], "2.1" -> [2, 1], "10.2.1" -> [10, 2, 1])
  const getWbsParts = (wbsStr: string): number[] => {
    return wbsStr.split('.').map(p => {
      const parsed = parseInt(p, 10);
      return isNaN(parsed) ? 0 : parsed;
    });
  };

  const compareWbs = (a: string, b: string): number => {
    const partsA = getWbsParts(a);
    const partsB = getWbsParts(b);
    const len = Math.max(partsA.length, partsB.length);
    for (let i = 0; i < len; i++) {
      const valA = partsA[i] || 0;
      const valB = partsB[i] || 0;
      if (valA !== valB) return valA - valB;
    }
    return 0;
  };

  // Sort activities
  const sortedActivities = [...filteredActivities].sort((a, b) => {
    let multiplier = sortOrder === 'asc' ? 1 : -1;
    
    if (sortField === 'wbs') {
      return compareWbs(a.wbs, b.wbs) * multiplier;
    } else if (sortField === 'inicioPlanificado') {
      return a.inicioPlanificado.localeCompare(b.inicioPlanificado) * multiplier;
    } else if (sortField === 'finPlanificado') {
      return a.finPlanificado.localeCompare(b.finPlanificado) * multiplier;
    } else if (sortField === 'valorTarea') {
      return (a.valorTarea - b.valorTarea) * multiplier;
    }
    return 0;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleDeleteClick = (id: string) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = () => {
    if (confirmDeleteId) {
      onDelete(confirmDeleteId);
      setConfirmDeleteId(null);
    }
  };

  const handleResetFilters = () => {
    setSearchText('');
    setFilterEstado('');
    setFilterResponsable('');
    setFilterDisciplina('');
    setFilterEtapa('');
    setFilterPrioridad('');
    setFilterCritica('');
  };

  const metrics = calcularMetricasProyecto(
    activities,
    [],
    [],
    [],
    project.idProyecto,
    project.utilidadEsperada,
    fechaCorte
  );

  return (
    <div className="space-y-4 select-none">
      {/* Panel de Indicadores de Gestión de Ingeniería */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-900 text-white rounded-2xl p-4 shadow-md border border-slate-800">
        <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/20">
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avance Planificado</span>
          <span className="text-lg font-black text-indigo-400 mt-1 block">{Math.round(metrics.avancePlanificadoGeneral || 0)}%</span>
          <span className="text-[9px] text-slate-400 block mt-0.5">Teórico a fecha de corte</span>
        </div>
        <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/20">
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avance Real</span>
          <span className="text-lg font-black text-emerald-400 mt-1 block">{Math.round(metrics.avanceRealGeneral || 0)}%</span>
          <span className="text-[9px] text-slate-400 block mt-0.5">Físico promedio de tareas</span>
        </div>
        <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/20">
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Desviación</span>
          <span className={`text-lg font-black mt-1 block ${metrics.desvio >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {metrics.desvio >= 0 ? `+${Math.round(metrics.desvio)}%` : `${Math.round(metrics.desvio)}%`}
          </span>
          <span className="text-[9px] text-slate-400 block mt-0.5">Físico (Real - Planificado)</span>
        </div>
        <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/20">
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">SPI (Plazo)</span>
          <span className={`text-lg font-black mt-1 block ${metrics.spi >= 1.0 ? 'text-emerald-400' : metrics.spi >= 0.9 ? 'text-amber-400' : 'text-rose-400'}`}>
            {metrics.spi.toFixed(2)}
          </span>
          <span className="text-[9px] text-slate-400 block mt-0.5">{metrics.spi >= 1.0 ? 'A tiempo' : 'Atraso cronograma'}</span>
        </div>
      </div>

      {/* Resumen de Estados de Tareas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center space-x-3 shadow-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
          <div>
            <span className="block text-[9px] text-slate-450 uppercase font-bold">Completadas</span>
            <span className="font-extrabold text-slate-800">{metrics.completadas} tareas</span>
          </div>
        </div>
        <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center space-x-3 shadow-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0" />
          <div>
            <span className="block text-[9px] text-slate-450 uppercase font-bold">En Curso</span>
            <span className="font-extrabold text-slate-800">{metrics.enCurso} tareas</span>
          </div>
        </div>
        <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center space-x-3 shadow-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0" />
          <div>
            <span className="block text-[9px] text-slate-450 uppercase font-bold">No Iniciadas</span>
            <span className="font-extrabold text-slate-800">{metrics.noIniciada} tareas</span>
          </div>
        </div>
        <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center space-x-3 shadow-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 animate-pulse" />
          <div>
            <span className="block text-[9px] text-slate-450 uppercase font-bold">Vencidas</span>
            <span className="font-extrabold text-rose-600">{metrics.atrasadas} tareas</span>
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Buscar por WBS, tarea, observaciones..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-700 rounded-xl py-2 pl-9 pr-4 text-xs focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none w-full transition"
            />
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-2 text-xs font-bold rounded-xl transition flex items-center space-x-1.5 border ${
                showFilters 
                  ? 'bg-slate-900 text-white border-slate-900' 
                  : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filtros Avanzados</span>
              {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {(searchText || filterEstado || filterResponsable || filterDisciplina || filterEtapa || filterPrioridad || filterCritica) && (
              <button
                onClick={handleResetFilters}
                className="px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 rounded-xl border border-rose-100 transition"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Advanced Filters section */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3 pt-3 border-t border-slate-100 text-xs">
                {/* Estado */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Estado</label>
                  <select
                    value={filterEstado}
                    onChange={(e) => setFilterEstado(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 outline-none text-slate-700"
                  >
                    <option value="">Todos</option>
                    <option value="No Iniciada">No Iniciada</option>
                    <option value="En Curso">En Curso</option>
                    <option value="Pausada">Pausada</option>
                    <option value="Completada">Completada</option>
                    <option value="Cancelada">Cancelada</option>
                  </select>
                </div>

                {/* Responsable */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Responsable</label>
                  <select
                    value={filterResponsable}
                    onChange={(e) => setFilterResponsable(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 outline-none text-slate-700"
                  >
                    <option value="">Todos</option>
                    {project.responsables.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                {/* Disciplina */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Disciplina</label>
                  <select
                    value={filterDisciplina}
                    onChange={(e) => setFilterDisciplina(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 outline-none text-slate-700"
                  >
                    <option value="">Todos</option>
                    {project.disciplinas.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {/* Etapa */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Etapa</label>
                  <select
                    value={filterEtapa}
                    onChange={(e) => setFilterEtapa(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 outline-none text-slate-700"
                  >
                    <option value="">Todos</option>
                    {project.etapas.map(et => (
                      <option key={et} value={et}>{et}</option>
                    ))}
                  </select>
                </div>

                {/* Prioridad */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Prioridad</label>
                  <select
                    value={filterPrioridad}
                    onChange={(e) => setFilterPrioridad(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 outline-none text-slate-700"
                  >
                    <option value="">Todos</option>
                    <option value="Alta">Alta</option>
                    <option value="Media">Media</option>
                    <option value="Baja">Baja</option>
                  </select>
                </div>

                {/* Crítica */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ruta Crítica</label>
                  <select
                    value={filterCritica}
                    onChange={(e) => setFilterCritica(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 outline-none text-slate-700"
                  >
                    <option value="">Todos</option>
                    <option value="Sí">Sí</option>
                    <option value="No">No</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Activities Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {sortedActivities.length === 0 ? (
          <div className="text-center py-16 px-4">
            <CheckCircle2 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-700">Sin actividades para mostrar</h4>
            <p className="text-slate-400 text-xs mt-1">Pruebe modificando los filtros o agregue una nueva actividad.</p>
          </div>
        ) : (
          <div className="overflow-auto max-h-[calc(100vh-380px)] min-h-[350px]">
            <table className="w-full text-left border-collapse text-[11px] whitespace-nowrap table-fixed">
              <thead>
                <tr className="bg-slate-900 text-slate-200 border-b border-slate-800 uppercase tracking-wider font-bold">
                  {/* Sorting columns */}
                  <th className="p-3 cursor-pointer select-none hover:text-white transition sticky top-0 left-0 z-30 bg-slate-900 w-[70px] min-w-[70px] max-w-[70px]" onClick={() => handleSort('wbs')}>
                    <div className="flex items-center space-x-1">
                      <span>WBS</span>
                      {sortField === 'wbs' && (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-sky-400" /> : <ChevronDown className="w-3.5 h-3.5 text-sky-400" />)}
                    </div>
                  </th>
                  <th className="p-3 sticky top-0 left-[70px] z-30 bg-slate-900 w-[80px] min-w-[80px] max-w-[80px]">Tipo</th>
                  <th className="p-3 sticky top-0 left-[150px] z-30 bg-slate-900 w-[240px] min-w-[240px] max-w-[240px]">Tarea / Entregable</th>
                  <th className="p-3 sticky top-0 left-[390px] z-30 bg-slate-900 w-[110px] min-w-[110px] max-w-[110px] border-r-2 border-slate-700">Disciplina</th>
                  <th className="p-3 sticky top-0 z-20 bg-slate-900 w-[120px] min-w-[120px]">Etapa</th>
                  <th className="p-3 sticky top-0 z-20 bg-slate-900 w-[120px] min-w-[120px]">Responsable</th>
                  <th className="p-3 sticky top-0 z-20 bg-slate-900 w-[60px] min-w-[60px] text-center">Crítica</th>
                  <th className="p-3 sticky top-0 z-20 bg-slate-900 w-[80px] min-w-[80px]">Prioridad</th>
                  <th className="p-3 sticky top-0 z-20 bg-slate-900 w-[100px] min-w-[100px]">Estado</th>
                  <th className="p-3 cursor-pointer select-none hover:text-white transition sticky top-0 z-20 bg-slate-900 w-[100px] min-w-[100px]" onClick={() => handleSort('inicioPlanificado')}>
                    <div className="flex items-center space-x-1">
                      <span>Inicio Plan</span>
                      {sortField === 'inicioPlanificado' && (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-sky-400" /> : <ChevronDown className="w-3.5 h-3.5 text-sky-400" />)}
                    </div>
                  </th>
                  <th className="p-3 cursor-pointer select-none hover:text-white transition sticky top-0 z-20 bg-slate-900 w-[100px] min-w-[100px]" onClick={() => handleSort('finPlanificado')}>
                    <div className="flex items-center space-x-1">
                      <span>Fin Plan</span>
                      {sortField === 'finPlanificado' && (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-sky-400" /> : <ChevronDown className="w-3.5 h-3.5 text-sky-400" />)}
                    </div>
                  </th>
                  <th className="p-3 text-center sticky top-0 z-20 bg-slate-900 w-[80px] min-w-[80px]">Dur. Plan</th>
                  <th className="p-3 sticky top-0 z-20 bg-slate-900 w-[100px] min-w-[100px]">Inicio Real</th>
                  <th className="p-3 sticky top-0 z-20 bg-slate-900 w-[100px] min-w-[100px]">Fin Real</th>
                  <th className="p-3 text-center sticky top-0 z-20 bg-slate-900 w-[80px] min-w-[80px]">Dur. Real</th>
                  <th className="p-3 text-center sticky top-0 z-20 bg-slate-900 w-[70px] min-w-[70px]">Atraso</th>
                  {currentUserRole === 'Empresa' && (
                    <>
                      <th className="p-3 cursor-pointer select-none hover:text-white transition text-right sticky top-0 z-20 bg-slate-900 w-[110px] min-w-[110px]" onClick={() => handleSort('valorTarea')}>
                        <div className="flex items-center justify-end space-x-1">
                          <span>Monto Tarea</span>
                          {sortField === 'valorTarea' && (sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-sky-400" /> : <ChevronDown className="w-3.5 h-3.5 text-sky-400" />)}
                        </div>
                      </th>
                      <th className="p-3 text-right sticky top-0 z-20 bg-slate-900 w-[100px] min-w-[100px]">Avance % Valor</th>
                    </>
                  )}
                  <th className="p-3 text-center sticky top-0 z-20 bg-slate-900 w-[90px] min-w-[90px]">Entregables</th>
                  <th className="p-3 text-center sticky top-0 z-20 bg-slate-900 w-[90px] min-w-[90px]">Avance Plan</th>
                  <th className="p-3 text-center sticky top-0 z-20 bg-slate-900 w-[120px] min-w-[120px]">Avance Real</th>
                  <th className="p-3 sticky top-0 z-20 bg-slate-900 w-[180px] min-w-[180px]">Observaciones</th>
                  <th className="p-3 text-center sticky top-0 z-20 bg-slate-900 w-[80px] min-w-[80px]">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700 font-sans">
                 {sortedActivities.map((a) => {
                  const isTitle = a.tipoRegistro === 'Título';
                  const isHito = a.tipoRegistro === 'Hito';
                  const isCritical = a.critica === 'Sí';
                  const isCompleted = a.estado === 'Completada';
                  const isOverdue = a.atrasoDias > 0 && !isCompleted && a.estado !== 'Cancelada';
                  
                  let rowClass = "group bg-white hover:bg-slate-100 transition-colors border-b border-slate-150";
                  let stickyBgClass = "bg-white group-hover:bg-slate-100";
                  
                  if (isTitle) {
                    rowClass = "group bg-slate-100 font-extrabold text-slate-900 border-b-2 border-slate-300 transition-colors";
                    stickyBgClass = "bg-slate-100 group-hover:bg-slate-200";
                  } else if (isHito) {
                    rowClass = "group bg-purple-50 hover:bg-purple-100 font-semibold text-purple-950 border-b border-purple-100 border-l-4 border-purple-400 transition-colors";
                    stickyBgClass = "bg-purple-50 group-hover:bg-purple-100";
                  } else if (isCritical) {
                    rowClass += " bg-red-50 font-medium";
                    stickyBgClass = "bg-red-50 group-hover:bg-red-100";
                  } else if (isCompleted) {
                    rowClass += " bg-emerald-50";
                    stickyBgClass = "bg-emerald-50 group-hover:bg-emerald-100";
                  }

                  return (
                    <tr 
                      key={a.id} 
                      className={rowClass}
                    >
                      {/* WBS */}
                      <td className={`p-3 font-mono font-bold text-slate-500 sticky left-0 z-20 w-[70px] min-w-[70px] max-w-[70px] truncate transition-colors ${stickyBgClass}`}>
                        {a.wbs}
                      </td>

                      {/* Tipo */}
                      <td className={`p-3 sticky left-[70px] z-20 w-[80px] min-w-[80px] max-w-[80px] truncate transition-colors ${stickyBgClass}`}>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          a.tipoRegistro === 'Hito' ? 'bg-purple-100 text-purple-700' :
                          a.tipoRegistro === 'Título' ? 'bg-slate-200 text-slate-800' :
                          a.tipoRegistro === 'Subtarea' ? 'bg-sky-50 text-sky-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {a.tipoRegistro}
                        </span>
                      </td>

                      {/* Tarea Name */}
                      <td className={`p-3 font-bold text-slate-800 sticky left-[150px] z-20 w-[240px] min-w-[240px] max-w-[240px] truncate transition-colors ${stickyBgClass}`} title={a.tarea}>
                        <div className="flex items-center space-x-1.5 truncate">
                          {isCritical && <Flag className="w-3.5 h-3.5 text-rose-500 shrink-0 fill-rose-500" />}
                          <span className={`${a.tipoRegistro === 'Título' ? 'text-slate-900 font-extrabold text-xs' : ''} truncate`}>{a.tarea}</span>
                        </div>
                      </td>

                      {/* Disciplina */}
                      <td className={`p-3 font-semibold text-slate-600 sticky left-[390px] z-20 w-[110px] min-w-[110px] max-w-[110px] truncate border-r-2 border-slate-300 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.12)] transition-colors ${stickyBgClass}`}>
                        {a.disciplina}
                      </td>

                      {/* Etapa */}
                      <td className="p-3 text-slate-500 font-medium truncate" title={a.etapa}>{a.etapa}</td>

                      {/* Responsable */}
                      <td className="p-3 font-medium text-slate-700 truncate" title={a.responsable}>{a.responsable}</td>

                      {/* Crítica */}
                      <td className="p-3 text-center">
                        <span className={`font-bold px-1.5 py-0.5 rounded text-[9px] ${
                          isCritical ? 'bg-rose-100 text-rose-700' : 'text-slate-400'
                        }`}>
                          {a.critica}
                        </span>
                      </td>

                      {/* Prioridad */}
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          a.prioridad === 'Alta' ? 'bg-red-50 text-red-600' :
                          a.prioridad === 'Media' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                        }`}>
                          {a.prioridad}
                        </span>
                      </td>

                      {/* Estado */}
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          a.estado === 'Completada' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                          a.estado === 'En Curso' ? 'bg-sky-100 text-sky-800 border border-sky-200' :
                          a.estado === 'Pausada' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                          a.estado === 'Cancelada' ? 'bg-red-100 text-red-800 border border-red-200' :
                          'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {a.estado}
                        </span>
                      </td>

                      {/* Inicio Planificado */}
                      <td className="p-3 text-slate-500 font-mono">{formatearFecha(a.inicioPlanificado)}</td>

                      {/* Fin Planificado */}
                      <td className="p-3 text-slate-500 font-mono">{formatearFecha(a.finPlanificado)}</td>

                      {/* Duración Planificada */}
                      <td className="p-3 text-center font-bold">{a.duracionPlanificada} d</td>

                      {/* Inicio Real */}
                      <td className="p-3 font-mono text-slate-500">{formatearFecha(a.inicioReal)}</td>

                      {/* Fin Real */}
                      <td className="p-3 font-mono text-slate-500">{formatearFecha(a.finReal)}</td>

                      {/* Duración Real */}
                      <td className="p-3 text-center font-bold text-slate-600">
                        {a.duracionReal ? `${a.duracionReal} d` : '-'}
                      </td>

                      {/* Atraso */}
                      <td className="p-3 text-center font-mono">
                        {isOverdue ? (
                          <span className="bg-rose-100 text-rose-700 font-extrabold px-1.5 py-0.5 rounded text-[10px]">
                            +{a.atrasoDias} d
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-bold">0</span>
                        )}
                      </td>

                      {/* Valor Tarea & Avance % Valor conditionally rendered */}
                      {currentUserRole === 'Empresa' && (
                        <>
                          <td className="p-3 text-right font-bold text-slate-800">
                            {formatearMoneda(a.valorTarea, project.moneda)}
                          </td>
                          <td className="p-3 text-right text-slate-500 font-semibold">
                            {formatearPorcentaje(a.avancePorcentajeValor)}
                          </td>
                        </>
                      )}

                      {/* Entregables */}
                      <td className="p-3 text-center">
                        <span className={`font-semibold px-2 py-0.5 rounded ${
                          a.entregables === 'Sí' ? 'bg-sky-50 text-sky-600 font-bold border border-sky-100' : 'text-slate-400'
                        }`}>
                          {a.entregables}
                        </span>
                      </td>

                      {/* Avance Planificado */}
                      <td className="p-3 text-center font-bold text-sky-600 font-mono">
                        {a.avancePlanificado}%
                      </td>

                      {/* Avance Real */}
                      <td className="p-3">
                        <div className="flex items-center space-x-2">
                          <span className={`font-bold font-mono min-w-[32px] text-right ${
                            isCompleted ? 'text-emerald-600' : a.avanceReal > 50 ? 'text-slate-800' : 'text-slate-500'
                          }`}>
                            {a.avanceReal}%
                          </span>
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden shrink-0">
                            <div 
                              className={`h-full rounded-full ${
                                isCompleted ? 'bg-emerald-500' : a.estado === 'Pausada' ? 'bg-amber-400' : 'bg-sky-500'
                              }`}
                              style={{ width: `${a.avanceReal}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Observaciones */}
                      <td className="p-3 text-slate-500 truncate max-w-[150px]" title={a.observaciones || '-'}>
                        {a.observaciones || '-'}
                      </td>

                      {/* Acciones */}
                      <td className="p-3 text-center">
                        {currentUserRole !== 'Cliente' ? (
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              onClick={() => onEdit(a)}
                              className="p-1 text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded transition"
                              title="Editar"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(a.id)}
                              className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[10px]">Solo Lectura</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal (Portal-like AnimatePresence) */}
      <AnimatePresence>
        {confirmDeleteId && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full border border-slate-200 shadow-2xl text-center"
            >
              <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4" />
              <h3 className="font-bold text-slate-800 text-lg">¿Eliminar Actividad?</h3>
              <p className="text-slate-500 text-xs mt-2 leading-relaxed">
                Esta acción eliminará de forma irreversible la actividad, sus ponderaciones presupuestarias vinculadas y sus registros de costo directo asociados del sistema.
              </p>
              
              <div className="flex items-center justify-center space-x-3 mt-6">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl transition shadow-md shadow-rose-500/10"
                >
                  Sí, Eliminar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

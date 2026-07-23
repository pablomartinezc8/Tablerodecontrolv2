import React, { useState, useEffect } from 'react';
import { Project, Activity } from '../types';
import { calcularDuracion, calcularAvancePlanificado, calcularAtrasoDias } from '../utils/projectCalculations';
import { Save, RotateCcw, AlertCircle, Info, CalendarCheck } from 'lucide-react';
import { formatearMoneda } from '../utils/formato';

interface ActivityFormProps {
  project: Project;
  editingActivity?: Activity | null;
  onSaveActivity: (activity: Activity) => void;
  onCancel: () => void;
  fechaCorte: string;
  currentUserRole?: string;
}

export default function ActivityForm({
  project,
  editingActivity,
  onSaveActivity,
  onCancel,
  fechaCorte,
  currentUserRole
}: ActivityFormProps) {
  const isEditing = Boolean(editingActivity);

  // Helper to safely obtain initial state from editingActivity or fallback
  const getInitialValue = <T,>(editVal: T | undefined | null, defaultVal: T): T => {
    if (editVal !== undefined && editVal !== null && editVal !== '') return editVal;
    return defaultVal;
  };

  // Input form state variables initialized directly from editingActivity or defaults
  const [wbs, setWbs] = useState(() => getInitialValue(editingActivity?.wbs, ''));
  const [tipoRegistro, setTipoRegistro] = useState<'Título' | 'Tarea' | 'Subtarea' | 'Hito'>(
    () => getInitialValue(editingActivity?.tipoRegistro, 'Tarea')
  );
  const [tarea, setTarea] = useState(() => getInitialValue(editingActivity?.tarea, ''));
  const [disciplina, setDisciplina] = useState(() => getInitialValue(editingActivity?.disciplina, project.disciplinas[0] || 'GENERAL'));
  const [etapa, setEtapa] = useState(() => getInitialValue(editingActivity?.etapa, project.etapas[0] || 'GENERAL'));
  const [responsable, setResponsable] = useState(() => getInitialValue(editingActivity?.responsable, project.responsables[0] || ''));
  const [critica, setCritica] = useState<'Sí' | 'No'>(() => getInitialValue(editingActivity?.critica, 'No'));
  const [prioridad, setPrioridad] = useState<'Alta' | 'Media' | 'Baja'>(() => getInitialValue(editingActivity?.prioridad, 'Media'));
  const [estado, setEstado] = useState<'No Iniciada' | 'En Curso' | 'Pausada' | 'Completada' | 'Cancelada'>(
    () => getInitialValue(editingActivity?.estado, 'No Iniciada')
  );
  const [inicioPlanificado, setInicioPlanificado] = useState(() => getInitialValue(editingActivity?.inicioPlanificado, fechaCorte || '2026-07-17'));
  const [finPlanificado, setFinPlanificado] = useState(() => getInitialValue(editingActivity?.finPlanificado, fechaCorte || '2026-08-17'));

  const [inicioReal, setInicioReal] = useState(() => 
    editingActivity ? (editingActivity.inicioReal || editingActivity.inicioPlanificado) : (fechaCorte || '2026-07-17')
  );
  const [finReal, setFinReal] = useState(() => 
    editingActivity ? (editingActivity.finReal || editingActivity.finPlanificado) : (fechaCorte || '2026-08-17')
  );

  const [valorTarea, setValorTarea] = useState<number>(() => getInitialValue(editingActivity?.valorTarea, 0));
  const [entregables, setEntregables] = useState<'Sí' | 'No'>(() => getInitialValue(editingActivity?.entregables, 'No'));
  const [observaciones, setObservaciones] = useState(() => getInitialValue(editingActivity?.observaciones, ''));
  const [avanceReal, setAvanceReal] = useState<number>(() => getInitialValue(editingActivity?.avanceReal, 0));
  
  const [error, setError] = useState('');

  // Update form fields if editingActivity changes while component is mounted
  useEffect(() => {
    if (editingActivity) {
      setWbs(editingActivity.wbs);
      setTipoRegistro(editingActivity.tipoRegistro);
      setTarea(editingActivity.tarea);
      setDisciplina(editingActivity.disciplina);
      setEtapa(editingActivity.etapa);
      setResponsable(editingActivity.responsable);
      setCritica(editingActivity.critica);
      setPrioridad(editingActivity.prioridad);
      setEstado(editingActivity.estado);
      setInicioPlanificado(editingActivity.inicioPlanificado);
      setFinPlanificado(editingActivity.finPlanificado);

      setInicioReal(editingActivity.inicioReal || editingActivity.inicioPlanificado);
      setFinReal(editingActivity.finReal || editingActivity.finPlanificado);

      setValorTarea(editingActivity.valorTarea || 0);
      setEntregables(editingActivity.entregables);
      setObservaciones(editingActivity.observaciones || '');
      setAvanceReal(editingActivity.avanceReal || 0);
    }
    setError('');
  }, [editingActivity]);

  // Adjust Hitos automatically
  useEffect(() => {
    if (tipoRegistro === 'Hito') {
      setValorTarea(0);
      setFinPlanificado(inicioPlanificado);
    } else if (tipoRegistro === 'Título') {
      setValorTarea(0);
    }
  }, [tipoRegistro]);

  // Live Calculated Read-Only Fields
  const duracionPlanificada = calcularDuracion(inicioPlanificado, finPlanificado);
  const duracionReal = (inicioReal && finReal) ? calcularDuracion(inicioReal, finReal) : 0;
  const atrasoDias = calcularAtrasoDias(finPlanificado, finReal || undefined, estado, fechaCorte);
  const avancePlanificado = calcularAvancePlanificado(inicioPlanificado, finPlanificado, fechaCorte);

  const handleReset = () => {
    setWbs('');
    setTipoRegistro('Tarea');
    setTarea('');
    setDisciplina(project.disciplinas[0] || 'GENERAL');
    setEtapa(project.etapas[0] || 'GENERAL');
    setResponsable(project.responsables[0] || '');
    setCritica('No');
    setPrioridad('Media');
    setEstado('No Iniciada');
    setInicioPlanificado('2026-07-17');
    setFinPlanificado('2026-08-17');
    setInicioReal('');
    setFinReal('');
    setValorTarea(0);
    setEntregables('No');
    setObservaciones('');
    setAvanceReal(0);
    setError('');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validations
    if (!wbs.trim()) {
      setError('El WBS es obligatorio.');
      return;
    }
    if (!tarea.trim()) {
      setError('La descripción o nombre de la tarea es obligatoria.');
      return;
    }
    if (new Date(finPlanificado) < new Date(inicioPlanificado)) {
      setError('La fecha de fin planificado no puede ser menor a la fecha de inicio.');
      return;
    }
    if (inicioReal && finReal && new Date(finReal) < new Date(inicioReal)) {
      setError('La fecha de fin real no puede ser menor a la fecha de inicio real.');
      return;
    }
    if (avanceReal < 0 || avanceReal > 100) {
      setError('El avance real debe ser un porcentaje entre 0 y 100.');
      return;
    }
    if (valorTarea < 0) {
      setError('El valor de la tarea no puede ser un monto negativo.');
      return;
    }

    const savedActivity: Activity = {
      id: editingActivity ? editingActivity.id : `act-${Date.now()}`,
      idProyecto: project.idProyecto,
      wbs: wbs.trim(),
      tipoRegistro,
      tarea: tarea.trim(),
      disciplina,
      etapa,
      responsable,
      critica,
      prioridad,
      estado,
      inicioPlanificado,
      finPlanificado,
      duracionPlanificada,
      inicioReal: inicioReal || undefined,
      finReal: finReal || undefined,
      duracionReal: duracionReal || undefined,
      atrasoDias,
      valorTarea: Number(valorTarea),
      avancePorcentajeValor: 0, // Will be calculated by storage / list
      entregables,
      observaciones: observaciones.trim(),
      avancePlanificado,
      avanceReal: Number(avanceReal),
      createdAt: editingActivity ? editingActivity.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSaveActivity(savedActivity);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden select-none">
      <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <CalendarCheck className="w-5 h-5 text-indigo-400" />
          <div>
            <h3 className="font-bold text-base">{isEditing ? 'Editar Actividad' : 'Nueva Actividad'}</h3>
            <p className="text-xs text-slate-400">Pta. Clasificación • Configuración detallada</p>
          </div>
        </div>
        <span className="text-xs bg-slate-800 text-slate-300 font-mono py-1 px-2 rounded-md border border-slate-700">
          Referencia: {project.codigoContrato}
        </span>
      </div>

      <form onSubmit={handleSave} className="p-6 space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-semibold flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Core details */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">WBS *</label>
            <input
              type="text"
              placeholder="Ej: 2.1.3"
              value={wbs}
              onChange={(e) => setWbs(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-2 px-3 text-xs font-bold font-mono outline-none text-slate-800"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tipo Registro *</label>
            <select
              value={tipoRegistro}
              onChange={(e) => setTipoRegistro(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-2 px-3 text-xs outline-none text-slate-800"
            >
              <option value="Título">Título</option>
              <option value="Tarea">Tarea</option>
              <option value="Subtarea">Subtarea</option>
              <option value="Hito">Hito</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Descripción de la Tarea o Hito *</label>
            <input
              type="text"
              placeholder="Ej: Dimensionamiento de bombas de pulpa"
              value={tarea}
              onChange={(e) => setTarea(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-2 px-3 text-xs outline-none text-slate-800"
              required
            />
          </div>
        </div>

        {/* Classifications & Assignee */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Disciplina</label>
            <select
              value={disciplina}
              onChange={(e) => setDisciplina(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-2 px-3 text-xs outline-none text-slate-800"
            >
              {project.disciplinas.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Etapa de Ingeniería</label>
            <select
              value={etapa}
              onChange={(e) => setEtapa(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-2 px-3 text-xs outline-none text-slate-800"
            >
              {project.etapas.map((et) => (
                <option key={et} value={et}>{et}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Responsable</label>
            <select
              value={responsable}
              onChange={(e) => setResponsable(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-2 px-3 text-xs outline-none text-slate-800"
            >
              {project.responsables.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Sujeto a Entregable</label>
            <select
              value={entregables}
              onChange={(e) => setEntregables(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl py-2 px-3 text-xs outline-none text-slate-800"
            >
              <option value="Sí">Sí</option>
              <option value="No">No</option>
            </select>
          </div>
        </div>

        {/* Priorities, critics & weights */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Ruta Crítica</label>
            <select
              value={critica}
              onChange={(e) => setCritica(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl py-2 px-3 text-xs outline-none text-slate-800"
            >
              <option value="Sí">Sí (Resaltar)</option>
              <option value="No">No</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Prioridad</label>
            <select
              value={prioridad}
              onChange={(e) => setPrioridad(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl py-2 px-3 text-xs outline-none text-slate-800"
            >
              <option value="Alta">Alta</option>
              <option value="Media">Media</option>
              <option value="Baja">Baja</option>
            </select>
          </div>

          {currentUserRole !== 'Control de Proyecto' ? (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Monto de Tarea ({project.moneda})</label>
              <input
                type="number"
                min="0"
                disabled={tipoRegistro === 'Hito' || tipoRegistro === 'Título'}
                placeholder="0"
                value={valorTarea}
                onChange={(e) => setValorTarea(Number(e.target.value))}
                className="w-full bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 border border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl py-2 px-3 text-xs outline-none text-slate-800 font-semibold"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Monto de Tarea ({project.moneda})</label>
              <div className="bg-slate-100 border border-slate-200 text-slate-400 font-medium rounded-xl py-2 px-3 text-xs outline-none italic cursor-not-allowed select-none">
                Restringido (Solo Control Técnico)
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Estado de la Tarea</label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl py-2 px-3 text-xs outline-none text-slate-800"
            >
              <option value="No Iniciada">No Iniciada</option>
              <option value="En Curso">En Curso</option>
              <option value="Pausada">Pausada</option>
              <option value="Completada">Completada</option>
              <option value="Cancelada">Cancelada</option>
            </select>
          </div>
        </div>

        {/* Dates timeline plan & real */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Inicio Planificado *</label>
            <input
              type="date"
              value={inicioPlanificado}
              onChange={(e) => setInicioPlanificado(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl py-2 px-3 text-xs outline-none text-slate-800"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Fin Planificado *</label>
            <input
              type="date"
              disabled={tipoRegistro === 'Hito'}
              value={finPlanificado}
              onChange={(e) => setFinPlanificado(e.target.value)}
              className="w-full bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 border border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl py-2 px-3 text-xs outline-none text-slate-800"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Inicio Real</label>
            <input
              type="date"
              disabled={estado === 'No Iniciada'}
              value={inicioReal}
              onChange={(e) => setInicioReal(e.target.value)}
              className="w-full bg-slate-50 disabled:bg-slate-150 disabled:text-slate-400 border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-2 px-3 text-xs outline-none text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Fin Real</label>
            <input
              type="date"
              disabled={estado !== 'Completada'}
              value={finReal}
              onChange={(e) => setFinReal(e.target.value)}
              className="w-full bg-slate-50 disabled:bg-slate-150 disabled:text-slate-400 border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-2 px-3 text-xs outline-none text-slate-800"
            />
          </div>
        </div>

        {/* Live calculated outcomes & Observaciones */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Observaciones</label>
            <textarea
              rows={3}
              placeholder="Anotaciones de ingeniería, pendientes del cliente, o revisiones..."
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-2 px-3 text-xs outline-none text-slate-800 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Avance Real Manual (%)</label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="0"
                max="100"
                disabled={estado === 'Completada' || estado === 'No Iniciada'}
                value={avanceReal}
                onChange={(e) => setAvanceReal(Number(e.target.value))}
                className="w-20 bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-2 px-3 text-xs outline-none text-slate-800 font-bold"
              />
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full" 
                  style={{ width: `${avanceReal}%` }}
                />
              </div>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              {estado === 'Completada' ? 'Autoestablecido en 100%' : estado === 'No Iniciada' ? 'Autoestablecido en 0%' : 'Carga libre autorizada'}
            </span>
          </div>
        </div>

        {/* Calculated summary bar (for visual feedback) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs">
          <div>
            <span className="text-slate-400 block font-bold uppercase tracking-wide text-[9px]">Duración Planificada</span>
            <span className="text-slate-700 font-bold mt-1 block">{duracionPlanificada} {duracionPlanificada === 1 ? 'día' : 'días'}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-bold uppercase tracking-wide text-[9px]">Duración Real</span>
            <span className="text-slate-700 font-bold mt-1 block">
              {duracionReal > 0 ? `${duracionReal} ${duracionReal === 1 ? 'día' : 'días'}` : 'N/A (Faltan fechas)'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block font-bold uppercase tracking-wide text-[9px]">Avance Planificado Quincenal</span>
            <span className="text-indigo-600 font-extrabold mt-1 block">{avancePlanificado}%</span>
          </div>
          <div>
            <span className="text-slate-400 block font-bold uppercase tracking-wide text-[9px]">Atraso del Plazo</span>
            <span className={`font-extrabold mt-1 block ${atrasoDias > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {atrasoDias > 0 ? `+${atrasoDias} días de desvío` : '0 desvíos'}
            </span>
          </div>
        </div>

        {/* Footer controls */}
        <div className="flex items-center justify-end space-x-3 pt-5 border-t border-slate-150">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-slate-150 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition"
          >
            Cancelar
          </button>
          
          {!isEditing && (
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200 font-bold text-xs rounded-xl transition flex items-center space-x-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpiar</span>
            </button>
          )}

          <button
            type="submit"
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition flex items-center space-x-2 shadow-md shadow-indigo-500/10"
          >
            <Save className="w-4 h-4" />
            <span>{isEditing ? 'Actualizar Actividad' : 'Guardar Actividad'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

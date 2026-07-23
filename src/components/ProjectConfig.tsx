import React, { useState } from 'react';
import { Project } from '../types';
import { 
  Settings, Save, Users, Layers, Award, Plus, Trash2, X, Check, HelpCircle,
  Cloud, CloudOff, RefreshCw, UploadCloud, DownloadCloud, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { isFirebaseActive, pushAllToCloud, pullAllFromCloud } from '../utils/firebase';

interface ProjectConfigProps {
  project: Project;
  onUpdateProject: (updatedProj: Project) => void;
  currentUserRole: 'Empresa' | 'Cliente';
}

export default function ProjectConfig({
  project,
  onUpdateProject,
  currentUserRole
}: ProjectConfigProps) {
  // Config form states
  const [nombre, setNombre] = useState(project.nombreProyecto);
  const [descripcion, setDescripcion] = useState(project.descripcion || '');
  const [cliente, setCliente] = useState(project.cliente || '');
  const [moneda, setMoneda] = useState(project.moneda);
  const [utilidad, setUtilidad] = useState(project.utilidadEsperada);
  const [fechaInicio, setFechaInicio] = useState(project.fechaInicioPlan);
  const [fechaFin, setFechaFin] = useState(project.fechaFinPlan);

  // Lists configurations
  const [disciplinas, setDisciplinas] = useState<string[]>(project.disciplinas);
  const [newDisciplina, setNewDisciplina] = useState('');

  const [etapas, setEtapas] = useState<string[]>(project.etapas);
  const [newEtapa, setNewEtapa] = useState('');

  const [responsables, setResponsables] = useState<string[]>(project.responsables);
  const [newResponsable, setNewResponsable] = useState('');

  // Alerts
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Firebase Sync States
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; msg: string } | null>(null);

  const handlePushCloud = async () => {
    setSyncLoading(true);
    setSyncResult(null);
    try {
      const ok = await pushAllToCloud();
      if (ok) {
        setSyncResult({ success: true, msg: '¡Datos locales exportados y sincronizados con Firestore exitosamente!' });
      } else {
        setSyncResult({ success: false, msg: 'Error al exportar. Verifique su conexión y configuración de Firebase.' });
      }
    } catch (e: any) {
      setSyncResult({ success: false, msg: e.message || 'Error inesperado durante la exportación.' });
    } finally {
      setSyncLoading(false);
    }
  };

  const handlePullCloud = async () => {
    if (!window.confirm('¿Está seguro de querer traer los datos desde la nube? Esto reemplazará su base de datos local actual con los datos guardados en Firestore.')) {
      return;
    }
    setSyncLoading(true);
    setSyncResult(null);
    try {
      const ok = await pullAllFromCloud();
      if (ok) {
        setSyncResult({ success: true, msg: '¡Base de datos local actualizada con los datos de Firestore! La aplicación se recargará para aplicar los cambios.' });
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setSyncResult({ success: false, msg: 'Error al importar de la nube. Verifique si ya posee colecciones en Firestore.' });
      }
    } catch (e: any) {
      setSyncResult({ success: false, msg: e.message || 'Error inesperado durante la importación.' });
    } finally {
      setSyncLoading(false);
    }
  };


  // --- CATALOG LISTS HANDLERS ---
  const handleAddDisciplina = () => {
    if (newDisciplina.trim() && !disciplinas.includes(newDisciplina.trim())) {
      setDisciplinas([...disciplinas, newDisciplina.trim()]);
      setNewDisciplina('');
    }
  };

  const handleRemoveDisciplina = (val: string) => {
    setDisciplinas(disciplinas.filter(d => d !== val));
  };

  const handleAddEtapa = () => {
    if (newEtapa.trim() && !etapas.includes(newEtapa.trim())) {
      setEtapas([...etapas, newEtapa.trim()]);
      setNewEtapa('');
    }
  };

  const handleRemoveEtapa = (val: string) => {
    setEtapas(etapas.filter(e => e !== val));
  };

  const handleAddResponsable = () => {
    if (newResponsable.trim() && !responsables.includes(newResponsable.trim())) {
      setResponsables([...responsables, newResponsable.trim()]);
      setNewResponsable('');
    }
  };

  const handleRemoveResponsable = (val: string) => {
    setResponsables(responsables.filter(r => r !== val));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError('');
    setSaveSuccess(false);

    if (!nombre.trim()) {
      setSaveError('El nombre del proyecto es obligatorio.');
      return;
    }
    if (utilidad < 0) {
      setSaveError('La utilidad no puede ser negativa.');
      return;
    }

    const updated: Project = {
      ...project,
      nombreProyecto: nombre.trim(),
      descripcion: descripcion.trim(),
      cliente: cliente.trim(),
      moneda,
      utilidadEsperada: Number(utilidad),
      fechaInicioPlan: fechaInicio,
      fechaFinPlan: fechaFin,
      disciplinas,
      etapas,
      responsables
    };

    onUpdateProject(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 select-none font-sans text-xs">
      {currentUserRole !== 'Empresa' ? (
        <div className="p-8 bg-white rounded-2xl border border-slate-200 shadow-sm text-center">
          <Settings className="w-12 h-12 text-slate-350 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-700">Acceso Restringido a Configuración</h4>
          <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto leading-relaxed">
            Su cuenta de tipo <strong>Cliente</strong> solo posee privilegios de lectura técnica. Las modificaciones de alcance contractual e ingeniería están reservadas al rol de administración de <strong>Empresa</strong>.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* 1. METADATA PROFILE BLOCK */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2 flex items-center space-x-2">
                <Settings className="w-4 h-4 text-indigo-600" />
                <span>Datos de Identificación de Contrato</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nombre Comercial del Proyecto *</label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 outline-none text-slate-800 font-semibold"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Descripción de Alcance</label>
                  <textarea
                    rows={2}
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Escriba el alcance contractual del proyecto..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 outline-none text-slate-800 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Mandante / Cliente</label>
                  <input
                    type="text"
                    value={cliente}
                    onChange={(e) => setCliente(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 outline-none text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Divisa de Costos</label>
                  <select
                    value={moneda}
                    onChange={(e) => setMoneda(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 outline-none text-slate-800 font-bold"
                  >
                    <option value="CLP">CLP (Pesos Chilenos - $)</option>
                    <option value="USD">USD (Dólares Americanos - US$)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Utilidad Comercial Esperada (%)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={utilidad}
                    onChange={(e) => setUtilidad(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 outline-none text-slate-800 font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">F. Inicio Planificado</label>
                    <input
                      type="date"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 outline-none text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">F. Fin Planificado</label>
                    <input
                      type="date"
                      value={fechaFin}
                      onChange={(e) => setFechaFin(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 outline-none text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Status save responses */}
              <AnimatePresence>
                {saveSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-center space-x-2 font-bold"
                  >
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>¡Configuración y catálogos comerciales guardados exitosamente!</span>
                  </motion.div>
                )}
                {saveError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-bold">
                    {saveError}
                  </div>
                )}
              </AnimatePresence>

              <div className="flex items-center justify-end pt-3 border-t border-slate-150">
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl transition flex items-center space-x-1.5 shadow-md shadow-indigo-500/10 text-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </div>

            {/* 2. SPECIFIC PROJECT GUIDANCE NOTE */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3.5">
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Resumen de Contrato</h4>
                <p className="text-slate-400 text-[10px] uppercase tracking-wide">Alcances y ponderaciones financieras</p>
              </div>

              <div className="space-y-3 text-[11px] text-slate-600 leading-relaxed">
                <p>
                  Cualquier variación en la <strong>Utilidad Comercial Esperada</strong> modificará proporcionalmente el monto del contrato de venta, los saldos pendientes por facturar y las certificaciones emitidas que no se encuentren en estado de borrador.
                </p>
                <div className="p-3.5 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100 flex items-start space-x-2">
                  <HelpCircle className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <span>La moneda elegida afectará visualmente la simbología de todos los reportes, KPIs y tableros económicos del proyecto activo.</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. CATALOG DESIGN DIALOG */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Configuración de Catálogos del Proyecto</h3>
              <p className="text-slate-400 text-[10px] mt-0.5">Establezca los valores por defecto disponibles para las actividades y asignaciones</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 border-t border-slate-100">
              
              {/* Disciplinas Catalog */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-slate-800 font-bold border-b border-slate-100 pb-1.5">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>Disciplinas Técnicas</span>
                </div>

                <div className="flex items-center space-x-1.5">
                  <input
                    type="text"
                    placeholder="Ej: Civil-Estructuras"
                    value={newDisciplina}
                    onChange={(e) => setNewDisciplina(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-1.5 outline-none text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={handleAddDisciplina}
                    className="p-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {disciplinas.map(d => (
                    <div key={d} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px]">
                      <span className="font-semibold text-slate-700">{d}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDisciplina(d)}
                        className="text-rose-500 hover:text-rose-700 p-0.5 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Etapas Catalog */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-slate-800 font-bold border-b border-slate-100 pb-1.5">
                  <Award className="w-4 h-4 text-indigo-600" />
                  <span>Etapas / Hitos de Ingeniería</span>
                </div>

                <div className="flex items-center space-x-1.5">
                  <input
                    type="text"
                    placeholder="Ej: Ingeniería Básica"
                    value={newEtapa}
                    onChange={(e) => setNewEtapa(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-1.5 outline-none text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={handleAddEtapa}
                    className="p-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {etapas.map(et => (
                    <div key={et} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px]">
                      <span className="font-semibold text-slate-700">{et}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveEtapa(et)}
                        className="text-rose-500 hover:text-rose-700 p-0.5 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Responsables Catalog */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-slate-800 font-bold border-b border-slate-100 pb-1.5">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span>Responsables de Control</span>
                </div>

                <div className="flex items-center space-x-1.5">
                  <input
                    type="text"
                    placeholder="Ej: Dr. Manuel Soto"
                    value={newResponsable}
                    onChange={(e) => setNewResponsable(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-1.5 outline-none text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={handleAddResponsable}
                    className="p-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {responsables.map(r => (
                    <div key={r} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px]">
                      <span className="font-semibold text-slate-700">{r}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveResponsable(r)}
                        className="text-rose-500 hover:text-rose-700 p-0.5 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div> {/* Closes Catalog Grid */}
          </div> {/* Closes Catalog Design Dialog */}
        </form>

      )}

      {/* 4. FIREBASE CLOUD PERSISTENCE PANEL */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center space-x-2">
            <Cloud className={`w-4 h-4 ${isFirebaseActive() ? 'text-indigo-600' : 'text-slate-400'}`} />
            <h3 className="font-bold text-slate-800 text-sm">Persistencia y Sincronización en la Nube</h3>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
            isFirebaseActive() 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
              : 'bg-amber-50 text-amber-700 border border-amber-100'
          }`}>
            {isFirebaseActive() ? 'Firebase Firestore Activo' : 'Persistencia Local'}
          </span>
        </div>

        {isFirebaseActive() ? (
          <div className="space-y-4">
            <p className="text-slate-500 text-[11px] leading-relaxed">
              La conexión con <strong>Cloud Firestore</strong> está activa. Cada vez que creas, modificas o eliminas un proyecto, actividad, costo directo/indirecto, certificación o base de conocimiento, los cambios se replican automáticamente en la nube en segundo plano de manera segura.
            </p>

            <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-indigo-800 space-y-2">
              <h4 className="font-bold text-[11px] flex items-center space-x-1">
                <span>Colecciones Activas en Firestore:</span>
              </h4>
              <ul className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px] font-semibold text-indigo-700">
                <li className="flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                  <span>projects</span>
                </li>
                <li className="flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                  <span>activities</span>
                </li>
                <li className="flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                  <span>costs_direct</span>
                </li>
                <li className="flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                  <span>costs_indirect</span>
                </li>
                <li className="flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                  <span>certifications</span>
                </li>
                <li className="flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                  <span>progress</span>
                </li>
                <li className="flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                  <span>knowledge_base</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={handlePushCloud}
                disabled={syncLoading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3.5 py-2 rounded-xl transition flex items-center space-x-1.5 shadow-sm text-[11px] disabled:opacity-50"
              >
                {syncLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <UploadCloud className="w-3.5 h-3.5" />
                )}
                <span>Exportar Datos Locales a la Nube</span>
              </button>

              <button
                type="button"
                onClick={handlePullCloud}
                disabled={syncLoading}
                className="bg-white border border-slate-350 hover:bg-slate-50 text-slate-700 font-bold px-3.5 py-2 rounded-xl transition flex items-center space-x-1.5 shadow-sm text-[11px] disabled:opacity-50"
              >
                {syncLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <DownloadCloud className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>Importar Datos de la Nube</span>
              </button>
            </div>

            <AnimatePresence>
              {syncResult && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className={`p-3 rounded-xl font-bold text-[11px] border ${
                    syncResult.success 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  {syncResult.msg}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="space-y-3.5">
            <p className="text-slate-500 text-[11px] leading-relaxed">
              La sincronización en la nube se encuentra deshabilitada temporalmente porque no se han detectado variables de entorno de Firebase. Sus datos se guardan de forma segura en el <strong>almacenamiento local (localStorage)</strong> de su navegador, por lo que persistirán al refrescar, pero podrían perderse si borra la caché o cambia de navegador.
            </p>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-850 flex items-start space-x-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-bold text-[11px]">¿Cómo activar la persistencia ilimitada en la nube?</h4>
                <p className="text-[10px] leading-relaxed text-amber-700">
                  Para guardar todos los registros de forma permanente y poder compartirlos con otros usuarios, configure las siguientes variables de entorno en su despliegue de Vercel o en el panel de Variables de su entorno de desarrollo:
                </p>
                <code className="block bg-amber-100/50 p-2 rounded-lg text-[9px] font-mono text-amber-900 leading-normal border border-amber-200/50 mt-1.5 whitespace-pre">
                  VITE_FIREBASE_API_KEY=tu_api_key{"\n"}
                  VITE_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com{"\n"}
                  VITE_FIREBASE_PROJECT_ID=tu_proyecto_id{"\n"}
                  VITE_FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com{"\n"}
                  VITE_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id{"\n"}
                  VITE_FIREBASE_APP_ID=tu_app_id
                </code>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


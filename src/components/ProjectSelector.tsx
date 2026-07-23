import React, { useState } from 'react';
import { Project, UserRole } from '../types';
import { Briefcase, Calendar, FolderPlus, UserCheck, Search, ClipboardList, Info, ArrowRight, X, Layers, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatearFecha } from '../utils/formato';

interface ProjectSelectorProps {
  projects: Project[];
  onSelectProject: (projectId: string) => void;
  onAddProject: (newProject: Project) => void;
  currentUserRole: UserRole;
  currentUserId?: string;
  onLogout: () => void;
}

export default function ProjectSelector({
  projects,
  onSelectProject,
  onAddProject,
  currentUserRole,
  onLogout
}: ProjectSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // New Project Form State
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [cliente, setCliente] = useState('');
  const [jefe, setJefe] = useState('');
  const [fechaInicio, setFechaInicio] = useState('2026-07-17');
  const [fechaFin, setFechaFin] = useState('2026-12-31');
  const [descripcion, setDescripcion] = useState('');
  const [moneda, setMoneda] = useState('USD');
  const [utilidad, setUtilidad] = useState(15);
  const [formError, setFormError] = useState('');

  const filteredProjects = projects.filter(p => 
    p.nombreProyecto.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.cliente.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.codigoContrato.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!nombre.trim() || !codigo.trim() || !cliente.trim() || !jefe.trim() || !descripcion.trim()) {
      setFormError('Todos los campos son obligatorios.');
      return;
    }

    if (new Date(fechaFin) < new Date(fechaInicio)) {
      setFormError('La fecha de fin no puede ser menor a la fecha de inicio.');
      return;
    }

    const newId = nombre.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
    if (projects.some(p => p.idProyecto === newId)) {
      setFormError('Ya existe un proyecto con un nombre similar.');
      return;
    }

    const newProj: Project = {
      idProyecto: newId,
      nombreProyecto: nombre,
      codigoContrato: codigo,
      cliente: cliente,
      jefeProyecto: jefe,
      fechaInicioPlan: fechaInicio,
      fechaFinPlan: fechaFin,
      estadoProyecto: 'Planificado',
      descripcion: descripcion,
      fechaUltimaActualizacion: '2026-07-17',
      // Standard configurations loaded automatically
      responsables: ['Pablo Martinez', 'Camila Blanco', 'Roberto Fueyo', 'Juan Aciar', 'Carlos Lorelli', 'Lorena Fiorotto'],
      disciplinas: ['GENERAL', 'PROCESOS', 'MECÁNICA', 'PIPING', 'ELECTRICIDAD', 'INSTRUMENTACIÓN', 'CIVIL', 'HVAC', 'P.MANAGEMENT'],
      etapas: ['GENERAL', 'ING. BÁSICA', 'ING. DETALLE', 'PROCURA', 'CONSTRUCCIÓN'],
      utilidadEsperada: Number(utilidad),
      moneda: moneda,
      frecuenciaCorte: '15 días',
      frecuenciaCertificacion: 'Mensual',
      nombreEmpresa: 'Taging Ingeniería Inteligente',
      nombreComercialApp: 'Taging Control'
    };

    onAddProject(newProj);
    setShowAddForm(false);
    
    // Reset fields
    setNombre('');
    setCodigo('');
    setCliente('');
    setJefe('');
    setFechaInicio('2026-07-17');
    setFechaFin('2026-12-31');
    setDescripcion('');
    setMoneda('USD');
    setUtilidad(15);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none relative">
      {/* Top Header */}
      <header className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shadow-md z-10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-5 relative">
            <svg viewBox="0 0 100 50" className="w-full h-full">
              <polygon points="20,50 80,10 80,50" fill="#4f46e5" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-black tracking-widest leading-none">TAGING</h1>
            <p className="text-[9px] text-slate-400 uppercase tracking-widest leading-none mt-1">Ingeniería Inteligente</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-slate-400">Sesión activa como:</p>
            <div className="flex items-center justify-end space-x-1">
              <span className={`w-2 h-2 rounded-full ${currentUserRole === 'Empresa' ? 'bg-indigo-400' : 'bg-emerald-400'}`} />
              <span className="text-xs font-semibold text-slate-200">{currentUserRole === 'Empresa' ? 'Administrador Empresa' : 'Cliente (Solo Lectura)'}</span>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 transition"
          >
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Seleccionar Proyecto</h2>
            <p className="text-sm text-slate-500 mt-1">
              Elija un proyecto de la lista para acceder al panel de control integral.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Buscar proyecto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white border border-slate-300 text-slate-700 rounded-xl py-2 pl-9 pr-4 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none w-full sm:w-64 transition shadow-sm"
              />
            </div>

            {/* Create Project Button (Empresa only) */}
            {currentUserRole === 'Empresa' && (
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm px-4 py-2 rounded-xl transition flex items-center justify-center space-x-2 shadow-sm shadow-indigo-500/10"
              >
                <FolderPlus className="w-4 h-4" />
                <span>Nuevo Proyecto</span>
              </button>
            )}
          </div>
        </div>

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
            <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700">No se encontraron proyectos</h3>
            <p className="text-slate-400 text-sm mt-1">
              {searchQuery ? 'Pruebe buscando con otros términos o filtros.' : 'No hay proyectos configurados en la plataforma.'}
            </p>
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="text-indigo-600 hover:text-indigo-700 font-semibold text-sm mt-4 underline"
              >
                Limpiar búsqueda
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((proj, idx) => (
              <motion.div
                key={proj.idProyecto}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.4 }}
                whileHover={{ y: -4, boxShadow: '0 12px 20px -8px rgba(0,0,0,0.1)' }}
                className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col h-full cursor-pointer transition-all relative overflow-hidden group shadow-sm"
                onClick={() => onSelectProject(proj.idProyecto)}
              >
                {/* Left accent color bar */}
                <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${
                  proj.estadoProyecto === 'En Curso' ? 'bg-indigo-500' :
                  proj.estadoProyecto === 'Completado' ? 'bg-emerald-500' :
                  proj.estadoProyecto === 'Pausado' ? 'bg-amber-500' : 'bg-slate-400'
                }`} />

                <div className="flex items-start justify-between mb-3 pl-2">
                  <div className="bg-slate-100 text-slate-600 font-mono text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md border border-slate-200">
                    Contrato: {proj.codigoContrato}
                  </div>
                  
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    proj.estadoProyecto === 'En Curso' ? 'bg-indigo-50 text-indigo-600' :
                    proj.estadoProyecto === 'Completado' ? 'bg-emerald-50 text-emerald-600' :
                    proj.estadoProyecto === 'Pausado' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {proj.estadoProyecto}
                  </span>
                </div>

                <div className="pl-2 flex-1">
                  <h3 className="text-lg font-bold text-slate-800 tracking-tight group-hover:text-indigo-600 transition-colors">
                    {proj.nombreProyecto}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium uppercase mt-0.5 tracking-wider">
                    Cliente: <span className="text-slate-700">{proj.cliente}</span>
                  </p>
                  
                  <p className="text-xs text-slate-500 line-clamp-2 mt-3 leading-relaxed">
                    {proj.descripcion}
                  </p>

                  <div className="grid grid-cols-2 gap-4 mt-5 pt-4 border-t border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Jefe Proyecto</span>
                      <div className="flex items-center space-x-1 mt-0.5 text-xs font-semibold text-slate-700">
                        <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{proj.jefeProyecto}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Plazo de Obra</span>
                      <div className="flex items-center space-x-1 mt-0.5 text-xs font-semibold text-slate-700">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{formatearFecha(proj.fechaInicioPlan)} al {formatearFecha(proj.fechaFinPlan)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-indigo-600 font-bold tracking-wide pl-2">
                  <span>Última act.: {formatearFecha(proj.fechaUltimaActualizacion)}</span>
                  <div className="flex items-center space-x-1 group-hover:translate-x-1.5 transition-transform duration-300">
                    <span>Ingresar</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Creation Modal Form (AnimatePresence) */}
      <AnimatePresence>
        {showAddForm && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200"
            >
              <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FolderPlus className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-bold text-lg">Crear Nuevo Proyecto</h3>
                </div>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-slate-400 hover:text-white transition p-1 rounded-lg hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-medium">
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nombre del Proyecto *</label>
                    <input
                      type="text"
                      placeholder="Ej: Planta de Clasificación"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none text-slate-800"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Código o N° Contrato *</label>
                    <input
                      type="text"
                      placeholder="Ej: 2026-2569-16"
                      value={codigo}
                      onChange={(e) => setCodigo(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none text-slate-800"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Cliente *</label>
                    <input
                      type="text"
                      placeholder="Ej: CASPOSO"
                      value={cliente}
                      onChange={(e) => setCliente(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none text-slate-800"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Líder / Jefe de Proyecto *</label>
                    <input
                      type="text"
                      placeholder="Ej: Roberto Fueyo"
                      value={jefe}
                      onChange={(e) => setJefe(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none text-slate-800"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Fecha de Inicio Plan *</label>
                    <input
                      type="date"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none text-slate-800"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Fecha de Finalización Plan *</label>
                    <input
                      type="date"
                      value={fechaFin}
                      onChange={(e) => setFechaFin(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none text-slate-800"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Moneda del Proyecto</label>
                    <select
                      value={moneda}
                      onChange={(e) => setMoneda(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none text-slate-800"
                    >
                      <option value="USD">Dólares Estadounidenses (USD)</option>
                      <option value="ARS">Pesos Argentinos (ARS)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Utilidad Esperada (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={utilidad}
                      onChange={(e) => setUtilidad(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Descripción del Proyecto *</label>
                  <textarea
                    rows={3}
                    placeholder="Escriba un resumen del alcance técnico, etapas principales y objetivos..."
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800 resize-none"
                    required
                  />
                </div>

                <div className="flex items-start space-x-2.5 p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                  <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-indigo-700 leading-relaxed">
                    <strong>Nota técnica:</strong> Al crear el proyecto, el sistema cargará automáticamente un equipo de 6 ingenieros responsables predeterminados, 9 disciplinas de diseño estándar y las 5 etapas de proyecto tradicionales. Podrá personalizar esta configuración en la sección de Configuración dentro de la app.
                  </p>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-150">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-sm rounded-xl transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition shadow-md shadow-indigo-500/10"
                  >
                    Crear Proyecto
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

import React from 'react';
import { Project, UserRole } from '../types';
import TagingLogo from './TagingLogo';
import { 
  BarChart3, CalendarDays, ClipboardList, DollarSign, Award, TrendingUp, 
  Settings, LogOut, ChevronDown, User, ShieldCheck, Briefcase, PlusCircle, Globe, FileSpreadsheet, Printer, Download, Upload, BookOpen, FileText
} from 'lucide-react';
import { motion } from 'motion/react';

interface LayoutProps {
  children: React.ReactNode;
  projects: Project[];
  activeProject: Project | null;
  onSelectProject: (id: string) => void;
  onOpenProjectCreator: () => void;
  currentRole: UserRole;
  onSwitchRole: (role: UserRole) => void;
  onLogout: () => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenPrintReport?: () => void;
  fechaCorte: string;
  onChangeFechaCorte: (newFecha: string) => void;
}

export default function Layout({
  children,
  projects,
  activeProject,
  onSelectProject,
  onOpenProjectCreator,
  currentRole,
  onSwitchRole,
  onLogout,
  activeTab,
  onSelectTab,
  onOpenPrintReport,
  fechaCorte,
  onChangeFechaCorte
}: LayoutProps) {
  
  // Navigation menu definitions
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, roles: ['Empresa', 'Cliente', 'Control de Proyecto'] },
    { id: 'actividades', label: 'Base de Actividades', icon: ClipboardList, roles: ['Empresa', 'Cliente', 'Control de Proyecto'] },
    { id: 'documentos', label: 'Listado de Documentos', icon: FileText, roles: ['Empresa', 'Cliente', 'Control de Proyecto'] },
    { id: 'gantt', label: 'Cronograma Gantt', icon: CalendarDays, roles: ['Empresa', 'Cliente', 'Control de Proyecto'] },
    { id: 'costos', label: 'Control de Costos', icon: DollarSign, roles: ['Empresa'] }, // Hidden for Cliente and Control de Proyecto
    { id: 'certificaciones', label: 'Certificaciones / Cobros', icon: Award, roles: ['Empresa', 'Cliente'] }, // Hidden for Control de Proyecto
    { id: 'progreso', label: 'Curva S de Progreso', icon: TrendingUp, roles: ['Empresa', 'Cliente', 'Control de Proyecto'] },
    { id: 'carga-masiva', label: 'Carga Masiva de Actividades', icon: FileSpreadsheet, roles: ['Empresa', 'Control de Proyecto'] },
    { id: 'base-conocimiento', label: 'Base de Conocimiento', icon: BookOpen, roles: ['Empresa', 'Cliente', 'Control de Proyecto'] },
    { id: 'configuracion', label: 'Configuración Contrato', icon: Settings, roles: ['Empresa'] } // Only Empresa gets config
  ];

  const handleExportData = () => {
    try {
      const data = {
        projects: JSON.parse(localStorage.getItem('taging_projects') || '[]'),
        activities: JSON.parse(localStorage.getItem('taging_activities') || '[]'),
        documents: JSON.parse(localStorage.getItem('taging_documents') || '[]'),
        costs_direct: JSON.parse(localStorage.getItem('taging_costs_direct') || '[]'),
        costs_indirect: JSON.parse(localStorage.getItem('taging_costs_indirect') || '[]'),
        certifications: JSON.parse(localStorage.getItem('taging_certifications') || '[]'),
        progress: JSON.parse(localStorage.getItem('taging_progress') || '[]'),
        knowledge_base: JSON.parse(localStorage.getItem('taging_knowledge_base') || '[]'),
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `respaldo_taging_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error al exportar los datos: ' + err);
    }
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);

        if (!data.projects || !data.activities) {
          alert('El archivo no tiene el formato de respaldo correcto (falta proyectos o actividades).');
          return;
        }

        if (confirm('¿Está seguro de que desea importar este respaldo? Esto reemplazará todos los datos actuales del navegador por los del archivo.')) {
          localStorage.setItem('taging_projects', JSON.stringify(data.projects));
          localStorage.setItem('taging_activities', JSON.stringify(data.activities));
          if (data.documents) localStorage.setItem('taging_documents', JSON.stringify(data.documents));
          if (data.costs_direct) localStorage.setItem('taging_costs_direct', JSON.stringify(data.costs_direct));
          if (data.costs_indirect) localStorage.setItem('taging_costs_indirect', JSON.stringify(data.costs_indirect));
          if (data.certifications) localStorage.setItem('taging_certifications', JSON.stringify(data.certifications));
          if (data.progress) localStorage.setItem('taging_progress', JSON.stringify(data.progress));
          if (data.knowledge_base) localStorage.setItem('taging_knowledge_base', JSON.stringify(data.knowledge_base));

          window.location.reload();
        }
      } catch (err) {
        alert('Error al procesar el archivo JSON: ' + err);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-700 antialiased select-none">
      
      {/* 1. TOP HEADER BANNER BAR */}
      <header className="bg-white text-slate-850 h-16 px-6 flex items-center justify-between border-b border-slate-200 shadow-sm shrink-0 sticky top-0 z-40">
        
        {/* Brand logo */}
        <div className="flex items-center space-x-3">
          <TagingLogo variant="full" theme="light" size="md" />
        </div>

        {/* Global project selector dropdown & calculation cut-off date */}
        <div className="flex items-center space-x-3.5">
          {activeProject && (
            <div className="relative group flex items-center space-x-2">
              <Briefcase className="w-4 h-4 text-indigo-600" />
              <select
                value={activeProject.idProyecto}
                onChange={(e) => onSelectProject(e.target.value)}
                className="bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xs py-1.5 px-3 rounded-xl outline-none border border-slate-200 cursor-pointer transition pr-8 appearance-none min-w-[200px]"
              >
                {projects.map((p) => (
                  <option key={p.idProyecto} value={p.idProyecto}>
                    {p.nombreProyecto}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 pointer-events-none" />
            </div>
          )}

          {currentRole === 'Empresa' && (
            <button
              onClick={onOpenProjectCreator}
              className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-xl border border-slate-200 transition shrink-0"
              title="Crear Nuevo Proyecto"
            >
              <PlusCircle className="w-4 h-4" />
            </button>
          )}

          {activeProject && (
            <div className="relative flex items-center space-x-2 bg-slate-50 border border-slate-200 py-1 px-2.5 rounded-xl text-xs font-semibold shrink-0">
              <CalendarDays className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <div className="flex flex-col text-[8px] leading-none text-slate-400 font-bold uppercase">
                <span>F. de Cálculo</span>
                <input
                  type="date"
                  value={fechaCorte}
                  onChange={(e) => onChangeFechaCorte(e.target.value)}
                  className="bg-transparent border-none text-slate-800 font-extrabold outline-none p-0 h-4 text-[10px] leading-none font-sans cursor-pointer mt-0.5"
                  title="Establezca la fecha de corte para calcular avances y atrasos"
                />
              </div>
            </div>
          )}
        </div>

        {/* Status badges & Logout */}
        <div className="flex items-center space-x-4">
          <div className="hidden md:flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-[10px]">
            <Globe className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-slate-600 font-bold uppercase tracking-wider">
              {activeProject?.moneda === 'CLP' ? 'Pesos Chilenos' : 'Dólares USD'}
            </span>
          </div>

          {onOpenPrintReport && (
            <button
              onClick={onOpenPrintReport}
              className="py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl border border-indigo-200 transition flex items-center space-x-1.5"
              title="Generar e Imprimir Reporte PDF"
            >
              <Printer className="w-4 h-4" />
              <span className="text-[10px] font-bold hidden md:inline">Reporte PDF</span>
            </button>
          )}

          <button
            onClick={onLogout}
            className="p-1.5 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 text-slate-400 rounded-xl border border-slate-200 transition"
            title="Cerrar Sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. SPLIT LAYOUT BODY (Sidebar + Main stage) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Navigation Left Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between p-4 shrink-0 hidden lg:flex">
          
          {/* Top block */}
          <div className="space-y-6">
            
            {/* Active User profile card */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
                  <User className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-800">
                    {currentRole === 'Empresa' ? 'Ing. Director de Control' : currentRole === 'Cliente' ? 'Asesor de Mandante' : 'Planificador Técnico'}
                  </h4>
                  <span className="text-[10px] text-slate-450 block font-semibold mt-0.5">Taging Control</span>
                </div>
              </div>

              {/* Role badge */}
              <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-slate-200">
                <div className="flex items-center space-x-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="text-[9px] text-slate-600 font-black tracking-wider uppercase">{currentRole}</span>
                </div>
                
                {/* Role Switch Shortcut for demo testing */}
                <button
                  onClick={() => onSwitchRole(currentRole === 'Empresa' ? 'Cliente' : currentRole === 'Cliente' ? 'Control de Proyecto' : 'Empresa')}
                  className="text-[9px] text-indigo-600 hover:text-indigo-800 font-bold underline transition"
                  title="Cambiar rol rápido para demostración"
                >
                  Alternar
                </button>
              </div>
            </div>

            {/* Menu options navigation */}
            <nav className="space-y-1">
              <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest pl-3 mb-2">Módulos de Control</span>
              {menuItems.map((item) => {
                const isSelected = activeTab === item.id;
                const isAllowed = item.roles.includes(currentRole);

                if (!isAllowed) return null;

                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isSelected 
                        ? 'bg-indigo-600 text-white font-black shadow-md shadow-indigo-600/15' 
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <item.icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Backup block with Export/Import buttons */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 mb-3">
            <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider text-center">Respaldo de Datos</span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={handleExportData}
                className="flex items-center justify-center space-x-1 py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-850 font-bold rounded-xl border border-slate-200 transition text-[10px]"
                title="Exportar base de datos a archivo JSON"
              >
                <Download className="w-3 h-3 text-indigo-500" />
                <span>Exportar</span>
              </button>
              <label
                className="flex items-center justify-center space-x-1 py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-850 font-bold rounded-xl border border-slate-200 cursor-pointer transition text-[10px]"
                title="Importar base de datos desde archivo JSON"
              >
                <Upload className="w-3 h-3 text-indigo-500" />
                <span>Importar</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportData}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Bottom block: Footer signature */}
          <div className="p-2.5 bg-slate-50 rounded-xl text-center text-[9px] text-slate-400 border border-slate-150">
            <span>Plataforma Control de Gestión • v1.0.0</span>
          </div>
        </aside>

        {/* Main interactive viewport container */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          
          {/* Quick Tab indicators for Mobile screens (hidden on desktop) */}
          <div className="lg:hidden mb-4 bg-white text-slate-800 rounded-2xl p-2 flex items-center justify-between border border-slate-200 text-xs overflow-x-auto gap-2 shadow-sm">
            {menuItems.map((item) => {
              const isSelected = activeTab === item.id;
              const isAllowed = item.roles.includes(currentRole);

              if (!isAllowed) return null;

              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-bold shrink-0 transition-all ${
                    isSelected ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Backup options for mobile/narrow viewports (hidden on desktop) */}
          <div className="lg:hidden mb-4 p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5 self-start sm:self-auto">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div className="text-left">
                <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-wider">Respaldo Total de Datos</h4>
                <p className="text-[9px] text-slate-400 mt-0.5 leading-none">Guarde o restaure la base de datos local completa (todas las tablas)</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 w-full sm:w-auto shrink-0">
              <button
                onClick={handleExportData}
                className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 py-1.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-200 transition text-[10px]"
                title="Exportar base de datos a archivo JSON"
              >
                <Download className="w-3.5 h-3.5 text-indigo-500" />
                <span>Exportar JSON</span>
              </button>
              <label
                className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 py-1.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-200 cursor-pointer transition text-[10px]"
                title="Importar base de datos desde archivo JSON"
              >
                <Upload className="w-3.5 h-3.5 text-indigo-500" />
                <span>Importar JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportData}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Active page children component content inside standard wrapper animation */}
          <motion.div
            key={activeTab + (activeProject?.idProyecto || '')}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {/* Context breadcrumb header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-200 pb-4">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Contrato de Ingeniería • Mandante: {activeProject?.cliente || 'Taging'}
                </span>
                <h2 className="text-xl font-black text-slate-800 tracking-tight mt-0.5">
                  {activeProject?.nombreProyecto}
                </h2>
              </div>

              {/* Mini quick summary info */}
              {activeProject && (
                <div className="flex items-center space-x-3 text-[11px] text-slate-500 font-medium">
                  <div className="bg-white border border-slate-200 p-1.5 px-3 rounded-xl flex items-center space-x-1.5 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Rendimiento Físico: <strong>{(activeProject.avanceFisicoAcumulado ?? 0).toFixed(1)}%</strong></span>
                  </div>
                  
                  <div className="bg-white border border-slate-200 p-1.5 px-3 rounded-xl shadow-sm">
                    <span>Atraso: <strong className={(activeProject.diasAtrasoTotal ?? 0) > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                      {(activeProject.diasAtrasoTotal ?? 0) > 0 ? `+${activeProject.diasAtrasoTotal} d` : '0 d'}
                    </strong></span>
                  </div>
                </div>
              )}
            </div>

            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import SplashScreen from './components/SplashScreen';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ActivityTable from './components/ActivityTable';
import ActivityForm from './components/ActivityForm';
import GanttChart from './components/GanttChart';
import CostsManager from './components/CostsManager';
import CertificationsManager from './components/CertificationsManager';
import ProgressCurve from './components/ProgressCurve';
import ProjectConfig from './components/ProjectConfig';
import CargaMasivaActividades from './components/CargaMasivaActividades';
import DocumentList from './components/DocumentList';
import PrintReportView from './components/PrintReportView';
import KnowledgeBase from './components/KnowledgeBase';
import AIChatbot from './components/AIChatbot';

import { Project, Activity, CostDirect, CostIndirect, Certification, DateCorteProgress, UserRole, ProjectDocument } from './types';
import { 
  initializeStorage, 
  getProjects, saveProjects, 
  getActivities, saveActivities, 
  getCostsDirect, saveCostsDirect, 
  getCostsIndirect, saveCostsIndirect, 
  getCertifications, saveCertifications, 
  getProgress, saveProgress,
  getDocuments, saveDocuments
} from './utils/storage';
import { recalculateProjectMetrics, recalcularActividades, syncActivitiesToCostsDirect } from './utils/projectCalculations';
import { PlusCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { isFirebaseActive, pullAllFromCloud } from './utils/firebase';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [firebaseStatus, setFirebaseStatus] = useState<'inactive' | 'syncing' | 'synced' | 'error'>('inactive');
  
  // Dynamic Calculation Date (Fecha de Corte)
  const [fechaCorte, setFechaCorte] = useState<string>(() => localStorage.getItem('taging_fecha_corte') || '2026-07-17');

  // Data State
  const [projects, setProjectsState] = useState<Project[]>([]);
  const [activities, setActivitiesState] = useState<Activity[]>([]);
  const [documents, setDocumentsState] = useState<ProjectDocument[]>([]);
  const [costsDirect, setCostsDirectState] = useState<CostDirect[]>([]);
  const [costsIndirect, setCostsIndirectState] = useState<CostIndirect[]>([]);
  const [certifications, setCertificationsState] = useState<Certification[]>([]);
  const [progressCuts, setProgressCutsState] = useState<DateCorteProgress[]>([]);

  // Navigation State
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showPrintReport, setShowPrintReport] = useState(false);

  // Activity Form Overlay Modal
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  // Project Creator Overlay Modal
  const [showProjectCreator, setShowProjectCreator] = useState(false);
  const [newProjNombre, setNewProjNombre] = useState('');
  const [newProjDescripcion, setNewProjDescripcion] = useState('');
  const [newProjCliente, setNewProjCliente] = useState('');
  const [newProjMoneda, setNewProjMoneda] = useState<'CLP' | 'USD'>('CLP');
  const [newProjUtilidad, setNewProjUtilidad] = useState(15);
  const [newProjFechaInicio, setNewProjFechaInicio] = useState('2026-05-01');
  const [newProjFechaFin, setNewProjFechaFin] = useState('2026-10-31');
  const [creatorError, setCreatorError] = useState('');

  // 1. Initial Seeding and Loading
  useEffect(() => {
    initializeStorage(); // seed if empty
    
    const runCloudSyncAndLoad = async () => {
      const activeCloud = isFirebaseActive();
      if (activeCloud) {
        setFirebaseStatus('syncing');
        const pulled = await pullAllFromCloud();
        if (pulled) {
          setFirebaseStatus('synced');
        } else {
          setFirebaseStatus('error');
        }
      }

      // Load from local storage (synced or fallback defaults)
      const loadedProjects = getProjects();
      const loadedActivities = getActivities();
      const loadedDocs = getDocuments();
      const loadedCostsDirect = getCostsDirect();
      const loadedCostsIndirect = getCostsIndirect();
      const loadedCertifications = getCertifications();
      const loadedProgressCuts = getProgress();

      const initialActiveId = loadedProjects.length > 0 ? loadedProjects[0].idProyecto : null;
      const initialFechaCorte = localStorage.getItem('taging_fecha_corte') || '2026-07-17';

      // Run recalculator on load for automatic dates & status & progress
      const initialRecalcedActivities = recalcularActividades(loadedActivities, initialFechaCorte);

      if (initialActiveId) {
        const calcResult = recalculateProjectMetrics(
          initialActiveId,
          loadedProjects,
          initialRecalcedActivities,
          loadedCostsDirect,
          loadedCostsIndirect,
          loadedCertifications,
          loadedProgressCuts,
          initialFechaCorte
        );

        const remappedProjects = loadedProjects.map(p => 
          p.idProyecto === initialActiveId ? { ...p, ...calcResult } : p
        );

        setProjectsState(remappedProjects);
        setActiveProjectId(initialActiveId);
      } else {
        setProjectsState(loadedProjects);
      }

      setActivitiesState(initialRecalcedActivities);
      setDocumentsState(loadedDocs);
      setCostsDirectState(loadedCostsDirect);
      setCostsIndirectState(loadedCostsIndirect);
      setCertificationsState(loadedCertifications);
      setProgressCutsState(loadedProgressCuts);
    };

    runCloudSyncAndLoad();
  }, []);


  const activeProject = useMemo(() => {
    return projects.find(p => p.idProyecto === activeProjectId) || null;
  }, [projects, activeProjectId]);

  // 2. Global Sync state and dynamic calculations
  const triggerRecalculations = (
    updatedProjects: Project[],
    updatedActivities: Activity[],
    updatedDirect: CostDirect[],
    updatedIndirect: CostIndirect[],
    updatedCerts: Certification[],
    updatedCuts: DateCorteProgress[],
    targetFechaCorte: string = fechaCorte
  ) => {
    // Run dynamic recalculation on activities before running project metrics
    const recalcedActivities = recalcularActividades(updatedActivities, targetFechaCorte);

    // Automatically sync activities to direct costs!
    const syncedDirect = syncActivitiesToCostsDirect(recalcedActivities, updatedDirect);

    // If activeProject is set, run calculation engine
    if (activeProjectId) {
      const calcResult = recalculateProjectMetrics(
        activeProjectId,
        updatedProjects,
        recalcedActivities,
        syncedDirect,
        updatedIndirect,
        updatedCerts,
        updatedCuts,
        targetFechaCorte
      );

      // Re-map projects to update active metrics
      const remappedProjects = updatedProjects.map(p => 
        p.idProyecto === activeProjectId ? { ...p, ...calcResult } : p
      );

      setProjectsState(remappedProjects);
      saveProjects(remappedProjects);
    } else {
      setProjectsState(updatedProjects);
      saveProjects(updatedProjects);
    }

    setActivitiesState(recalcedActivities);
    saveActivities(recalcedActivities);

    setCostsDirectState(syncedDirect);
    saveCostsDirect(syncedDirect);

    setCostsIndirectState(updatedIndirect);
    saveCostsIndirect(updatedIndirect);

    setCertificationsState(updatedCerts);
    saveCertifications(updatedCerts);

    setProgressCutsState(updatedCuts);
    saveProgress(updatedCuts);
  };

  const handleFechaCorteChange = (newFecha: string) => {
    setFechaCorte(newFecha);
    localStorage.setItem('taging_fecha_corte', newFecha);
    triggerRecalculations(projects, activities, costsDirect, costsIndirect, certifications, progressCuts, newFecha);
  };

  // --- CRUD ACTIONS: ACTIVITIES ---
  const handleAddActivity = (newAct: Activity) => {
    const updated = [...activities, newAct];
    triggerRecalculations(projects, updated, costsDirect, costsIndirect, certifications, progressCuts);
    setShowActivityModal(false);
  };

  const handleEditActivity = (updatedAct: Activity) => {
    const updated = activities.map(a => a.id === updatedAct.id ? updatedAct : a);
    triggerRecalculations(projects, updated, costsDirect, costsIndirect, certifications, progressCuts);
    setShowActivityModal(false);
  };

  const handleDeleteActivity = (id: string) => {
    const updated = activities.filter(a => a.id !== id);
    // Also remove associated direct costs linked to this activity
    const updatedDirect = costsDirect.filter(c => c.idActividad !== id);
    triggerRecalculations(projects, updated, updatedDirect, costsIndirect, certifications, progressCuts);
  };

  // --- CRUD ACTIONS: COSTS ---
  const handleAddDirectCost = (newCost: CostDirect) => {
    let updatedActivities = activities;
    if (newCost.idActividad) {
      updatedActivities = activities.map(a =>
        a.id === newCost.idActividad ? { ...a, valorTarea: newCost.valorTarea } : a
      );
    }
    const updated = [...costsDirect, newCost];
    triggerRecalculations(projects, updatedActivities, updated, costsIndirect, certifications, progressCuts);
  };

  const handleEditDirectCost = (updatedCost: CostDirect) => {
    let updatedActivities = activities;
    if (updatedCost.idActividad) {
      updatedActivities = activities.map(a =>
        a.id === updatedCost.idActividad ? { ...a, valorTarea: updatedCost.valorTarea } : a
      );
    }
    const updated = costsDirect.map(c => c.idCosto === updatedCost.idCosto ? updatedCost : c);
    triggerRecalculations(projects, updatedActivities, updated, costsIndirect, certifications, progressCuts);
  };

  const handleDeleteDirectCost = (id: string) => {
    const updated = costsDirect.filter(c => c.idCosto !== id);
    triggerRecalculations(projects, activities, updated, costsIndirect, certifications, progressCuts);
  };

  const handleAddIndirectCost = (newCost: CostIndirect) => {
    const updated = [...costsIndirect, newCost];
    triggerRecalculations(projects, activities, costsDirect, updated, certifications, progressCuts);
  };

  const handleEditIndirectCost = (updatedCost: CostIndirect) => {
    const updated = costsIndirect.map(c => c.idCostoIndirecto === updatedCost.idCostoIndirecto ? updatedCost : c);
    triggerRecalculations(projects, activities, costsDirect, updated, certifications, progressCuts);
  };

  const handleDeleteIndirectCost = (id: string) => {
    const updated = costsIndirect.filter(c => c.idCostoIndirecto !== id);
    triggerRecalculations(projects, activities, costsDirect, updated, certifications, progressCuts);
  };

  // --- CRUD ACTIONS: CERTIFICATIONS ---
  const handleAddCertification = (newCert: Certification) => {
    const updated = [...certifications, newCert];
    triggerRecalculations(projects, activities, costsDirect, costsIndirect, updated, progressCuts);
  };

  const handleEditCertification = (updatedCert: Certification) => {
    const updated = certifications.map(c => c.idCertificacion === updatedCert.idCertificacion ? updatedCert : c);
    triggerRecalculations(projects, activities, costsDirect, costsIndirect, updated, progressCuts);
  };

  const handleDeleteCertification = (id: string) => {
    const updated = certifications.filter(c => c.idCertificacion !== id);
    triggerRecalculations(projects, activities, costsDirect, costsIndirect, updated, progressCuts);
  };

  // --- CRUD ACTIONS: PROGRESS CUTS ---
  const handleAddProgressCut = (newCut: DateCorteProgress) => {
    const updated = [...progressCuts, newCut];
    triggerRecalculations(projects, activities, costsDirect, costsIndirect, certifications, updated);
  };

  const handleEditProgressCut = (updatedCut: DateCorteProgress) => {
    const updated = progressCuts.map(c => c.idProgreso === updatedCut.idProgreso ? updatedCut : c);
    triggerRecalculations(projects, activities, costsDirect, costsIndirect, certifications, updated);
  };

  const handleDeleteProgressCut = (id: string) => {
    const updated = progressCuts.filter(c => c.idProgreso !== id);
    triggerRecalculations(projects, activities, costsDirect, costsIndirect, certifications, updated);
  };

  // --- CONFIG ACTIONS: PROJECT METADATA ---
  const handleUpdateProject = (updatedProj: Project) => {
    const updated = projects.map(p => p.idProyecto === updatedProj.idProyecto ? updatedProj : p);
    triggerRecalculations(updated, activities, costsDirect, costsIndirect, certifications, progressCuts);
  };

  // --- CREATE NEW PROJECT ---
  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    setCreatorError('');

    if (!newProjNombre.trim()) {
      setCreatorError('El nombre del proyecto es obligatorio.');
      return;
    }

    const newId = `proj-${Date.now()}`;
    const newProj: Project = {
      idProyecto: newId,
      nombreProyecto: newProjNombre.trim(),
      descripcion: newProjDescripcion.trim(),
      cliente: newProjCliente.trim(),
      moneda: newProjMoneda,
      utilidadEsperada: Number(newProjUtilidad),
      fechaInicioPlan: newProjFechaInicio,
      fechaFinPlan: newProjFechaFin,
      estadoProyecto: 'Planificado',
      codigoContrato: `CTR-${Math.floor(Math.random() * 900) + 100}`,
      jefeProyecto: 'Ing. Supervisor Taging',
      fechaUltimaActualizacion: new Date().toISOString().split('T')[0],
      nombreEmpresa: 'Taging Ingeniería',
      nombreComercialApp: 'Control de Contratos',
      frecuenciaCorte: '15 días',
      frecuenciaCertificacion: 'Mensual',
      
      // Default catalogs template for quick utility
      disciplinas: ['Civil', 'Mecánica', 'Estructuras', 'Piping', 'Electricidad', 'Instrumentación'],
      etapas: ['Ingeniería Básica', 'Ingeniería de Detalle', 'Adquisiciones', 'Construcción', 'Precomisionamiento'],
      responsables: ['Ing. Juan Pérez', 'Dra. Ana Gómez', 'Ing. Carlos Solis', 'Mandante Control'],
      
      // Default blank metrics
      avanceFisicoAcumulado: 0,
      diasAtrasoTotal: 0,
      montoPresupuestoBAC: 0,
      montoRealAC: 0,
      montoComprometido: 0,
      montoEAC: 0,
      desvioTotal: 0
    };

    const updatedProjects = [...projects, newProj];
    setProjectsState(updatedProjects);
    saveProjects(updatedProjects);
    setActiveProjectId(newId);
    setShowProjectCreator(false);

    // Reset creator inputs
    setNewProjNombre('');
    setNewProjDescripcion('');
    setNewProjCliente('');
    setNewProjMoneda('CLP');
    setNewProjUtilidad(15);
  };

  // Render trigger modals
  const handleTriggerEditActivity = (act: Activity) => {
    setEditingActivity(act);
    setShowActivityModal(true);
  };

  const handleTriggerAddActivity = () => {
    setEditingActivity(null);
    setShowActivityModal(true);
  };

  const handleSaveDocuments = (updatedDocs: ProjectDocument[]) => {
    setDocumentsState(updatedDocs);
    saveDocuments(updatedDocs);
  };

  // --- ROUTING ACTIVE VIEW RENDERING ---
  const renderActiveView = () => {
    if (!activeProject) {
      return (
        <div className="text-center py-20 bg-white border rounded-2xl">
          <p className="text-slate-400">Cree o seleccione un proyecto activo para comenzar el control.</p>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            project={activeProject}
            activities={activities}
            costsDirect={costsDirect}
            costsIndirect={costsIndirect}
            certifications={certifications}
            progress={progressCuts}
            onNavigateToSection={(tab) => setActiveTab(tab)}
            onOpenPrintReport={() => setShowPrintReport(true)}
            currentUserRole={currentUserRole!}
            fechaCorte={fechaCorte}
            onChangeFechaCorte={handleFechaCorteChange}
          />
        );
      case 'actividades':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Registro Central de Actividades</h3>
                <p className="text-[10px] text-slate-400">Administre el cronograma general de ingeniería del contrato</p>
              </div>
              
              {currentUserRole !== 'Cliente' && (
                <button
                  onClick={handleTriggerAddActivity}
                  className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-3.5 py-2 rounded-xl transition flex items-center space-x-1.5 shadow-md shadow-sky-500/10 text-xs"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Agregar Actividad</span>
                </button>
              )}
            </div>

            <ActivityTable
              project={activeProject}
              activities={activities}
              onEdit={handleTriggerEditActivity}
              onDelete={handleDeleteActivity}
              currentUserRole={currentUserRole!}
              fechaCorte={fechaCorte}
            />
          </div>
        );
      case 'documentos':
        return (
          <DocumentList
            project={activeProject}
            documents={documents}
            onSaveDocuments={handleSaveDocuments}
            currentUserRole={currentUserRole!}
          />
        );
      case 'gantt':
        return <GanttChart project={activeProject} activities={activities} />;
      case 'costos':
        return (
          <CostsManager
            project={activeProject}
            activities={activities}
            costsDirect={costsDirect}
            costsIndirect={costsIndirect}
            onAddDirectCost={handleAddDirectCost}
            onEditDirectCost={handleEditDirectCost}
            onDeleteDirectCost={handleDeleteDirectCost}
            onAddIndirectCost={handleAddIndirectCost}
            onEditIndirectCost={handleEditIndirectCost}
            onDeleteIndirectCost={handleDeleteIndirectCost}
            currentUserRole={currentUserRole!}
          />
        );
      case 'certificaciones':
        return (
          <CertificationsManager
            project={activeProject}
            activities={activities}
            certifications={certifications}
            onAddCertification={handleAddCertification}
            onEditCertification={handleEditCertification}
            onDeleteCertification={handleDeleteCertification}
            currentUserRole={currentUserRole!}
          />
        );
      case 'progreso':
        return (
          <ProgressCurve
            project={activeProject}
            progressCuts={progressCuts}
            onAddProgressCut={handleAddProgressCut}
            onEditProgressCut={handleEditProgressCut}
            onDeleteProgressCut={handleDeleteProgressCut}
            currentUserRole={currentUserRole!}
          />
        );
      case 'carga-masiva':
        return (
          <CargaMasivaActividades
            project={activeProject}
            activities={activities}
            onImportSuccess={(updatedActs) => {
              triggerRecalculations(projects, updatedActs, costsDirect, costsIndirect, certifications, progressCuts);
            }}
            currentUserRole={currentUserRole!}
          />
        );
      case 'configuracion':
        return (
          <ProjectConfig
            project={activeProject}
            onUpdateProject={handleUpdateProject}
            currentUserRole={currentUserRole!}
          />
        );
      case 'base-conocimiento':
        return (
          <KnowledgeBase
            currentUserRole={currentUserRole!}
          />
        );
      default:
        return <div>Vista no implementada</div>;
    }
  };

  // Render transitions
  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  if (!currentUserRole) {
    return <Login onLoginSuccess={(user) => setCurrentUserRole(user.role)} />;
  }

  if (showPrintReport && activeProject) {
    return (
      <PrintReportView
        project={activeProject}
        activities={activities}
        costsDirect={costsDirect}
        costsIndirect={costsIndirect}
        certifications={certifications}
        progress={progressCuts}
        onClose={() => setShowPrintReport(false)}
        currentUserRole={currentUserRole}
      />
    );
  }

  return (
    <div className="relative min-h-screen">
      <Layout
        projects={projects}
        activeProject={activeProject}
        onSelectProject={(id) => setActiveProjectId(id)}
        onOpenProjectCreator={() => setShowProjectCreator(true)}
        currentRole={currentUserRole}
        onSwitchRole={(role) => setCurrentUserRole(role)}
        onLogout={() => setCurrentUserRole(null)}
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        onOpenPrintReport={() => setShowPrintReport(true)}
        fechaCorte={fechaCorte}
        onChangeFechaCorte={handleFechaCorteChange}
      >
        {renderActiveView()}
      </Layout>

      {/* --- OVERLAY GLOBAL MODALS --- */}

      {/* 1. Project Creator Modal Overlay */}
      <AnimatePresence>
        {showProjectCreator && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200"
            >
              <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
                <h4 className="font-bold text-sm">Crear Nuevo Contrato / Proyecto</h4>
                <button onClick={() => setShowProjectCreator(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleCreateProject} className="p-5 space-y-4 text-xs font-sans">
                {creatorError && <div className="p-2.5 bg-red-50 text-red-600 font-bold rounded-lg">{creatorError}</div>}

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nombre del Proyecto *</label>
                  <input
                    type="text"
                    value={newProjNombre}
                    onChange={(e) => setNewProjNombre(e.target.value)}
                    placeholder="Ej: Planta Desaladora Norte"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 outline-none text-slate-800 font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Mandante / Cliente</label>
                  <input
                    type="text"
                    value={newProjCliente}
                    onChange={(e) => setNewProjCliente(e.target.value)}
                    placeholder="Ej: BHP Billiton"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 outline-none text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Moneda del Contrato</label>
                    <select
                      value={newProjMoneda}
                      onChange={(e) => setNewProjMoneda(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 outline-none text-slate-800 font-bold"
                    >
                      <option value="CLP">CLP ($)</option>
                      <option value="USD">USD (US$)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Utilidad Esperada (%)</label>
                    <input
                      type="number"
                      min="0"
                      value={newProjUtilidad}
                      onChange={(e) => setNewProjUtilidad(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 outline-none text-slate-800 font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">F. Inicio Contrato</label>
                    <input
                      type="date"
                      value={newProjFechaInicio}
                      onChange={(e) => setNewProjFechaInicio(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 outline-none text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">F. Término Contrato</label>
                    <input
                      type="date"
                      value={newProjFechaFin}
                      onChange={(e) => setNewProjFechaFin(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 outline-none text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Descripción del Proyecto</label>
                  <textarea
                    rows={2}
                    value={newProjDescripcion}
                    onChange={(e) => setNewProjDescripcion(e.target.value)}
                    placeholder="Descripción resumida..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 outline-none text-slate-800 resize-none"
                  />
                </div>

                <div className="p-3 bg-slate-50 rounded-xl text-[10px] text-slate-500 font-medium leading-relaxed">
                  <strong>Ponderación automática:</strong><br />
                  Se cargará una plantilla estándar de disciplinas (Civil, Piping, Estructuras, Mecánica, Electricidad) para facilitar la estructuración inmediata del cronograma.
                </div>

                <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-150">
                  <button type="button" onClick={() => setShowProjectCreator(false)} className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-xl transition">Cancelar</button>
                  <button type="submit" className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl transition shadow-md shadow-sky-500/10">Crear Contrato</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Activity Creator/Editor Modal Overlay */}
      {showActivityModal && activeProject && (
        <ActivityForm
          project={activeProject}
          editingActivity={editingActivity}
          onSaveActivity={editingActivity ? handleEditActivity : handleAddActivity}
          onCancel={() => setShowActivityModal(false)}
          fechaCorte={fechaCorte}
          currentUserRole={currentUserRole || undefined}
        />
      )}

      {/* 3. AI Chatbot Widget */}
      <AIChatbot activeTab={activeTab} activeProject={activeProject} />
    </div>
  );
}

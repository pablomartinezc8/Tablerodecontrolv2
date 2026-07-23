import React, { useState, useMemo } from 'react';
import { Project, Activity, CostDirect, CostIndirect } from '../types';
import { formatearMoneda, formatearPorcentaje } from '../utils/formato';
import { 
  DollarSign, Calculator, Plus, Edit, Trash2, ShieldAlert, AlertTriangle, 
  TrendingDown, CheckCircle2, X, ClipboardList, Info, HelpCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface CostsManagerProps {
  project: Project;
  activities: Activity[];
  costsDirect: CostDirect[];
  costsIndirect: CostIndirect[];
  onAddDirectCost: (cost: CostDirect) => void;
  onEditDirectCost: (cost: CostDirect) => void;
  onDeleteDirectCost: (id: string) => void;
  onAddIndirectCost: (cost: CostIndirect) => void;
  onEditIndirectCost: (cost: CostIndirect) => void;
  onDeleteIndirectCost: (id: string) => void;
  currentUserRole: 'Empresa' | 'Cliente';
}

export default function CostsManager({
  project,
  activities,
  costsDirect,
  costsIndirect,
  onAddDirectCost,
  onEditDirectCost,
  onDeleteDirectCost,
  onAddIndirectCost,
  onEditIndirectCost,
  onDeleteIndirectCost,
  currentUserRole
}: CostsManagerProps) {
  // Navigation tabs for sub-tables
  const [activeTab, setActiveTab] = useState<'direct' | 'indirect'>('direct');
  
  // Modals state
  const [showDirectModal, setShowDirectModal] = useState(false);
  const [editingDirect, setEditingDirect] = useState<CostDirect | null>(null);

  const [showIndirectModal, setShowIndirectModal] = useState(false);
  const [editingIndirect, setEditingIndirect] = useState<CostIndirect | null>(null);

  // Deletion state
  const [confirmDeleteDirectId, setConfirmDeleteDirectId] = useState<string | null>(null);
  const [confirmDeleteIndirectId, setConfirmDeleteIndirectId] = useState<string | null>(null);

  // --- Modal Input states ---
  // Direct
  const [directIdActividad, setDirectIdActividad] = useState('');
  const [directTarea, setDirectTarea] = useState('');
  const [directUnidad, setDirectUnidad] = useState('GL');
  const [directCantidad, setDirectCantidad] = useState(1);
  const [directPrecioUnit, setDirectPrecioUnit] = useState(0);
  const [directRealAcum, setDirectRealAcum] = useState(0);
  const [directComprometido, setDirectComprometido] = useState(0);

  // Indirect
  const [indirectConcepto, setIndirectConcepto] = useState('');
  const [indirectPresupuesto, setIndirectPresupuesto] = useState(0);
  const [indirectRealAcum, setIndirectRealAcum] = useState(0);
  const [indirectComprometido, setIndirectComprometido] = useState(0);

  const [modalError, setModalError] = useState('');

  // Project filtered lists
  const projectActivities = activities.filter(a => a.idProyecto === project.idProyecto && a.tipoRegistro !== 'Título' && a.tipoRegistro !== 'Hito');
  const projectCostsDirect = costsDirect.filter(c => c.idProyecto === project.idProyecto);
  const projectCostsIndirect = costsIndirect.filter(c => c.idProyecto === project.idProyecto);

  // --- ECONOMIC CALCULATIONS ---
  const directBudget = projectCostsDirect.reduce((acc, c) => acc + (c.valorTarea || 0), 0);
  const directReal = projectCostsDirect.reduce((acc, c) => acc + (c.realAcumulado || 0), 0);
  const directCommitted = projectCostsDirect.reduce((acc, c) => acc + (c.comprometido || 0), 0);
  const directEac = projectCostsDirect.reduce((acc, c) => acc + (c.eac || 0), 0);

  const indirectBudget = projectCostsIndirect.reduce((acc, c) => acc + (c.presupuesto || 0), 0);
  const indirectReal = projectCostsIndirect.reduce((acc, c) => acc + (c.realAcumulado || 0), 0);
  const indirectCommitted = projectCostsIndirect.reduce((acc, c) => acc + (c.comprometido || 0), 0);
  const indirectEac = projectCostsIndirect.reduce((acc, c) => acc + (c.eac || 0), 0);

  const totalBudget = directBudget + indirectBudget;
  const totalReal = directReal + indirectReal;
  const totalCommitted = directCommitted + indirectCommitted;
  const totalEac = directEac + indirectEac;

  const totalDesvio = totalBudget - totalEac;
  const totalPorcentajeEjecutado = totalBudget > 0 ? (totalReal / totalBudget) * 100 : 0;

  // Margin and Contract Amount
  const utilityValue = totalBudget * (project.utilidadEsperada / 100);
  const contractMonto = totalBudget + utilityValue;

  // --- CHARTS PREPARATION ---
  const chartData = [
    {
      name: 'Costos Directos',
      Presupuesto: directBudget,
      Real: directReal,
      Comprometido: directCommitted,
      EAC: directEac
    },
    {
      name: 'Costos Indirectos',
      Presupuesto: indirectBudget,
      Real: indirectReal,
      Comprometido: indirectCommitted,
      EAC: indirectEac
    },
    {
      name: 'Económico Consolidado',
      Presupuesto: totalBudget,
      Real: totalReal,
      Comprometido: totalCommitted,
      EAC: totalEac
    }
  ];

  // --- MODALS HANDLERS ---
  const handleOpenDirect = (cost: CostDirect | null = null) => {
    setModalError('');
    if (cost) {
      setEditingDirect(cost);
      setDirectIdActividad(cost.idActividad || '');
      setDirectTarea(cost.tarea);
      setDirectUnidad(cost.unidad);
      setDirectCantidad(cost.cantidad);
      setDirectPrecioUnit(cost.precioUnitario);
      setDirectRealAcum(cost.realAcumulado);
      setDirectComprometido(cost.comprometido);
    } else {
      setEditingDirect(null);
      setDirectIdActividad('');
      setDirectTarea('');
      setDirectUnidad('GL');
      setDirectCantidad(1);
      setDirectPrecioUnit(0);
      setDirectRealAcum(0);
      setDirectComprometido(0);
    }
    setShowDirectModal(true);
  };

  const handleOpenIndirect = (cost: CostIndirect | null = null) => {
    setModalError('');
    if (cost) {
      setEditingIndirect(cost);
      setIndirectConcepto(cost.concepto);
      setIndirectPresupuesto(cost.presupuesto);
      setIndirectRealAcum(cost.realAcumulado);
      setIndirectComprometido(cost.comprometido);
    } else {
      setEditingIndirect(null);
      setIndirectConcepto('');
      setIndirectPresupuesto(0);
      setIndirectRealAcum(0);
      setIndirectComprometido(0);
    }
    setShowIndirectModal(true);
  };

  // Sync direct cost title and reference when linking to an existing activity
  const handleDirectActChange = (actId: string) => {
    setDirectIdActividad(actId);
    const linkedAct = projectActivities.find(a => a.id === actId);
    if (linkedAct) {
      setDirectTarea(linkedAct.tarea);
      setDirectPrecioUnit(linkedAct.valorTarea);
      setDirectCantidad(1);
    }
  };

  const handleSaveDirect = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');

    if (!directTarea.trim()) {
      setModalError('La descripción o tarea del costo es obligatoria.');
      return;
    }
    if (directCantidad <= 0 || directPrecioUnit < 0 || directRealAcum < 0 || directComprometido < 0) {
      setModalError('Los importes monetarios y cantidades no pueden ser menores a cero.');
      return;
    }

    const linkedAct = projectActivities.find(a => a.id === directIdActividad);
    const valorCalculado = directCantidad * directPrecioUnit;
    const eacCalculado = directRealAcum + directComprometido;

    const savedCost: CostDirect = {
      idCosto: editingDirect ? editingDirect.idCosto : `cd-${Date.now()}`,
      idProyecto: project.idProyecto,
      idActividad: directIdActividad || undefined,
      wbsReferencia: linkedAct ? linkedAct.wbs : undefined,
      tarea: directTarea.trim(),
      unidad: directUnidad,
      cantidad: Number(directCantidad),
      precioUnitario: Number(directPrecioUnit),
      valorTarea: valorCalculado,
      realAcumulado: Number(directRealAcum),
      comprometido: Number(directComprometido),
      eac: eacCalculado,
      desvio: valorCalculado - eacCalculado,
      porcentajeEjecutado: valorCalculado > 0 ? (directRealAcum / valorCalculado) * 100 : 0
    };

    if (editingDirect) {
      onEditDirectCost(savedCost);
    } else {
      onAddDirectCost(savedCost);
    }
    setShowDirectModal(false);
  };

  const handleSaveIndirect = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');

    if (!indirectConcepto.trim()) {
      setModalError('El concepto de costo es obligatorio.');
      return;
    }
    if (indirectPresupuesto < 0 || indirectRealAcum < 0 || indirectComprometido < 0) {
      setModalError('Los importes presupuestados o acumulados no pueden ser negativos.');
      return;
    }

    const eacCalculado = indirectRealAcum + indirectComprometido;

    const savedCost: CostIndirect = {
      idCostoIndirecto: editingIndirect ? editingIndirect.idCostoIndirecto : `ci-${Date.now()}`,
      idProyecto: project.idProyecto,
      concepto: indirectConcepto.trim(),
      presupuesto: Number(indirectPresupuesto),
      realAcumulado: Number(indirectRealAcum),
      comprometido: Number(indirectComprometido),
      eac: eacCalculado,
      desvio: Number(indirectPresupuesto) - eacCalculado,
      porcentajeEjecutado: Number(indirectPresupuesto) > 0 ? (indirectRealAcum / Number(indirectPresupuesto)) * 100 : 0
    };

    if (editingIndirect) {
      onEditIndirectCost(savedCost);
    } else {
      onAddIndirectCost(savedCost);
    }
    setShowIndirectModal(false);
  };

  return (
    <div className="space-y-6 select-none font-sans text-xs">
      {/* 1. TOP ECONOMIC CARD GRID SUMMARY */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Presupuesto BAC</span>
          <h4 className="text-xl font-extrabold text-slate-800 tracking-tight mt-1">{formatearMoneda(totalBudget, project.moneda)}</h4>
          <span className="text-[10px] text-slate-400 mt-2 block">Directo + Indirecto</span>
        </div>
        
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Real Acumulado (AC)</span>
          <h4 className="text-xl font-extrabold text-slate-800 tracking-tight mt-1">{formatearMoneda(totalReal, project.moneda)}</h4>
          <span className="text-[10px] text-emerald-600 font-bold mt-2 block">{formatearPorcentaje(totalPorcentajeEjecutado)} Ejecutado</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Comprometido</span>
          <h4 className="text-xl font-extrabold text-slate-800 tracking-tight mt-1">{formatearMoneda(totalCommitted, project.moneda)}</h4>
          <span className="text-[10px] text-slate-400 mt-2 block">Contratos u OC emitidos</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Proyección EAC</span>
          <h4 className={`text-xl font-extrabold mt-1 tracking-tight ${totalEac > totalBudget ? 'text-rose-600' : 'text-slate-800'}`}>
            {formatearMoneda(totalEac, project.moneda)}
          </h4>
          <span className="text-[10px] text-slate-400 mt-2 block">Costo estimado a término</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between col-span-2 md:col-span-1">
          <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Venta / Margen</span>
          <h4 className="text-xl font-extrabold text-emerald-600 tracking-tight mt-1">{formatearMoneda(contractMonto, project.moneda)}</h4>
          <span className="text-[10px] text-slate-500 mt-2 block font-semibold">Margen: +{project.utilidadEsperada}%</span>
        </div>
      </div>

      {/* 2. ALERTS BAR IF OVERCOST */}
      {totalEac > totalBudget && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl flex items-start space-x-3">
          <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5 animate-bounce" />
          <div>
            <h5 className="font-bold text-xs">Alerta de Desviación de Costos</h5>
            <p className="text-[11px] text-rose-600 leading-relaxed mt-0.5">
              El costo proyectado a término (EAC) supera el presupuesto aprobado en {formatearMoneda(Math.abs(totalDesvio), project.moneda)}. Por favor, revise el comprometido de los subcontratistas o aplique medidas de contingencia económica.
            </p>
          </div>
        </div>
      )}

      {/* 3. CHARTS ROW & INFORMATION BAR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Costs Bar chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h4 className="font-bold text-slate-800 text-sm mb-4">Desglose Gráfico de Costos</h4>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={10}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 9 }} />
                <YAxis tickFormatter={(v) => `$${v/1000}k`} stroke="#94a3b8" tick={{ fontSize: 9 }} />
                <Tooltip formatter={(value) => formatearMoneda(Number(value), project.moneda)} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="Presupuesto" fill="#818cf8" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Real" fill="#f43f5e" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Comprometido" fill="#fbbf24" radius={[3, 3, 0, 0]} />
                <Bar dataKey="EAC" fill="#10b981" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Marginal performance information */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-slate-800 text-sm">Resumen de Rentabilidad</h4>
            <p className="text-slate-400 text-[10px] mt-0.5 uppercase tracking-wide">Ponderación contractual</p>
          </div>

          <div className="space-y-3.5 my-4">
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Costos Directos totales:</span>
              <span className="font-bold text-slate-800">{formatearMoneda(directBudget, project.moneda)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Costos Indirectos totales:</span>
              <span className="font-bold text-slate-800">{formatearMoneda(indirectBudget, project.moneda)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Utilidad teórica prevista:</span>
              <span className="font-bold text-emerald-600">+{formatearMoneda(utilityValue, project.moneda)}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-500 font-medium">Costo Estimado a Cierre (EAC):</span>
              <span className={`font-black ${totalEac > totalBudget ? 'text-rose-600' : 'text-slate-800'}`}>
                {formatearMoneda(totalEac, project.moneda)}
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl flex items-start space-x-2">
            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Monto de contrato ponderado en base al presupuesto inicial ({formatearMoneda(totalBudget, project.moneda)}) + margen de utilidad del {project.utilidadEsperada}%.
            </p>
          </div>
        </div>
      </div>

      {/* 4. TABLES MATRIX SECTION */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Tabs selector row */}
        <div className="bg-slate-900 px-5 py-3 flex items-center justify-between text-white border-b border-slate-800 flex-wrap gap-3">
          <div className="flex items-center space-x-2">
            <Calculator className="w-4 h-4 text-indigo-400" />
            <div className="bg-slate-800 rounded-xl p-0.5 flex border border-slate-700 text-[10px] font-bold uppercase tracking-wider">
              <button
                onClick={() => setActiveTab('direct')}
                className={`px-4 py-1.5 rounded-lg transition-all ${
                  activeTab === 'direct' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                Costos Directos por Actividad ({projectCostsDirect.length})
              </button>
              <button
                onClick={() => setActiveTab('indirect')}
                className={`px-4 py-1.5 rounded-lg transition-all ${
                  activeTab === 'indirect' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                Costos Indirectos y Contingencia ({projectCostsIndirect.length})
              </button>
            </div>
          </div>

          {currentUserRole === 'Empresa' && (
            <button
              onClick={() => activeTab === 'direct' ? handleOpenDirect() : handleOpenIndirect()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-lg transition flex items-center space-x-1 shadow-md shadow-indigo-650/10"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar {activeTab === 'direct' ? 'Costo Actividad' : 'Costo Indirecto'}</span>
            </button>
          )}
        </div>

        {/* Tab content view: Direct Costs */}
        {activeTab === 'direct' && (
          <div className="overflow-auto max-h-[500px]">
            {projectCostsDirect.length === 0 ? (
              <div className="text-center py-16">
                <ClipboardList className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                <h5 className="font-bold text-slate-600">No hay costos directos cargados</h5>
                <p className="text-slate-400">Presione "Agregar Costo Actividad" para asociar presupuestos a su cronograma.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead className="sticky top-0 z-30 bg-slate-100 text-slate-700 font-bold uppercase tracking-wider shadow-sm border-b border-slate-200">
                  <tr>
                    <th className="p-3 sticky top-0 left-0 z-30 bg-slate-100 w-[90px] min-w-[90px]">WBS Ref.</th>
                    <th className="p-3 sticky top-0 left-[90px] z-30 bg-slate-100 w-[220px] min-w-[220px] border-r-2 border-slate-300 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.12)]">Actividad / Tarea</th>
                    <th className="p-3 sticky top-0 z-20 bg-slate-100">Unidad</th>
                    <th className="p-3 text-center sticky top-0 z-20 bg-slate-100">Cantidad</th>
                    <th className="p-3 text-right sticky top-0 z-20 bg-slate-100">P. Unitario</th>
                    <th className="p-3 text-right sticky top-0 z-20 bg-slate-100">Presupuesto BAC</th>
                    <th className="p-3 text-right sticky top-0 z-20 bg-slate-100">Costo Real (AC)</th>
                    <th className="p-3 text-right sticky top-0 z-20 bg-slate-100">Comprometido</th>
                    <th className="p-3 text-right sticky top-0 z-20 bg-slate-100">EAC Proyección</th>
                    <th className="p-3 text-center sticky top-0 z-20 bg-slate-100">Desvío</th>
                    <th className="p-3 text-center sticky top-0 z-20 bg-slate-100">Ejecutado %</th>
                    <th className="p-3 text-center sticky top-0 z-20 bg-slate-100">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {projectCostsDirect.map((c) => {
                    const isOver = c.eac > c.valorTarea;
                    return (
                      <tr key={c.idCosto} className="group hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-mono font-bold text-slate-500 sticky left-0 z-20 bg-white group-hover:bg-slate-50 transition-colors w-[90px] min-w-[90px]">{c.wbsReferencia || '-'}</td>
                        <td className="p-3 font-semibold text-slate-800 truncate max-w-[220px] sticky left-[90px] z-20 bg-white group-hover:bg-slate-50 transition-colors border-r-2 border-slate-300 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.12)]" title={c.tarea}>{c.tarea}</td>
                        <td className="p-3 font-medium text-slate-500">{c.unidad}</td>
                        <td className="p-3 text-center font-bold">{c.cantidad}</td>
                        <td className="p-3 text-right text-slate-600">{formatearMoneda(c.precioUnitario, project.moneda)}</td>
                        <td className="p-3 text-right font-bold text-slate-800">{formatearMoneda(c.valorTarea, project.moneda)}</td>
                        <td className="p-3 text-right text-slate-700">{formatearMoneda(c.realAcumulado, project.moneda)}</td>
                        <td className="p-3 text-right text-slate-700">{formatearMoneda(c.comprometido, project.moneda)}</td>
                        <td className={`p-3 text-right font-bold ${isOver ? 'text-rose-600' : 'text-slate-800'}`}>
                          <div className="flex items-center justify-end space-x-1">
                            {isOver && <AlertTriangle className="w-3.5 h-3.5 text-rose-500" title="Excede presupuesto!" />}
                            <span>{formatearMoneda(c.eac, project.moneda)}</span>
                          </div>
                        </td>
                        <td className={`p-3 text-center font-bold ${c.desvio >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {c.desvio >= 0 ? `+${formatearMoneda(c.desvio, project.moneda)}` : formatearMoneda(c.desvio, project.moneda)}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <span className="font-bold text-slate-600">{formatearPorcentaje(c.porcentajeEjecutado)}</span>
                            <div className="w-10 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, c.porcentajeEjecutado)}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          {currentUserRole === 'Empresa' ? (
                            <div className="flex items-center justify-center space-x-1.5">
                              <button
                                onClick={() => handleOpenDirect(c)}
                                className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setConfirmDeleteDirectId(c.idCosto)}
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
        )}

        {/* Tab content view: Indirect Costs */}
        {activeTab === 'indirect' && (
          <div className="overflow-auto max-h-[500px]">
            {projectCostsIndirect.length === 0 ? (
              <div className="text-center py-16">
                <ClipboardList className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                <h5 className="font-bold text-slate-600">No hay costos indirectos cargados</h5>
                <p className="text-slate-400">Presione "Agregar Costo Indirecto" para registrar gastos fijos u operativos.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead className="sticky top-0 z-30 bg-slate-100 text-slate-700 font-bold uppercase tracking-wider shadow-sm border-b border-slate-200">
                  <tr>
                    <th className="p-3 sticky top-0 left-0 z-30 bg-slate-100 w-[240px] min-w-[240px] border-r-2 border-slate-300 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.12)]">Concepto Económico</th>
                    <th className="p-3 text-right sticky top-0 z-20 bg-slate-100">Presupuesto inicial</th>
                    <th className="p-3 text-right sticky top-0 z-20 bg-slate-100">Real Acumulado (AC)</th>
                    <th className="p-3 text-right sticky top-0 z-20 bg-slate-100">Comprometido</th>
                    <th className="p-3 text-right sticky top-0 z-20 bg-slate-100">EAC Proyectado</th>
                    <th className="p-3 text-center sticky top-0 z-20 bg-slate-100">Desvío</th>
                    <th className="p-3 text-center sticky top-0 z-20 bg-slate-100">Ejecutado %</th>
                    <th className="p-3 text-center sticky top-0 z-20 bg-slate-100">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {projectCostsIndirect.map((c) => {
                    const isOver = c.eac > c.presupuesto;
                    return (
                      <tr key={c.idCostoIndirecto} className="group hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-bold text-slate-800 sticky left-0 z-20 bg-white group-hover:bg-slate-50 transition-colors w-[240px] min-w-[240px] border-r-2 border-slate-300 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.12)]">{c.concepto}</td>
                        <td className="p-3 text-right text-slate-600 font-semibold">{formatearMoneda(c.presupuesto, project.moneda)}</td>
                        <td className="p-3 text-right text-slate-600">{formatearMoneda(c.realAcumulado, project.moneda)}</td>
                        <td className="p-3 text-right text-slate-600">{formatearMoneda(c.comprometido, project.moneda)}</td>
                        <td className={`p-3 text-right font-bold ${isOver ? 'text-rose-600' : 'text-slate-800'}`}>
                          <div className="flex items-center justify-end space-x-1">
                            {isOver && <AlertTriangle className="w-3.5 h-3.5 text-rose-500" title="Concepto excedido!" />}
                            <span>{formatearMoneda(c.eac, project.moneda)}</span>
                          </div>
                        </td>
                        <td className={`p-3 text-center font-bold ${c.desvio >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {c.desvio >= 0 ? `+${formatearMoneda(c.desvio, project.moneda)}` : formatearMoneda(c.desvio, project.moneda)}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <span className="font-bold text-slate-600">{formatearPorcentaje(c.porcentajeEjecutado)}</span>
                            <div className="w-10 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500" style={{ width: `${Math.min(100, c.porcentajeEjecutado)}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          {currentUserRole === 'Empresa' ? (
                            <div className="flex items-center justify-center space-x-1.5">
                              <button
                                onClick={() => handleOpenIndirect(c)}
                                className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setConfirmDeleteIndirectId(c.idCostoIndirecto)}
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
        )}
      </div>

      {/* --- MODALS IMPLEMENTATIONS (AnimatePresence) --- */}
      
      {/* 1. Modal Direct Cost Add/Edit */}
      <AnimatePresence>
        {showDirectModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200"
            >
              <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
                <h4 className="font-bold text-sm">{editingDirect ? 'Editar Costo Directo' : 'Vincular Presupuesto Directo'}</h4>
                <button onClick={() => setShowDirectModal(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleSaveDirect} className="p-5 space-y-4">
                {modalError && <div className="p-2.5 bg-red-50 text-red-600 font-bold rounded-lg">{modalError}</div>}
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Vincular con Actividad de Cronograma</label>
                  <select
                    value={directIdActividad}
                    onChange={(e) => handleDirectActChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 outline-none text-slate-800 font-semibold"
                  >
                    <option value="">-- No vincular / Carga manual independiente --</option>
                    {projectActivities.map(a => (
                      <option key={a.id} value={a.id}>({a.wbs}) {a.tarea} - [{formatearMoneda(a.valorTarea, project.moneda)}]</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Descripción / Concepto *</label>
                  <input
                    type="text"
                    value={directTarea}
                    onChange={(e) => setDirectTarea(e.target.value)}
                    placeholder="Ej: Ensayo de hormigón en cimientos"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 outline-none text-slate-800"
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Unidad</label>
                    <input
                      type="text"
                      value={directUnidad}
                      onChange={(e) => setDirectUnidad(e.target.value)}
                      placeholder="GL, HH, m3..."
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 outline-none text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Cantidad</label>
                    <input
                      type="number"
                      min="1"
                      value={directCantidad}
                      onChange={(e) => setDirectCantidad(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 outline-none text-slate-800 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Precio Unit.</label>
                    <input
                      type="number"
                      min="0"
                      value={directPrecioUnit}
                      onChange={(e) => setDirectPrecioUnit(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 outline-none text-slate-800 font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Costo Real (AC)</label>
                    <input
                      type="number"
                      min="0"
                      value={directRealAcum}
                      onChange={(e) => setDirectRealAcum(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 outline-none text-slate-800 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Comprometido</label>
                    <input
                      type="number"
                      min="0"
                      value={directComprometido}
                      onChange={(e) => setDirectComprometido(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 outline-none text-slate-800 font-semibold"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-500 font-medium">
                  <strong>Ponderación automática:</strong><br />
                  Presupuesto calculado: <span className="font-bold text-slate-800">{formatearMoneda(directCantidad * directPrecioUnit, project.moneda)}</span><br />
                  EAC Proyectado: <span className="font-bold text-slate-800">{formatearMoneda(Number(directRealAcum) + Number(directComprometido), project.moneda)}</span>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-150">
                  <button type="button" onClick={() => setShowDirectModal(false)} className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-xl transition">Cancelar</button>
                  <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-md shadow-indigo-500/10">Guardar</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Modal Indirect Cost Add/Edit */}
      <AnimatePresence>
        {showIndirectModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200"
            >
              <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
                <h4 className="font-bold text-sm">{editingIndirect ? 'Editar Costo Indirecto' : 'Nuevo Registro de Gasto Indirecto'}</h4>
                <button onClick={() => setShowIndirectModal(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleSaveIndirect} className="p-5 space-y-4">
                {modalError && <div className="p-2.5 bg-red-50 text-red-600 font-bold rounded-lg">{modalError}</div>}
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Concepto o Cuenta Contable *</label>
                  <input
                    type="text"
                    value={indirectConcepto}
                    onChange={(e) => setIndirectConcepto(e.target.value)}
                    placeholder="Ej: Honorarios Administrativos"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 outline-none text-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Presupuesto inicial (BAC)</label>
                  <input
                    type="number"
                    min="0"
                    value={indirectPresupuesto}
                    onChange={(e) => setIndirectPresupuesto(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 outline-none text-slate-800 font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Costo Real (AC)</label>
                    <input
                      type="number"
                      min="0"
                      value={indirectRealAcum}
                      onChange={(e) => setIndirectRealAcum(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 outline-none text-slate-800 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Comprometido</label>
                    <input
                      type="number"
                      min="0"
                      value={indirectComprometido}
                      onChange={(e) => setIndirectComprometido(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 outline-none text-slate-800 font-semibold"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-150">
                  <button type="button" onClick={() => setShowIndirectModal(false)} className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-xl transition">Cancelar</button>
                  <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-md shadow-indigo-500/10">Guardar</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3 & 4. Deletion confirmation modals */}
      <AnimatePresence>
        {confirmDeleteDirectId && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full border border-slate-200 text-center"
            >
              <Trash2 className="w-12 h-12 text-rose-500 mx-auto mb-4" />
              <h3 className="font-bold text-slate-800 text-base">¿Eliminar registro de costo directo?</h3>
              <p className="text-slate-500 text-xs mt-2 leading-relaxed">Esta acción eliminará de forma irreversible el presupuesto asociado a la actividad seleccionada.</p>
              
              <div className="flex items-center justify-center space-x-3 mt-6">
                <button onClick={() => setConfirmDeleteDirectId(null)} className="px-4 py-2 bg-slate-100 text-slate-600 font-semibold rounded-xl transition">Cancelar</button>
                <button onClick={() => { onDeleteDirectCost(confirmDeleteDirectId); setConfirmDeleteDirectId(null); }} className="px-4 py-2 bg-rose-600 text-white font-bold rounded-xl transition shadow-md shadow-rose-500/10">Sí, eliminar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmDeleteIndirectId && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full border border-slate-200 text-center"
            >
              <Trash2 className="w-12 h-12 text-rose-500 mx-auto mb-4" />
              <h3 className="font-bold text-slate-800 text-base">¿Eliminar cuenta de costo indirecto?</h3>
              <p className="text-slate-500 text-xs mt-2 leading-relaxed">Se desvinculará este concepto de la estructura económica consolidada del proyecto.</p>
              
              <div className="flex items-center justify-center space-x-3 mt-6">
                <button onClick={() => setConfirmDeleteIndirectId(null)} className="px-4 py-2 bg-slate-100 text-slate-600 font-semibold rounded-xl transition">Cancelar</button>
                <button onClick={() => { onDeleteIndirectCost(confirmDeleteIndirectId); setConfirmDeleteIndirectId(null); }} className="px-4 py-2 bg-rose-600 text-white font-bold rounded-xl transition shadow-md shadow-rose-500/10">Sí, eliminar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

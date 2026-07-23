import React, { useState, useMemo } from 'react';
import { Project, Activity, Certification } from '../types';
import { formatearMoneda, formatearPorcentaje, formatearFecha } from '../utils/formato';
import { 
  Award, FileSpreadsheet, Plus, Edit, Trash2, CheckCircle2, ShieldAlert, 
  HelpCircle, X, ClipboardList, Info, Calendar, ArrowRightLeft, Landmark 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

interface CertificationsManagerProps {
  project: Project;
  activities: Activity[];
  certifications: Certification[];
  onAddCertification: (cert: Certification) => void;
  onEditCertification: (cert: Certification) => void;
  onDeleteCertification: (id: string) => void;
  currentUserRole: 'Empresa' | 'Cliente';
}

export default function CertificationsManager({
  project,
  activities,
  certifications,
  onAddCertification,
  onEditCertification,
  onDeleteCertification,
  currentUserRole
}: CertificationsManagerProps) {
  const [filterEstado, setFilterEstado] = useState('');
  
  // Modals state
  const [showModal, setShowModal] = useState(false);
  const [editingCert, setEditingCert] = useState<Certification | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form input states
  const [numero, setNumero] = useState(1);
  const [fechaPeriodo, setFechaPeriodo] = useState('Julio 2026');
  const [tareaCertificar, setTareaCertificar] = useState('');
  const [fechaPresentacion, setFechaPresentacion] = useState('2026-07-17');
  const [fechaAprobacion, setFechaAprobacion] = useState('');
  const [valorTarea, setValorTarea] = useState(0);
  const [certificado, setCertificado] = useState(0);
  const [aprobado, setAprobado] = useState(0);
  const [facturado, setFacturado] = useState(0);
  const [cobrado, setCobrado] = useState(0);
  const [estado, setEstado] = useState<Certification['estado']>('Borrador');
  const [observaciones, setObservaciones] = useState('');
  const [formError, setFormError] = useState('');

  // Filter certifications by project
  const projectCertifications = useMemo(() => {
    return certifications.filter(c => c.idProyecto === project.idProyecto)
      .sort((a, b) => a.numero - b.numero);
  }, [certifications, project.idProyecto]);

  const filteredCerts = useMemo(() => {
    return projectCertifications.filter(c => filterEstado ? c.estado === filterEstado : true);
  }, [projectCertifications, filterEstado]);

  // Project budget to calculate Contract Sum
  // Sum of activity values
  const totalBudgetCost = activities.filter(a => a.idProyecto === project.idProyecto).reduce((acc, a) => acc + (a.valorTarea || 0), 0);
  const contractValue = totalBudgetCost * (1 + (project.utilidadEsperada / 100));

  // --- STATS CALCULATIONS ---
  const totalCertificado = projectCertifications.reduce((acc, c) => c.estado !== 'Borrador' ? acc + (c.certificado || 0) : acc, 0);
  const totalAprobado = projectCertifications.reduce((acc, c) => c.estado === 'Aprobado' || c.estado === 'Facturado' || c.estado === 'Cobrado' ? acc + (c.aprobado || 0) : acc, 0);
  const totalFacturado = projectCertifications.reduce((acc, c) => c.estado === 'Facturado' || c.estado === 'Cobrado' ? acc + (c.facturado || 0) : acc, 0);
  const totalCobrado = projectCertifications.reduce((acc, c) => c.estado === 'Cobrado' ? acc + (c.cobrado || 0) : acc, 0);

  const saldoPorCertificar = Math.max(0, contractValue - totalCertificado);
  const saldoPorCobrar = Math.max(0, totalFacturado - totalCobrado);
  const porcentajeCertificado = contractValue > 0 ? (totalCertificado / contractValue) * 100 : 0;

  // --- RECHARTS DATA ---
  // Line chart: Plan vs Certified Accumulated over time
  let accumulatedPlan = 0;
  let accumulatedCert = 0;
  
  const progressLineData = projectCertifications.map((c, idx) => {
    // Simulated incremental plan for visuals
    accumulatedPlan += c.valorTarea;
    accumulatedCert += c.estado !== 'Borrador' ? c.certificado : 0;
    return {
      period: c.fechaPeriodo,
      'Certificación Acumulada': accumulatedCert,
      'Valor Teórico Planificado': accumulatedPlan
    };
  });

  // Pie chart: states
  const stateCounts: { [key: string]: number } = {};
  projectCertifications.forEach(c => {
    stateCounts[c.estado] = (stateCounts[c.estado] || 0) + 1;
  });
  const stateColorMap: { [key: string]: string } = {
    Borrador: '#94a3b8',
    Presentado: '#f59e0b',
    Aprobado: '#818cf8',
    Facturado: '#6366f1',
    Cobrado: '#10b981',
    Pendiente: '#ef4444'
  };
  const pieData = Object.entries(stateCounts).map(([name, value]) => ({
    name,
    value,
    color: stateColorMap[name] || '#64748b'
  }));

  // --- MODAL ACTION HANDLERS ---
  const handleOpenModal = (cert: Certification | null = null) => {
    setFormError('');
    if (cert) {
      setEditingCert(cert);
      setNumero(cert.numero);
      setFechaPeriodo(cert.fechaPeriodo);
      setTareaCertificar(cert.tareaCertificar);
      setFechaPresentacion(cert.fechaPresentacion);
      setFechaAprobacion(cert.fechaAprobacion || '');
      setValorTarea(cert.valorTarea);
      setCertificado(cert.certificado);
      setAprobado(cert.aprobado);
      setFacturado(cert.facturado);
      setCobrado(cert.cobrado);
      setEstado(cert.estado);
      setObservaciones(cert.observaciones || '');
    } else {
      setEditingCert(null);
      setNumero(projectCertifications.length + 1);
      setFechaPeriodo('Julio 2026');
      setTareaCertificar('');
      setFechaPresentacion('2026-07-17');
      setFechaAprobacion('');
      setValorTarea(0);
      setCertificado(0);
      setAprobado(0);
      setFacturado(0);
      setCobrado(0);
      setEstado('Borrador');
      setObservaciones('');
    }
    setShowModal(true);
  };

  // Automatically update monetary inputs when selecting state
  const handleEstadoChange = (newEst: Certification['estado']) => {
    setEstado(newEst);
    if (newEst === 'Cobrado') {
      setCobrado(certificado);
      setFacturado(certificado);
      setAprobado(certificado);
    } else if (newEst === 'Facturado') {
      setFacturado(certificado);
      setAprobado(certificado);
      setCobrado(0);
    } else if (newEst === 'Aprobado') {
      setAprobado(certificado);
      setFacturado(0);
      setCobrado(0);
    } else if (newEst === 'Borrador') {
      setAprobado(0);
      setFacturado(0);
      setCobrado(0);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!tareaCertificar.trim() || !fechaPeriodo.trim()) {
      setFormError('El periodo y el concepto/tarea a certificar son obligatorios.');
      return;
    }
    if (certificado < 0 || aprobado < 0 || facturado < 0 || cobrado < 0) {
      setFormError('Los montos ingresados no pueden ser negativos.');
      return;
    }
    if (certificado > valorTarea && valorTarea > 0) {
      // Just a warning or lock
    }

    const saved: Certification = {
      idCertificacion: editingCert ? editingCert.idCertificacion : `cert-${Date.now()}`,
      idProyecto: project.idProyecto,
      numero: Number(numero),
      fechaPeriodo: fechaPeriodo.trim(),
      tareaCertificar: tareaCertificar.trim(),
      fechaPresentacion: fechaPresentacion,
      fechaAprobacion: fechaAprobacion || undefined,
      valorTarea: Number(valorTarea),
      certificado: Number(certificado),
      aprobado: Number(aprobado),
      facturado: Number(facturado),
      cobrado: Number(cobrado),
      estado,
      observaciones: observaciones.trim()
    };

    if (editingCert) {
      onEditCertification(saved);
    } else {
      onAddCertification(saved);
    }
    setShowModal(false);
  };

  const isCliente = currentUserRole === 'Cliente';

  if (isCliente) {
    const clientProgressLineData = projectCertifications.map((c, idx) => {
      const accPlan = projectCertifications.slice(0, idx + 1).reduce((sum, item) => sum + item.valorTarea, 0);
      const accCert = projectCertifications.slice(0, idx + 1).reduce((sum, item) => sum + (item.estado !== 'Borrador' ? item.certificado : 0), 0);
      return {
        period: c.fechaPeriodo,
        'Certificación Acumulada %': contractValue > 0 ? Number(((accCert / contractValue) * 100).toFixed(1)) : 0,
        'Planificado Teórico %': contractValue > 0 ? Number(((accPlan / contractValue) * 100).toFixed(1)) : 0
      };
    });

    return (
      <div className="space-y-6 select-none font-sans text-xs">
        {/* Client KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Porcentaje Certificado</span>
            <h4 className="text-xl font-extrabold text-indigo-650 tracking-tight mt-1">{formatearPorcentaje(porcentajeCertificado)}</h4>
            <span className="text-[10px] text-slate-400 mt-2 block">De avance acumulado total</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Saldo Pendiente</span>
            <h4 className="text-xl font-extrabold text-slate-800 mt-1 tracking-tight">{formatearPorcentaje(Math.max(0, 100 - porcentajeCertificado))}</h4>
            <span className="text-[10px] text-slate-400 mt-2 block">Por certificar en obras</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Periodos Presentados</span>
            <h4 className="text-xl font-extrabold text-slate-800 mt-1 tracking-tight">{projectCertifications.filter(c => c.estado !== 'Borrador').length}</h4>
            <span className="text-[10px] text-slate-400 mt-2 block">Estados de pago presentados</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Periodos Aprobados</span>
            <h4 className="text-xl font-extrabold text-emerald-650 mt-1 tracking-tight">
              {projectCertifications.filter(c => ['Aprobado', 'Facturado', 'Cobrado'].includes(c.estado)).length}
            </h4>
            <span className="text-[10px] text-emerald-600 font-bold mt-2 block">Validados formalmente</span>
          </div>
        </div>

        {/* Charts block */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h4 className="font-bold text-slate-800 text-sm mb-4">Curva de Certificación Física de Obras (%)</h4>
            <div className="h-56">
              {clientProgressLineData.length === 0 ? (
                <p className="text-slate-400 text-center py-16">Sin datos de periodos cargados</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={clientProgressLineData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="period" stroke="#94a3b8" tick={{ fontSize: 9 }} />
                    <YAxis unit="%" stroke="#94a3b8" tick={{ fontSize: 9 }} />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                    <Line type="monotone" dataKey="Certificación Acumulada %" stroke="#10b981" strokeWidth={3} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="Planificado Teórico %" stroke="#818cf8" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* States segmented Pie */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Estados de Certificaciones</h4>
              <p className="text-slate-400 text-[10px]">Cantidad de certificados presentados por estado</p>
            </div>

            <div className="h-44 relative flex items-center justify-center">
              {pieData.length === 0 ? (
                <p className="text-slate-400 text-center py-10">Sin certificados creados</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
              
              <div className="absolute text-center flex flex-col justify-center items-center pointer-events-none">
                <span className="text-xl font-black text-slate-800 leading-none">{projectCertifications.length}</span>
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mt-1">Certificados</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1 border-t border-slate-100 pt-3 text-[10px]">
              {pieData.map(d => (
                <div key={d.name} className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="text-slate-500 truncate" title={d.name}>{d.name} ({d.value})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Simplified table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-900 px-5 py-3 flex items-center justify-between text-white border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Landmark className="w-4 h-4 text-indigo-400" />
              <h4 className="font-bold text-sm">Libro de Certificaciones del Proyecto (Solo Lectura)</h4>
            </div>
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg p-1 px-2.5 outline-none font-semibold text-xs"
            >
              <option value="">Estados (Todos)</option>
              <option value="Borrador">Borrador</option>
              <option value="Presentado">Presentado</option>
              <option value="Aprobado">Aprobado</option>
              <option value="Facturado">Facturado</option>
              <option value="Cobrado">Cobrado</option>
              <option value="Pendiente">Pendiente</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            {filteredCerts.length === 0 ? (
              <div className="text-center py-16">
                <FileSpreadsheet className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                <h5 className="font-bold text-slate-600">No hay registros de certificación</h5>
              </div>
            ) : (
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-5 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                    <th className="p-3 text-center">N° Cert.</th>
                    <th className="p-3">Periodo</th>
                    <th className="p-3">Concepto a Certificar</th>
                    <th className="p-3">Presentación</th>
                    <th className="p-3">Aprobación</th>
                    <th className="p-3 text-right">Avance Certificado %</th>
                    <th className="p-3 text-center">Estado</th>
                    <th className="p-3">Observaciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
                  {filteredCerts.map((c) => {
                    const pctIndividual = c.valorTarea > 0 ? (c.certificado / c.valorTarea) * 100 : 0;
                    return (
                      <tr key={c.idCertificacion} className="hover:bg-slate-50/50">
                        <td className="p-3 text-center font-bold font-mono text-slate-500">#{c.numero}</td>
                        <td className="p-3 font-bold text-slate-800">{c.fechaPeriodo}</td>
                        <td className="p-3 font-semibold text-slate-700 truncate max-w-[200px]" title={c.tareaCertificar}>{c.tareaCertificar}</td>
                        <td className="p-3 text-slate-500 font-mono">{formatearFecha(c.fechaPresentacion)}</td>
                        <td className="p-3 text-slate-500 font-mono">{c.fechaAprobacion ? formatearFecha(c.fechaAprobacion) : '-'}</td>
                        <td className="p-3 text-right font-bold text-indigo-600 font-mono">{pctIndividual.toFixed(1)}%</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            c.estado === 'Cobrado' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                            c.estado === 'Facturado' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                            c.estado === 'Aprobado' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                            c.estado === 'Presentado' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                            c.estado === 'Pendiente' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                            'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            {c.estado}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500 truncate max-w-[200px]">{c.observaciones || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none font-sans text-xs">
      {/* 1. TOP STATS CARDS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Monto Venta Contrato</span>
          <h4 className="text-xl font-extrabold text-slate-800 tracking-tight mt-1">{formatearMoneda(contractValue, project.moneda)}</h4>
          <span className="text-[10px] text-slate-400 mt-2 block">Costo total + {project.utilidadEsperada}% Utilidad</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Certificado Acumulado</span>
          <h4 className="text-xl font-extrabold text-slate-800 mt-1 tracking-tight">{formatearMoneda(totalCertificado, project.moneda)}</h4>
          <span className="text-[10px] text-indigo-600 font-bold mt-2 block">{formatearPorcentaje(porcentajeCertificado)} Certificado</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Facturado Acumulado</span>
          <h4 className="text-xl font-extrabold text-slate-800 mt-1 tracking-tight">{formatearMoneda(totalFacturado, project.moneda)}</h4>
          <span className="text-[10px] text-slate-400 mt-2 block">
            {formatearPorcentaje(totalCertificado > 0 ? (totalFacturado / totalCertificado) * 100 : 0)} del certificado
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Cobrado Acumulado</span>
          <h4 className="text-xl font-extrabold text-emerald-600 mt-1 tracking-tight">{formatearMoneda(totalCobrado, project.moneda)}</h4>
          <span className="text-[10px] text-emerald-600 font-bold mt-2 block">
            {formatearPorcentaje(totalFacturado > 0 ? (totalCobrado / totalFacturado) * 100 : 0)} cobros liquidados
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between col-span-2 md:col-span-1">
          <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Saldo por Certificar</span>
          <h4 className="text-xl font-extrabold text-slate-800 mt-1 tracking-tight">{formatearMoneda(saldoPorCertificar, project.moneda)}</h4>
          <span className="text-[10px] text-rose-500 font-bold mt-2 block">Pendiente cobrar: {formatearMoneda(saldoPorCobrar, project.moneda)}</span>
        </div>
      </div>

      {/* 2. CHARTS VIEW PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Accumulation Line Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h4 className="font-bold text-slate-800 text-sm mb-4">Curva de Certificación Quincenal vs Contractual</h4>
          <div className="h-56">
            {progressLineData.length === 0 ? (
              <p className="text-slate-400 text-center py-16">Sin datos de periodos cargados</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={progressLineData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="period" stroke="#94a3b8" tick={{ fontSize: 9 }} />
                  <YAxis tickFormatter={(v) => `$${v/1000}k`} stroke="#94a3b8" tick={{ fontSize: 9 }} />
                  <Tooltip formatter={(value) => formatearMoneda(Number(value), project.moneda)} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                  <Line type="monotone" dataKey="Certificación Acumulada" stroke="#10b981" strokeWidth={3} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="Valor Teórico Planificado" stroke="#818cf8" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* States segmented Pie */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-slate-800 text-sm">Estados de Certificaciones</h4>
            <p className="text-slate-400 text-[10px]">Cantidad de certificados presentados por estado</p>
          </div>

          <div className="h-44 relative flex items-center justify-center">
            {pieData.length === 0 ? (
              <p className="text-slate-400 text-center py-10">Sin certificados creados</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
            
            <div className="absolute text-center flex flex-col justify-center items-center pointer-events-none">
              <span className="text-xl font-black text-slate-800 leading-none">{projectCertifications.length}</span>
              <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mt-1">Certificados</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1 border-t border-slate-100 pt-3 text-[10px]">
            {pieData.map(d => (
              <div key={d.name} className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                <span className="text-slate-500 truncate" title={d.name}>{d.name} ({d.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. TABLE GENERAL LIST VIEW */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-900 px-5 py-3 flex items-center justify-between text-white border-b border-slate-800 flex-wrap gap-3">
          <div className="flex items-center space-x-2">
            <Landmark className="w-4 h-4 text-indigo-400" />
            <h4 className="font-bold text-sm">Libro de Certificaciones del Proyecto</h4>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            {/* Filter by state */}
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg p-1 px-2.5 outline-none font-semibold text-xs"
            >
              <option value="">Estados (Todos)</option>
              <option value="Borrador">Borrador</option>
              <option value="Presentado">Presentado</option>
              <option value="Aprobado">Aprobado</option>
              <option value="Facturado">Facturado</option>
              <option value="Cobrado">Cobrado</option>
              <option value="Pendiente">Pendiente</option>
            </select>

            {currentUserRole === 'Empresa' && (
              <button
                onClick={() => handleOpenModal()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-lg transition flex items-center space-x-1 text-xs shadow-md shadow-indigo-650/10"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nueva Certificación</span>
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredCerts.length === 0 ? (
            <div className="text-center py-16">
              <FileSpreadsheet className="w-12 h-12 text-slate-200 mx-auto mb-2" />
              <h5 className="font-bold text-slate-600">No hay registros de certificación</h5>
              <p className="text-slate-400">Presione "Nueva Certificación" para registrar avances económicos.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-5 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                  <th className="p-3 text-center">N° Cert.</th>
                  <th className="p-3">Periodo</th>
                  <th className="p-3">Concepto a Certificar</th>
                  <th className="p-3">Presentación</th>
                  <th className="p-3">Aprobación</th>
                  <th className="p-3 text-right">Presupuesto</th>
                  <th className="p-3 text-right">Certificado</th>
                  <th className="p-3 text-right">Aprobado</th>
                  <th className="p-3 text-right">Facturado</th>
                  <th className="p-3 text-right">Cobrado</th>
                  <th className="p-3 text-center">Estado</th>
                  <th className="p-3">Observaciones</th>
                  <th className="p-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
                {filteredCerts.map((c) => {
                  return (
                    <tr key={c.idCertificacion} className="hover:bg-slate-50/50">
                      <td className="p-3 text-center font-bold font-mono text-slate-500">#{c.numero}</td>
                      <td className="p-3 font-bold text-slate-800">{c.fechaPeriodo}</td>
                      <td className="p-3 font-semibold text-slate-700 truncate max-w-[200px]" title={c.tareaCertificar}>{c.tareaCertificar}</td>
                      <td className="p-3 text-slate-500 font-mono">{formatearFecha(c.fechaPresentacion)}</td>
                      <td className="p-3 text-slate-500 font-mono">{c.fechaAprobacion ? formatearFecha(c.fechaAprobacion) : '-'}</td>
                      <td className="p-3 text-right text-slate-600">{formatearMoneda(c.valorTarea, project.moneda)}</td>
                      <td className="p-3 text-right font-bold text-slate-800">{formatearMoneda(c.certificado, project.moneda)}</td>
                      <td className="p-3 text-right text-indigo-500 font-semibold">{formatearMoneda(c.aprobado, project.moneda)}</td>
                      <td className="p-3 text-right text-indigo-600 font-semibold">{formatearMoneda(c.facturado, project.moneda)}</td>
                      <td className="p-3 text-right text-emerald-600 font-bold">{formatearMoneda(c.cobrado, project.moneda)}</td>
                      
                      {/* Estado label */}
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          c.estado === 'Cobrado' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                          c.estado === 'Facturado' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                          c.estado === 'Aprobado' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                          c.estado === 'Presentado' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                          c.estado === 'Pendiente' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                          'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {c.estado}
                        </span>
                      </td>

                      <td className="p-3 text-slate-500 truncate max-w-[150px]" title={c.observaciones || '-'}>{c.observaciones || '-'}</td>
                      
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
                              onClick={() => setConfirmDeleteId(c.idCertificacion)}
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

      {/* --- MODAL FORM FOR CERTIFICATION --- */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200"
            >
              <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
                <h4 className="font-bold text-sm">{editingCert ? 'Editar Certificación' : 'Nueva Certificación Mensual'}</h4>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleSave} className="p-5 space-y-4">
                {formError && <div className="p-2.5 bg-red-50 text-red-600 font-bold rounded-lg">{formError}</div>}

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">N° Certificado</label>
                    <input
                      type="number"
                      min="1"
                      value={numero}
                      onChange={(e) => setNumero(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 outline-none text-slate-800 font-bold"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Periodo (Mes/Año) *</label>
                    <input
                      type="text"
                      value={fechaPeriodo}
                      onChange={(e) => setFechaPeriodo(e.target.value)}
                      placeholder="Ej: Julio 2026"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 outline-none text-slate-800 font-semibold"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Concepto o Hito a Certificar *</label>
                  <input
                    type="text"
                    value={tareaCertificar}
                    onChange={(e) => setTareaCertificar(e.target.value)}
                    placeholder="Ej: Avance 30% Ingeniería Básica"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 outline-none text-slate-800"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">F. Presentación *</label>
                    <input
                      type="date"
                      value={fechaPresentacion}
                      onChange={(e) => setFechaPresentacion(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 outline-none text-slate-800"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">F. Aprobación</label>
                    <input
                      type="date"
                      value={fechaAprobacion}
                      onChange={(e) => setFechaAprobacion(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 outline-none text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Presupuesto Asignado</label>
                    <input
                      type="number"
                      min="0"
                      value={valorTarea}
                      onChange={(e) => setValorTarea(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 outline-none text-slate-800 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Monto Certificado</label>
                    <input
                      type="number"
                      min="0"
                      value={certificado}
                      onChange={(e) => { setCertificado(Number(e.target.value)); setAprobado(Number(e.target.value)); }}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 outline-none text-slate-800 font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Estado Contractual</label>
                  <select
                    value={estado}
                    onChange={(e) => handleEstadoChange(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 outline-none text-slate-800 font-bold"
                  >
                    <option value="Borrador">Borrador</option>
                    <option value="Presentado">Presentado</option>
                    <option value="Aprobado">Aprobado (Certificado liquidado)</option>
                    <option value="Facturado">Facturado (Factura emitida)</option>
                    <option value="Cobrado">Cobrado (Ingreso de caja cancelado)</option>
                    <option value="Pendiente">Pendiente (Reclamado/Fondo Reparo)</option>
                  </select>
                </div>

                {estado !== 'Borrador' && (
                  <div className="grid grid-cols-3 gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-100 text-[10px]">
                    <div>
                      <span className="text-slate-400 block font-bold uppercase">Aprobado</span>
                      <input
                        type="number"
                        value={aprobado}
                        onChange={(e) => setAprobado(Number(e.target.value))}
                        className="w-full bg-transparent border-b border-slate-300 outline-none text-slate-800 font-semibold"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 block font-bold uppercase">Facturado</span>
                      <input
                        type="number"
                        value={facturado}
                        onChange={(e) => setFacturado(Number(e.target.value))}
                        className="w-full bg-transparent border-b border-slate-300 outline-none text-slate-800 font-semibold"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 block font-bold uppercase">Cobrado</span>
                      <input
                        type="number"
                        value={cobrado}
                        onChange={(e) => setCobrado(Number(e.target.value))}
                        className="w-full bg-transparent border-b border-slate-300 outline-none text-slate-800 font-semibold"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Observaciones / Comentarios</label>
                  <textarea
                    rows={2}
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Escriba detalles sobre órdenes de compra, fondos de retención, retenciones..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 outline-none text-slate-800 resize-none"
                  />
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
              className="bg-white rounded-2xl p-6 max-w-sm w-full border border-slate-200 text-center animate-fade-in"
            >
              <Trash2 className="w-12 h-12 text-rose-500 mx-auto mb-4" />
              <h3 className="font-bold text-slate-800 text-base">¿Eliminar registro de certificación?</h3>
              <p className="text-slate-500 text-xs mt-2 leading-relaxed">Esta acción eliminará de forma irreversible el certificado y recalculará la facturación consolidada del proyecto.</p>
              
              <div className="flex items-center justify-center space-x-3 mt-6">
                <button onClick={() => setConfirmDeleteId(null)} className="px-4 py-2 bg-slate-100 text-slate-600 font-semibold rounded-xl transition">Cancelar</button>
                <button onClick={() => { onDeleteCertification(confirmDeleteId); setConfirmDeleteId(null); }} className="px-4 py-2 bg-rose-600 text-white font-bold rounded-xl transition shadow-md shadow-rose-500/10">Sí, eliminar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

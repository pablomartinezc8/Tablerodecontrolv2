import React, { useState, useMemo, useRef } from 'react';
import { Project, ProjectDocument } from '../types';
import { descargarPlantillaDocumentos } from '../utils/plantillaDocumentosExcel';
import { leerFilasDocumentosExcel, exportarDocumentosExcel, RawDocumentRow } from '../utils/importarDocumentosExcel';
import { 
  FileText, Download, Upload, Plus, Search, Filter, Trash2, Edit3, 
  FileSpreadsheet, CheckCircle2, AlertTriangle, X, RefreshCw, Layers,
  CheckCircle, Clock, FileCode, ArrowUpDown, FileCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DocumentListProps {
  project: Project;
  documents: ProjectDocument[];
  onSaveDocuments: (updatedDocs: ProjectDocument[]) => void;
  currentUserRole?: string;
}

/**
 * Natural WBS hierarchical numerical comparison.
 * Compares parts numerically: "1.1" < "1.2" < "1.10" < "2" < "2.1".
 */
export function compareWBS(a?: string, b?: string): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;

  const partsA = a.trim().split('.');
  const partsB = b.trim().split('.');
  const maxLength = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < maxLength; i++) {
    if (i >= partsA.length) return -1; // e.g. "1" comes before "1.1"
    if (i >= partsB.length) return 1;  // e.g. "1.1" comes after "1"

    const partA = partsA[i];
    const partB = partsB[i];

    const numA = parseInt(partA, 10);
    const numB = parseInt(partB, 10);

    const isNumA = !isNaN(numA) && String(numA) === partA.trim();
    const isNumB = !isNaN(numB) && String(numB) === partB.trim();

    if (isNumA && isNumB) {
      if (numA !== numB) return numA - numB;
    } else {
      const cmp = partA.localeCompare(partB, undefined, { numeric: true, sensitivity: 'base' });
      if (cmp !== 0) return cmp;
    }
  }

  return 0;
}

/**
 * Normalizes documents so every record has a valid WBS field if missing.
 */
export function ensureDocumentsWBS(docs: ProjectDocument[]): ProjectDocument[] {
  let currentMajor = 0;
  let currentMinor = 0;

  return docs.map((doc) => {
    const isTitle = doc.tipoDocumento === 'Título' || doc.tipoDocumento === 'TITULO';

    if (doc.wbs && doc.wbs.trim() !== '') {
      const parts = doc.wbs.split('.');
      const majorNum = parseInt(parts[0], 10);
      if (!isNaN(majorNum)) {
        currentMajor = Math.max(currentMajor, majorNum);
        if (parts.length > 1) {
          const minorNum = parseInt(parts[1], 10);
          if (!isNaN(minorNum)) currentMinor = minorNum;
        } else {
          currentMinor = 0;
        }
      }
      return doc;
    }

    if (isTitle) {
      currentMajor++;
      currentMinor = 0;
      return {
        ...doc,
        wbs: String(currentMajor)
      };
    } else {
      if (currentMajor === 0) currentMajor = 1;
      currentMinor++;
      return {
        ...doc,
        wbs: `${currentMajor}.${currentMinor}`
      };
    }
  });
}

export default function DocumentList({
  project,
  documents,
  onSaveDocuments,
  currentUserRole = 'Empresa'
}: DocumentListProps) {
  // Filter & Normalize documents belonging to active project
  const projectDocs = useMemo(() => {
    const raw = documents.filter(d => d.idProyecto === project.idProyecto);
    return ensureDocumentsWBS(raw);
  }, [documents, project.idProyecto]);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEtapa, setSelectedEtapa] = useState<string>('Todas');
  const [selectedDisciplina, setSelectedDisciplina] = useState<string>('Todas');
  const [selectedTipo, setSelectedTipo] = useState<string>('Todos');
  const [selectedEstado, setSelectedEstado] = useState<string>('Todos');

  // Sorting
  const [sortField, setSortField] = useState<'wbs' | 'item' | 'codificacion' | 'tipoDocumento'>('wbs');
  const [sortAsc, setSortAsc] = useState(true);

  // Modals state
  const [showDocModal, setShowDocModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<ProjectDocument | null>(null);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [parsedRows, setParsedRows] = useState<RawDocumentRow[]>([]);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');

  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<ProjectDocument | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State for manual creation/editing
  const [formWbs, setFormWbs] = useState('');
  const [formParentTitle, setFormParentTitle] = useState('');
  const [formItem, setFormItem] = useState('');
  const [formTipo, setFormTipo] = useState<'DOC' | 'DWG' | 'ACT' | string>('DOC');
  const [formCodificacion, setFormCodificacion] = useState('');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formEtapa, setFormEtapa] = useState('ETAPA 1');
  const [formSeccion, setFormSeccion] = useState('Ingeniería Básica');
  const [formDisciplina, setFormDisciplina] = useState('Civil');
  const [formRevision, setFormRevision] = useState('A');
  const [formEstado, setFormEstado] = useState('Aprobado');
  const [formObservaciones, setFormObservaciones] = useState('');

  // Helper to suggest next WBS number
  const suggestNextWBS = (parentWbs: string, isNewTitle: boolean) => {
    if (isNewTitle || !parentWbs) {
      let maxMajor = 0;
      projectDocs.forEach(d => {
        const mainNum = parseInt((d.wbs || '').split('.')[0], 10);
        if (!isNaN(mainNum) && mainNum > maxMajor) maxMajor = mainNum;
      });
      return String(maxMajor + 1);
    } else {
      let maxMinor = 0;
      const prefix = `${parentWbs}.`;
      projectDocs.forEach(d => {
        if (d.wbs && d.wbs.startsWith(prefix)) {
          const childPart = d.wbs.slice(prefix.length);
          const childNum = parseInt(childPart, 10);
          if (!isNaN(childNum) && childNum > maxMinor) maxMinor = childNum;
        }
      });
      return `${parentWbs}.${maxMinor + 1}`;
    }
  };

  // Extract unique stages and disciplines for filters
  const availableEtapas = useMemo(() => {
    const setEtapas = new Set(projectDocs.map(d => d.etapa).filter(Boolean));
    return ['Todas', ...Array.from(setEtapas)];
  }, [projectDocs]);

  const availableDisciplinas = useMemo(() => {
    const setDisc = new Set(projectDocs.map(d => d.disciplina).filter(Boolean));
    return ['Todas', ...Array.from(setDisc)];
  }, [projectDocs]);

  // Open modal for new document
  const handleOpenNewDocModal = () => {
    setEditingDoc(null);
    setFormItem(String(projectDocs.length + 1));
    setFormTipo('DOC');
    setFormCodificacion('');
    setFormDescripcion('');
    setFormEtapa('ETAPA 1');
    setFormSeccion('General');
    setFormDisciplina('Civil');
    setFormRevision('A');
    setFormEstado('Aprobado');
    setFormObservaciones('');

    const titles = projectDocs.filter(d => d.tipoDocumento === 'Título' || d.tipoDocumento === 'TITULO');
    if (titles.length > 0) {
      const lastTitleWbs = titles[titles.length - 1].wbs;
      setFormParentTitle(lastTitleWbs);
      setFormWbs(suggestNextWBS(lastTitleWbs, false));
    } else {
      setFormParentTitle('');
      setFormWbs('1.1');
    }

    setShowDocModal(true);
  };

  // Open modal for editing document
  const handleOpenEditDocModal = (doc: ProjectDocument) => {
    setEditingDoc(doc);
    setFormWbs(doc.wbs || '');
    setFormParentTitle('');
    setFormItem(doc.item || '');
    setFormTipo(doc.tipoDocumento || 'DOC');
    setFormCodificacion(doc.codificacion || '');
    setFormDescripcion(doc.descripcion || '');
    setFormEtapa(doc.etapa || 'ETAPA 1');
    setFormSeccion(doc.seccion || 'General');
    setFormDisciplina(doc.disciplina || 'Civil');
    setFormRevision(doc.revision || 'A');
    setFormEstado(doc.estado || 'Aprobado');
    setFormObservaciones(doc.observaciones || '');
    setShowDocModal(true);
  };

  // Save document handler
  const handleSaveDocSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDescripcion.trim() && !formCodificacion.trim()) {
      alert('Por favor ingrese al menos la Codificación o Descripción del documento.');
      return;
    }

    const finalWbs = formWbs.trim() || '1';

    if (editingDoc) {
      // Update existing
      const updated = documents.map(d => {
        if (d.id === editingDoc.id) {
          return {
            ...d,
            wbs: finalWbs,
            item: formItem.trim() || '-',
            tipoDocumento: formTipo,
            codificacion: formCodificacion.trim() || 'S/N',
            descripcion: formDescripcion.trim(),
            etapa: formEtapa,
            seccion: formSeccion.trim(),
            disciplina: formDisciplina,
            revision: formRevision.trim() || 'A',
            estado: formEstado,
            observaciones: formObservaciones.trim(),
            updatedAt: new Date().toISOString().split('T')[0]
          };
        }
        return d;
      });
      onSaveDocuments(updated);
    } else {
      // Create new
      const newDoc: ProjectDocument = {
        id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        idProyecto: project.idProyecto,
        wbs: finalWbs,
        item: formItem.trim() || '-',
        tipoDocumento: formTipo,
        codificacion: formCodificacion.trim() || 'S/N',
        descripcion: formDescripcion.trim(),
        etapa: formEtapa,
        seccion: formSeccion.trim(),
        disciplina: formDisciplina,
        revision: formRevision.trim() || 'A',
        estado: formEstado,
        observaciones: formObservaciones.trim(),
        createdAt: new Date().toISOString().split('T')[0]
      };
      onSaveDocuments([...documents, newDoc]);
    }

    setShowDocModal(false);
  };

  // Delete document handler
  const handleDeleteDoc = (docId: string) => {
    const updated = documents.filter(d => d.id !== docId);
    onSaveDocuments(updated);
    setDeleteConfirmDoc(null);
  };

  // Handle Upload File Selection
  const handleFileSelected = async (file: File) => {
    setUploadFile(file);
    setUploadLoading(true);
    try {
      const rows = await leerFilasDocumentosExcel(file);
      setParsedRows(rows);
    } catch (err) {
      alert('Error al leer el archivo Excel/CSV: ' + err);
      setParsedRows([]);
    } finally {
      setUploadLoading(false);
    }
  };

  // Execute Mass Import
  const handleConfirmImport = () => {
    if (parsedRows.length === 0) return;

    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      alert('No hay filas válidas para importar.');
      return;
    }

    const importedDocs: ProjectDocument[] = validRows.map((r, idx) => ({
      id: `doc-imp-${Date.now()}-${idx}`,
      idProyecto: project.idProyecto,
      wbs: r.wbs || `${idx + 1}`,
      item: r.item || '-',
      tipoDocumento: r.tipoDocumento || 'DOC',
      codificacion: r.codificacion || 'S/N',
      descripcion: r.descripcion,
      etapa: r.etapa || 'ETAPA 1',
      seccion: r.seccion || 'General',
      disciplina: r.disciplina || 'General',
      revision: r.revision || 'A',
      estado: r.estado || 'Aprobado',
      observaciones: r.observaciones || '',
      createdAt: new Date().toISOString().split('T')[0]
    }));

    if (importMode === 'replace') {
      const otherProjectDocs = documents.filter(d => d.idProyecto !== project.idProyecto);
      onSaveDocuments([...otherProjectDocs, ...importedDocs]);
    } else {
      onSaveDocuments([...documents, ...importedDocs]);
    }

    setShowUploadModal(false);
    setUploadFile(null);
    setParsedRows([]);
  };

  // Filtered & Sorted Documents
  const filteredDocs = useMemo(() => {
    return projectDocs.filter(d => {
      // Search text
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchWbs = (d.wbs || '').toLowerCase().includes(term);
        const matchCod = (d.codificacion || '').toLowerCase().includes(term);
        const matchDesc = (d.descripcion || '').toLowerCase().includes(term);
        const matchItem = (d.item || '').toLowerCase().includes(term);
        const matchDisc = (d.disciplina || '').toLowerCase().includes(term);
        if (!matchWbs && !matchCod && !matchDesc && !matchItem && !matchDisc) return false;
      }

      // Etapa filter
      if (selectedEtapa !== 'Todas' && d.etapa !== selectedEtapa) return false;

      // Disciplina filter
      if (selectedDisciplina !== 'Todas' && d.disciplina !== selectedDisciplina) return false;

      // Tipo filter
      if (selectedTipo !== 'Todos' && d.tipoDocumento !== selectedTipo) return false;

      // Estado filter
      if (selectedEstado !== 'Todos' && d.estado !== selectedEstado) return false;

      return true;
    }).sort((a, b) => {
      if (sortField === 'wbs') {
        const cmp = compareWBS(a.wbs, b.wbs);
        return sortAsc ? cmp : -cmp;
      }

      let valA = a[sortField] || '';
      let valB = b[sortField] || '';

      if (sortField === 'item') {
        const numA = parseInt(valA.replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(valB.replace(/\D/g, ''), 10) || 0;
        return sortAsc ? numA - numB : numB - numA;
      }

      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });
  }, [projectDocs, searchTerm, selectedEtapa, selectedDisciplina, selectedTipo, selectedEstado, sortField, sortAsc]);

  // KPI calculations
  const totalCount = projectDocs.length;
  const dwgCount = projectDocs.filter(d => d.tipoDocumento === 'DWG').length;
  const docCount = projectDocs.filter(d => d.tipoDocumento === 'DOC').length;
  const actCount = projectDocs.filter(d => d.tipoDocumento === 'ACT').length;
  const aprobadosCount = projectDocs.filter(d => d.estado === 'Aprobado').length;
  const enRevisionCount = projectDocs.filter(d => d.estado === 'En Revisión').length;

  return (
    <div className="space-y-4">
      
      {/* 1. STICKY TOP HEADER & CONTROL PANEL */}
      <div className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-md pt-1 pb-3 space-y-3 border-b border-slate-200/60">
        
        {/* Top Title & Global Actions */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <FileText className="w-4 h-4" />
              </span>
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Documentación de Ingeniería</span>
            </div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight mt-0.5">
              Listado Master de Documentos
            </h1>
            <p className="text-xs text-slate-500">
              Control de estructura jerárquica WBS, codificación y estados de emisión (Cod. Referencia 0526-G-LD-001)
            </p>
          </div>

          {/* Global Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => descargarPlantillaDocumentos()}
              className="flex items-center space-x-1.5 py-1.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 transition text-xs font-bold"
              title="Descargar plantilla de Excel con estructura WBS"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span>Plantilla Excel</span>
            </button>

            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center space-x-1.5 py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl border border-indigo-200 transition text-xs font-bold"
              title="Subir archivo Excel/CSV para cargar documentos"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-600" />
              <span>Cargar Excel / CSV</span>
            </button>

            <button
              onClick={() => exportarDocumentosExcel(projectDocs, project.nombreProyecto)}
              className="flex items-center space-x-1.5 py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl border border-emerald-200 transition text-xs font-bold"
              title="Exportar listado actual a Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Exportar Excel</span>
            </button>

            {currentUserRole === 'Empresa' && (
              <button
                onClick={handleOpenNewDocModal}
                className="flex items-center space-x-1.5 py-1.5 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-600/20 transition text-xs font-black"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Documento</span>
              </button>
            )}
          </div>
        </div>

        {/* Filters & Search Control Bar */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
            
            {/* Search Box */}
            <div className="relative w-full lg:w-80">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por WBS, código, descripción, ítem..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full lg:w-auto">
              
              {/* Etapa */}
              <div>
                <select
                  value={selectedEtapa}
                  onChange={(e) => setSelectedEtapa(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold py-1.5 px-2 rounded-xl outline-none"
                >
                  {availableEtapas.map(e => (
                    <option key={e} value={e}>{e === 'Todas' ? 'Etapa: Todas' : e}</option>
                  ))}
                </select>
              </div>

              {/* Disciplina Filter */}
              <div>
                <select
                  value={selectedDisciplina}
                  onChange={(e) => setSelectedDisciplina(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold py-1.5 px-2 rounded-xl outline-none"
                >
                  {availableDisciplinas.map(d => (
                    <option key={d} value={d}>{d === 'Todas' ? 'Disciplina: Todas' : d}</option>
                  ))}
                </select>
              </div>

              {/* Tipo Documento */}
              <div>
                <select
                  value={selectedTipo}
                  onChange={(e) => setSelectedTipo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold py-1.5 px-2 rounded-xl outline-none"
                >
                  <option value="Todos">Tipo: Todos</option>
                  <option value="DOC">DOC (Informes)</option>
                  <option value="DWG">DWG (Planos)</option>
                  <option value="ACT">ACT (Actas)</option>
                  <option value="Título">Título (Agrupador)</option>
                </select>
              </div>

              {/* Estado */}
              <div>
                <select
                  value={selectedEstado}
                  onChange={(e) => setSelectedEstado(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold py-1.5 px-2 rounded-xl outline-none"
                >
                  <option value="Todos">Estado: Todos</option>
                  <option value="Aprobado">Aprobado</option>
                  <option value="En Revisión">En Revisión</option>
                  <option value="Emitido">Emitido</option>
                  <option value="Pendiente">Pendiente</option>
                </select>
              </div>
            </div>
          </div>

          {/* Counter indicator */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 pt-1.5 font-medium">
            <span>Mostrando <strong>{filteredDocs.length}</strong> de <strong>{projectDocs.length}</strong> ítems ordenados por WBS</span>
            {(searchTerm || selectedEtapa !== 'Todas' || selectedDisciplina !== 'Todas' || selectedTipo !== 'Todos' || selectedEstado !== 'Todos') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedEtapa('Todas');
                  setSelectedDisciplina('Todas');
                  setSelectedTipo('Todos');
                  setSelectedEstado('Todos');
                }}
                className="text-indigo-600 hover:underline font-bold"
              >
                Limpiar Filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. MAIN DOCUMENTS DATA TABLE WITH VERTICAL & HORIZONTAL SCROLL + STICKY DESCRIPTION */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-270px)] min-h-[380px] relative">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-30 bg-slate-100 shadow-xs">
              <tr className="border-b border-slate-200 text-slate-600 font-extrabold text-[10px] uppercase tracking-wider">
                
                {/* Fixed Column 1: WBS */}
                <th 
                  onClick={() => {
                    if (sortField === 'wbs') setSortAsc(!sortAsc);
                    else { setSortField('wbs'); setSortAsc(true); }
                  }}
                  className="sticky top-0 left-0 z-40 bg-slate-100 py-3 px-2 cursor-pointer hover:bg-slate-200 transition min-w-[65px] w-[65px] border-r border-slate-200"
                >
                  <div className="flex items-center space-x-1">
                    <span>WBS</span>
                    <ArrowUpDown className="w-3 h-3 text-indigo-600" />
                  </div>
                </th>

                {/* Fixed Column 2: Ítem */}
                <th 
                  onClick={() => {
                    if (sortField === 'item') setSortAsc(!sortAsc);
                    else { setSortField('item'); setSortAsc(true); }
                  }}
                  className="sticky top-0 left-[65px] z-40 bg-slate-100 py-3 px-2 cursor-pointer hover:bg-slate-200 transition min-w-[50px] w-[50px] border-r border-slate-200"
                >
                  <div className="flex items-center space-x-0.5">
                    <span>Ítem</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                {/* Fixed Column 3: Tipo */}
                <th 
                  onClick={() => {
                    if (sortField === 'tipoDocumento') setSortAsc(!sortAsc);
                    else { setSortField('tipoDocumento'); setSortAsc(true); }
                  }}
                  className="sticky top-0 left-[115px] z-40 bg-slate-100 py-3 px-2 cursor-pointer hover:bg-slate-200 transition min-w-[75px] w-[75px] border-r border-slate-200"
                >
                  <span>Tipo</span>
                </th>

                {/* Fixed Column 4: Codificación */}
                <th 
                  onClick={() => {
                    if (sortField === 'codificacion') setSortAsc(!sortAsc);
                    else { setSortField('codificacion'); setSortAsc(true); }
                  }}
                  className="sticky top-0 left-[190px] z-40 bg-slate-100 py-3 px-2.5 cursor-pointer hover:bg-slate-200 transition min-w-[135px] w-[135px] border-r border-slate-200"
                >
                  <div className="flex items-center space-x-1">
                    <span>Codificación</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                {/* Fixed Column 5: Descripción (STAYS VISIBLE ON HORIZONTAL SCROLL) */}
                <th className="sticky top-0 left-[325px] z-40 bg-slate-100 py-3 px-3.5 min-w-[320px] max-w-[420px] border-r-2 border-slate-300 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.1)] text-slate-800 font-black">
                  Descripción / Título del Documento
                </th>

                {/* Scrollable Right Columns */}
                <th className="py-3 px-3 min-w-[150px]">Etapa / Sección</th>
                <th className="py-3 px-2 text-center w-14">Rev.</th>
                <th className="py-3 px-3 w-28 text-center">Estado</th>
                <th className="py-3 px-3 text-center w-20">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                    <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-bold text-slate-600">No se encontraron documentos</p>
                    <p className="text-xs text-slate-400 mt-0.5">Pruebe ajustando los filtros de búsqueda o cargue documentos mediante Excel.</p>
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => {
                  const isTitle = doc.tipoDocumento === 'Título' || doc.tipoDocumento === 'TITULO';

                  if (isTitle) {
                    return (
                      <tr key={doc.id} className="bg-slate-900 text-white font-extrabold border-t-2 border-b-2 border-slate-950">
                        {/* WBS */}
                        <td className="sticky left-0 z-20 bg-slate-900 py-2.5 px-2 font-mono text-amber-400 font-black text-xs min-w-[65px] w-[65px] border-r border-slate-800">
                          {doc.wbs}
                        </td>

                        {/* Ítem */}
                        <td className="sticky left-[65px] z-20 bg-slate-900 py-2.5 px-2 font-mono text-slate-400 font-bold text-xs min-w-[50px] w-[50px] border-r border-slate-800">
                          {doc.item || '-'}
                        </td>

                        {/* Tipo */}
                        <td className="sticky left-[115px] z-20 bg-slate-900 py-2.5 px-2 min-w-[75px] w-[75px] border-r border-slate-800">
                          <span className="inline-block py-0.5 px-1.5 rounded-md bg-amber-500 text-slate-950 font-black text-[9px] uppercase tracking-wider">
                            TÍTULO
                          </span>
                        </td>

                        {/* Codificación */}
                        <td className="sticky left-[190px] z-20 bg-slate-900 py-2.5 px-2.5 font-mono font-black text-amber-300/80 text-xs min-w-[135px] w-[135px] border-r border-slate-800">
                          {doc.codificacion || '-'}
                        </td>

                        {/* Descripción Banner */}
                        <td className="sticky left-[325px] z-20 bg-slate-900 py-2.5 px-3.5 font-black text-white text-xs uppercase tracking-wide border-r-2 border-slate-700 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.3)] min-w-[320px] max-w-[420px]">
                          <div className="flex items-center space-x-2">
                            <span className="p-1 bg-amber-500/20 text-amber-400 rounded-md">
                              <Layers className="w-3.5 h-3.5" />
                            </span>
                            <span>{doc.descripcion}</span>
                          </div>
                        </td>

                        {/* Etapa / Sección */}
                        <td className="py-2.5 px-3 text-slate-300 font-bold text-xs bg-slate-850">
                          {doc.etapa} {doc.seccion ? `• ${doc.seccion}` : ''}
                        </td>

                        {/* Rev */}
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-400 text-xs bg-slate-850">
                          {doc.revision || '-'}
                        </td>

                        {/* Estado */}
                        <td className="py-2.5 px-3 text-center bg-slate-850">
                          <span className="inline-block py-0.5 px-2 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold">
                            {doc.estado}
                          </span>
                        </td>

                        {/* Acciones */}
                        <td className="py-2.5 px-3 text-center bg-slate-850">
                          {currentUserRole === 'Empresa' && (
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                onClick={() => handleOpenEditDocModal(doc)}
                                className="p-1 text-slate-400 hover:text-amber-400 rounded transition"
                                title="Editar título"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmDoc(doc)}
                                className="p-1 text-slate-400 hover:text-rose-400 rounded transition"
                                title="Eliminar título"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/80 transition group">
                      {/* Sticky Left WBS */}
                      <td className="sticky left-0 z-20 bg-white group-hover:bg-slate-50 py-3 px-2 font-bold font-mono text-indigo-700 text-xs border-r border-slate-100 min-w-[65px] w-[65px]">
                        {doc.wbs}
                      </td>

                      {/* Sticky Left Ítem */}
                      <td className="sticky left-[65px] z-20 bg-white group-hover:bg-slate-50 py-3 px-2 font-bold text-slate-400 font-mono text-[11px] border-r border-slate-100 min-w-[50px] w-[50px]">
                        {doc.item || '-'}
                      </td>

                      {/* Sticky Left Tipo Documento Badge */}
                      <td className="sticky left-[115px] z-20 bg-white group-hover:bg-slate-50 py-3 px-2 border-r border-slate-100 min-w-[75px] w-[75px]">
                        <span className={`inline-block py-0.5 px-1.5 rounded-md font-black text-[10px] tracking-wider uppercase border ${
                          doc.tipoDocumento === 'DWG' 
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : doc.tipoDocumento === 'DOC'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {doc.tipoDocumento}
                        </span>
                      </td>

                      {/* Sticky Left Codificación */}
                      <td className="sticky left-[190px] z-20 bg-white group-hover:bg-slate-50 py-3 px-2.5 font-mono font-bold text-slate-850 text-xs border-r border-slate-100 min-w-[135px] w-[135px]">
                        {doc.codificacion}
                      </td>

                      {/* Sticky Left Descripción (FIXED ON HORIZONTAL SCROLL) */}
                      <td className="sticky left-[325px] z-20 bg-white group-hover:bg-slate-50 py-3 px-3.5 font-semibold text-slate-800 leading-snug border-r-2 border-slate-200 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)] min-w-[320px] max-w-[420px]">
                        {doc.descripcion}
                        {doc.observaciones && (
                          <span className="block text-[10px] text-slate-400 font-normal italic mt-0.5">
                            Obs: {doc.observaciones}
                          </span>
                        )}
                      </td>

                      {/* Etapa / Sección */}
                      <td className="py-3 px-3 text-slate-600 font-medium">
                        <span className="font-bold text-slate-700">{doc.etapa}</span>
                        {doc.seccion && <span className="text-slate-400 text-[11px] block">{doc.seccion}</span>}
                      </td>

                      {/* Rev. */}
                      <td className="py-3 px-2 text-center font-mono font-bold text-slate-600">
                        {doc.revision || '-'}
                      </td>

                      {/* Estado */}
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border ${
                          doc.estado === 'Aprobado' || doc.estado === 'Vigente'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : doc.estado === 'En Revisión'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : doc.estado === 'Emitido'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {doc.estado}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-3 text-center">
                        {currentUserRole === 'Empresa' && (
                          <div className="flex items-center justify-center space-x-1 opacity-80 group-hover:opacity-100 transition">
                            <button
                              onClick={() => handleOpenEditDocModal(doc)}
                              className="p-1 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition"
                              title="Editar documento"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmDoc(doc)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                              title="Eliminar documento"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: MASS UPLOAD EXCEL / CSV */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-3xl rounded-2xl border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800">Carga Masiva de Documentos WBS</h3>
                    <p className="text-xs text-slate-500">Seleccione un archivo Excel (.xlsx) con la estructura del listado master</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadFile(null);
                    setParsedRows([]);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5 overflow-y-auto grow">
                
                {/* File Dropzone */}
                {!uploadFile ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50 hover:bg-indigo-50/40 rounded-2xl p-8 text-center cursor-pointer transition group"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFileSelected(f);
                      }}
                    />
                    <FileSpreadsheet className="w-12 h-12 text-slate-400 group-hover:text-indigo-600 mx-auto mb-3 transition" />
                    <p className="text-sm font-black text-slate-700 group-hover:text-indigo-900">
                      Haga clic o arrastre su archivo Excel aquí
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Soporta .xlsx, .xls y .csv con columna WBS</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Selected File Card */}
                    <div className="p-3.5 bg-indigo-50/60 border border-indigo-200 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <FileCheck className="w-6 h-6 text-indigo-600" />
                        <div>
                          <p className="text-xs font-black text-slate-800">{uploadFile.name}</p>
                          <p className="text-[10px] text-slate-500">{(uploadFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setUploadFile(null);
                          setParsedRows([]);
                        }}
                        className="text-xs text-rose-600 hover:underline font-bold"
                      >
                        Cambiar
                      </button>
                    </div>

                    {/* Import Mode Radio */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                        Modo de Importación
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <label className={`flex items-center space-x-2 p-2.5 rounded-xl border cursor-pointer text-xs font-bold transition ${
                          importMode === 'replace' ? 'bg-indigo-50 border-indigo-300 text-indigo-900' : 'bg-white border-slate-200 text-slate-600'
                        }`}>
                          <input
                            type="radio"
                            name="importMode"
                            checked={importMode === 'replace'}
                            onChange={() => setImportMode('replace')}
                            className="text-indigo-600"
                          />
                          <span>Reemplazar listado actual ({projectDocs.length} items)</span>
                        </label>

                        <label className={`flex items-center space-x-2 p-2.5 rounded-xl border cursor-pointer text-xs font-bold transition ${
                          importMode === 'append' ? 'bg-indigo-50 border-indigo-300 text-indigo-900' : 'bg-white border-slate-200 text-slate-600'
                        }`}>
                          <input
                            type="radio"
                            name="importMode"
                            checked={importMode === 'append'}
                            onChange={() => setImportMode('append')}
                            className="text-indigo-600"
                          />
                          <span>Agregar al listado existente</span>
                        </label>
                      </div>
                    </div>

                    {/* Parsed Rows Preview Table */}
                    {uploadLoading ? (
                      <div className="py-8 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
                        <span className="text-xs font-bold">Procesando y validando archivo...</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                          <span>Vista previa de filas a importar ({parsedRows.filter(r => r.isValid).length} válidas)</span>
                        </div>

                        <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl">
                          <table className="w-full text-left text-[11px] border-collapse">
                            <thead className="bg-slate-100 sticky top-0 font-extrabold text-slate-500">
                              <tr>
                                <th className="p-2 w-8">#</th>
                                <th className="p-2 w-12">WBS</th>
                                <th className="p-2 w-12">Ítem</th>
                                <th className="p-2 w-12">Tipo</th>
                                <th className="p-2 min-w-[110px]">Codificación</th>
                                <th className="p-2 min-w-[180px]">Descripción</th>
                                <th className="p-2 w-10">Estado</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-150 font-medium">
                              {parsedRows.map((r, i) => (
                                <tr key={i} className={r.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/50'}>
                                  <td className="p-2 text-slate-400">{r.rowNumber}</td>
                                  <td className="p-2 font-mono font-bold text-indigo-700">{r.wbs}</td>
                                  <td className="p-2 font-mono font-bold">{r.item}</td>
                                  <td className="p-2"><span className="font-bold uppercase">{r.tipoDocumento}</span></td>
                                  <td className="p-2 font-mono font-bold text-slate-800">{r.codificacion}</td>
                                  <td className="p-2 font-semibold text-slate-800">{r.descripcion}</td>
                                  <td className="p-2 font-bold">{r.estado}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
                <button
                  onClick={() => descargarPlantillaDocumentos()}
                  className="text-xs text-indigo-600 hover:underline font-bold flex items-center space-x-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar Plantilla de Ejemplo (.xlsx)</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setShowUploadModal(false);
                      setUploadFile(null);
                      setParsedRows([]);
                    }}
                    className="py-2 px-4 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    disabled={!uploadFile || parsedRows.filter(r => r.isValid).length === 0}
                    onClick={handleConfirmImport}
                    className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-600/20 transition"
                  >
                    Confirmar e Importar ({parsedRows.filter(r => r.isValid).length})
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 2: MANUAL CREATE / EDIT DOCUMENT */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showDocModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-2xl border border-slate-200 shadow-xl overflow-hidden"
            >
              <form onSubmit={handleSaveDocSubmit}>
                <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-base font-black text-slate-800">
                    {editingDoc ? 'Editar Documento' : 'Agregar Nuevo Documento'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowDocModal(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                  
                  {/* WBS Field with Auto-Suggestion Selector */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-indigo-700 uppercase tracking-wider mb-1">
                      Estructura WBS * (Ej: 1, 1.1, 1.2, 2.1)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        required
                        value={formWbs}
                        onChange={(e) => setFormWbs(e.target.value)}
                        placeholder="Ej: 1.3, 2.1, 3.2"
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-indigo-900 outline-none focus:border-indigo-500 focus:bg-white"
                      />
                      <select
                        value={formParentTitle}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormParentTitle(val);
                          const next = suggestNextWBS(val, formTipo === 'Título');
                          setFormWbs(next);
                        }}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-[11px] font-bold text-slate-700 outline-none"
                      >
                        <option value="">-- Nuevo Título Raíz --</option>
                        {projectDocs.filter(d => d.tipoDocumento === 'Título' || d.tipoDocumento === 'TITULO').map(t => (
                          <option key={t.id} value={t.wbs}>
                            Capítulo {t.wbs}: {t.descripcion}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Row 1: Item & Tipo */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Ítem</label>
                      <input
                        type="text"
                        value={formItem}
                        onChange={(e) => setFormItem(e.target.value)}
                        placeholder="Ej: 1, 100, -"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Tipo Documento</label>
                      <select
                        value={formTipo}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormTipo(val);
                          const next = suggestNextWBS(formParentTitle, val === 'Título');
                          setFormWbs(next);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                      >
                        <option value="DOC">DOC - Informe / Memoria</option>
                        <option value="DWG">DWG - Plano / Diagrama</option>
                        <option value="ACT">ACT - Chequeo / Acta</option>
                        <option value="Título">Título - Encabezado / Agrupador de Sección</option>
                      </select>
                    </div>
                  </div>

                  {/* Codificación */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Codificación / Código</label>
                    <input
                      type="text"
                      value={formCodificacion}
                      onChange={(e) => setFormCodificacion(e.target.value)}
                      placeholder="Ej: 0526-G-IN-0001"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 outline-none"
                    />
                  </div>

                  {/* Descripción */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Descripción / Título Documento *</label>
                    <textarea
                      required
                      rows={2}
                      value={formDescripcion}
                      onChange={(e) => setFormDescripcion(e.target.value)}
                      placeholder="Ej: Memoria de Cálculo Fundaciones de Equipos..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none"
                    />
                  </div>

                  {/* Row 2: Etapa & Sección */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Etapa</label>
                      <input
                        type="text"
                        value={formEtapa}
                        onChange={(e) => setFormEtapa(e.target.value)}
                        placeholder="Ej: ETAPA 1"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Sección / Paquete</label>
                      <input
                        type="text"
                        value={formSeccion}
                        onChange={(e) => setFormSeccion(e.target.value)}
                        placeholder="Ej: Ingeniería Básica"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                      />
                    </div>
                  </div>

                  {/* Row 3: Disciplina & Revisión */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Disciplina</label>
                      <select
                        value={formDisciplina}
                        onChange={(e) => setFormDisciplina(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                      >
                        <option value="Civil">Civil</option>
                        <option value="Electricidad">Electricidad</option>
                        <option value="Procesos">Procesos</option>
                        <option value="Cañerías">Cañerías</option>
                        <option value="Instrumentación">Instrumentación</option>
                        <option value="Mecánica">Mecánica</option>
                        <option value="Electromecánica">Electromecánica</option>
                        <option value="General">General</option>
                        <option value="P.Management">P.Management</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Revisión</label>
                      <input
                        type="text"
                        value={formRevision}
                        onChange={(e) => setFormRevision(e.target.value)}
                        placeholder="Ej: A, B, 0"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                      />
                    </div>
                  </div>

                  {/* Estado */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Estado</label>
                    <select
                      value={formEstado}
                      onChange={(e) => setFormEstado(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                    >
                      <option value="Aprobado">Aprobado</option>
                      <option value="En Revisión">En Revisión</option>
                      <option value="Emitido">Emitido</option>
                      <option value="Pendiente">Pendiente</option>
                    </select>
                  </div>

                  {/* Observaciones */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Observaciones</label>
                    <input
                      type="text"
                      value={formObservaciones}
                      onChange={(e) => setFormObservaciones(e.target.value)}
                      placeholder="Notas adicionales opcionales..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none"
                    />
                  </div>

                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowDocModal(false)}
                    className="py-2 px-4 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-600/20"
                  >
                    Guardar Documento
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 3: DELETE CONFIRMATION */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {deleteConfirmDoc && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-xl overflow-hidden p-6 space-y-4"
            >
              <div className="flex items-center space-x-3 text-rose-600">
                <div className="p-2.5 bg-rose-50 rounded-2xl">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-base font-black text-slate-800">¿Eliminar Documento?</h3>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Está a punto de eliminar el documento WBS <strong className="font-mono">{deleteConfirmDoc.wbs}</strong> ({deleteConfirmDoc.codificacion}) - "{deleteConfirmDoc.descripcion}". Esta acción no se puede deshacer.
              </p>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  onClick={() => setDeleteConfirmDoc(null)}
                  className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeleteDoc(deleteConfirmDoc.id)}
                  className="py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md shadow-rose-600/20"
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

import React, { useState, useRef } from 'react';
import { Project, Activity } from '../types';
import { descargarPlantillaActividades } from '../utils/plantillaActividadesExcel';
import { leerFilasDeExcel, aplicarImportacionActividades } from '../utils/importarActividadesExcel';
import { validarActividadesImportadas, ValidatedRow } from '../utils/validarActividadesImportadas';
import { exportarActividadesExcel } from '../utils/exportarActividadesExcel';
import { formatearMoneda } from '../utils/formato';
import { 
  Download, Upload, CheckCircle2, AlertTriangle, XCircle, Trash2, 
  Eye, EyeOff, FileSpreadsheet, RefreshCw, FileUp, Database, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CargaMasivaActividadesProps {
  project: Project;
  activities: Activity[];
  onImportSuccess: (updatedActivities: Activity[]) => void;
  currentUserRole?: string;
}

export default function CargaMasivaActividades({
  project,
  activities,
  onImportSuccess,
  currentUserRole = 'Empresa'
}: CargaMasivaActividadesProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    validatedRows: ValidatedRow[];
    totalRows: number;
    totalValidas: number;
    totalConErrores: number;
    totalConAdvertencias: number;
  } | null>(null);

  const [importOption, setImportOption] = useState<'replace' | 'append' | 'update'>('update');
  const [showPreview, setShowPreview] = useState(true);
  const [importSummary, setImportSummary] = useState<{
    success: boolean;
    totalImported: number;
    totalUpdated: number;
    totalOmitted: number;
  } | null>(null);

  const [modalAlert, setModalAlert] = useState<{
    title: string;
    message: string;
    type: 'error' | 'warning' | 'success';
  } | null>(null);

  const [modalConfirm, setModalConfirm] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter activities corresponding only to current project
  const projectActivities = activities.filter(a => a.idProyecto === project.idProyecto);

  const handleDownloadTemplate = () => {
    descargarPlantillaActividades();
  };

  const handleExportCurrent = () => {
    exportarActividadesExcel(projectActivities, project.nombreProyecto, currentUserRole);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setImportSummary(null);
    setValidationResult(null);
    await processAndValidateFile(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
      setFile(droppedFile);
      setImportSummary(null);
      setValidationResult(null);
      await processAndValidateFile(droppedFile);
    }
  };

  const processAndValidateFile = async (selectedFile: File) => {
    setLoading(true);
    try {
      const rawRows = await leerFilasDeExcel(selectedFile);
      const results = validarActividadesImportadas(rawRows, projectActivities);
      setValidationResult(results);
    } catch (err) {
      console.error(err);
      setModalAlert({
        title: 'Error de Lectura',
        message: 'Ocurrió un error al intentar abrir y validar el archivo Excel. Por favor verifique que sea un libro de Excel válido (.xlsx o .xls), no esté dañado ni con contraseña de seguridad.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setValidationResult(null);
    setImportSummary(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleValidateManual = async () => {
    if (!file) return;
    await processAndValidateFile(file);
  };

  const executeFinalImport = (validRows: ValidatedRow[]) => {
    setLoading(true);
    setTimeout(() => {
      try {
        const updatedGlobalActivities = aplicarImportacionActividades(
          validRows,
          project.idProyecto,
          activities,
          importOption
        );

        // Calculate counts
        let importedCount = 0;
        let updatedCount = 0;

        if (importOption === 'replace') {
          importedCount = validRows.length;
        } else if (importOption === 'append') {
          importedCount = validRows.length;
        } else if (importOption === 'update') {
          validRows.forEach(row => {
            const exists = projectActivities.some(a => a.wbs === row.wbs);
            if (exists) {
              updatedCount++;
            } else {
              importedCount++;
            }
          });
        }

        // Trigger state updates
        onImportSuccess(updatedGlobalActivities);

        setImportSummary({
          success: true,
          totalImported: importedCount,
          totalUpdated: updatedCount,
          totalOmitted: validationResult!.totalConErrores
        });

        // Clear file state after successful import
        setFile(null);
        setValidationResult(null);
      } catch (err) {
        console.error(err);
        setModalAlert({
          title: 'Error de Importación',
          message: 'Ocurrió un error inesperado al aplicar las actividades validadas en el proyecto.',
          type: 'error'
        });
      } finally {
        setLoading(false);
      }
    }, 800);
  };

  const handleImport = () => {
    if (!validationResult || !project) return;
    
    const validRows = validationResult.validatedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      setModalAlert({
        title: 'Sin Registros Válidos',
        message: 'No existen actividades válidas para importar en este archivo. Por favor revise y corrija los errores señalados en color rojo en la tabla de vista previa.',
        type: 'error'
      });
      return;
    }

    const proceedWithWarningsCheck = () => {
      if (validationResult.totalConAdvertencias > 0) {
        setModalConfirm({
          title: 'Confirmar con Advertencias',
          message: `La planilla contiene ${validationResult.totalConAdvertencias} fila(s) con advertencias no-bloqueantes. ¿Desea confirmar la importación con estas advertencias?`,
          onConfirm: () => {
            setModalConfirm(null);
            executeFinalImport(validRows);
          }
        });
      } else {
        executeFinalImport(validRows);
      }
    };

    if (validationResult.totalConErrores > 0) {
      setModalConfirm({
        title: 'Ignorar Errores Críticos',
        message: `La planilla contiene ${validationResult.totalConErrores} fila(s) con errores graves que se OMITIRÁN. ¿Desea proceder e importar únicamente las ${validationResult.totalValidas} fila(s) completamente correctas?`,
        onConfirm: () => {
          setModalConfirm(null);
          proceedWithWarningsCheck();
        }
      });
    } else {
      proceedWithWarningsCheck();
    }
  };

  return (
    <div className="space-y-6 text-xs font-sans">
      
      {/* HEADER SECTION */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <h3 className="text-base font-black text-slate-800 tracking-tight">Carga Masiva de Actividades</h3>
          <p className="text-[11px] text-slate-450 mt-1 leading-relaxed">
            Descargue la plantilla Excel, complete las actividades del proyecto y luego vuelva a cargar el archivo para importar la información automáticamente.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadTemplate}
            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-3.5 py-2 rounded-xl transition flex items-center space-x-1.5 border border-indigo-150"
            title="Descargar Plantilla Vacía"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar Plantilla de Actividades</span>
          </button>

          <button
            onClick={handleExportCurrent}
            disabled={projectActivities.length === 0}
            className="bg-slate-50 hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-slate-50 text-slate-700 font-bold px-3.5 py-2 rounded-xl transition flex items-center space-x-1.5 border border-slate-200"
            title="Exportar actividades actuales del proyecto"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Exportar Actividades Actuales</span>
          </button>
        </div>
      </div>

      {/* IMPORT SUCCESS NOTIFICATION SUMMARY */}
      {importSummary && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start space-x-3.5 shadow-sm"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 space-y-1">
            <h4 className="font-extrabold text-emerald-800 text-sm">¡Actividades importadas correctamente!</h4>
            <p className="text-[11px] text-emerald-700">La base de datos, el cronograma de Gantt, la curva S y los indicadores clave del Dashboard se han actualizado automáticamente.</p>
            <div className="flex flex-wrap gap-4 pt-2 text-[10px] font-bold text-emerald-800">
              <span className="bg-white/80 px-2.5 py-1 rounded-lg border border-emerald-150">Total Creadas: {importSummary.totalImported}</span>
              <span className="bg-white/80 px-2.5 py-1 rounded-lg border border-emerald-150">Total Actualizadas por WBS: {importSummary.totalUpdated}</span>
              {importSummary.totalOmitted > 0 && (
                <span className="bg-rose-100/80 text-rose-800 px-2.5 py-1 rounded-lg border border-rose-200">Total Omitidas por Error: {importSummary.totalOmitted}</span>
              )}
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: UPLOADER & CONFIGS */}
        <div className="xl:col-span-1 space-y-6">
          
          {/* UPLOAD ZONE CARD */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">1. Cargar Archivo Excel</h4>
            
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2.5 ${
                file 
                  ? 'border-indigo-500 bg-indigo-50/20' 
                  : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
              }`}
            >
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx, .xls"
                className="hidden"
              />
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${file ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                <FileUp className="w-5 h-5" />
              </div>
              <div>
                <p className="font-extrabold text-slate-800 text-xs">
                  {file ? file.name : 'Arrastre su archivo de Excel aquí'}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  {file ? `${(file.size / 1024).toFixed(1)} KB` : 'o haga clic para examinar sus archivos (.xlsx)'}
                </p>
              </div>
            </div>

            {file && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleValidateManual}
                  disabled={loading}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-bold py-2 px-3 rounded-xl transition flex items-center justify-center space-x-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Volver a Validar</span>
                </button>
                <button
                  onClick={handleClear}
                  disabled={loading}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold p-2 rounded-xl transition border border-rose-150"
                  title="Limpiar Selección"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* IMPORT OPTIONS CARD */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">2. Opciones de Importación</h4>
            
            <div className="space-y-2.5">
              <label 
                className={`flex items-start space-x-3 p-3 rounded-xl border cursor-pointer transition ${
                  importOption === 'update' 
                    ? 'border-indigo-500 bg-indigo-50/10 text-indigo-950 font-semibold' 
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <input 
                  type="radio" 
                  name="importOption" 
                  value="update" 
                  checked={importOption === 'update'}
                  onChange={() => setImportOption('update')}
                  className="mt-0.5 accent-indigo-600"
                />
                <div>
                  <span className="block text-xs font-extrabold">Actualizar actividades por WBS</span>
                  <span className="block text-[10px] text-slate-400 mt-0.5 font-normal">
                    Si el WBS ya existe, sobrescribe sus campos. Si no existe, lo agrega como una nueva actividad.
                  </span>
                </div>
              </label>

              <label 
                className={`flex items-start space-x-3 p-3 rounded-xl border cursor-pointer transition ${
                  importOption === 'replace' 
                    ? 'border-indigo-500 bg-indigo-50/10 text-indigo-950 font-semibold' 
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <input 
                  type="radio" 
                  name="importOption" 
                  value="replace" 
                  checked={importOption === 'replace'}
                  onChange={() => setImportOption('replace')}
                  className="mt-0.5 accent-indigo-600"
                />
                <div>
                  <span className="block text-xs font-extrabold text-rose-700">Reemplazar actividades actuales</span>
                  <span className="block text-[10px] text-slate-400 mt-0.5 font-normal">
                    Elimina por completo las actividades actuales de este proyecto e importa exclusivamente lo cargado en el Excel.
                  </span>
                </div>
              </label>

              <label 
                className={`flex items-start space-x-3 p-3 rounded-xl border cursor-pointer transition ${
                  importOption === 'append' 
                    ? 'border-indigo-500 bg-indigo-50/10 text-indigo-950 font-semibold' 
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <input 
                  type="radio" 
                  name="importOption" 
                  value="append" 
                  checked={importOption === 'append'}
                  onChange={() => setImportOption('append')}
                  className="mt-0.5 accent-indigo-600"
                />
                <div>
                  <span className="block text-xs font-extrabold">Agregar actividades al proyecto</span>
                  <span className="block text-[10px] text-slate-400 mt-0.5 font-normal">
                    Mantiene intacto el cronograma existente y anexa las filas del Excel al final (pueden duplicarse WBS).
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* CONFIRM ACTION CARD */}
          {validationResult && (
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-slate-900 text-white rounded-2xl p-5 shadow-xl space-y-4"
            >
              <h4 className="font-extrabold text-white text-xs uppercase tracking-wider flex items-center space-x-2">
                <Database className="w-4 h-4 text-indigo-400" />
                <span>3. Ejecutar Importación</span>
              </h4>
              
              <div className="space-y-2 text-[11px] text-slate-300">
                <div className="flex justify-between border-b border-slate-800 pb-1.5">
                  <span>Proyecto Destino:</span>
                  <span className="font-extrabold text-white">{project.nombreProyecto}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1.5">
                  <span>Modo de Carga:</span>
                  <span className="font-extrabold text-indigo-300">
                    {importOption === 'replace' ? 'Reemplazo Absoluto' : importOption === 'append' ? 'Anexión Simple' : 'Actualización por WBS'}
                  </span>
                </div>
                <div className="flex justify-between pb-0.5">
                  <span>Filas a Importar:</span>
                  <span className="font-extrabold text-emerald-400">{validationResult.totalValidas}</span>
                </div>
              </div>

              <button
                onClick={handleImport}
                disabled={validationResult.totalValidas === 0 || loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white font-black py-2.5 px-4 rounded-xl transition flex items-center justify-center space-x-2 text-xs shadow-lg shadow-indigo-600/25"
              >
                <span>Confirmar e Importar</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

        </div>

        {/* RIGHT COLUMN: VALIDATION RESULTS SUMMARY & PREVIEW */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* VALIDATION INDICATORS BOARD */}
          {validationResult ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              
              <div className="bg-white p-4 rounded-2xl border border-slate-250 shadow-sm flex items-center space-x-3.5">
                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none">Detectadas</span>
                  <span className="block text-lg font-black text-slate-800 mt-1">{validationResult.totalRows}</span>
                </div>
              </div>

              <div className={`bg-white p-4 rounded-2xl border shadow-sm flex items-center space-x-3.5 ${validationResult.totalValidas > 0 ? 'border-emerald-200' : 'border-slate-250'}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${validationResult.totalValidas > 0 ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none">Válidas</span>
                  <span className={`block text-lg font-black mt-1 ${validationResult.totalValidas > 0 ? 'text-emerald-600' : 'text-slate-800'}`}>{validationResult.totalValidas}</span>
                </div>
              </div>

              <div className={`bg-white p-4 rounded-2xl border shadow-sm flex items-center space-x-3.5 ${validationResult.totalConErrores > 0 ? 'border-rose-200 bg-rose-50/10' : 'border-slate-250'}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${validationResult.totalConErrores > 0 ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
                  <XCircle className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none">Con Error</span>
                  <span className={`block text-lg font-black mt-1 ${validationResult.totalConErrores > 0 ? 'text-rose-600' : 'text-slate-800'}`}>{validationResult.totalConErrores}</span>
                </div>
              </div>

              <div className={`bg-white p-4 rounded-2xl border shadow-sm flex items-center space-x-3.5 ${validationResult.totalConAdvertencias > 0 ? 'border-amber-200 bg-amber-50/10' : 'border-slate-250'}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${validationResult.totalConAdvertencias > 0 ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none">Advertencias</span>
                  <span className={`block text-lg font-black mt-1 ${validationResult.totalConAdvertencias > 0 ? 'text-amber-500' : 'text-slate-800'}`}>{validationResult.totalConAdvertencias}</span>
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-indigo-50/30 rounded-2xl border border-indigo-100 p-8 text-center space-y-3 shadow-sm">
              <FileUp className="w-10 h-10 text-indigo-500 mx-auto" />
              <div className="max-w-md mx-auto">
                <h4 className="font-extrabold text-indigo-950 text-xs uppercase tracking-wider">Esperando Planilla de Carga</h4>
                <p className="text-[11px] text-indigo-700/85 mt-1 leading-relaxed">
                  Suba o arrastre un archivo Excel completo. El validador inteligente procesará de forma inmediata cada fila, analizando la coherencia estructural de los WBS, consistencia de cronograma, y estados.
                </p>
              </div>
            </div>
          )}

          {/* INTERACTIVE PREVIEW TABLE */}
          {validationResult && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm space-y-0.5">
              
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Detalle y Vista Previa de Filas</h4>
                  <span className="bg-slate-100 text-slate-600 font-bold text-[10px] px-2 py-0.5 rounded-full">
                    {validationResult.validatedRows.length} fila(s)
                  </span>
                </div>
                
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center space-x-1"
                >
                  {showPreview ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Ocultar Grilla</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>Mostrar Grilla</span>
                    </>
                  )}
                </button>
              </div>

              {showPreview && (
                <div className="overflow-x-auto max-h-[480px]">
                  <table className="w-full text-[11px] text-slate-600 border-collapse">
                    <thead className="bg-slate-50 text-slate-450 uppercase font-bold text-[9px] tracking-widest border-b border-slate-200 sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-2.5 text-center w-12">Fila</th>
                        <th className="px-3 py-2.5 text-left w-16">WBS</th>
                        <th className="px-3 py-2.5 text-left w-20">Registro</th>
                        <th className="px-3 py-2.5 text-left">Tarea</th>
                        <th className="px-3 py-2.5 text-left w-20">Disciplina</th>
                        <th className="px-3 py-2.5 text-left w-20">Etapa</th>
                        <th className="px-3 py-2.5 text-left w-24">Responsable</th>
                        <th className="px-3 py-2.5 text-center w-20">Estado</th>
                        <th className="px-3 py-2.5 text-center w-24">Planificación</th>
                        {currentUserRole !== 'Control de Proyecto' && (
                          <th className="px-3 py-2.5 text-right w-24">Valor</th>
                        )}
                        <th className="px-3 py-2.5 text-center w-16">% Avance</th>
                        <th className="px-4 py-2.5 text-left min-w-[180px]">Estado Validación</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {validationResult.validatedRows.map((row) => {
                        const hasErrors = row.errors.length > 0;
                        const hasWarnings = row.warnings.length > 0;
                        
                        let rowBg = 'hover:bg-slate-50/50';
                        if (hasErrors) rowBg = 'bg-rose-50/20 hover:bg-rose-50/40';
                        else if (hasWarnings) rowBg = 'bg-amber-50/10 hover:bg-amber-50/25';

                        return (
                          <tr key={row.rowNum} className={`transition ${rowBg}`}>
                            <td className="px-3 py-2.5 text-center font-bold text-slate-400">{row.rowNum}</td>
                            <td className="px-3 py-2.5 font-bold text-slate-700">{row.wbs}</td>
                            <td className="px-3 py-2.5">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                row.tipoRegistro === 'Título' ? 'bg-purple-50 text-purple-700 border border-purple-150' :
                                row.tipoRegistro === 'Hito' ? 'bg-blue-50 text-blue-700 border border-blue-150' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                {row.tipoRegistro}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 font-semibold text-slate-800 line-clamp-2 max-w-xs">{row.tarea || '-'}</td>
                            <td className="px-3 py-2.5 text-slate-500 uppercase">{row.disciplina || '-'}</td>
                            <td className="px-3 py-2.5 text-slate-500">{row.etapa || '-'}</td>
                            <td className="px-3 py-2.5 text-slate-500">{row.responsable || '-'}</td>
                            <td className="px-3 py-2.5 text-center">
                              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                                row.estado === 'Completada' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                row.estado === 'En Curso' ? 'bg-sky-50 text-sky-700 border border-sky-200' :
                                row.estado === 'Pausada' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                'bg-slate-100 text-slate-500'
                              }`}>
                                {row.estado}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-center text-slate-450 leading-tight">
                              <span className="block font-medium text-slate-700">{row.inicioPlanificado}</span>
                              <span className="text-[10px]">al {row.finPlanificado}</span>
                            </td>
                            {currentUserRole !== 'Control de Proyecto' && (
                              <td className="px-3 py-2.5 text-right font-bold text-slate-700">
                                {formatearMoneda(row.valorTarea, project.moneda)}
                              </td>
                            )}
                            <td className="px-3 py-2.5 text-center font-bold text-slate-700">{row.avanceReal}%</td>
                            
                            {/* VALIDATION DETAILS */}
                            <td className="px-4 py-2.5">
                              {hasErrors ? (
                                <div className="space-y-1">
                                  {row.errors.map((err, i) => (
                                    <div key={i} className="flex items-start space-x-1.5 text-rose-700 font-semibold leading-tight">
                                      <XCircle className="w-3.5 h-3.5 shrink-0 text-rose-500 mt-0.5" />
                                      <span>{err}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : hasWarnings ? (
                                <div className="space-y-1">
                                  {row.warnings.map((warn, i) => (
                                    <div key={i} className="flex items-start space-x-1.5 text-amber-700 font-semibold leading-tight">
                                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-500 mt-0.5" />
                                      <span>{warn}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="flex items-center space-x-1 text-emerald-700 font-bold">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                  <span>Fila Correcta</span>
                                </div>
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
          )}

        </div>

      </div>

      <AnimatePresence>
        {/* CUSTOM ALERT MODAL */}
        {modalAlert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full border border-slate-200 shadow-xl space-y-4"
            >
              <div className="flex items-start space-x-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  modalAlert.type === 'error' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                  modalAlert.type === 'warning' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                  'bg-emerald-50 text-emerald-600 border border-emerald-100'
                }`}>
                  {modalAlert.type === 'error' ? (
                    <XCircle className="w-5 h-5" />
                  ) : modalAlert.type === 'warning' ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800">{modalAlert.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{modalAlert.message}</p>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setModalAlert(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2 rounded-xl text-xs transition"
                >
                  Entendido
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* CUSTOM CONFIRM MODAL */}
        {modalConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full border border-slate-200 shadow-xl space-y-4"
            >
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800">{modalConfirm.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{modalConfirm.message}</p>
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => setModalConfirm(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3.5 py-2 rounded-xl text-xs transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={modalConfirm.onConfirm}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-4 py-2 rounded-xl text-xs transition shadow-md shadow-indigo-600/15"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

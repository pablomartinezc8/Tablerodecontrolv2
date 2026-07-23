import * as XLSX from 'xlsx';
import { Activity } from '../types';
import { calcularDuracion, calcularAvancePlanificado, calcularAtrasoDias, HOY } from './projectCalculations';

/**
 * Parsea un valor de fecha obtenido desde Excel y lo convierte a formato string ISO "YYYY-MM-DD"
 */
export function excelDateToISOString(val: any): string | undefined {
  if (val === undefined || val === null || val === '') return undefined;
  
  // 1. Si ya es una instancia de Date
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  
  // 2. Si es número (formato serial de Excel)
  if (typeof val === 'number') {
    // 25569 es la compensación para epoch de Unix en días desde 1900-01-01
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  
  // 3. Si es un string
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return undefined;
    
    // Formato dd/mm/aaaa
    const partsSlash = trimmed.split('/');
    if (partsSlash.length === 3) {
      const d = partsSlash[0].padStart(2, '0');
      const m = partsSlash[1].padStart(2, '0');
      let y = partsSlash[2];
      if (y.length === 2) y = '20' + y; // auto-corrección de año de 2 dígitos
      return `${y}-${m}-${d}`;
    }

    // Formato yyyy-mm-dd o dd-mm-yyyy
    const partsDash = trimmed.split('-');
    if (partsDash.length === 3) {
      if (partsDash[0].length === 4) {
        return `${partsDash[0]}-${partsDash[1].padStart(2, '0')}-${partsDash[2].padStart(2, '0')}`;
      } else {
        return `${partsDash[2]}-${partsDash[1].padStart(2, '0')}-${partsDash[0].padStart(2, '0')}`;
      }
    }
  }
  return undefined;
}

/**
 * Lee un archivo de Excel y devuelve un listado de filas como objetos JSON.
 */
export function leerFilasDeExcel(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          resolve([]);
          return;
        }
        
        // Cargar libro de Excel usando array buffer
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        
        // Seleccionar hoja llamada "Actividades" o la primera disponible
        const sheetName = workbook.SheetNames.includes("Actividades") 
          ? "Actividades" 
          : workbook.SheetNames[0];
          
        const worksheet = workbook.Sheets[sheetName];
        
        // Convertir hoja a JSON con celdas vacías por defecto en string vacío
        const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Aplica la importación final de las actividades válidas al listado global de actividades,
 * realizando los cálculos de campos automáticos de manera local.
 */
export function aplicarImportacionActividades(
  validatedRows: any[], // Solo las filas que pasaron la validación crítica (isValid === true)
  projectId: string,
  existingActivities: Activity[],
  option: 'replace' | 'append' | 'update'
): Activity[] {
  const nowStr = new Date().toISOString();
  
  // Separar actividades del proyecto activo y de otros proyectos
  const otherProjectsActivities = existingActivities.filter(a => a.idProyecto !== projectId);
  const currentProjectActivities = existingActivities.filter(a => a.idProyecto === projectId);

  let updatedProjectActivities: Activity[] = [];

  if (option === 'replace') {
    // Reemplazar todo: partimos con el arreglo vacío para este proyecto
    updatedProjectActivities = [];
  } else {
    // Agregar o actualizar: copiamos las actuales
    updatedProjectActivities = [...currentProjectActivities];
  }

  validatedRows.forEach((row) => {
    const nd = row.normalizedData;
    if (!nd) return;

    // Calcular campos dinámicos
    const duracionPlanificada = calcularDuracion(nd.inicioPlanificado, nd.finPlanificado);
    const duracionReal = nd.inicioReal && nd.finReal ? calcularDuracion(nd.inicioReal, nd.finReal) : undefined;
    const atrasoDias = calcularAtrasoDias(nd.finPlanificado, nd.finReal, nd.estado, HOY);
    const avancePlanificado = calcularAvancePlanificado(nd.inicioPlanificado, nd.finPlanificado, HOY);

    const baseActivity: Partial<Activity> = {
      idProyecto: projectId,
      wbs: nd.wbs,
      tipoRegistro: nd.tipoRegistro,
      tarea: nd.tarea,
      disciplina: nd.disciplina,
      etapa: nd.etapa,
      responsable: nd.responsable,
      critica: nd.critica,
      prioridad: nd.prioridad,
      estado: nd.estado,
      inicioPlanificado: nd.inicioPlanificado,
      finPlanificado: nd.finPlanificado,
      duracionPlanificada,
      inicioReal: nd.inicioReal || undefined,
      finReal: nd.finReal || undefined,
      duracionReal: duracionReal || 0,
      atrasoDias,
      valorTarea: nd.valorTarea,
      entregables: nd.entregables,
      observaciones: nd.observaciones,
      avancePlanificado,
      avanceReal: nd.avanceReal
    };

    if (option === 'update') {
      const existingIdx = updatedProjectActivities.findIndex(a => a.wbs === nd.wbs);
      if (existingIdx !== -1) {
        // Actualizar actividad existente: mantener ID y createdAt, actualizar updatedAt
        const prev = updatedProjectActivities[existingIdx];
        updatedProjectActivities[existingIdx] = {
          ...prev,
          ...baseActivity,
          id: prev.id,
          createdAt: prev.createdAt || nowStr,
          updatedAt: nowStr
        } as Activity;
      } else {
        // No existe: agregar como nueva
        const newAct: Activity = {
          ...baseActivity,
          id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          avancePorcentajeValor: 0,
          createdAt: nowStr,
          updatedAt: nowStr
        } as Activity;
        updatedProjectActivities.push(newAct);
      }
    } else {
      // Reemplazar o Agregar: simplemente agregamos como nueva actividad
      const newAct: Activity = {
        ...baseActivity,
        id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        avancePorcentajeValor: 0,
        createdAt: nowStr,
        updatedAt: nowStr
      } as Activity;
      updatedProjectActivities.push(newAct);
    }
  });

  // Recalcular % Ponderado del Valor del proyecto (avancePorcentajeValor)
  const totalValorProyecto = updatedProjectActivities.reduce((acc, a) => acc + (a.valorTarea || 0), 0);
  updatedProjectActivities.forEach(a => {
    a.avancePorcentajeValor = totalValorProyecto > 0 ? ((a.valorTarea || 0) / totalValorProyecto) * 100 : 0;
  });

  // Retornar la unión de actividades de otros proyectos con las de este proyecto actualizadas
  return [...otherProjectsActivities, ...updatedProjectActivities];
}

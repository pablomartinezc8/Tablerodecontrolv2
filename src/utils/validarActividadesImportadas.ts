import { Activity } from '../types';
import { excelDateToISOString } from './importarActividadesExcel';

export interface ValidatedRow {
  rowNum: number; // 2-indexed since row 1 is header
  wbs: string;
  tipoRegistro: string;
  tarea: string;
  disciplina: string;
  etapa: string;
  responsable: string;
  estado: string;
  inicioPlanificado: string;
  finPlanificado: string;
  valorTarea: number;
  avanceReal: number;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  normalizedData?: any; // Partial<Activity> structure
}

/**
 * Normaliza campos de opción única (Sí/No, Prioridad, Estado, Tipo)
 */
function normalizeDropdown(value: any, allowedMap: Record<string, string>, defaultValue?: string): { val: string; valid: boolean } {
  if (value === undefined || value === null || value === '') {
    return { val: defaultValue || '', valid: true };
  }
  const clean = String(value).trim().toLowerCase();
  
  // Try exact match in map
  if (allowedMap[clean] !== undefined) {
    return { val: allowedMap[clean], valid: true };
  }
  
  // Try loose contains or return invalid
  for (const [k, v] of Object.entries(allowedMap)) {
    if (clean.includes(k) || k.includes(clean)) {
      return { val: v, valid: true };
    }
  }
  
  return { val: String(value), valid: false };
}

/**
 * Valida y normaliza una lista de filas leídas del Excel.
 */
export function validarActividadesImportadas(
  rawRows: any[],
  existingActivities: Activity[]
): {
  validatedRows: ValidatedRow[];
  totalRows: number;
  totalValidas: number;
  totalConErrores: number;
  totalConAdvertencias: number;
} {
  const validatedRows: ValidatedRow[] = [];
  const seenWBSInFile = new Set<string>();
  const existingWBSMap = new Set(existingActivities.map(a => a.wbs));

  // Allowed values mapping for normalization
  const mapTipo: Record<string, string> = {
    'título': 'Título', 'titulo': 'Título',
    'tarea': 'Tarea',
    'subtarea': 'Subtarea',
    'hito': 'Hito'
  };

  const mapEstado: Record<string, string> = {
    'no iniciada': 'No Iniciada', 'no_iniciada': 'No Iniciada', 'no': 'No Iniciada',
    'en curso': 'En Curso', 'en_curso': 'En Curso', 'curso': 'En Curso', 'desarrollo': 'En Curso',
    'pausada': 'Pausada', 'suspendida': 'Pausada',
    'completada': 'Completada', 'terminada': 'Completada', 'finalizada': 'Completada',
    'cancelada': 'Cancelada', 'anulada': 'Cancelada'
  };

  const mapPrioridad: Record<string, string> = {
    'alta': 'Alta',
    'media': 'Media',
    'baja': 'Baja'
  };

  const mapSiNo: Record<string, string> = {
    'sí': 'Sí', 'si': 'Sí',
    'no': 'No'
  };

  rawRows.forEach((row, index) => {
    const rowNum = index + 2; // Data starts at line 2 in excel (line 1 is header)
    const errors: string[] = [];
    const warnings: string[] = [];

    // Extract raw fields (handle flexible headers casing/spacing)
    const getField = (keys: string[]): any => {
      for (const key of keys) {
        if (row[key] !== undefined) return row[key];
        // Loose search
        const match = Object.keys(row).find(k => k.toLowerCase().replace(/\s/g, '') === key.toLowerCase().replace(/\s/g, ''));
        if (match) return row[match];
      }
      return undefined;
    };

    const rawWbs = String(getField(['wbs', 'codigo_wbs']) || '').trim();
    const rawTipo = String(getField(['tipo registro', 'tiporegistro', 'tipo']) || '').trim();
    const rawTarea = String(getField(['tarea', 'actividad', 'descripcion']) || '').trim();
    const rawDisciplina = String(getField(['disciplina', 'area']) || '').trim();
    const rawEtapa = String(getField(['etapa', 'fase']) || '').trim();
    const rawResponsable = String(getField(['responsable', 'asignado']) || '').trim();
    const rawCritica = getField(['crítica', 'critica']);
    const rawPrioridad = getField(['prioridad']);
    const rawEstado = String(getField(['estado']) || '').trim();
    const rawInicioPlan = getField(['inicio planificado', 'inicioplanificado', 'fecha_inicio_plan', 'inicio_plan']);
    const rawFinPlan = getField(['fin planificado', 'finplanificado', 'fecha_fin_plan', 'fin_plan']);
    const rawInicioReal = getField(['inicio real', 'inicioreal', 'fecha_inicio_real', 'inicio_real']);
    const rawFinReal = getField(['fin real', 'finreal', 'fecha_fin_real', 'fin_real']);
    const rawValor = getField(['valor de tarea', 'valordetarea', 'valor_tarea', 'valor', 'presupuesto']);
    const rawEntregables = getField(['entregables', 'entregable']);
    const rawObservaciones = String(getField(['observaciones', 'comentarios', 'nota']) || '').trim();
    const rawAvanceReal = getField(['avance real', 'avancereal', 'avance_%', 'avance', 'porcentaje_avance']);

    // --- CRITICAL ERRORS ---

    // 1. WBS
    if (!rawWbs) {
      errors.push("WBS es obligatorio.");
    }

    // 2. Tipo Registro
    let finalTipo = '';
    if (!rawTipo) {
      errors.push("Tipo Registro es obligatorio.");
    } else {
      const norm = normalizeDropdown(rawTipo, mapTipo);
      if (!norm.valid) {
        errors.push(`Tipo Registro no válido ('${rawTipo}'). Valores admitidos: Título, Tarea, Subtarea, Hito.`);
      } else {
        finalTipo = norm.val;
      }
    }

    // 3. Tarea
    if (!rawTarea) {
      errors.push("Tarea (nombre o descripción) es obligatoria.");
    }

    // 4. Estado
    let finalEstado = '';
    if (!rawEstado) {
      errors.push("Estado es obligatorio.");
    } else {
      const norm = normalizeDropdown(rawEstado, mapEstado);
      if (!norm.valid) {
        errors.push(`Estado no válido ('${rawEstado}'). Valores admitidos: No Iniciada, En Curso, Pausada, Completada, Cancelada.`);
      } else {
        finalEstado = norm.val;
      }
    }

    // 5. Inicio y Fin Planificado
    const isoInicioPlan = excelDateToISOString(rawInicioPlan);
    const isoFinPlan = excelDateToISOString(rawFinPlan);

    if (!rawInicioPlan) {
      errors.push("Inicio Planificado es obligatorio.");
    } else if (!isoInicioPlan) {
      errors.push(`Fecha de Inicio Planificado no es válida o tiene un formato incorrecto.`);
    }

    if (!rawFinPlan) {
      errors.push("Fin Planificado es obligatorio.");
    } else if (!isoFinPlan) {
      errors.push(`Fecha de Fin Planificado no es válida o tiene un formato incorrecto.`);
    }

    if (isoInicioPlan && isoFinPlan) {
      if (isoFinPlan < isoInicioPlan) {
        errors.push("Fin Planificado no puede ser menor a Inicio Planificado.");
      }
    }

    // 6. Fechas reales (Opcional)
    const isoInicioReal = rawInicioReal ? excelDateToISOString(rawInicioReal) : undefined;
    const isoFinReal = rawFinReal ? excelDateToISOString(rawFinReal) : undefined;

    if (isoInicioReal && isoFinReal) {
      if (isoFinReal < isoInicioReal) {
        errors.push("Fin Real no puede ser menor a Inicio Real.");
      }
    }

    // 7. Valor de Tarea
    let valorTareaParsed = 0;
    if (rawValor !== undefined && rawValor !== null && rawValor !== '') {
      const valNum = Number(rawValor);
      if (isNaN(valNum)) {
        errors.push("Valor de Tarea debe ser un número válido.");
      } else if (valNum < 0) {
        errors.push("Valor de Tarea no puede ser negativo.");
      } else {
        valorTareaParsed = valNum;
      }
    }

    // 8. Avance Real
    let avanceRealParsed: number | undefined = undefined;
    if (rawAvanceReal !== undefined && rawAvanceReal !== null && rawAvanceReal !== '') {
      const valPct = Number(rawAvanceReal);
      if (isNaN(valPct)) {
        errors.push("Avance Real debe ser un número válido.");
      } else if (valPct < 0 || valPct > 100) {
        errors.push("Avance Real debe estar entre 0 y 100.");
      } else {
        avanceRealParsed = valPct;
      }
    }

    // 9. Dropdowns opcionales
    const normCritica = normalizeDropdown(rawCritica, mapSiNo, 'No');
    if (!normCritica.valid) {
      errors.push(`Crítica no es válida ('${rawCritica}'). Valores admitidos: Sí, No.`);
    }

    const normPrioridad = normalizeDropdown(rawPrioridad, mapPrioridad, 'Media');
    if (!normPrioridad.valid) {
      errors.push(`Prioridad no es válida ('${rawPrioridad}'). Valores admitidos: Alta, Media, Baja.`);
    }

    const normEntregables = normalizeDropdown(rawEntregables, mapSiNo, 'No');
    if (!normEntregables.valid) {
      errors.push(`Entregables no es válido ('${rawEntregables}'). Valores admitidos: Sí, No.`);
    }


    // --- WARNINGS ---

    // 1. WBS duplicado en archivo
    if (rawWbs) {
      if (seenWBSInFile.has(rawWbs)) {
        warnings.push("WBS duplicado dentro del archivo Excel.");
      } else {
        seenWBSInFile.add(rawWbs);
      }

      // 2. WBS ya existente en proyecto
      if (existingWBSMap.has(rawWbs)) {
        warnings.push("WBS ya existente en el proyecto.");
      }
    }

    // 3. Responsable vacío
    if (!rawResponsable) {
      warnings.push("Responsable vacío.");
    }

    // 4. Disciplina vacía
    if (!rawDisciplina) {
      warnings.push("Disciplina vacía.");
    }

    // 5. Etapa vacía
    if (!rawEtapa) {
      warnings.push("Etapa vacía.");
    }

    // 6. Valor vacío o cero
    if (valorTareaParsed === 0) {
      warnings.push("Valor de Tarea vacío o cero.");
    }

    // 7. En Curso sin Avance Real
    if (finalEstado === 'En Curso' && (avanceRealParsed === undefined || avanceRealParsed === 0)) {
      warnings.push("Actividad 'En Curso' sin Avance Real cargado (se iniciará en 0% salvo que cargue otro).");
    }

    // 8. Completada sin Fin Real
    if (finalEstado === 'Completada' && !isoFinReal) {
      warnings.push("Actividad 'Completada' sin Fin Real cargado (se estimará como Fin Planificado o quedará vacío).");
    }

    // 9. No Iniciada con Inicio Real
    if (finalEstado === 'No Iniciada' && isoInicioReal) {
      warnings.push("Actividad 'No Iniciada' con Inicio Real cargado.");
    }

    const isValid = errors.length === 0;

    // Build partial normalized activity
    let normalizedData = null;
    if (isValid) {
      // Determine default real progress based on state if empty
      let finalAvanceReal = 0;
      if (avanceRealParsed !== undefined) {
        finalAvanceReal = avanceRealParsed;
      } else {
        if (finalEstado === 'Completada') finalAvanceReal = 100;
        else if (finalEstado === 'En Curso') finalAvanceReal = 0; // Default to 0 if empty
      }

      normalizedData = {
        wbs: rawWbs,
        tipoRegistro: finalTipo,
        tarea: rawTarea,
        disciplina: rawDisciplina || 'GENERAL',
        etapa: rawEtapa || 'GENERAL',
        responsable: rawResponsable || 'Sin Asignar',
        critica: normCritica.val as 'Sí' | 'No',
        prioridad: normPrioridad.val as 'Alta' | 'Media' | 'Baja',
        estado: finalEstado as any,
        inicioPlanificado: isoInicioPlan!,
        finPlanificado: isoFinPlan!,
        inicioReal: isoInicioReal,
        finReal: isoFinReal,
        valorTarea: valorTareaParsed,
        entregables: normEntregables.val as 'Sí' | 'No',
        observaciones: rawObservaciones,
        avanceReal: finalAvanceReal
      };
    }

    validatedRows.push({
      rowNum,
      wbs: rawWbs,
      tipoRegistro: finalTipo || rawTipo,
      tarea: rawTarea,
      disciplina: rawDisciplina,
      etapa: rawEtapa,
      responsable: rawResponsable,
      estado: finalEstado || rawEstado,
      inicioPlanificado: isoInicioPlan || String(rawInicioPlan || ''),
      finPlanificado: isoFinPlan || String(rawFinPlan || ''),
      valorTarea: valorTareaParsed,
      avanceReal: avanceRealParsed ?? 0,
      isValid,
      errors,
      warnings,
      normalizedData
    });
  });

  const totalRows = validatedRows.length;
  const totalValidas = validatedRows.filter(r => r.isValid).length;
  const totalConErrores = validatedRows.filter(r => !r.isValid).length;
  const totalConAdvertencias = validatedRows.filter(r => r.isValid && r.warnings.length > 0).length;

  return {
    validatedRows,
    totalRows,
    totalValidas,
    totalConErrores,
    totalConAdvertencias
  };
}

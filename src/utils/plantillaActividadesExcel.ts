import * as XLSX from 'xlsx';

/**
 * Genera y descarga la plantilla modelo simplificada "Plantilla_Carga_Actividades.xlsx".
 * Contiene únicamente las hojas "Actividades" e "Instrucciones".
 */
export function descargarPlantillaActividades() {
  const workbook = XLSX.utils.book_new();

  // 1. Hoja "Actividades"
  const headers = [
    "WBS",
    "Tipo Registro",
    "Tarea",
    "Disciplina",
    "Etapa",
    "Responsable",
    "Crítica",
    "Prioridad",
    "Estado",
    "Inicio Planificado",
    "Fin Planificado",
    "Inicio Real",
    "Fin Real",
    "Valor de Tarea",
    "Entregables",
    "Observaciones",
    "Avance Real"
  ];

  const ejemplo1 = [
    "1",
    "Título",
    "INGENIERÍA GENERAL DEL PROYECTO",
    "GENERAL",
    "GENERAL",
    "Ing. Juan Pérez",
    "No",
    "Alta",
    "En Curso",
    "01/05/2026",
    "31/05/2026",
    "01/05/2026",
    "",
    1000000,
    "Sí",
    "Coordinación general e inicio de actividades",
    15
  ];

  const ejemplo2 = [
    "1.1",
    "Tarea",
    "Diseño Civil de Cimentaciones",
    "CIVIL",
    "ING. DETALLE",
    "Ing. Carlos Solis",
    "Sí",
    "Alta",
    "Completada",
    "02/05/2026",
    "15/05/2026",
    "02/05/2026",
    "14/05/2026",
    500000,
    "Sí",
    "Cálculos civiles aprobados por revisor",
    100
  ];

  const ejemplo3 = [
    "1.2",
    "Hito",
    "Aprobación de Planos Eléctricos",
    "ELECTRICIDAD",
    "ING. DETALLE",
    "Dra. Ana Gómez",
    "No",
    "Media",
    "No Iniciada",
    "20/05/2026",
    "20/05/2026",
    "",
    "",
    0,
    "No",
    "Hito contractual",
    0
  ];

  const dataActividades = [headers, ejemplo1, ejemplo2, ejemplo3];
  const wsActividades = XLSX.utils.aoa_to_sheet(dataActividades);

  // Ancho de columnas adecuado
  wsActividades['!cols'] = [
    { wch: 10 }, // WBS
    { wch: 15 }, // Tipo Registro
    { wch: 35 }, // Tarea
    { wch: 18 }, // Disciplina
    { wch: 18 }, // Etapa
    { wch: 20 }, // Responsable
    { wch: 10 }, // Crítica
    { wch: 12 }, // Prioridad
    { wch: 15 }, // Estado
    { wch: 18 }, // Inicio Planificado
    { wch: 18 }, // Fin Planificado
    { wch: 15 }, // Inicio Real
    { wch: 15 }, // Fin Real
    { wch: 15 }, // Valor de Tarea
    { wch: 12 }, // Entregables
    { wch: 30 }, // Observaciones
    { wch: 12 }  // Avance Real
  ];

  // Congelar primera fila
  wsActividades['!views'] = [
    { state: 'frozen', ySplit: 1, xSplit: 0, topLeftCell: 'A2', activePane: 'bottomLeft' }
  ];

  // Filtros activados
  wsActividades['!autofilter'] = { ref: "A1:Q4" };

  // 2. Hoja "Instrucciones"
  const instrucciones = [
    ["Instrucciones para la Carga Masiva de Actividades", ""],
    ["", ""],
    ["1. Complete únicamente la hoja \"Actividades\".", ""],
    ["2. No modifique los encabezados ni altere el orden de las columnas.", ""],
    ["3. No elimine columnas obligatorias.", ""],
    ["4. Columnas obligatorias (deben completarse para procesar la importación):", ""],
    ["   - WBS: Código jerárquico de la actividad (ej: 1, 2, 2.1, 2.1.1)", ""],
    ["   - Tipo Registro: Clasificación (Valores permitidos: Título, Tarea, Subtarea, Hito)", ""],
    ["   - Tarea: Nombre o descripción clara de la actividad", ""],
    ["   - Estado: Avance del estado (Valores permitidos: No Iniciada, En Curso, Pausada, Completada, Cancelada)", ""],
    ["   - Inicio Planificado: Fecha de inicio programada (formato dd/mm/aaaa o aaaa-mm-dd)", ""],
    ["   - Fin Planificado: Fecha de fin programada (formato dd/mm/aaaa, debe ser igual o mayor al Inicio)", ""],
    ["5. Fechas reales (Inicio Real / Fin Real):", ""],
    ["   - Opcionales, utilícelas para registrar el avance verídico de campo.", ""],
    ["6. Valor de Tarea:", ""],
    ["   - Número entero o decimal representativo para ponderar avances físicos generales.", ""],
    ["   - Si se deja vacío o en cero, se asumirá 0.", ""],
    ["7. Avance Real:", ""],
    ["   - Porcentaje opcional (entre 0 y 100).", ""],
    ["   - Si se deja vacío, se calculará automáticamente con base en el Estado:", ""],
    ["     * No Iniciada => 0%", ""],
    ["     * Completada => 100%", ""],
    ["     * En Curso => 0% (salvo que el usuario cargue otro valor)", ""],
    ["     * Pausada => 0% (salvo que el usuario cargue otro valor)", ""],
    ["     * Cancelada => 0% (salvo que el usuario cargue otro valor)", ""],
    ["8. Campos omitidos (No se deben incluir en el Excel porque la app los calcula solos):", ""],
    ["   - ID de la actividad, Duración Planificada/Real, Atraso en días, Avance % Valor y Avance Planificado.", ""],
    ["", ""],
    ["GLOSARIO DE OPCIONES ADMITIDAS:", ""],
    ["Tipo Registro:", "Título, Tarea, Subtarea, Hito"],
    ["Prioridad:", "Alta, Media, Baja (por defecto: Media)"],
    ["Crítica:", "Sí, No (por defecto: No)"],
    ["Entregables:", "Sí, No (por defecto: No)"],
    ["Estado:", "No Iniciada, En Curso, Pausada, Completada, Cancelada"]
  ];

  const wsInstrucciones = XLSX.utils.aoa_to_sheet(instrucciones);
  wsInstrucciones['!cols'] = [
    { wch: 45 },
    { wch: 55 }
  ];

  // Añadir hojas al libro
  XLSX.utils.book_append_sheet(workbook, wsActividades, "Actividades");
  XLSX.utils.book_append_sheet(workbook, wsInstrucciones, "Instrucciones");

  // Guardar archivo
  XLSX.writeFile(workbook, "Plantilla_Carga_Actividades.xlsx");
}

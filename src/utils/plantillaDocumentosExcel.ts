import * as XLSX from 'xlsx';

export function descargarPlantillaDocumentos() {
  // Define exact template headers including WBS
  const headers = [
    'WBS',
    'Ítem',
    'Tipo Documento',
    'Codificación',
    'Descripción',
    'Etapa',
    'Sección',
    'Disciplina',
    'Revisión',
    'Estado',
    'Observaciones'
  ];

  // Example sample rows directly illustrating WBS structure
  const sampleRows = [
    [
      '1',
      'I',
      'Título',
      '0526-CIV-00',
      'INGENIERÍA CIVIL',
      'ETAPA 1',
      'General',
      'Civil',
      '-',
      'Vigente',
      'Título Principal 1'
    ],
    [
      '1.1',
      '1',
      'DOC',
      '0526-C-MC-0001',
      'Memoria de Cálculo Fundaciones de Equipos',
      'ETAPA 1',
      'Ingeniería Básica',
      'Civil',
      'A',
      'Aprobado',
      'Cálculo fundaciones'
    ],
    [
      '1.2',
      '2',
      'DOC',
      '0526-C-ET-0001',
      'Especificación Técnica de Obra Civil',
      'ETAPA 1',
      'Ingeniería Básica',
      'Civil',
      'A',
      'Aprobado',
      'Especificaciones'
    ],
    [
      '1.3',
      '3',
      'DWG',
      '0526-C-PL-0001',
      'Plano General de Obra Civil',
      'ETAPA 1',
      'Ingeniería Básica',
      'Civil',
      'A',
      'Aprobado',
      'Plano general'
    ],
    [
      '2',
      'II',
      'Título',
      '0526-ELE-00',
      'INGENIERÍA ELECTROMECÁNICA',
      'ETAPA 1',
      'General',
      'Electromecánica',
      '-',
      'Vigente',
      'Título Principal 2'
    ],
    [
      '2.1',
      '4',
      'DWG',
      '0526-E-DU-0001',
      'Diagrama Unifilar Eléctrico de Potencia',
      'ETAPA 1',
      'Ingeniería Básica',
      'Electromecánica',
      'A',
      'Aprobado',
      'Unifilar'
    ],
    [
      '2.2',
      '5',
      'DOC',
      '0526-E-MC-0001',
      'Memoria Descriptiva Eléctrica',
      'ETAPA 1',
      'Ingeniería Básica',
      'Electromecánica',
      'A',
      'Aprobado',
      'Memoria descriptiva'
    ],
    [
      '3',
      'III',
      'Título',
      '0526-DET-00',
      'INGENIERÍA DE DETALLE',
      'ETAPA 2',
      'Ingeniería de Detalle',
      'General',
      '-',
      'Vigente',
      'Título Principal 3'
    ],
    [
      '3.1',
      '101',
      'DOC',
      '0526-C-MC-0101',
      'Memoria de Cálculo Fundaciones de Estructuras',
      'ETAPA 2',
      'Ingeniería de Detalle',
      'Civil',
      'A',
      'Aprobado',
      'Estructuras'
    ],
    [
      '3.2',
      '102',
      'DWG',
      '0526-C-PL-0101',
      'Fundaciones - Planos de Encofrados',
      'ETAPA 2',
      'Ingeniería de Detalle',
      'Civil',
      'A',
      'Aprobado',
      'Encofrados'
    ]
  ];

  // Instructions Sheet
  const instructionsData = [
    ['GUÍA DE LLENADO DE PLANTILLA DE DOCUMENTOS CON ESTRUCTURA WBS'],
    [''],
    ['CAMPOS Y VALORES PERMITIDOS:'],
    ['1. WBS: Código jerárquico numérico (Ej: 1, 2 para Títulos; 1.1, 1.2, 2.1, 2.2 para Documentos Hijos). Determina el orden visual jerárquico.'],
    ['2. Ítem: Número de ítem o correlativo opcional (Ej: 1, 2, 100, "-" o dejar vacío).'],
    ['3. Tipo Documento: "DOC" (Informes/Especificaciones), "DWG" (Planos), "ACT" (Actas/Chequeos), "Título" (Encabezado/Agrupador de sección).'],
    ['4. Codificación: Código oficial del documento (Ej: 0526-G-IN-0001, 0526-C-PL-0101, S/N).'],
    ['5. Descripción: Título o nombre descriptivo completo del documento o del Título WBS.'],
    ['6. Etapa: "ETAPA 1", "ETAPA 2", "Ingeniería Básica", "Ingeniería de Detalle", etc.'],
    ['7. Sección: "Paquete Electromecánico", "Paquete Obra Civil", "Ingeniería Básica", "Ingeniería de Detalle", "General", etc.'],
    ['8. Disciplina: "Civil", "Electricidad", "Procesos", "Cañerías", "Instrumentación", "Mecánica", "Electromecánica", "General".'],
    ['9. Revisión: "A", "B", "0", "1", "2".'],
    ['10. Estado: "Aprobado", "En Revisión", "Emitido", "Pendiente", "Vigente".'],
    ['11. Observaciones: Texto opcional.'],
    [''],
    ['INSTRUCCIONES:'],
    ['Complete las filas en la pestaña "Listado_Documentos" conservando el nombre de las columnas.'],
    ['Una vez completado el archivo, diríjase a la pestaña "Listado de Documentos" en la aplicación y presione "Cargar Excel / CSV"']
  ];

  const wb = XLSX.utils.book_new();

  // Create Data Sheet
  const wsData = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);

  // Adjust column widths
  wsData['!cols'] = [
    { wch: 10 }, // WBS
    { wch: 8 },  // Ítem
    { wch: 16 }, // Tipo Documento
    { wch: 22 }, // Codificación
    { wch: 55 }, // Descripción
    { wch: 15 }, // Etapa
    { wch: 28 }, // Sección
    { wch: 18 }, // Disciplina
    { wch: 10 }, // Revisión
    { wch: 15 }, // Estado
    { wch: 30 }  // Observaciones
  ];

  XLSX.utils.book_append_sheet(wb, wsData, 'Listado_Documentos');

  // Create Instructions Sheet
  const wsInst = XLSX.utils.aoa_to_sheet(instructionsData);
  wsInst['!cols'] = [{ wch: 100 }];
  XLSX.utils.book_append_sheet(wb, wsInst, 'Instrucciones');

  // Write and trigger download
  XLSX.writeFile(wb, 'Plantilla_Listado_Documentos_Proyecto.xlsx');
}

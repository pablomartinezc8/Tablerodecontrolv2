import * as XLSX from 'xlsx';
import { ProjectDocument } from '../types';

export interface RawDocumentRow {
  rowNumber: number;
  wbs: string;
  item: string;
  tipoDocumento: string;
  codificacion: string;
  descripcion: string;
  etapa: string;
  seccion: string;
  disciplina: string;
  revision: string;
  estado: string;
  observaciones: string;
  isValid: boolean;
  errors: string[];
}

export async function leerFilasDocumentosExcel(file: File): Promise<RawDocumentRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Select sheet: prefer 'Listado_Documentos' or 'Sheet1' or first sheet
        let sheetName = workbook.SheetNames.find(
          name => name.toLowerCase().includes('documento') || name.toLowerCase().includes('listado')
        ) || workbook.SheetNames[0];

        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) {
          resolve([]);
          return;
        }

        // Convert to array of arrays or objects
        const rawRows = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });
        if (rawRows.length < 2) {
          resolve([]);
          return;
        }

        // Find header row (usually line 0 or line with 'codificación' / 'descripción' / 'tipo')
        let headerIndex = 0;
        for (let i = 0; i < Math.min(5, rawRows.length); i++) {
          const rowStr = JSON.stringify(rawRows[i]).toLowerCase();
          if (rowStr.includes('codific') || rowStr.includes('descrip') || rowStr.includes('tipo')) {
            headerIndex = i;
            break;
          }
        }

        const headers = (rawRows[headerIndex] || []).map((h: any) => String(h || '').trim().toLowerCase());

        const getColIndex = (keywords: string[]) => {
          return headers.findIndex(h => keywords.some(k => h.includes(k)));
        };

        const idxWbs = getColIndex(['wbs', 'jerarquía', 'jerarquia', 'capítulo', 'capitulo']);
        const idxItem = getColIndex(['ítem', 'item', 'n°', 'no']);
        const idxTipo = getColIndex(['tipo', 'tipo documento', 'doc/dwg']);
        const idxCod = getColIndex(['codificac', 'código', 'codigo', 'cod']);
        const idxDesc = getColIndex(['descripc', 'desc', 'título', 'titulo', 'nombre']);
        const idxEtapa = getColIndex(['etapa', 'fase']);
        const idxSeccion = getColIndex(['sección', 'seccion', 'subetapa', 'paquete']);
        const idxDisciplina = getColIndex(['disciplina', 'especialidad', 'área', 'area']);
        const idxRev = getColIndex(['revisión', 'revision', 'rev']);
        const idxEstado = getColIndex(['estado', 'status']);
        const idxObs = getColIndex(['observac', 'obs', 'comentario']);

        const parsedRows: RawDocumentRow[] = [];
        let autoMajor = 0;
        let autoMinor = 0;

        for (let r = headerIndex + 1; r < rawRows.length; r++) {
          const row = rawRows[r] || [];
          if (!row || row.length === 0) continue;

          // Check if row is completely empty
          const hasData = row.some((val: any) => val !== undefined && val !== null && String(val).trim() !== '');
          if (!hasData) continue;

          const wbsInput = idxWbs >= 0 && row[idxWbs] !== undefined ? String(row[idxWbs]).trim() : '';
          const itemStr = idxItem >= 0 && row[idxItem] !== undefined ? String(row[idxItem]).trim() : '-';
          const tipoStr = idxTipo >= 0 && row[idxTipo] !== undefined ? String(row[idxTipo]).trim() : 'DOC';
          const codStr = idxCod >= 0 && row[idxCod] !== undefined ? String(row[idxCod]).trim() : '';
          const descStr = idxDesc >= 0 && row[idxDesc] !== undefined ? String(row[idxDesc]).trim() : '';
          const etapaStr = idxEtapa >= 0 && row[idxEtapa] !== undefined ? String(row[idxEtapa]).trim() : 'ETAPA 1';
          const seccionStr = idxSeccion >= 0 && row[idxSeccion] !== undefined ? String(row[idxSeccion]).trim() : 'General';
          const discStr = idxDisciplina >= 0 && row[idxDisciplina] !== undefined ? String(row[idxDisciplina]).trim() : 'General';
          const revStr = idxRev >= 0 && row[idxRev] !== undefined ? String(row[idxRev]).trim() : 'A';
          const estadoStr = idxEstado >= 0 && row[idxEstado] !== undefined ? String(row[idxEstado]).trim() : 'Aprobado';
          const obsStr = idxObs >= 0 && row[idxObs] !== undefined ? String(row[idxObs]).trim() : '';

          const normalizedTipo = tipoStr.toUpperCase();
          const isTitle = normalizedTipo === 'TÍTULO' || normalizedTipo === 'TITULO';

          let computedWbs = wbsInput;
          if (!computedWbs) {
            if (isTitle) {
              autoMajor++;
              autoMinor = 0;
              computedWbs = String(autoMajor);
            } else {
              if (autoMajor === 0) autoMajor = 1;
              autoMinor++;
              computedWbs = `${autoMajor}.${autoMinor}`;
            }
          }

          const errors: string[] = [];
          if (!descStr && !codStr) {
            errors.push('Debe especificar al menos la Descripción o la Codificación del documento.');
          }

          parsedRows.push({
            rowNumber: r + 1,
            wbs: computedWbs,
            item: itemStr || '-',
            tipoDocumento: isTitle ? 'Título' : (normalizedTipo || 'DOC'),
            codificacion: codStr || 'S/N',
            descripcion: descStr || 'Documento sin nombre',
            etapa: etapaStr || 'ETAPA 1',
            seccion: seccionStr || 'General',
            disciplina: discStr || 'General',
            revision: revStr.toUpperCase() || 'A',
            estado: estadoStr || 'Aprobado',
            observaciones: obsStr,
            isValid: errors.length === 0,
            errors
          });
        }

        resolve(parsedRows);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

export function exportarDocumentosExcel(documents: ProjectDocument[], projectName: string) {
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

  const rows = documents.map(d => [
    d.wbs || '',
    d.item || '-',
    d.tipoDocumento || 'DOC',
    d.codificacion || 'S/N',
    d.descripcion || '',
    d.etapa || '',
    d.seccion || '',
    d.disciplina || '',
    d.revision || 'A',
    d.estado || 'Aprobado',
    d.observaciones || ''
  ]);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = [
    { wch: 10 },
    { wch: 8 },
    { wch: 16 },
    { wch: 22 },
    { wch: 55 },
    { wch: 15 },
    { wch: 28 },
    { wch: 18 },
    { wch: 10 },
    { wch: 15 },
    { wch: 30 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Listado_Documentos');
  const fileName = `Listado_Documentos_${projectName.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

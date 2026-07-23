import * as XLSX from 'xlsx';
import { Activity } from '../types';

/**
 * Exporta el listado completo de actividades de un proyecto, incluyendo todos
 * los campos de la base de datos (incluso los calculados) a un archivo Excel.
 */
export function exportarActividadesExcel(activities: Activity[], projectName: string, currentUserRole?: string) {
  const hideFinancials = currentUserRole === 'Cliente' || currentUserRole === 'Control de Proyecto';

  const headers = [
    "ID",
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
    "Duración Planificada",
    "Inicio Real",
    "Fin Real",
    "Duración Real",
    "Atraso en días",
    hideFinancials ? "Valor (Restringido)" : "Valor de Tarea",
    hideFinancials ? "Avance % Valor (Restringido)" : "Avance % Valor",
    "Entregables",
    "Observaciones",
    "Avance Planificado",
    "Avance Real",
    "Created At",
    "Updated At"
  ];

  const rows = activities.map(a => [
    a.id,
    a.wbs,
    a.tipoRegistro,
    a.tarea,
    a.disciplina,
    a.etapa,
    a.responsable,
    a.critica,
    a.prioridad,
    a.estado,
    a.inicioPlanificado,
    a.finPlanificado,
    a.duracionPlanificada,
    a.inicioReal || "",
    a.finReal || "",
    a.duracionReal || 0,
    a.atrasoDias,
    hideFinancials ? "Restringido" : a.valorTarea,
    hideFinancials ? "Restringido" : Number((a.avancePorcentajeValor || 0).toFixed(4)),
    a.entregables,
    a.observaciones || "",
    a.avancePlanificado,
    a.avanceReal,
    a.createdAt,
    a.updatedAt
  ]);

  const workbook = XLSX.utils.book_new();
  const data = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Definir anchos para mayor prolijidad visual
  ws['!cols'] = [
    { wch: 15 }, // ID
    { wch: 10 }, // WBS
    { wch: 15 }, // Tipo Registro
    { wch: 35 }, // Tarea
    { wch: 15 }, // Disciplina
    { wch: 15 }, // Etapa
    { wch: 20 }, // Responsable
    { wch: 10 }, // Crítica
    { wch: 12 }, // Prioridad
    { wch: 15 }, // Estado
    { wch: 18 }, // Inicio Planificado
    { wch: 18 }, // Fin Planificado
    { wch: 18 }, // Duración Planificada
    { wch: 15 }, // Inicio Real
    { wch: 15 }, // Fin Real
    { wch: 15 }, // Duración Real
    { wch: 15 }, // Atraso en días
    { wch: 15 }, // Valor de Tarea
    { wch: 15 }, // Avance % Valor
    { wch: 12 }, // Entregables
    { wch: 30 }, // Observaciones
    { wch: 18 }, // Avance Planificado
    { wch: 12 }, // Avance Real
    { wch: 25 }, // Created At
    { wch: 25 }  // Updated At
  ];

  // Añadir la hoja de cálculo
  XLSX.utils.book_append_sheet(workbook, ws, "Actividades");

  // Formato del nombre del archivo: Actividades_[NombreProyecto]_[Fecha].xlsx
  const safeProjectName = projectName.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_");
  const todayStr = new Date().toISOString().split('T')[0];
  const filename = `Actividades_${safeProjectName}_${todayStr}.xlsx`;

  // Descargar archivo Excel en el cliente
  XLSX.writeFile(workbook, filename);
}

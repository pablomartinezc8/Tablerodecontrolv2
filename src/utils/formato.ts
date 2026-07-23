export const formatearMoneda = (valor: number | undefined | null, moneda: string = 'USD'): string => {
  if (valor === undefined || valor === null || isNaN(valor)) {
    return '$0';
  }
  
  // Format with dots as thousands separators and commas as decimal separators (Spanish style)
  const formatted = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(valor);
  
  return `${moneda === 'USD' ? 'US$' : '$'} ${formatted}`;
};

export const formatearPorcentaje = (valor: number | undefined | null): string => {
  if (valor === undefined || valor === null || isNaN(valor)) {
    return '0%';
  }
  
  const rounded = Math.round(valor);
  return `${rounded}%`;
};

export const formatearFecha = (fechaStr: string | undefined | null): string => {
  if (!fechaStr) return '-';
  try {
    const parts = fechaStr.split('-');
    if (parts.length !== 3) return fechaStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  } catch (e) {
    return fechaStr;
  }
};

export const obtenerNombreMes = (fechaStr: string): string => {
  // Returns Spanish month name
  try {
    const date = new Date(fechaStr + 'T12:00:00');
    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  } catch (e) {
    return 'N/A';
  }
};

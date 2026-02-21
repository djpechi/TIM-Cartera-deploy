import * as XLSX from 'xlsx';

export interface ContratoData {
  numeroContrato: string;
  cliente: string;
  fechaInicio: Date | null;
  plazo: number | null;
  fechaTerminacion: Date | null;
  rentaMensual: number;
  rentaAdministracion: number | null;
  rentaClubTim: number | null;
  rentaTotal: number;
  descripcion: string;
  numeroSerie: string;
  estado: string;
}

/**
 * Procesa el archivo Excel de contratos activos TIM
 * Columnas esperadas:
 * - A: f (índice)
 * - B: Interno Contrato
 * - C: CLIENTE
 * - F: Status
 * - G: DESCRIPCION
 * - H: NUMERO DE SERIE
 * - M: Fecha De Inicio
 * - N: Plazo
 * - O: Terminacion
 * - V: Renta Mensual
 * - W: AYL 202 (Administración)
 * - X: CLUBTIM 201
 * - Y: Renta Total
 */
export async function processContratosFile(filePath: string): Promise<{
  contratos: ContratoData[];
  resumen: {
    totalRegistros: number;
    contratosActivos: number;
    contratosInactivos: number;
    errores: string[];
  };
}> {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null }) as any[][];

  const contratos: ContratoData[] = [];
  const errores: string[] = [];
  let contratosActivos = 0;
  let contratosInactivos = 0;

  // Saltar fila de encabezados (índice 0) y empezar desde índice 1
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    try {
      const numeroContrato = row[1]?.toString().trim(); // Columna B
      const cliente = row[2]?.toString().trim(); // Columna C
      const estado = row[5]?.toString().trim().toUpperCase(); // Columna F
      const descripcion = row[6]?.toString().trim() || ''; // Columna G
      const numeroSerie = row[7]?.toString().trim() || ''; // Columna H
      const fechaInicio = parseExcelDate(row[12]); // Columna M
      const plazo = parseNumber(row[13]); // Columna N
      const fechaTerminacion = parseExcelDate(row[14]); // Columna O
      const rentaMensual = parseNumber(row[21]) || 0; // Columna V
      const rentaAdministracion = parseNumber(row[22]); // Columna W
      const rentaClubTim = parseNumber(row[23]); // Columna X
      const rentaTotal = parseNumber(row[24]) || rentaMensual; // Columna Y

      // Validar campos obligatorios
      if (!numeroContrato || !cliente) {
        continue; // Saltar filas vacías
      }

      if (estado === 'ACTIVO') {
        contratosActivos++;
      } else {
        contratosInactivos++;
      }

      contratos.push({
        numeroContrato,
        cliente,
        fechaInicio,
        plazo,
        fechaTerminacion,
        rentaMensual,
        rentaAdministracion,
        rentaClubTim,
        rentaTotal,
        descripcion,
        numeroSerie,
        estado,
      });
    } catch (error: any) {
      errores.push(`Fila ${i + 1}: ${error.message}`);
    }
  }

  return {
    contratos,
    resumen: {
      totalRegistros: contratos.length,
      contratosActivos,
      contratosInactivos,
      errores,
    },
  };
}

/**
 * Convierte fecha de Excel a objeto Date
 */
function parseExcelDate(value: any): Date | null {
  if (!value) return null;
  
  // Si ya es un objeto Date
  if (value instanceof Date) {
    return value;
  }
  
  // Si es un número (formato de fecha de Excel)
  if (typeof value === 'number') {
    // Excel almacena fechas como días desde 1900-01-01
    const excelEpoch = new Date(1900, 0, 1);
    const days = value - 2; // Ajuste por bug de Excel con año 1900
    return new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
  }
  
  // Si es un string, intentar parsearlo
  if (typeof value === 'string') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }
  
  return null;
}

/**
 * Convierte valor a número
 */
function parseNumber(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'number' ? value : parseFloat(value.toString().replace(/[^0-9.-]/g, ''));
  return isNaN(num) ? null : num;
}

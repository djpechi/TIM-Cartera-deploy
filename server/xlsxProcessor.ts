import * as XLSX from 'xlsx';
import { InsertFactura, InsertPendientePago } from '../drizzle/schema';

export interface ProcessResult {
  success: boolean;
  registrosProcesados: number;
  registrosExitosos: number;
  registrosError: number;
  errores: string[];
  data?: any[];
}

/**
 * Parsea fecha en formato DD/MM/YYYY o timestamp de Excel
 */
function parseExcelDate(value: any): Date | null {
  if (!value) return null;
  
  // Si es un número (serial date de Excel)
  if (typeof value === 'number') {
    // Excel serial date: días desde 1900-01-01
    const excelEpoch = new Date(1900, 0, 1);
    const days = value - 2; // Ajuste por bug de Excel (1900 no fue bisiesto)
    const date = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
    return date;
  }
  
  // Si es string en formato DD/MM/YYYY
  if (typeof value === 'string') {
    const parts = value.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const year = parseInt(parts[2]);
      return new Date(year, month, day);
    }
  }
  
  // Si ya es Date
  if (value instanceof Date) {
    return value;
  }
  
  return null;
}

/**
 * Parsea valor numérico de Excel
 */
function parseNumber(value: any): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.-]/g, '');
    return parseFloat(cleaned) || 0;
  }
  return 0;
}

/**
 * Procesa archivo de Facturación Tim Transp (folios AB)
 */
export function processTimTranspFile(buffer: Buffer): ProcessResult {
  const errores: string[] = [];
  const facturas: Partial<InsertFactura>[] = [];
  
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Buscar fila de encabezados
    let headerRow = -1;
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i] as any[];
      if (row.some(cell => 
        typeof cell === 'string' && 
        (cell.toLowerCase().includes('folio') || cell.toLowerCase().includes('fecha'))
      )) {
        headerRow = i;
        break;
      }
    }
    
    if (headerRow === -1) {
      errores.push('No se encontró fila de encabezados en el archivo');
      return {
        success: false,
        registrosProcesados: 0,
        registrosExitosos: 0,
        registrosError: 1,
        errores,
      };
    }
    
    const headers = (data[headerRow] as any[]).map(h => String(h || '').toLowerCase().trim());
    const fechaIdx = headers.findIndex(h => h.includes('fecha'));
    const folioIdx = headers.findIndex(h => h.includes('folio'));
    const clienteIdx = headers.findIndex(h => h.includes('cliente') || h.includes('nombre'));
    const importeIdx = headers.findIndex(h => h.includes('importe') || h.includes('total'));
    const descripcionIdx = headers.findIndex(h => h.includes('descripci'));
    const estatusIdx = headers.findIndex(h => h.includes('estatus'));
    
    // Procesar filas de datos
    for (let i = headerRow + 1; i < data.length; i++) {
      const row = data[i] as any[];
      if (!row || row.length === 0) continue;
      
      const folio = row[folioIdx] ? String(row[folioIdx]).trim() : '';
      if (!folio || !folio.startsWith('AB')) continue;
      
      try {
        const fecha = parseExcelDate(row[fechaIdx]);
        const nombreCliente = row[clienteIdx] ? String(row[clienteIdx]).trim() : '';
        const importeTotal = parseNumber(row[importeIdx]);
        const descripcion = row[descripcionIdx] ? String(row[descripcionIdx]) : '';
        const estatus = row[estatusIdx] ? String(row[estatusIdx]).toLowerCase() : 'normal';
        
        if (!fecha || !nombreCliente || importeTotal === 0) {
          errores.push(`Fila ${i + 1}: Datos incompletos para folio ${folio}`);
          continue;
        }
        
        facturas.push({
          folio,
          sistema: 'tim_transp',
          nombreCliente,
          fecha,
          importeTotal: importeTotal.toString(),
          descripcion,
          estatus: estatus.includes('cancelad') ? 'cancelada' : 'normal',
          estadoPago: 'pendiente',
          diasAtraso: 0,
          interesesMoratorios: '0.00',
        });
      } catch (error) {
        errores.push(`Fila ${i + 1}: Error al procesar - ${error}`);
      }
    }
    
    return {
      success: true,
      registrosProcesados: data.length - headerRow - 1,
      registrosExitosos: facturas.length,
      registrosError: errores.length,
      errores,
      data: facturas,
    };
  } catch (error) {
    errores.push(`Error al leer archivo: ${error}`);
    return {
      success: false,
      registrosProcesados: 0,
      registrosExitosos: 0,
      registrosError: 1,
      errores,
    };
  }
}

/**
 * Procesa archivo de Facturación Tim Value (folios AA)
 */
export function processTimValueFile(buffer: Buffer): ProcessResult {
  const errores: string[] = [];
  const facturas: Partial<InsertFactura>[] = [];
  
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Buscar fila de encabezados
    let headerRow = -1;
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i] as any[];
      if (row.some(cell => 
        typeof cell === 'string' && 
        (cell.toLowerCase().includes('folio') || cell.toLowerCase().includes('fecha'))
      )) {
        headerRow = i;
        break;
      }
    }
    
    if (headerRow === -1) {
      errores.push('No se encontró fila de encabezados en el archivo');
      return {
        success: false,
        registrosProcesados: 0,
        registrosExitosos: 0,
        registrosError: 1,
        errores,
      };
    }
    
    const headers = (data[headerRow] as any[]).map(h => String(h || '').toLowerCase().trim());
    const fechaIdx = headers.findIndex(h => h.includes('fecha'));
    const folioIdx = headers.findIndex(h => h.includes('folio'));
    const clienteIdx = headers.findIndex(h => h.includes('cliente') || h.includes('nombre'));
    const importeIdx = headers.findIndex(h => h.includes('importe') || h.includes('total'));
    const descripcionIdx = headers.findIndex(h => h.includes('descripci'));
    const estatusIdx = headers.findIndex(h => h.includes('estatus'));
    
    // Procesar filas de datos
    for (let i = headerRow + 1; i < data.length; i++) {
      const row = data[i] as any[];
      if (!row || row.length === 0) continue;
      
      const folio = row[folioIdx] ? String(row[folioIdx]).trim() : '';
      if (!folio || !folio.startsWith('AA')) continue;
      
      try {
        const fecha = parseExcelDate(row[fechaIdx]);
        const nombreCliente = row[clienteIdx] ? String(row[clienteIdx]).trim() : '';
        const importeTotal = parseNumber(row[importeIdx]);
        const descripcion = row[descripcionIdx] ? String(row[descripcionIdx]) : '';
        const estatus = row[estatusIdx] ? String(row[estatusIdx]).toLowerCase() : 'normal';
        
        if (!fecha || !nombreCliente || importeTotal === 0) {
          errores.push(`Fila ${i + 1}: Datos incompletos para folio ${folio}`);
          continue;
        }
        
        facturas.push({
          folio,
          sistema: 'tim_value',
          nombreCliente,
          fecha,
          importeTotal: importeTotal.toString(),
          descripcion,
          estatus: estatus.includes('cancelad') ? 'cancelada' : 'normal',
          estadoPago: 'pendiente',
          diasAtraso: 0,
          interesesMoratorios: '0.00',
        });
      } catch (error) {
        errores.push(`Fila ${i + 1}: Error al procesar - ${error}`);
      }
    }
    
    return {
      success: true,
      registrosProcesados: data.length - headerRow - 1,
      registrosExitosos: facturas.length,
      registrosError: errores.length,
      errores,
      data: facturas,
    };
  } catch (error) {
    errores.push(`Error al leer archivo: ${error}`);
    return {
      success: false,
      registrosProcesados: 0,
      registrosExitosos: 0,
      registrosError: 1,
      errores,
    };
  }
}

/**
 * Procesa archivo de Pendientes de Pago
 */
export function processPendientesFile(buffer: Buffer): ProcessResult {
  const errores: string[] = [];
  const pendientes: Partial<InsertPendientePago>[] = [];
  
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Buscar fila de encabezados
    let headerRow = -1;
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i] as any[];
      if (row.some(cell => 
        typeof cell === 'string' && 
        (cell.toLowerCase().includes('folio') || cell.toLowerCase().includes('alias'))
      )) {
        headerRow = i;
        break;
      }
    }
    
    if (headerRow === -1) {
      errores.push('No se encontró fila de encabezados en el archivo');
      return {
        success: false,
        registrosProcesados: 0,
        registrosExitosos: 0,
        registrosError: 1,
        errores,
      };
    }
    
    const headers = (data[headerRow] as any[]).map(h => String(h || '').toLowerCase().trim());
    const aliasIdx = headers.findIndex(h => h.includes('alias'));
    const folioIdx = headers.findIndex(h => h.includes('folio'));
    const clienteIdx = headers.findIndex(h => h.includes('cliente') || h.includes('nombre'));
    const descripcionIdx = headers.findIndex(h => h.includes('descripci'));
    const diasIdx = headers.findIndex(h => h.includes('d') && h.includes('vencid'));
    const saldoIdx = headers.findIndex(h => h.includes('saldo') || h.includes('sum') || h.includes('valor'));
    
    // Procesar filas de datos
    for (let i = headerRow + 1; i < data.length; i++) {
      const row = data[i] as any[];
      if (!row || row.length === 0) continue;
      
      const folio = row[folioIdx] ? String(row[folioIdx]).trim() : '';
      if (!folio) continue;
      
      try {
        const alias = row[aliasIdx] ? String(row[aliasIdx]).trim() : '';
        const nombreCliente = row[clienteIdx] ? String(row[clienteIdx]).trim() : '';
        const descripcion = row[descripcionIdx] ? String(row[descripcionIdx]) : '';
        const diasVencido = parseNumber(row[diasIdx]);
        const saldo = parseNumber(row[saldoIdx]);
        
        if (!nombreCliente || saldo === 0) {
          errores.push(`Fila ${i + 1}: Datos incompletos para folio ${folio}`);
          continue;
        }
        
        pendientes.push({
          folio,
          nombreCliente,
          alias,
          descripcion,
          diasVencido,
          saldo: saldo.toString(),
          interesesMoratorios: '0.00',
        });
      } catch (error) {
        errores.push(`Fila ${i + 1}: Error al procesar - ${error}`);
      }
    }
    
    return {
      success: true,
      registrosProcesados: data.length - headerRow - 1,
      registrosExitosos: pendientes.length,
      registrosError: errores.length,
      errores,
      data: pendientes,
    };
  } catch (error) {
    errores.push(`Error al leer archivo: ${error}`);
    return {
      success: false,
      registrosProcesados: 0,
      registrosExitosos: 0,
      registrosError: 1,
      errores,
    };
  }
}

/**
 * Calcula días de atraso e intereses moratorios
 */
export function calcularAtrasoEIntereses(
  fechaVencimiento: Date | null,
  saldo: number,
  tasaInteresMensual: number
): { diasAtraso: number; interesesMoratorios: number; totalConIntereses: number } {
  if (!fechaVencimiento) {
    return {
      diasAtraso: 0,
      interesesMoratorios: 0,
      totalConIntereses: saldo,
    };
  }
  
  const hoy = new Date();
  const diffTime = hoy.getTime() - fechaVencimiento.getTime();
  const diasAtraso = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  
  if (diasAtraso === 0) {
    return {
      diasAtraso: 0,
      interesesMoratorios: 0,
      totalConIntereses: saldo,
    };
  }
  
  // Calcular intereses: Saldo * (Tasa / 100) * (Días / 30)
  const interesesMoratorios = saldo * (tasaInteresMensual / 100) * (diasAtraso / 30);
  const totalConIntereses = saldo + interesesMoratorios;
  
  return {
    diasAtraso,
    interesesMoratorios: Math.round(interesesMoratorios * 100) / 100,
    totalConIntereses: Math.round(totalConIntereses * 100) / 100,
  };
}

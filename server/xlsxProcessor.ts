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
    
    // Detectar columnas por contenido si no se encuentran por nombre
    let fechaIdx = headers.findIndex(h => h.includes('fecha') && !h.includes('venc'));
    let venceIdx = headers.findIndex(h => h.includes('vence') || h.includes('vencimiento'));
    let folioIdx = headers.findIndex(h => h.includes('folio'));
    let clienteIdx = headers.findIndex(h => h.includes('cliente') || h.includes('nombre') || h.includes('razón'));
    let importeIdx = headers.findIndex(h => h.includes('importe') || h.includes('total') || h.includes('saldo'));
    let descripcionIdx = headers.findIndex(h => h.includes('descripci') || h.includes('concepto'));
    let estatusIdx = headers.findIndex(h => h.includes('estatus') || h.includes('status'));
    
    // Si no encontramos las columnas por nombre, intentar detectarlas por contenido de la primera fila de datos
    if (folioIdx === -1 || clienteIdx === -1 || importeIdx === -1) {
      const firstDataRow = data[headerRow + 1] as any[];
      if (firstDataRow) {
        for (let i = 0; i < firstDataRow.length; i++) {
          const value = firstDataRow[i];
          // Detectar folio (empieza con AB o AA)
          if (folioIdx === -1 && typeof value === 'string' && (value.startsWith('AB') || value.startsWith('AA'))) {
            folioIdx = i;
          }
          // Detectar cliente (string largo que no es folio)
          if (clienteIdx === -1 && typeof value === 'string' && value.length > 10 && !value.startsWith('AB') && !value.startsWith('AA')) {
            clienteIdx = i;
          }
          // Detectar importe (número mayor a 100)
          if (importeIdx === -1 && typeof value === 'number' && value > 100) {
            importeIdx = i;
          }
          // Detectar fecha (Date object)
          if (fechaIdx === -1 && value instanceof Date) {
            fechaIdx = i;
          }
        }
      }
    }
    
    // Procesar filas de datos
    for (let i = headerRow + 1; i < data.length; i++) {
      const row = data[i] as any[];
      if (!row || row.length === 0) continue;
      
      const folio = row[folioIdx] ? String(row[folioIdx]).trim() : '';
      // Aceptar folios AB (Tim Transp) y AA (Tim Value) para mayor flexibilidad
      if (!folio || (!folio.startsWith('AB') && !folio.startsWith('AA'))) continue;
      
      try {
        const fecha = parseExcelDate(row[fechaIdx]);
        const fechaVencimiento = venceIdx !== -1 ? parseExcelDate(row[venceIdx]) : null;
        const nombreCliente = row[clienteIdx] ? String(row[clienteIdx]).trim() : '';
        const importeTotal = parseNumber(row[importeIdx]);
        const descripcion = row[descripcionIdx] ? String(row[descripcionIdx]) : '';
        const estatus = row[estatusIdx] ? String(row[estatusIdx]).toLowerCase() : 'normal';
        
        // Extraer numeroContrato de la descripción (formato: EXP:XXXX)
        let numeroContrato: string | null = null;
        const contratoMatch = descripcion.match(/EXP[:\s]*([A-Z0-9]+)/i);
        if (contratoMatch) {
          numeroContrato = contratoMatch[1];
        }
        
        if (!fecha || !nombreCliente || importeTotal === 0) {
          errores.push(`Fila ${i + 1}: Datos incompletos para folio ${folio}`);
          continue;
        }
        
        facturas.push({
          folio,
          sistema: 'tim_transp',
          nombreCliente,
          fecha,
          fechaVencimiento,
          importeTotal: importeTotal.toString(),
          descripcion,
          numeroContrato,
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
    
    // Detectar columnas por contenido si no se encuentran por nombre
    let fechaIdx = headers.findIndex(h => h.includes('fecha') && !h.includes('venc'));
    let venceIdx = headers.findIndex(h => h.includes('vence') || h.includes('vencimiento'));
    let folioIdx = headers.findIndex(h => h.includes('folio'));
    let clienteIdx = headers.findIndex(h => h.includes('cliente') || h.includes('nombre') || h.includes('razón'));
    let importeIdx = headers.findIndex(h => h.includes('importe') || h.includes('total') || h.includes('saldo'));
    let descripcionIdx = headers.findIndex(h => h.includes('descripci') || h.includes('concepto'));
    let estatusIdx = headers.findIndex(h => h.includes('estatus') || h.includes('status'));
    
    // Si no encontramos las columnas por nombre, intentar detectarlas por contenido de la primera fila de datos
    if (folioIdx === -1 || clienteIdx === -1 || importeIdx === -1) {
      const firstDataRow = data[headerRow + 1] as any[];
      if (firstDataRow) {
        for (let i = 0; i < firstDataRow.length; i++) {
          const value = firstDataRow[i];
          // Detectar folio (empieza con AB o AA)
          if (folioIdx === -1 && typeof value === 'string' && (value.startsWith('AB') || value.startsWith('AA'))) {
            folioIdx = i;
          }
          // Detectar cliente (string largo que no es folio)
          if (clienteIdx === -1 && typeof value === 'string' && value.length > 10 && !value.startsWith('AB') && !value.startsWith('AA')) {
            clienteIdx = i;
          }
          // Detectar importe (número mayor a 100)
          if (importeIdx === -1 && typeof value === 'number' && value > 100) {
            importeIdx = i;
          }
          // Detectar fecha (Date object)
          if (fechaIdx === -1 && value instanceof Date) {
            fechaIdx = i;
          }
        }
      }
    }
    
    // Procesar filas de datos
    for (let i = headerRow + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;
      
      const folio = row[folioIdx] ? String(row[folioIdx]).trim() : '';
      console.log(`[DEBUG] Fila ${i}: Folio = "${folio}"`);
      if (!folio || !folio.startsWith('AB')) {
        console.log(`[DEBUG] Fila ${i}: Folio rechazado (vacío o no empieza con AB)`);
        continue;
      };
      
      try {
        const fecha = parseExcelDate(row[fechaIdx]);
        const fechaVencimiento = venceIdx !== -1 ? parseExcelDate(row[venceIdx]) : null;
        const nombreCliente = row[clienteIdx] ? String(row[clienteIdx]).trim() : '';
        const importeTotal = parseNumber(row[importeIdx]);
        const descripcion = row[descripcionIdx] ? String(row[descripcionIdx]) : '';
        const estatus = row[estatusIdx] ? String(row[estatusIdx]).toLowerCase() : 'normal';
        
        // Extraer numeroContrato de la descripción (formato: EXP:XXXX)
        let numeroContrato: string | null = null;
        const contratoMatch = descripcion.match(/EXP[:\s]*([A-Z0-9]+)/i);
        if (contratoMatch) {
          numeroContrato = contratoMatch[1];
        }
        
        if (!fecha || !nombreCliente || importeTotal === 0) {
          errores.push(`Fila ${i + 1}: Datos incompletos para folio ${folio}`);
          continue;
        }
        
        facturas.push({
          folio,
          sistema: 'tim_value',
          nombreCliente,
          fecha,
          fechaVencimiento,
          importeTotal: importeTotal.toString(),
          descripcion,
          numeroContrato,
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
        (cell.toLowerCase().includes('folio') || cell.toLowerCase().includes('saldo'))
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
    const folioIdx = headers.findIndex(h => h.includes('folio'));
    const saldoIdx = headers.findIndex(h => h.includes('saldo'));
    const atrasoIdx = headers.findIndex(h => h.includes('atraso'));
    const fechaIdx = headers.findIndex(h => h === 'fecha');
    const venceIdx = headers.findIndex(h => h.includes('vence'));
    
    if (folioIdx === -1) {
      errores.push('No se encontró columna de Folio en el archivo');
      return {
        success: false,
        registrosProcesados: 0,
        registrosExitosos: 0,
        registrosError: 1,
        errores,
      };
    }
    
    // Procesar filas de datos
    for (let i = headerRow + 1; i < data.length; i++) {
      const row = data[i] as any[];
      if (!row || row.length === 0) continue;
      
      const folio = row[folioIdx] ? String(row[folioIdx]).trim() : '';
      if (!folio) continue;
      
      try {
        const saldo = saldoIdx !== -1 ? parseNumber(row[saldoIdx]) : 0;
        const diasVencido = atrasoIdx !== -1 ? parseNumber(row[atrasoIdx]) : 0;
        
        // Leer fechas del archivo si están disponibles
        let fecha = null;
        let fechaVencimiento = null;
        
        if (fechaIdx !== -1 && row[fechaIdx]) {
          fecha = parseExcelDate(row[fechaIdx]);
        }
        
        if (venceIdx !== -1 && row[venceIdx]) {
          fechaVencimiento = parseExcelDate(row[venceIdx]);
        }
        
        // Si el folio aparece en pendientes, significa que NO está pagado
        // Guardamos folio, saldo y fechas para marcar como pendiente
        pendientes.push({
          folio,
          nombreCliente: '', // Se llenará al cruzar con facturas
          alias: '',
          descripcion: '',
          diasVencido,
          saldo: saldo.toString(),
          interesesMoratorios: '0.00',
          fecha: fecha,
          fechaVencimiento: fechaVencimiento,
        } as any);
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

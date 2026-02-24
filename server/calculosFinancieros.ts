/**
 * Funciones de cálculo financiero para contratos de arrendamiento
 */

const IVA_RATE = 0.16; // 16%

/**
 * Calcula el IVA de un monto
 */
export function calcularIVA(montoSinIva: number): number {
  return Number((montoSinIva * IVA_RATE).toFixed(2));
}

/**
 * Calcula el total con IVA
 */
export function calcularTotalConIVA(montoSinIva: number): number {
  return Number((montoSinIva * (1 + IVA_RATE)).toFixed(2));
}

/**
 * Calcula la mensualidad de un préstamo usando la fórmula de PAGO (PMT)
 * @param principal - Monto a financiar
 * @param tasaAnual - Tasa de interés anual (porcentaje, ej: 12 para 12%)
 * @param plazoMeses - Plazo en meses
 * @returns Mensualidad calculada
 */
export function calcularPago(principal: number, tasaAnual: number, plazoMeses: number): number {
  if (tasaAnual === 0) {
    // Si no hay interés, es una división simple
    return Number((principal / plazoMeses).toFixed(2));
  }
  
  const tasaMensual = tasaAnual / 100 / 12;
  const pago = principal * (tasaMensual * Math.pow(1 + tasaMensual, plazoMeses)) / 
               (Math.pow(1 + tasaMensual, plazoMeses) - 1);
  
  return Number(pago.toFixed(2));
}

/**
 * Calcula los valores para un line item de Arrendamiento Puro
 */
export interface LineItemPuroInput {
  precioEquipoSinIva?: number;
  pagoInicialSinIva: number;
  comisionesSinIva: number;
  mensualidadBaseSinIva: number;
  serviciosAdicionalesSinIva: number;
  valorResidualSinIva: number;
}

export interface LineItemCalculado {
  rentaMensualSinIva: number;
  ivaMensual: number;
  rentaMensualConIva: number;
  totalPagoInicialSinIva: number;
  ivaPagoInicial: number;
  totalPagoInicialConIva: number;
  totalComisionesSinIva: number;
  ivaComisiones: number;
  totalComisionesConIva: number;
  totalValorResidualSinIva: number;
  ivaValorResidual: number;
  totalValorResidualConIva: number;
}

export function calcularLineItemPuro(input: LineItemPuroInput): LineItemCalculado {
  // Calcular renta mensual total
  const rentaMensualSinIva = input.mensualidadBaseSinIva + input.serviciosAdicionalesSinIva;
  const ivaMensual = calcularIVA(rentaMensualSinIva);
  const rentaMensualConIva = rentaMensualSinIva + ivaMensual;
  
  // Calcular pago inicial
  const totalPagoInicialSinIva = input.pagoInicialSinIva;
  const ivaPagoInicial = calcularIVA(totalPagoInicialSinIva);
  const totalPagoInicialConIva = totalPagoInicialSinIva + ivaPagoInicial;
  
  // Calcular comisiones
  const totalComisionesSinIva = input.comisionesSinIva;
  const ivaComisiones = calcularIVA(totalComisionesSinIva);
  const totalComisionesConIva = totalComisionesSinIva + ivaComisiones;
  
  // Calcular valor residual
  const totalValorResidualSinIva = input.valorResidualSinIva;
  const ivaValorResidual = calcularIVA(totalValorResidualSinIva);
  const totalValorResidualConIva = totalValorResidualSinIva + ivaValorResidual;
  
  return {
    rentaMensualSinIva,
    ivaMensual,
    rentaMensualConIva,
    totalPagoInicialSinIva,
    ivaPagoInicial,
    totalPagoInicialConIva,
    totalComisionesSinIva,
    ivaComisiones,
    totalComisionesConIva,
    totalValorResidualSinIva,
    ivaValorResidual,
    totalValorResidualConIva,
  };
}

/**
 * Calcula los valores para un line item de Arrendamiento Financiero
 */
export interface LineItemFinancieroInput {
  precioEquipoSinIva: number;
  pagoInicialSinIva: number;
  comisionesSinIva: number;
  tasaInteresAnual: number;
  valorResidualSinIva: number;
  plazoMeses: number;
}

export function calcularLineItemFinanciero(input: LineItemFinancieroInput): LineItemCalculado & { montoFinanciar: number } {
  // Calcular monto a financiar
  const montoFinanciar = input.precioEquipoSinIva - input.pagoInicialSinIva - input.valorResidualSinIva;
  
  // Calcular mensualidad (capital + interés)
  const rentaMensualSinIva = calcularPago(montoFinanciar, input.tasaInteresAnual, input.plazoMeses);
  const ivaMensual = calcularIVA(rentaMensualSinIva);
  const rentaMensualConIva = rentaMensualSinIva + ivaMensual;
  
  // Calcular pago inicial
  const totalPagoInicialSinIva = input.pagoInicialSinIva;
  const ivaPagoInicial = calcularIVA(totalPagoInicialSinIva);
  const totalPagoInicialConIva = totalPagoInicialSinIva + ivaPagoInicial;
  
  // Calcular comisiones
  const totalComisionesSinIva = input.comisionesSinIva;
  const ivaComisiones = calcularIVA(totalComisionesSinIva);
  const totalComisionesConIva = totalComisionesSinIva + ivaComisiones;
  
  // Calcular valor residual
  const totalValorResidualSinIva = input.valorResidualSinIva;
  const ivaValorResidual = calcularIVA(totalValorResidualSinIva);
  const totalValorResidualConIva = totalValorResidualSinIva + ivaValorResidual;
  
  return {
    montoFinanciar,
    rentaMensualSinIva,
    ivaMensual,
    rentaMensualConIva,
    totalPagoInicialSinIva,
    ivaPagoInicial,
    totalPagoInicialConIva,
    totalComisionesSinIva,
    ivaComisiones,
    totalComisionesConIva,
    totalValorResidualSinIva,
    ivaValorResidual,
    totalValorResidualConIva,
  };
}

/**
 * Calcula los valores para un line item de Crédito Simple
 */
export interface LineItemCreditoInput {
  montoCredito: number; // Monto a financiar
  pagoInicialSinIva: number;
  comisionesSinIva: number;
  tasaInteresAnual: number;
  valorResidualSinIva: number;
  plazoMeses: number;
}

export function calcularLineItemCredito(input: LineItemCreditoInput): LineItemCalculado & { montoFinanciar: number } {
  // El monto a financiar ya viene dado
  const montoFinanciar = input.montoCredito;
  
  // Calcular mensualidad
  const rentaMensualSinIva = calcularPago(montoFinanciar, input.tasaInteresAnual, input.plazoMeses);
  const ivaMensual = calcularIVA(rentaMensualSinIva);
  const rentaMensualConIva = rentaMensualSinIva + ivaMensual;
  
  // Calcular pago inicial
  const totalPagoInicialSinIva = input.pagoInicialSinIva;
  const ivaPagoInicial = calcularIVA(totalPagoInicialSinIva);
  const totalPagoInicialConIva = totalPagoInicialSinIva + ivaPagoInicial;
  
  // Calcular comisiones
  const totalComisionesSinIva = input.comisionesSinIva;
  const ivaComisiones = calcularIVA(totalComisionesSinIva);
  const totalComisionesConIva = totalComisionesSinIva + ivaComisiones;
  
  // Calcular valor residual
  const totalValorResidualSinIva = input.valorResidualSinIva;
  const ivaValorResidual = calcularIVA(totalValorResidualSinIva);
  const totalValorResidualConIva = totalValorResidualSinIva + ivaValorResidual;
  
  return {
    montoFinanciar,
    rentaMensualSinIva,
    ivaMensual,
    rentaMensualConIva,
    totalPagoInicialSinIva,
    ivaPagoInicial,
    totalPagoInicialConIva,
    totalComisionesSinIva,
    ivaComisiones,
    totalComisionesConIva,
    totalValorResidualSinIva,
    ivaValorResidual,
    totalValorResidualConIva,
  };
}

/**
 * Genera la proyección mensual para un contrato
 */
export interface ProyeccionMes {
  mes: Date;
  numeroRenta: number;
  montoPagoInicial: number;
  montoComisiones: number;
  montoRentaMensual: number;
  montoValorResidual: number;
  montoTotal: number;
}

export function generarProyeccionMensual(
  fechaInicio: Date,
  plazo: number,
  lineItem: LineItemCalculado
): ProyeccionMes[] {
  const proyeccion: ProyeccionMes[] = [];
  
  for (let i = 0; i < plazo; i++) {
    const mes = new Date(fechaInicio);
    mes.setMonth(mes.getMonth() + i);
    
    const numeroRenta = i + 1;
    const esPrimerMes = i === 0;
    const esUltimoMes = i === plazo - 1;
    
    // Mes 1: Pago inicial + comisiones + primera renta
    // Meses 2 a n: Solo rentas
    // Último mes: Renta + valor residual
    
    const montoPagoInicial = esPrimerMes ? lineItem.totalPagoInicialConIva : 0;
    const montoComisiones = esPrimerMes ? lineItem.totalComisionesConIva : 0;
    const montoRentaMensual = lineItem.rentaMensualConIva;
    const montoValorResidual = esUltimoMes ? lineItem.totalValorResidualConIva : 0;
    
    const montoTotal = montoPagoInicial + montoComisiones + montoRentaMensual + montoValorResidual;
    
    proyeccion.push({
      mes,
      numeroRenta,
      montoPagoInicial,
      montoComisiones,
      montoRentaMensual,
      montoValorResidual,
      montoTotal,
    });
  }
  
  return proyeccion;
}

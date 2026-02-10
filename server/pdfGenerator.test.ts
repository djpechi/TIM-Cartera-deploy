import { describe, it, expect } from 'vitest';
import { generarEstadoCuentaClientePDF, generarEstadoCuentaGrupoPDF } from './pdfGenerator';

describe('Generador de PDFs de Estados de Cuenta', () => {
  it('debe generar PDF de cliente con columnas de contrato e intereses moratorios', async () => {
    const estadoCliente = {
      cliente: {
        nombre: 'GRUPO GASTRONOMICO MERCUG',
        rfc: 'GME123456789',
        correoCobranza: 'cobranza@mercug.com',
        telefono: '4441234567',
      },
      facturas: [
        {
          folio: 'AB9668',
          fecha: new Date('2025-08-02'),
          importeTotal: '9918.00',
          diasAtraso: 161,
          interesesMoratorios: '798.40',
          sistema: 'tim_transp' as const,
          numeroContrato: 'EXP:123',
        },
        {
          folio: 'AB9669',
          fecha: new Date('2025-08-02'),
          importeTotal: '4479.31',
          diasAtraso: 161,
          interesesMoratorios: '360.58',
          sistema: 'tim_value' as const,
          numeroContrato: 'EXP:456',
        },
        {
          folio: 'AB11400',
          fecha: new Date('2026-01-02'),
          importeTotal: '9918.00',
          diasAtraso: 9,
          interesesMoratorios: '0.00',
          sistema: 'tim_transp' as const,
          numeroContrato: null, // Sin contrato
        },
      ],
      totalPendiente: 24315.31,
      totalIntereses: 1158.98,
      totalGeneral: 25474.29,
    };

    const pdfBuffer = await generarEstadoCuentaClientePDF(estadoCliente);

    // Verificar que el PDF se generó correctamente
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(0);

    // Verificar que el PDF comienza con el header correcto
    const pdfHeader = pdfBuffer.toString('utf-8', 0, 8);
    expect(pdfHeader).toBe('%PDF-1.3');

    // Convertir el buffer a string para buscar contenido
    const pdfContent = pdfBuffer.toString('utf-8');

    // Verificar que contiene los datos del cliente
    expect(pdfContent).toContain('GRUPO GASTRONOMICO MERCUG');
    expect(pdfContent).toContain('GME123456789');

    // Verificar que contiene los folios
    expect(pdfContent).toContain('AB9668');
    expect(pdfContent).toContain('AB9669');
    expect(pdfContent).toContain('AB11400');

    // Verificar que contiene las columnas nuevas
    expect(pdfContent).toContain('Contrato');
    expect(pdfContent).toContain('Intereses');

    // Verificar que contiene los números de contrato
    expect(pdfContent).toContain('EXP:123');
    expect(pdfContent).toContain('EXP:456');

    // Verificar que contiene los totales
    expect(pdfContent).toContain('Subtotal');
    expect(pdfContent).toContain('Intereses Moratorios');
    expect(pdfContent).toContain('TOTAL A PAGAR');
  });

  it('debe generar PDF de grupo con columnas de contrato e intereses moratorios', async () => {
    const estadoGrupo = {
      grupo: {
        nombre: 'GRUPO EMPRESARIAL TEST',
        responsable: 'Juan Pérez',
      },
      facturas: [
        {
          folio: 'AB9668',
          fecha: new Date('2025-08-02'),
          importeTotal: '9918.00',
          diasAtraso: 161,
          interesesMoratorios: '798.40',
          sistema: 'tim_transp' as const,
          numeroContrato: 'EXP:123',
          clienteNombre: 'CLIENTE A',
        },
        {
          folio: 'AB9669',
          fecha: new Date('2025-08-02'),
          importeTotal: '4479.31',
          diasAtraso: 161,
          interesesMoratorios: '360.58',
          sistema: 'tim_value' as const,
          numeroContrato: 'EXP:456',
          clienteNombre: 'CLIENTE B',
        },
      ],
      totalPendiente: 14397.31,
      totalIntereses: 1158.98,
      totalGeneral: 15556.29,
    };

    const pdfBuffer = await generarEstadoCuentaGrupoPDF(estadoGrupo);

    // Verificar que el PDF se generó correctamente
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(0);

    // Verificar que el PDF comienza con el header correcto
    const pdfHeader = pdfBuffer.toString('utf-8', 0, 8);
    expect(pdfHeader).toBe('%PDF-1.3');

    // Convertir el buffer a string para buscar contenido
    const pdfContent = pdfBuffer.toString('utf-8');

    // Verificar que contiene los datos del grupo
    expect(pdfContent).toContain('GRUPO EMPRESARIAL TEST');

    // Verificar que contiene los nombres de clientes
    expect(pdfContent).toContain('CLIENTE A');
    expect(pdfContent).toContain('CLIENTE B');

    // Verificar que contiene las columnas nuevas
    expect(pdfContent).toContain('Contrato');
    expect(pdfContent).toContain('Intereses');

    // Verificar que contiene los números de contrato
    expect(pdfContent).toContain('EXP:123');
    expect(pdfContent).toContain('EXP:456');

    // Verificar que contiene los totales
    expect(pdfContent).toContain('Subtotal');
    expect(pdfContent).toContain('Intereses Moratorios');
    expect(pdfContent).toContain('TOTAL A PAGAR');
  });

  it('debe manejar facturas sin número de contrato mostrando N/A', async () => {
    const estadoCliente = {
      cliente: {
        nombre: 'CLIENTE TEST',
      },
      facturas: [
        {
          folio: 'TEST001',
          fecha: new Date('2026-01-01'),
          importeTotal: '1000.00',
          diasAtraso: 0,
          interesesMoratorios: '0.00',
          sistema: 'tim_transp' as const,
          numeroContrato: null,
        },
      ],
      totalPendiente: 1000.00,
      totalIntereses: 0.00,
      totalGeneral: 1000.00,
    };

    const pdfBuffer = await generarEstadoCuentaClientePDF(estadoCliente);
    const pdfContent = pdfBuffer.toString('utf-8');

    // Verificar que muestra N/A para facturas sin contrato
    expect(pdfContent).toContain('N/A');
  });
});

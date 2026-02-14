import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

interface FacturaPendiente {
  folio: string;
  fecha: Date | null;
  importeTotal: string;
  saldoPendiente: string;
  diasAtraso: number | null;
  interesesMoratorios: string | null;
  sistema: 'tim_transp' | 'tim_value';
  numeroContrato?: string | null;
  clienteNombre?: string;
}

interface EstadoCuentaCliente {
  cliente: {
    nombre: string;
    rfc?: string | null;
    correoCobranza?: string | null;
    telefono?: string | null;
  };
  facturas: FacturaPendiente[];
  totalPendiente: number;
  totalIntereses: number;
  totalGeneral: number;
}

interface EstadoCuentaGrupo {
  grupo: {
    nombre: string;
    responsable?: string | null;
  };
  facturas: Array<FacturaPendiente & { clienteNombre: string }>;
  totalPendiente: number;
  totalIntereses: number;
  totalGeneral: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(value);
}

function formatDate(date: Date | null): string {
  if (!date) return 'N/A';
  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export async function generarEstadoCuentaClientePDF(
  data: EstadoCuentaCliente,
  tasaInteresMoratorio: number = 0
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Encabezado
      doc.fontSize(20).font('Helvetica-Bold').text('Estado de Cuenta', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica').text(new Date().toLocaleDateString('es-MX'), {
        align: 'center',
      });
      doc.moveDown(1);

      // Información del cliente
      doc.fontSize(12).font('Helvetica-Bold').text('Información del Cliente');
      doc.fontSize(10).font('Helvetica');
      doc.text(`Cliente: ${data.cliente.nombre}`);
      if (data.cliente.rfc) doc.text(`RFC: ${data.cliente.rfc}`);
      if (data.cliente.correoCobranza) doc.text(`Correo: ${data.cliente.correoCobranza}`);
      if (data.cliente.telefono) doc.text(`Teléfono: ${data.cliente.telefono}`);
      doc.moveDown(1);

      // Tabla de facturas
      doc.fontSize(12).font('Helvetica-Bold').text('Facturas Pendientes');
      doc.moveDown(0.5);

      const tableTop = doc.y;
      const colWidths = {
        contrato: 60,
        folio: 70,
        fecha: 65,
        sistema: 50,
        importe: 75,
        intereses: 75,
        dias: 45,
      };

      // Encabezados de tabla
      doc.fontSize(9).font('Helvetica-Bold');
      let x = 50;
      doc.text('Contrato', x, tableTop, { width: colWidths.contrato, align: 'left' });
      x += colWidths.contrato;
      doc.text('Folio', x, tableTop, { width: colWidths.folio, align: 'left' });
      x += colWidths.folio;
      doc.text('Fecha', x, tableTop, { width: colWidths.fecha, align: 'left' });
      x += colWidths.fecha;
      doc.text('Sist.', x, tableTop, { width: colWidths.sistema, align: 'left' });
      x += colWidths.sistema;
      doc.text('Importe', x, tableTop, { width: colWidths.importe, align: 'right' });
      x += colWidths.importe;
      doc.text('Intereses', x, tableTop, { width: colWidths.intereses, align: 'right' });
      x += colWidths.intereses;
      doc.text('Días', x, tableTop, { width: colWidths.dias, align: 'right' });

      doc.moveDown(0.3);
      doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
      doc.moveDown(0.3);

      // Calcular totales con tasa editable
      let subtotal = 0;
      let totalIntereses = 0;
      
      // Filas de facturas
      doc.fontSize(8).font('Helvetica');
      data.facturas.forEach((factura) => {
        const rowY = doc.y;
        
        // Verificar si necesitamos nueva página
        if (rowY > 700) {
          doc.addPage();
          doc.y = 50;
        }

        const saldoPendiente = Number(factura.saldoPendiente || 0);
        const diasAtraso = Number(factura.diasAtraso || 0);
        const intereses = saldoPendiente * (tasaInteresMoratorio / 100) * (diasAtraso / 30);
        
        subtotal += saldoPendiente;
        totalIntereses += intereses;

        x = 50;
        doc.text(factura.numeroContrato || 'N/A', x, doc.y, { width: colWidths.contrato, align: 'left' });
        x += colWidths.contrato;
        doc.text(factura.folio, x, rowY, { width: colWidths.folio, align: 'left' });
        x += colWidths.folio;
        doc.text(formatDate(factura.fecha), x, rowY, { width: colWidths.fecha, align: 'left' });
        x += colWidths.fecha;
        doc.text(factura.sistema === 'tim_transp' ? 'TT' : 'TV', x, rowY, {
          width: colWidths.sistema,
          align: 'left',
        });
        x += colWidths.sistema;
        doc.text(formatCurrency(saldoPendiente), x, rowY, { width: colWidths.importe, align: 'right' });
        x += colWidths.importe;
        doc.text(formatCurrency(intereses), x, rowY, { width: colWidths.intereses, align: 'right' });
        x += colWidths.intereses;
        doc.text(String(factura.diasAtraso || 0), x, rowY, { width: colWidths.dias, align: 'right' });

        doc.moveDown(0.8);
      });

      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
      doc.moveDown(0.5);

      // Totales
      const totalGeneral = subtotal + totalIntereses;
      
      doc.fontSize(10).font('Helvetica-Bold');
      const totalsX = 350;
      doc.text('Subtotal:', totalsX, doc.y, { width: 80, align: 'left' });
      doc.text(formatCurrency(subtotal), totalsX + 80, doc.y, {
        width: 82,
        align: 'right',
      });
      doc.moveDown(0.5);
      doc.text(`Intereses Moratorios (${tasaInteresMoratorio}%):`, totalsX, doc.y, { width: 80, align: 'left' });
      doc.text(formatCurrency(totalIntereses), totalsX + 80, doc.y, {
        width: 82,
        align: 'right',
      });
      doc.moveDown(0.5);
      doc.fontSize(12);
      doc.text('TOTAL A PAGAR:', totalsX, doc.y, { width: 80, align: 'left' });
      doc.text(formatCurrency(totalGeneral), totalsX + 80, doc.y, {
        width: 82,
        align: 'right',
      });

      // Pie de página
      doc.moveDown(2);
      doc.fontSize(8).font('Helvetica').text(
        'Este documento es un estado de cuenta informativo. Para cualquier aclaración, favor de contactar al departamento de cobranza.',
        50,
        doc.page.height - 100,
        { align: 'center', width: 512 }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export async function generarEstadoCuentaGrupoPDF(
  data: EstadoCuentaGrupo,
  tasaInteresMoratorio: number = 0
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Encabezado
      doc.fontSize(20).font('Helvetica-Bold').text('Estado de Cuenta - Grupo', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica').text(new Date().toLocaleDateString('es-MX'), {
        align: 'center',
      });
      doc.moveDown(1);

      // Información del grupo
      doc.fontSize(12).font('Helvetica-Bold').text('Información del Grupo');
      doc.fontSize(10).font('Helvetica');
      doc.text(`Grupo: ${data.grupo.nombre}`);
      doc.moveDown(1);

      // Tabla de facturas
      doc.fontSize(12).font('Helvetica-Bold').text('Facturas Pendientes');
      doc.moveDown(0.5);

      const tableTop = doc.y;
      const colWidths = {
        contrato: 50,
        cliente: 85,
        folio: 60,
        fecha: 60,
        importe: 70,
        intereses: 70,
        dias: 45,
      };

      // Encabezados de tabla
      doc.fontSize(9).font('Helvetica-Bold');
      let x = 50;
      doc.text('Contrato', x, tableTop, { width: colWidths.contrato, align: 'left' });
      x += colWidths.contrato;
      doc.text('Cliente', x, tableTop, { width: colWidths.cliente, align: 'left' });
      x += colWidths.cliente;
      doc.text('Folio', x, tableTop, { width: colWidths.folio, align: 'left' });
      x += colWidths.folio;
      doc.text('Fecha', x, tableTop, { width: colWidths.fecha, align: 'left' });
      x += colWidths.fecha;
      doc.text('Importe', x, tableTop, { width: colWidths.importe, align: 'right' });
      x += colWidths.importe;
      doc.text('Intereses', x, tableTop, { width: colWidths.intereses, align: 'right' });
      x += colWidths.intereses;
      doc.text('Días', x, tableTop, { width: colWidths.dias, align: 'right' });

      doc.moveDown(0.3);
      doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
      doc.moveDown(0.3);

      // Calcular totales con tasa editable
      let subtotal = 0;
      let totalIntereses = 0;
      
      // Filas de facturas
      doc.fontSize(8).font('Helvetica');
      data.facturas.forEach((factura) => {
        const rowY = doc.y;
        
        // Verificar si necesitamos nueva página
        if (rowY > 700) {
          doc.addPage();
          doc.y = 50;
        }

        const saldoPendiente = Number(factura.saldoPendiente || 0);
        const diasAtraso = Number(factura.diasAtraso || 0);
        const intereses = saldoPendiente * (tasaInteresMoratorio / 100) * (diasAtraso / 30);
        
        subtotal += saldoPendiente;
        totalIntereses += intereses;

        x = 50;
        doc.text(factura.numeroContrato || 'N/A', x, doc.y, {
          width: colWidths.contrato,
          align: 'left',
        });
        x += colWidths.contrato;
        doc.text(factura.clienteNombre || '', x, rowY, {
          width: colWidths.cliente,
          align: 'left',
        });
        x += colWidths.cliente;
        doc.text(factura.folio, x, rowY, { width: colWidths.folio, align: 'left' });
        x += colWidths.folio;
        doc.text(formatDate(factura.fecha), x, rowY, { width: colWidths.fecha, align: 'left' });
        x += colWidths.fecha;
        doc.text(formatCurrency(saldoPendiente), x, rowY, { width: colWidths.importe, align: 'right' });
        x += colWidths.importe;
        doc.text(formatCurrency(intereses), x, rowY, { width: colWidths.intereses, align: 'right' });
        x += colWidths.intereses;
        doc.text(String(factura.diasAtraso || 0), x, rowY, { width: colWidths.dias, align: 'right' });

        doc.moveDown(0.8);
      });

      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
      doc.moveDown(0.5);

      // Totales
      const totalGeneral = subtotal + totalIntereses;
      
      doc.fontSize(10).font('Helvetica-Bold');
      const totalsX = 350;
      doc.text('Subtotal:', totalsX, doc.y, { width: 80, align: 'left' });
      doc.text(formatCurrency(subtotal), totalsX + 80, doc.y, {
        width: 82,
        align: 'right',
      });
      doc.moveDown(0.5);
      doc.text(`Intereses Moratorios (${tasaInteresMoratorio}%):`, totalsX, doc.y, { width: 80, align: 'left' });
      doc.text(formatCurrency(totalIntereses), totalsX + 80, doc.y, {
        width: 82,
        align: 'right',
      });
      doc.moveDown(0.5);
      doc.fontSize(12);
      doc.text('TOTAL A PAGAR:', totalsX, doc.y, { width: 80, align: 'left' });
      doc.text(formatCurrency(totalGeneral), totalsX + 80, doc.y, {
        width: 82,
        align: 'right',
      });

      // Pie de página
      doc.moveDown(2);
      doc.fontSize(8).font('Helvetica').text(
        'Este documento es un estado de cuenta informativo. Para cualquier aclaración, favor de contactar al departamento de cobranza.',
        50,
        doc.page.height - 100,
        { align: 'center', width: 512 }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

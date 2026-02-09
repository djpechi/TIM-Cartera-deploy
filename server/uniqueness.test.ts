import { describe, it, expect, beforeAll } from 'vitest';
import { createCliente, getClienteByNombre, createFactura, getFacturaByFolio } from './db';
import type { InsertCliente, InsertFactura } from '../drizzle/schema';

describe('Validaciones de Unicidad', () => {
  describe('Clientes', () => {
    const testCliente: InsertCliente = {
      nombre: 'Test Cliente Unicidad ' + Date.now(),
      rfc: 'TEST123456',
      activo: true,
    };

    it('debe crear un cliente nuevo sin errores', async () => {
      const clienteId = await createCliente(testCliente);
      expect(clienteId).toBeTypeOf('number');
      expect(clienteId).toBeGreaterThan(0);
    });

    it('debe rechazar la creación de un cliente con nombre duplicado', async () => {
      const duplicateCliente: InsertCliente = {
        ...testCliente,
        rfc: 'OTRO123456',
      };

      await expect(createCliente(duplicateCliente)).rejects.toThrow(
        /Ya existe un cliente con el nombre/
      );
    });

    it('debe permitir buscar un cliente por nombre', async () => {
      const found = await getClienteByNombre(testCliente.nombre);
      expect(found).toBeDefined();
      expect(found?.nombre).toBe(testCliente.nombre);
    });
  });

  describe('Facturas', () => {
    const testFactura: InsertFactura = {
      folio: 'TEST-' + Date.now(),
      sistema: 'tim_transp',
      nombreCliente: 'Cliente Test',
      fecha: new Date(),
      importeTotal: '1000.00',
      estatus: 'normal',
      estadoPago: 'pendiente',
    };

    it('debe crear una factura nueva sin errores', async () => {
      const factura = await createFactura(testFactura);
      expect(factura.id).toBeTypeOf('number');
      expect(factura.folio).toBe(testFactura.folio);
    });

    it('debe rechazar la creación de una factura con folio duplicado', async () => {
      const duplicateFactura: InsertFactura = {
        ...testFactura,
        nombreCliente: 'Otro Cliente',
      };

      await expect(createFactura(duplicateFactura)).rejects.toThrow(
        /Ya existe una factura con el folio/
      );
    });

    it('debe permitir buscar una factura por folio', async () => {
      const found = await getFacturaByFolio(testFactura.folio);
      expect(found).toBeDefined();
      expect(found?.folio).toBe(testFactura.folio);
    });
  });
});

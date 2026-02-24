import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { 
  contratosProyeccion, 
  lineItemsContrato, 
  proyeccionMensualManual,
  vendedores,
  clientes 
} from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  calcularLineItemPuro,
  calcularLineItemFinanciero,
  calcularLineItemCredito,
  generarProyeccionMensual,
  type LineItemCalculado,
} from "../calculosFinancieros";

/**
 * Middleware para verificar que el usuario es administrador
 */
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Solo los administradores pueden realizar esta acción",
    });
  }
  return next({ ctx });
});

export const proyeccionContratosRouter = router({
  /**
   * Listar todos los contratos de proyección
   */
  list: protectedProcedure
    .input(z.object({
      estatus: z.enum(["activo", "cancelado", "todos"]).optional().default("activo"),
      clienteId: z.number().optional(),
      empresa: z.enum(["tim_transp", "tim_value", "todas"]).optional().default("todas"),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      let query = db
        .select({
          id: contratosProyeccion.id,
          numeroContrato: contratosProyeccion.numeroContrato,
          clienteId: contratosProyeccion.clienteId,
          clienteNombre: clientes.nombre,
          vendedorId: contratosProyeccion.vendedorId,
          vendedorNombre: vendedores.nombre,
          empresa: contratosProyeccion.empresa,
          tipoContrato: contratosProyeccion.tipoContrato,
          fechaInicio: contratosProyeccion.fechaInicio,
          plazo: contratosProyeccion.plazo,
          estatus: contratosProyeccion.estatus,
          createdAt: contratosProyeccion.createdAt,
        })
        .from(contratosProyeccion)
        .leftJoin(clientes, eq(contratosProyeccion.clienteId, clientes.id))
        .leftJoin(vendedores, eq(contratosProyeccion.vendedorId, vendedores.id))
        .$dynamic();

      // Filtrar por estatus
      if (input.estatus !== "todos") {
        query = query.where(eq(contratosProyeccion.estatus, input.estatus));
      }

      // Filtrar por cliente
      if (input.clienteId) {
        query = query.where(eq(contratosProyeccion.clienteId, input.clienteId));
      }

      // Filtrar por empresa
      if (input.empresa !== "todas") {
        query = query.where(eq(contratosProyeccion.empresa, input.empresa));
      }

      const contratos = await query.orderBy(desc(contratosProyeccion.createdAt));
      return contratos;
    }),

  /**
   * Obtener detalle de un contrato con sus line items y proyección
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Obtener contrato
      const contrato = await db
        .select()
        .from(contratosProyeccion)
        .where(eq(contratosProyeccion.id, input.id))
        .limit(1);

      if (!contrato || contrato.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Contrato no encontrado" });
      }

      // Obtener line items
      const lineItems = await db
        .select()
        .from(lineItemsContrato)
        .where(eq(lineItemsContrato.contratoId, input.id))
        .orderBy(lineItemsContrato.consecutivo);

      // Obtener proyección mensual
      const proyeccion = await db
        .select()
        .from(proyeccionMensualManual)
        .where(eq(proyeccionMensualManual.contratoId, input.id))
        .orderBy(proyeccionMensualManual.mes);

      return {
        contrato: contrato[0],
        lineItems,
        proyeccion,
      };
    }),

  /**
   * Crear un nuevo contrato de proyección
   */
  create: adminProcedure
    .input(z.object({
      numeroContrato: z.string().min(1, "El número de contrato es requerido"),
      clienteId: z.number(),
      vendedorId: z.number().optional(),
      empresa: z.enum(["tim_transp", "tim_value"]),
      tipoContrato: z.enum(["arrendamiento_puro", "arrendamiento_financiero", "credito_simple"]),
      fechaInicio: z.string(), // ISO date string
      plazo: z.number().min(12).max(60),
      notas: z.string().optional(),
      lineItems: z.array(z.object({
        nombreEquipo: z.string().min(1),
        // Campos comunes
        precioEquipoSinIva: z.number().optional(),
        pagoInicialSinIva: z.number().default(0),
        comisionesSinIva: z.number().default(0),
        valorResidualSinIva: z.number().default(0),
        // Arrendamiento Puro
        mensualidadBaseSinIva: z.number().optional(),
        serviciosAdicionalesSinIva: z.number().optional(),
        // Financiero y Crédito
        tasaInteresAnual: z.number().optional(),
      })).min(1, "Debe agregar al menos un equipo"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Verificar que el número de contrato no exista
      const existente = await db
        .select()
        .from(contratosProyeccion)
        .where(eq(contratosProyeccion.numeroContrato, input.numeroContrato))
        .limit(1);

      if (existente && existente.length > 0) {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "Ya existe un contrato con ese número" 
        });
      }

      // Crear contrato
      const [contrato] = await db.insert(contratosProyeccion).values([{
        numeroContrato: input.numeroContrato,
        clienteId: input.clienteId,
        vendedorId: input.vendedorId,
        empresa: input.empresa,
        tipoContrato: input.tipoContrato,
        fechaInicio: new Date(input.fechaInicio),
        plazo: input.plazo,
        notas: input.notas,
        creadoPorId: ctx.user.id,
      }]);

      const contratoId = Number(contrato.insertId);

      // Crear line items y proyección
      for (let i = 0; i < input.lineItems.length; i++) {
        const item = input.lineItems[i];
        let calculado: LineItemCalculado & { montoFinanciar?: number };

        // Calcular según el tipo de contrato
        if (input.tipoContrato === "arrendamiento_puro") {
          calculado = calcularLineItemPuro({
            precioEquipoSinIva: item.precioEquipoSinIva,
            pagoInicialSinIva: item.pagoInicialSinIva,
            comisionesSinIva: item.comisionesSinIva,
            mensualidadBaseSinIva: item.mensualidadBaseSinIva || 0,
            serviciosAdicionalesSinIva: item.serviciosAdicionalesSinIva || 0,
            valorResidualSinIva: item.valorResidualSinIva,
          });
        } else if (input.tipoContrato === "arrendamiento_financiero") {
          calculado = calcularLineItemFinanciero({
            precioEquipoSinIva: item.precioEquipoSinIva || 0,
            pagoInicialSinIva: item.pagoInicialSinIva,
            comisionesSinIva: item.comisionesSinIva,
            tasaInteresAnual: item.tasaInteresAnual || 0,
            valorResidualSinIva: item.valorResidualSinIva,
            plazoMeses: input.plazo,
          });
        } else {
          // credito_simple
          calculado = calcularLineItemCredito({
            montoCredito: item.precioEquipoSinIva || 0,
            pagoInicialSinIva: item.pagoInicialSinIva,
            comisionesSinIva: item.comisionesSinIva,
            tasaInteresAnual: item.tasaInteresAnual || 0,
            valorResidualSinIva: item.valorResidualSinIva,
            plazoMeses: input.plazo,
          });
        }

        // Insertar line item
        const [lineItem] = await db.insert(lineItemsContrato).values([{
          contratoId,
          consecutivo: i + 1,
          nombreEquipo: item.nombreEquipo,
          precioEquipoSinIva: item.precioEquipoSinIva?.toString(),
          pagoInicialSinIva: item.pagoInicialSinIva.toString(),
          comisionesSinIva: item.comisionesSinIva.toString(),
          valorResidualSinIva: item.valorResidualSinIva.toString(),
          mensualidadBaseSinIva: item.mensualidadBaseSinIva?.toString(),
          serviciosAdicionalesSinIva: item.serviciosAdicionalesSinIva?.toString(),
          tasaInteresAnual: item.tasaInteresAnual?.toString(),
          montoFinanciar: calculado.montoFinanciar?.toString(),
          rentaMensualSinIva: calculado.rentaMensualSinIva.toString(),
          ivaMensual: calculado.ivaMensual.toString(),
          rentaMensualConIva: calculado.rentaMensualConIva.toString(),
          totalPagoInicialSinIva: calculado.totalPagoInicialSinIva.toString(),
          ivaPagoInicial: calculado.ivaPagoInicial.toString(),
          totalPagoInicialConIva: calculado.totalPagoInicialConIva.toString(),
          totalComisionesSinIva: calculado.totalComisionesSinIva.toString(),
          ivaComisiones: calculado.ivaComisiones.toString(),
          totalComisionesConIva: calculado.totalComisionesConIva.toString(),
          totalValorResidualSinIva: calculado.totalValorResidualSinIva.toString(),
          ivaValorResidual: calculado.ivaValorResidual.toString(),
          totalValorResidualConIva: calculado.totalValorResidualConIva.toString(),
        }]);

        const lineItemId = Number(lineItem.insertId);

        // Generar proyección mensual
        const proyeccion = generarProyeccionMensual(
          new Date(input.fechaInicio),
          input.plazo,
          calculado
        );

        // Insertar proyección mensual
        for (const mes of proyeccion) {
          await db.insert(proyeccionMensualManual).values({
            contratoId,
            lineItemId,
            mes: mes.mes,
            numeroRenta: mes.numeroRenta,
            montoPagoInicial: mes.montoPagoInicial.toString(),
            montoComisiones: mes.montoComisiones.toString(),
            montoRentaMensual: mes.montoRentaMensual.toString(),
            montoValorResidual: mes.montoValorResidual.toString(),
            montoTotal: mes.montoTotal.toString(),
          });
        }
      }

      return { success: true, contratoId };
    }),

  /**
   * Dar de baja (cancelar) un contrato
   */
  cancelar: adminProcedure
    .input(z.object({
      id: z.number(),
      motivoCancelacion: z.string().min(1, "El motivo de cancelación es requerido"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Verificar que el contrato existe y está activo
      const contrato = await db
        .select()
        .from(contratosProyeccion)
        .where(eq(contratosProyeccion.id, input.id))
        .limit(1);

      if (!contrato || contrato.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Contrato no encontrado" });
      }

      if (contrato[0].estatus === "cancelado") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "El contrato ya está cancelado" });
      }

      // Cancelar contrato
      await db
        .update(contratosProyeccion)
        .set({
          estatus: "cancelado",
          fechaCancelacion: new Date(),
          motivoCancelacion: input.motivoCancelacion,
          usuarioCancelacionId: ctx.user.id,
        })
        .where(eq(contratosProyeccion.id, input.id));

      return { success: true };
    }),

  /**
   * Listar vendedores
   */
  listVendedores: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const result = await db
      .select()
      .from(vendedores)
      .where(eq(vendedores.activo, true))
      .orderBy(vendedores.nombre);

    return result;
  }),

  /**
   * Crear vendedor
   */
  createVendedor: adminProcedure
    .input(z.object({
      nombre: z.string().min(1),
      email: z.string().email().optional(),
      telefono: z.string().optional(),
      comisionPorcentaje: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [vendedor] = await db.insert(vendedores).values({
        nombre: input.nombre,
        email: input.email,
        telefono: input.telefono,
        comisionPorcentaje: input.comisionPorcentaje?.toString(),
      });
      return { success: true, vendedorId: Number(vendedor.insertId) };
    }),
});

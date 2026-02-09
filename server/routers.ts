import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { 
  processTimTranspFile, 
  processTimValueFile, 
  processPendientesFile,
  calcularAtrasoEIntereses 
} from "./xlsxProcessor";
import { TRPCError } from "@trpc/server";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ============ Dashboard ============
  dashboard: router({
    stats: protectedProcedure.query(async () => {
      const stats = await db.getDashboardStats();
      const historialReciente = await db.getAllHistorialCargas();
      
      return {
        ...stats,
        ultimasCargasCount: historialReciente.length,
      };
    }),
    
    facturasPendientes: protectedProcedure.query(async () => {
      return await db.getFacturasPendientes();
    }),
    
    historialCargas: protectedProcedure.query(async () => {
      return await db.getAllHistorialCargas();
    }),
  }),

  // ============ Carga de Archivos ============
  upload: router({
    processFile: protectedProcedure
      .input(z.object({
        tipoArchivo: z.enum(['tim_transp', 'tim_value', 'pendientes']),
        fileName: z.string(),
        fileData: z.string(), // Base64 encoded
      }))
      .mutation(async ({ input, ctx }) => {
        const { tipoArchivo, fileName, fileData } = input;
        
        // Crear registro de historial
        const historialResult = await db.createHistorialCarga({
          tipoArchivo,
          nombreArchivo: fileName,
          registrosProcesados: 0,
          registrosExitosos: 0,
          registrosError: 0,
          estatus: 'procesando',
          usuarioId: ctx.user.id,
        });
        
        const historialId = Number(historialResult[0].insertId);
        
        try {
          // Decodificar archivo
          const buffer = Buffer.from(fileData, 'base64');
          
          let result;
          if (tipoArchivo === 'tim_transp') {
            result = processTimTranspFile(buffer);
          } else if (tipoArchivo === 'tim_value') {
            result = processTimValueFile(buffer);
          } else {
            result = processPendientesFile(buffer);
          }
          
          if (!result.success) {
            await db.updateHistorialCarga(historialId, {
              estatus: 'error',
              errores: result.errores,
              completedAt: new Date(),
            });
            
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Error al procesar archivo: ${result.errores.join(', ')}`,
            });
          }
          
          // Obtener configuración de tasa de interés
          const tasaConfig = await db.getConfiguracion('tasa_interes_mensual');
          const tasaInteres = tasaConfig ? parseFloat(tasaConfig.valor) : 1.5;
          
          // Guardar datos en la base de datos
          if (tipoArchivo === 'pendientes') {
            // Limpiar pendientes anteriores
            await db.clearAllPendientes();
            
            // Insertar nuevos pendientes
            for (const pendiente of result.data || []) {
              await db.createPendientePago(pendiente as any);
            }
            
            // Actualizar estado de facturas basado en pendientes
            const allFacturas = await db.getAllFacturas();
            const foliosPendientes = new Set((result.data || []).map((p: any) => p.folio));
            
            for (const factura of allFacturas) {
              const estadoPago = foliosPendientes.has(factura.folio) ? 'pendiente' : 'pagado';
              await db.updateFacturaEstadoPago(factura.folio, estadoPago);
            }
          } else {
            // Insertar o actualizar facturas
            for (const factura of result.data || []) {
              // Calcular fecha de vencimiento (30 días después de la fecha de factura)
              const fechaVencimiento = new Date(factura.fecha);
              fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);
              
              // Calcular atraso e intereses
              const { diasAtraso, interesesMoratorios, totalConIntereses } = calcularAtrasoEIntereses(
                fechaVencimiento,
                parseFloat(factura.importeTotal),
                tasaInteres
              );
              
              await db.upsertFactura({
                ...factura,
                fechaVencimiento,
                diasAtraso,
                interesesMoratorios: interesesMoratorios.toString(),
                totalConIntereses: totalConIntereses.toString(),
              } as any);
            }
          }
          
          // Actualizar historial
          await db.updateHistorialCarga(historialId, {
            registrosProcesados: result.registrosProcesados,
            registrosExitosos: result.registrosExitosos,
            registrosError: result.registrosError,
            errores: result.errores,
            estatus: 'completado',
            completedAt: new Date(),
          });
          
          // Crear log de auditoría
          await db.createAuditLog({
            usuarioId: ctx.user.id,
            accion: 'upload_file',
            entidad: 'historialCargas',
            entidadId: historialId,
            detalles: {
              tipoArchivo,
              fileName,
              registrosExitosos: result.registrosExitosos,
            },
          });
          
          return {
            success: true,
            historialId,
            registrosProcesados: result.registrosProcesados,
            registrosExitosos: result.registrosExitosos,
            registrosError: result.registrosError,
            errores: result.errores,
          };
        } catch (error) {
          await db.updateHistorialCarga(historialId, {
            estatus: 'error',
            errores: [String(error)],
            completedAt: new Date(),
          });
          
          throw error;
        }
      }),
  }),

  // ============ Clientes ============
  clientes: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllClientes();
    }),
    
    create: protectedProcedure
      .input(z.object({
        nombre: z.string(),
        alias: z.string().optional(),
        grupo: z.string().optional(),
        asignado: z.string().optional(),
        correoCobranza: z.string().email().optional(),
        telefono: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.createCliente(input);
        
        await db.createAuditLog({
          usuarioId: ctx.user.id,
          accion: 'create_cliente',
          entidad: 'clientes',
          detalles: input,
        });
        
        return { success: true };
      }),
  }),

  // ============ Facturas ============
  facturas: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllFacturas();
    }),
    
    pendientes: protectedProcedure.query(async () => {
      return await db.getFacturasPendientes();
    }),
    
    byFolio: protectedProcedure
      .input(z.object({ folio: z.string() }))
      .query(async ({ input }) => {
        return await db.getFacturaByFolio(input.folio);
      }),
  }),

  // ============ Configuración ============
  config: router({
    get: protectedProcedure
      .input(z.object({ clave: z.string() }))
      .query(async ({ input }) => {
        return await db.getConfiguracion(input.clave);
      }),
    
    getAll: protectedProcedure.query(async () => {
      return await db.getAllConfiguracion();
    }),
    
    set: protectedProcedure
      .input(z.object({
        clave: z.string(),
        valor: z.string(),
        tipo: z.enum(['string', 'number', 'boolean', 'json']),
        descripcion: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.setConfiguracion({
          ...input,
          updatedBy: ctx.user.id,
        });
        
        await db.createAuditLog({
          usuarioId: ctx.user.id,
          accion: 'update_config',
          entidad: 'configuracion',
          detalles: input,
        });
        
        return { success: true };
      }),
  }),

  // ============ Reportes ============
  reportes: router({
    carteraVencida: protectedProcedure.query(async () => {
      const facturas = await db.getFacturasPendientes();
      
      // Agrupar por cliente
      const porCliente = facturas.reduce((acc, factura) => {
        const cliente = factura.nombreCliente;
        if (!acc[cliente]) {
          acc[cliente] = {
            cliente,
            facturas: [],
            totalSaldo: 0,
            totalIntereses: 0,
            totalConIntereses: 0,
          };
        }
        
        acc[cliente].facturas.push(factura);
        acc[cliente].totalSaldo += parseFloat(factura.importeTotal);
        acc[cliente].totalIntereses += parseFloat(factura.interesesMoratorios || '0');
        acc[cliente].totalConIntereses += parseFloat(factura.totalConIntereses || '0');
        
        return acc;
      }, {} as Record<string, any>);
      
      return Object.values(porCliente);
    }),
    
    evolucionTemporal: protectedProcedure
      .input(z.object({
        meses: z.number().default(6),
      }))
      .query(async ({ input }) => {
        // Obtener todas las facturas
        const facturas = await db.getAllFacturas();
        
        // Agrupar por mes
        const porMes = facturas.reduce((acc, factura) => {
          const mes = new Date(factura.fecha).toISOString().slice(0, 7);
          if (!acc[mes]) {
            acc[mes] = {
              mes,
              totalFacturado: 0,
              totalPendiente: 0,
              totalPagado: 0,
            };
          }
          
          acc[mes].totalFacturado += parseFloat(factura.importeTotal);
          if (factura.estadoPago === 'pendiente') {
            acc[mes].totalPendiente += parseFloat(factura.importeTotal);
          } else {
            acc[mes].totalPagado += parseFloat(factura.importeTotal);
          }
          
          return acc;
        }, {} as Record<string, any>);
        
        return Object.values(porMes).sort((a, b) => b.mes.localeCompare(a.mes)).slice(0, input.meses);
      }),
  }),
});

export type AppRouter = typeof appRouter;

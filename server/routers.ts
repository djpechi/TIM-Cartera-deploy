import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { adminProcedure } from "./adminMiddleware";
import { z } from "zod";
import * as db from "./db";
import { 
  processTimTranspFile, 
  processTimValueFile, 
  processPendientesFile,
  calcularAtrasoEIntereses 
} from "./xlsxProcessor";
import { processContratosFile } from "./contratosProcessor";
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
    updateFormatoMoneda: protectedProcedure
      .input(z.object({
        formato: z.enum(["completo", "miles", "millones"]),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.updateUserFormatoMoneda(ctx.user.id, input.formato);
        return { success: true };
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
    
    facturasFaltantes: protectedProcedure.query(async () => {
      return await db.getFacturasFaltantesNoResueltas();
    }),
  }),

  // ============ Carga de Archivos ============
  upload: router({
    processFile: protectedProcedure
      .input(z.object({
        tipoArchivo: z.enum(['tim_transp', 'tim_value', 'pendientes', 'contratos']),
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
          } else if (tipoArchivo === 'contratos') {
            // Guardar archivo temporalmente para procesarlo
            const fs = await import('fs/promises');
            const path = await import('path');
            const tempPath = path.join('/tmp', `contratos_${Date.now()}.xlsx`);
            await fs.writeFile(tempPath, buffer);
            
            const contratosResult = await processContratosFile(tempPath);
            
            // Limpiar archivo temporal
            await fs.unlink(tempPath);
            
            result = {
              success: true,
              data: contratosResult.contratos,
              resumen: contratosResult.resumen,
              errores: contratosResult.resumen.errores
            };
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
          let facturasFaltantes: any[] = [];
          let saldosPendientes: Map<string, number> = new Map();
          
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
            const foliosExistentes = new Set(allFacturas.map(f => f.folio));
            
            // Crear mapa de saldos pendientes del archivo
            saldosPendientes = new Map(
              (result.data || []).map((p: any) => [p.folio, parseFloat(p.saldo || '0')])
            );
            
            console.log(`[DEBUG] Registros en archivo: ${result.data?.length || 0}`);
            console.log(`[DEBUG] Saldos en mapa: ${saldosPendientes.size}`);
            const totalArchivoDebug = Array.from(saldosPendientes.values()).reduce((sum: number, val: number) => sum + val, 0);
            console.log(`[DEBUG] Total saldos en mapa: $${totalArchivoDebug.toFixed(2)}`);
            
            // Identificar facturas que están en el archivo pero NO en la BD
            const foliosFaltantes = (result.data || []).filter((p: any) => !foliosExistentes.has(p.folio));
            
            // Guardar lista de facturas faltantes para reportar al usuario
            facturasFaltantes = foliosFaltantes.map((p: any) => ({
              folio: p.folio,
              saldo: p.saldo,
              fecha: p.fecha,
              fechaVencimiento: p.fechaVencimiento
            }));
            
            console.log(`[PENDIENTES] Facturas faltantes detectadas: ${facturasFaltantes.length}`);
            if (facturasFaltantes.length > 0) {
              console.log('[PENDIENTES] Folios faltantes:', facturasFaltantes.map(f => f.folio).join(', '));
              
              // Guardar facturas faltantes en la base de datos
              for (const faltante of facturasFaltantes) {
                await db.insertFacturaFaltante({
                  folio: faltante.folio,
                  saldo: faltante.saldo,
                  fecha: faltante.fecha,
                  fechaVencimiento: faltante.fechaVencimiento,
                  archivoOrigen: input.fileName || 'pendientes.xlsx',
                  resuelta: false
                });
              }
            }
            
            // NO crear facturas nuevas - solo reportar las faltantes
            // (Las facturas deben ser creadas primero desde archivos TT o TV)
            
            // Identificar fecha más antigua en el archivo de pendientes
            let fechaMinimaArchivo: Date | null = null;
            for (const pendiente of result.data || []) {
              if (pendiente.fecha) {
                const fecha = new Date(pendiente.fecha);
                if (!fechaMinimaArchivo || fecha < fechaMinimaArchivo) {
                  fechaMinimaArchivo = fecha;
                }
              }
            }
            
            if (fechaMinimaArchivo) {
              console.log(`[FECHA MÍNIMA] Fecha más antigua en archivo: ${fechaMinimaArchivo.toISOString().split('T')[0]}`);
            }
            
            // Crear mapa de fechas del archivo para actualizar facturas existentes
            const fechasArchivo = new Map(
              (result.data || [])
                .filter((p: any) => p.fecha && p.fechaVencimiento)
                .map((p: any) => [p.folio, { fecha: p.fecha, fechaVencimiento: p.fechaVencimiento }])
            );
            
            // Actualizar saldoPendiente, estado y fechas de todas las facturas
            // NUEVA LÓGICA: Si la factura está en el archivo de pendientes, es pendiente; si no, es pagado
            // VALIDACIÓN: Solo actualizar facturas con fecha >= fecha mínima del archivo
            let facturasActualizadas = 0;
            let saldoTotalActualizado = 0;
            let facturasIgnoradasHistoricas = 0;
            for (const factura of allFacturas) {
              // Log para AA1455 - verificar si entra en el bucle
              if (factura.folio === 'AA1455') {
                console.log(`[DEBUG AA1455] Procesando factura - Fecha: ${factura.fecha}, Fecha mínima archivo: ${fechaMinimaArchivo}`);
              }
              
              // TEMPORALMENTE DESHABILITADO: Ignorar facturas históricas
              // TODO: Revisar lógica de fecha mínima después de resolver problema de actualización
              /*
              if (fechaMinimaArchivo && factura.fecha) {
                const fechaFactura = new Date(factura.fecha);
                if (fechaFactura < fechaMinimaArchivo) {
                  if (factura.folio === 'AA1455') {
                    console.log(`[DEBUG AA1455] IGNORADA como histórica - Fecha factura: ${fechaFactura.toISOString()}, Fecha mínima: ${fechaMinimaArchivo.toISOString()}`);
                  }
                  facturasIgnoradasHistoricas++;
                  continue; // No modificar esta factura
                }
              }
              */
              const estaEnArchivoPendientes = foliosPendientes.has(factura.folio);
              const saldoPendiente = estaEnArchivoPendientes ? (saldosPendientes.get(factura.folio) || 0) : 0;
              const estadoPago = estaEnArchivoPendientes ? 'pendiente' : 'pagado';
              
              // Log para facturas que se marcan como pagadas (para debug)
              if (!estaEnArchivoPendientes && factura.folio === 'AA1455') {
                console.log(`[DEBUG AA1455] Marcando como pagada - Fecha: ${factura.fecha}, Estado anterior: ${factura.estadoPago}`);
              }
              
              // Si el archivo tiene fechas para esta factura, actualizarlas también
              const fechasDelArchivo = fechasArchivo.get(factura.folio);
              if (fechasDelArchivo) {
                const fechaFactura = new Date(fechasDelArchivo.fecha);
                const fechaVencimiento = new Date(fechasDelArchivo.fechaVencimiento);
                
                // Recalcular diasAtraso basado en fechaVencimiento real
                const hoy = new Date();
                hoy.setHours(0, 0, 0, 0);
                const vence = new Date(fechaVencimiento);
                vence.setHours(0, 0, 0, 0);
                const diasAtraso = Math.max(0, Math.floor((hoy.getTime() - vence.getTime()) / (1000 * 60 * 60 * 24)));
                
                // Actualizar factura con fechas y saldo
                await db.upsertFactura({
                  ...factura,
                  fecha: fechaFactura,
                  fechaVencimiento,
                  saldoPendiente: saldoPendiente.toString(),
                  estadoPago,
                  diasAtraso,
                } as any);
              } else {
                // Solo actualizar saldo si no hay fechas en el archivo
                await db.updateFacturaSaldoPendiente(factura.folio, saldoPendiente, estadoPago);
              }
              
              if (estaEnArchivoPendientes) {
                facturasActualizadas++;
                saldoTotalActualizado += saldoPendiente;
              }
            }
            
            console.log(`[DEBUG] Facturas actualizadas: ${facturasActualizadas}`);
            console.log(`[DEBUG] Saldo total actualizado: $${saldoTotalActualizado.toFixed(2)}`);
            if (facturasIgnoradasHistoricas > 0) {
              console.log(`[DEBUG] Facturas históricas ignoradas: ${facturasIgnoradasHistoricas}`);
            }
          } else if (tipoArchivo === 'contratos') {
            // Guardar contratos en la base de datos
            let contratosActualizados = 0;
            let contratosNuevos = 0;
            
            for (const contrato of result.data || []) {
              const contratoExistente = await db.getContratoByNumero(contrato.numeroContrato);
              
              await db.upsertContratoFromFile({
                numeroContrato: contrato.numeroContrato,
                nombreCliente: contrato.cliente,
                fechaInicio: contrato.fechaInicio,
                plazo: contrato.plazo,
                fechaTerminacion: contrato.fechaTerminacion,
                rentaMensual: contrato.rentaMensual,
                rentaAdministracion: contrato.rentaAdministracion,
                rentaClubTim: contrato.rentaClubTim,
                descripcion: contrato.descripcion,
                numeroSerie: contrato.numeroSerie,
                estado: contrato.estado,
              });
              
              if (contratoExistente) {
                contratosActualizados++;
              } else {
                contratosNuevos++;
              }
            }
            
            console.log(`[CONTRATOS] Nuevos: ${contratosNuevos}, Actualizados: ${contratosActualizados}`);
          } else {
            // Insertar o actualizar facturas
            const facturasConId: Array<{
              id: number;
              descripcion: string;
              monto: number;
              nombreCliente: string;
              empresa: 'tim_transp' | 'tim_value';
              fecha: Date;
            }> = [];
            
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
              
              // Obtener el ID de la factura recién insertada
              const facturaGuardada = await db.getFacturaByFolio(factura.folio);
              if (facturaGuardada && factura.descripcion) {
                facturasConId.push({
                  id: facturaGuardada.id,
                  descripcion: factura.descripcion,
                  monto: parseFloat(factura.importeTotal),
                  nombreCliente: factura.nombreCliente,
                  empresa: tipoArchivo as 'tim_transp' | 'tim_value',
                  fecha: new Date(factura.fecha),
                });
              }
            }
            
            // Procesar contratos de las facturas
            if (facturasConId.length > 0) {
              const { procesarLoteFacturas } = await import('./contratoIntegration');
              const resultadoContratos = await procesarLoteFacturas(facturasConId);
              
              // Agregar información de contratos al log
              await db.createAuditLog({
                usuarioId: ctx.user.id,
                accion: 'process_contratos',
                entidad: 'contratos',
                detalles: {
                  tipoArchivo,
                  ...resultadoContratos,
                },
              });
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
          
          // Validar totales después de la carga de pendientes
          let validacionTotales = null;
          if (tipoArchivo === 'pendientes') {
            const totalArchivo = Array.from(saldosPendientes.values()).reduce((sum: number, val: number) => sum + val, 0);
            const allFacturasPendientes = await db.getFacturasCarteraPendiente();
            const totalBD = allFacturasPendientes.reduce((sum, f) => sum + parseFloat(f.saldoPendiente || '0'), 0);
            const diferencia = Math.abs(totalArchivo - totalBD);
            const tolerancia = 0.01; // Tolerancia de 1 centavo
            
            validacionTotales = {
              totalArchivo,
              totalBD,
              diferencia,
              coincide: diferencia < tolerancia
            };
            
            console.log(`[VALIDACIÓN] Total archivo: $${totalArchivo.toFixed(2)}`);
            console.log(`[VALIDACIÓN] Total BD: $${totalBD.toFixed(2)}`);
            console.log(`[VALIDACIÓN] Diferencia: $${diferencia.toFixed(2)}`);
            console.log(`[VALIDACIÓN] Coincide: ${validacionTotales.coincide}`);
          }
          
          return {
            success: true,
            historialId,
            registrosProcesados: result.registrosProcesados,
            registrosExitosos: result.registrosExitosos,
            registrosError: result.registrosError,
            errores: result.errores,
            validacionTotales,
            facturasFaltantes: tipoArchivo === 'pendientes' ? facturasFaltantes : undefined,
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

  // ============ Administración de Usuarios ============
  admin: router({
    users: router({
      list: adminProcedure.query(async () => {
        return await db.getAllUsers();
      }),
      
      stats: adminProcedure.query(async () => {
        return await db.getUserStats();
      }),
      
      updateRole: adminProcedure
        .input(z.object({
          userId: z.number(),
          newRole: z.enum(["admin", "operador", "consulta"]),
        }))
        .mutation(async ({ input, ctx }) => {
          // No permitir que un admin cambie su propio rol
          if (input.userId === ctx.user.id) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'No puedes cambiar tu propio rol',
            });
          }
          
          await db.updateUserRole(input.userId, input.newRole);
          
          // Registrar en auditoría
          await db.createAuditLog({
            usuarioId: ctx.user.id,
            accion: 'update_user_role',
            entidad: 'users',
            entidadId: input.userId,
            detalles: {
              newRole: input.newRole,
              changedBy: ctx.user.email,
            },
          });
          
          return { success: true };
        }),
      
      updatePermisos: adminProcedure
        .input(z.object({
          userId: z.number(),
          permisos: z.array(z.string()),
        }))
        .mutation(async ({ input, ctx }) => {
          await db.updateUserPermisos(input.userId, input.permisos);
          
          // Registrar en auditoría
          await db.createAuditLog({
            usuarioId: ctx.user.id,
            accion: 'update_user_permisos',
            entidad: 'users',
            entidadId: input.userId,
            detalles: {
              permisos: input.permisos,
              changedBy: ctx.user.email,
            },
          });
          
          return { success: true };
        }),
      
      updateStatus: adminProcedure
        .input(z.object({
          userId: z.number(),
          activo: z.boolean(),
        }))
        .mutation(async ({ input, ctx }) => {
          // No permitir que un admin desactive su propia cuenta
          if (input.userId === ctx.user.id) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'No puedes desactivar tu propia cuenta',
            });
          }
          
          await db.updateUserStatus(input.userId, input.activo);
          
          // Registrar en auditoría
          await db.createAuditLog({
            usuarioId: ctx.user.id,
            accion: input.activo ? 'activate_user' : 'deactivate_user',
            entidad: 'users',
            entidadId: input.userId,
            detalles: {
              activo: input.activo,
              changedBy: ctx.user.email,
            },
          });
          
          return { success: true };
        }),
    }),
  }),
  
  // ============ Clientes y Grupos ============
  clientes: router({
    list: protectedProcedure
      .query(async () => {
        return await db.getClientesConGrupo();
      }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getClienteById(input.id);
      }),
    
    getByGrupo: protectedProcedure
      .input(z.object({ grupoId: z.number() }))
      .query(async ({ input }) => {
        return await db.getClientesByGrupo(input.grupoId);
      }),
    
    create: protectedProcedure
      .input(z.object({
        nombre: z.string().min(1),
        rfc: z.string().optional(),
        alias: z.string().optional(),
        grupoId: z.number().optional(),
        responsableCobranza: z.string().optional(),
        correoCobranza: z.string().email().optional(),
        telefono: z.string().optional(),
        direccion: z.string().optional(),
        notas: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createCliente(input);
        
        // Registrar en auditoría
        await db.createAuditLog({
          usuarioId: ctx.user.id,
          accion: 'create_cliente',
          entidad: 'clientes',
          entidadId: id,
          detalles: { nombre: input.nombre },
        });
        
        return { id };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        nombre: z.string().min(1).optional(),
        rfc: z.string().optional(),
        alias: z.string().optional(),
        grupoId: z.number().nullable().optional(),
        responsableCobranza: z.string().optional(),
        correoCobranza: z.string().email().optional(),
        telefono: z.string().optional(),
        direccion: z.string().optional(),
        notas: z.string().optional(),
        activo: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        await db.updateCliente(id, data);
        
        // Registrar en auditoría
        await db.createAuditLog({
          usuarioId: ctx.user.id,
          accion: 'update_cliente',
          entidad: 'clientes',
          entidadId: id,
          detalles: data,
        });
        
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.deleteCliente(input.id);
        
        // Registrar en auditoría
        await db.createAuditLog({
          usuarioId: ctx.user.id,
          accion: 'delete_cliente',
          entidad: 'clientes',
          entidadId: input.id,
          detalles: {},
        });
        
        return { success: true };
      }),
    
    asignarGrupo: protectedProcedure
      .input(z.object({
        clienteId: z.number(),
        grupoId: z.number().nullable(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.asignarClienteAGrupo(input.clienteId, input.grupoId);
        
        // Registrar en auditoría
        await db.createAuditLog({
          usuarioId: ctx.user.id,
          accion: 'asignar_grupo_cliente',
          entidad: 'clientes',
          entidadId: input.clienteId,
          detalles: { grupoId: input.grupoId },
        });
        
        return { success: true };
      }),
  }),
  
  grupos: router({
    list: protectedProcedure
      .query(async () => {
        return await db.getAllGrupos();
      }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getGrupoById(input.id);
      }),
    
    create: protectedProcedure
      .input(z.object({
        nombre: z.string().min(1),
        descripcion: z.string().optional(),
        responsable: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createGrupo(input);
        
        // Registrar en auditoría
        await db.createAuditLog({
          usuarioId: ctx.user.id,
          accion: 'create_grupo',
          entidad: 'gruposClientes',
          entidadId: id,
          detalles: { nombre: input.nombre },
        });
        
        return { id };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        nombre: z.string().min(1).optional(),
        descripcion: z.string().optional(),
        responsable: z.string().optional(),
        activo: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        await db.updateGrupo(id, data);
        
        // Registrar en auditoría
        await db.createAuditLog({
          usuarioId: ctx.user.id,
          accion: 'update_grupo',
          entidad: 'gruposClientes',
          entidadId: id,
          detalles: data,
        });
        
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.deleteGrupo(input.id);
        
        // Registrar en auditoría
        await db.createAuditLog({
          usuarioId: ctx.user.id,
          accion: 'delete_grupo',
          entidad: 'gruposClientes',
          entidadId: input.id,
          detalles: {},
        });
        
        return { success: true };
      }),
  }),

  // ============ Proyección de Facturación ============
  proyeccion: router({
    // Listar todos los contratos
    contratos: protectedProcedure.query(async () => {
      return await db.getAllContratos();
    }),

    // Obtener contratos activos
    contratosActivos: protectedProcedure.query(async () => {
      return await db.getContratosActivos();
    }),

    // Obtener contratos próximos a vencer
    contratosProximosAVencer: protectedProcedure
      .input(z.object({ limite: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return await db.getContratosProximosAVencer(input?.limite);
      }),

    // Obtener contratos por cliente
    contratosByCliente: protectedProcedure
      .input(z.object({ clienteId: z.number() }))
      .query(async ({ input }) => {
        return await db.getContratosByCliente(input.clienteId);
      }),

    // Obtener contratos por empresa
    contratosByEmpresa: protectedProcedure
      .input(z.object({ empresa: z.enum(['tim_transp', 'tim_value']) }))
      .query(async ({ input }) => {
        return await db.getContratosByEmpresa(input.empresa);
      }),

    // Obtener proyección consolidada por mes
    proyeccionConsolidada: protectedProcedure
      .input(z.object({
        fechaInicio: z.string(),
        fechaFin: z.string(),
      }))
      .query(async ({ input }) => {
        const fechaInicio = new Date(input.fechaInicio);
        const fechaFin = new Date(input.fechaFin);
        return await db.getProyeccionConsolidada(fechaInicio, fechaFin);
      }),

    // Obtener proyección por empresa
    proyeccionPorEmpresa: protectedProcedure
      .input(z.object({
        fechaInicio: z.string(),
        fechaFin: z.string(),
      }))
      .query(async ({ input }) => {
        const fechaInicio = new Date(input.fechaInicio);
        const fechaFin = new Date(input.fechaFin);
        return await db.getProyeccionPorEmpresa(fechaInicio, fechaFin);
      }),

    // Obtener proyección por grupo
    proyeccionPorGrupo: protectedProcedure
      .input(z.object({
        fechaInicio: z.string(),
        fechaFin: z.string(),
      }))
      .query(async ({ input }) => {
        const fechaInicio = new Date(input.fechaInicio);
        const fechaFin = new Date(input.fechaFin);
        return await db.getProyeccionPorGrupo(fechaInicio, fechaFin);
      }),

    // Obtener proyecciones de un contrato específico
    proyeccionesByContrato: protectedProcedure
      .input(z.object({ contratoId: z.number() }))
      .query(async ({ input }) => {
        return await db.getProyeccionesByContrato(input.contratoId);
      }),

    // Obtener detalles de un contrato
    contratoDetalle: protectedProcedure
      .input(z.object({ numeroContrato: z.string() }))
      .query(async ({ input }) => {
        const contrato = await db.getContratoByNumero(input.numeroContrato);
        if (!contrato) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Contrato no encontrado' });
        }
        
        const proyecciones = await db.getProyeccionesByContrato(contrato.id);
        const partidas = await db.getPartidasByContrato(contrato.id);
        
        return {
          contrato,
          proyecciones,
          partidas,
        };
      }),

    // Obtener proyección en formato matricial (contratos x meses)
    proyeccionMatricial: protectedProcedure
      .input(z.object({
        anio: z.number(),
        empresa: z.enum(['todas', 'tim_transp', 'tim_value']).optional(),
        grupoId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return await db.getProyeccionMatricial(input.anio, input.empresa, input.grupoId);
      }),
  }),

  // ============ Estados de Cuenta ============
  estadosCuenta: router({
    // Obtener lista de clientes con deuda
    clientesConDeuda: protectedProcedure.query(async () => {
      return await db.getClientesConDeuda();
    }),

    // Obtener lista de grupos con deuda
    gruposConDeuda: protectedProcedure.query(async () => {
      return await db.getGruposConDeuda();
    }),

    // Obtener estado de cuenta de un cliente
    cliente: protectedProcedure
      .input(z.object({ clienteId: z.number() }))
      .query(async ({ input }) => {
        const estado = await db.getEstadoCuentaCliente(input.clienteId);
        if (!estado) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Cliente no encontrado',
          });
        }
        return estado;
      }),

    // Obtener estado de cuenta de un grupo
    grupo: protectedProcedure
      .input(z.object({ grupoId: z.number() }))
      .query(async ({ input }) => {
        const estado = await db.getEstadoCuentaGrupo(input.grupoId);
        if (!estado) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Grupo no encontrado',
          });
        }
        return estado;
      }),

    // Generar PDF de estado de cuenta de cliente
    generarPDFCliente: protectedProcedure
      .input(z.object({ 
        clienteId: z.number(),
        tasaInteresMoratorio: z.number().default(0)
      }))
      .mutation(async ({ input }) => {
        const estado = await db.getEstadoCuentaCliente(input.clienteId);
        if (!estado) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Cliente no encontrado',
          });
        }
        
        const { generarEstadoCuentaClientePDF } = await import('./pdfGenerator');
        const pdfBuffer = await generarEstadoCuentaClientePDF(estado, input.tasaInteresMoratorio);
        
        return {
          pdf: pdfBuffer.toString('base64'),
          filename: `estado_cuenta_${estado.cliente.nombre.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`,
        };
      }),

    // Generar PDFs masivos de estados de cuenta en ZIP
    generarPDFsMasivos: protectedProcedure
      .input(z.object({ 
        clienteIds: z.array(z.number()),
        tasaInteresMoratorio: z.number().default(0)
      }))
      .mutation(async ({ input }) => {
        const { generarEstadoCuentaClientePDF } = await import('./pdfGenerator');
        const archiver = await import('archiver');
        const { Readable } = await import('stream');
        
        // Crear un buffer para el ZIP
        const chunks: Buffer[] = [];
        const archive = archiver.default('zip', { zlib: { level: 9 } });
        
        archive.on('data', (chunk: Buffer) => chunks.push(chunk));
        
        const zipPromise = new Promise<Buffer>((resolve, reject) => {
          archive.on('end', () => resolve(Buffer.concat(chunks)));
          archive.on('error', reject);
        });
        
        // Generar PDF para cada cliente y agregarlo al ZIP
        for (const clienteId of input.clienteIds) {
          const estado = await db.getEstadoCuentaCliente(clienteId);
          if (estado) {
            const pdfBuffer = await generarEstadoCuentaClientePDF(estado, input.tasaInteresMoratorio);
            const filename = `${estado.cliente.nombre.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
            archive.append(pdfBuffer, { name: filename });
          }
        }
        
        archive.finalize();
        const zipBuffer = await zipPromise;
        
        return {
          zip: zipBuffer.toString('base64'),
          filename: `estados_cuenta_${new Date().toISOString().split('T')[0]}.zip`,
        };
      }),

    // Generar PDF de estado de cuenta de grupo
    generarPDFGrupo: protectedProcedure
      .input(z.object({ 
        grupoId: z.number(),
        tasaInteresMoratorio: z.number().default(0)
      }))
      .mutation(async ({ input }) => {
        const estado = await db.getEstadoCuentaGrupo(input.grupoId);
        if (!estado) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Grupo no encontrado',
          });
        }
        
        const { generarEstadoCuentaGrupoPDF } = await import('./pdfGenerator');
        const pdfBuffer = await generarEstadoCuentaGrupoPDF(estado, input.tasaInteresMoratorio);
        
        return {
          pdf: pdfBuffer.toString('base64'),
          filename: `estado_cuenta_grupo_${estado.grupo.nombre.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`,
        };
      }),
  }),

  // ============ Análisis de Cobranza ============
  analisis: router({
    // Obtener evolución temporal de cobranza
    evolucionCobranza: protectedProcedure.query(async () => {
      return await db.getEvolucionCobranza();
    }),

    // Obtener top deudores
    topDeudores: protectedProcedure
      .input(z.object({ limit: z.number().optional().default(10) }))
      .query(async ({ input }) => {
        return await db.getTopDeudores(input.limit);
      }),

    // Obtener distribución por antigüedad
    distribucionAntiguedad: protectedProcedure.query(async () => {
      return await db.getDistribucionPorAntiguedad();
    }),

    // Obtener facturas por número de contrato
    facturasPorContrato: protectedProcedure
      .input(z.object({ numeroContrato: z.string() }))
      .query(async ({ input }) => {
        return await db.getFacturasPorContrato(input.numeroContrato);
      }),

    // Obtener contratos agrupados por cliente
    contratosPorCliente: protectedProcedure
      .input(z.object({ clienteId: z.number() }))
      .query(async ({ input }) => {
        return await db.getContratosPorCliente(input.clienteId);
      }),

    // Obtener deuda total de un cliente (vencida + proyectada)
    deudaTotalCliente: protectedProcedure
      .input(z.object({ clienteId: z.number() }))
      .query(async ({ input }) => {
        return await db.getDeudaTotalCliente(input.clienteId);
      }),

    // Obtener deuda total de un grupo (vencida + proyectada)
    deudaTotalGrupo: protectedProcedure
      .input(z.object({ grupoId: z.number() }))
      .query(async ({ input }) => {
        return await db.getDeudaTotalGrupo(input.grupoId);
      }),

    // Obtener clientes con contratos activos
    clientesConContratosActivos: protectedProcedure.query(async () => {
      return await db.getClientesConContratosActivos();
    }),

    // Obtener grupos con contratos activos
    gruposConContratosActivos: protectedProcedure.query(async () => {
      return await db.getGruposConContratosActivos();
    }),
  }),
});

export type AppRouter = typeof appRouter;

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
            const foliosExistentes = new Set(allFacturas.map(f => f.folio));
            
            // Crear mapa de saldos pendientes del archivo
            const saldosPendientes = new Map(
              (result.data || []).map((p: any) => [p.folio, parseFloat(p.saldo || '0')])
            );
            
            // Crear facturas para folios que no existen en la BD
            const foliosFaltantes = (result.data || []).filter((p: any) => !foliosExistentes.has(p.folio));
            
            for (const pendiente of foliosFaltantes) {
              const diasAtraso = pendiente.diasVencido || 0;
              const saldo = parseFloat(pendiente.saldo || '0');
              
              const fechaVencimiento = new Date();
              fechaVencimiento.setDate(fechaVencimiento.getDate() - diasAtraso);
              
              const fechaFactura = new Date(fechaVencimiento);
              fechaFactura.setDate(fechaFactura.getDate() - 30);
              
              await db.upsertFactura({
                folio: pendiente.folio,
                fecha: fechaFactura,
                fechaVencimiento,
                importeTotal: saldo.toString(),
                saldoPendiente: saldo.toString(),
                nombreCliente: pendiente.nombreCliente || 'CLIENTE DESCONOCIDO',
                descripcion: 'Factura creada automáticamente desde archivo de pendientes',
                estadoPago: 'pendiente',
                diasAtraso,
                interesesMoratorios: '0.00',
                totalConIntereses: saldo.toString(),
                sistema: 'tim_transp',
              } as any);
            }
            
            // Actualizar saldoPendiente y estado de todas las facturas
            for (const factura of allFacturas) {
              const saldoPendiente = saldosPendientes.get(factura.folio) || 0;
              const estadoPago = saldoPendiente > 0 ? 'pendiente' : 'pagado';
              
              await db.updateFacturaSaldoPendiente(factura.folio, saldoPendiente, estadoPago);
            }
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
  }),
});

export type AppRouter = typeof appRouter;

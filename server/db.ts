import { eq, desc, and, sql, inArray, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  gruposClientes, GrupoCliente, InsertGrupoCliente,
  clientes, Cliente, InsertCliente,
  facturas, Factura, InsertFactura,
  pendientesPago, PendientePago, InsertPendientePago,
  historialCargas, HistorialCarga, InsertHistorialCarga,
  configuracion, Configuracion, InsertConfiguracion,
  auditLogs, AuditLog, InsertAuditLog,
  googleSheetsConfig, GoogleSheetsConfig, InsertGoogleSheetsConfig,
  contratos, Contrato, InsertContrato,
  proyeccionMensual, ProyeccionMensual, InsertProyeccionMensual,
  partidasFactura, PartidaFactura, InsertPartidaFactura
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ User Management ============
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============ Clientes ============
export async function createCliente(cliente: InsertCliente) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Validar que no exista un cliente con el mismo nombre
  const existing = await getClienteByNombre(cliente.nombre);
  if (existing) {
    throw new Error(`Ya existe un cliente con el nombre "${cliente.nombre}"`);
  }
  
  const result = await db.insert(clientes).values(cliente);
  return result[0].insertId;
}

export async function getClienteByNombre(nombre: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(clientes).where(eq(clientes.nombre, nombre)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllClientes() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(clientes).orderBy(clientes.nombre);
}

export async function upsertCliente(cliente: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const insertData: any = {
    nombre: cliente.razonSocial || cliente.nombre,
    rfc: cliente.rfc,
    grupoId: cliente.grupoId,
    telefono: cliente.telefono,
    direccion: cliente.direccion,
    notas: cliente.notas,
  };
  
  await db.insert(clientes).values(insertData).onDuplicateKeyUpdate({
    set: insertData,
  });
}

export async function getClienteByRazonSocial(razonSocial: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(clientes).where(eq(clientes.nombre, razonSocial)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createGrupoCliente(grupo: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(gruposClientes).values(grupo);
  return { id: Number(result[0].insertId), ...grupo };
}

export async function updateFacturaEstatus(id: number, estatus: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(facturas).set({ estatus: estatus as any }).where(eq(facturas.id, id));
}

// ============ Facturas ============
export async function createFactura(factura: InsertFactura) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Validar que no exista una factura con el mismo folio
  const existing = await getFacturaByFolio(factura.folio);
  if (existing) {
    throw new Error(`Ya existe una factura con el folio "${factura.folio}"`);
  }
  
  const result = await db.insert(facturas).values(factura);
  return { id: Number(result[0].insertId), ...factura };
}

export async function getFacturaByFolio(folio: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(facturas).where(eq(facturas.folio, folio)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllFacturas() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(facturas).orderBy(desc(facturas.fecha));
}

export async function getFacturasPendientes() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(facturas).where(eq(facturas.estadoPago, 'pendiente')).orderBy(desc(facturas.diasAtraso));
}

export async function updateFacturaEstadoPago(folio: string, estadoPago: 'pendiente' | 'pagado') {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(facturas).set({ estadoPago }).where(eq(facturas.folio, folio));
}

export async function upsertFactura(factura: InsertFactura) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(facturas).values(factura).onDuplicateKeyUpdate({
    set: {
      clienteId: factura.clienteId,
      nombreCliente: factura.nombreCliente,
      fecha: factura.fecha,
      fechaVencimiento: factura.fechaVencimiento,
      importeTotal: factura.importeTotal,
      descripcion: factura.descripcion,
      estatus: factura.estatus,
      estadoPago: factura.estadoPago,
      diasAtraso: factura.diasAtraso,
      interesesMoratorios: factura.interesesMoratorios,
      totalConIntereses: factura.totalConIntereses,
    },
  });
}

// ============ Pendientes de Pago ============
export async function createPendientePago(pendiente: InsertPendientePago) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(pendientesPago).values(pendiente);
  return result;
}

export async function getAllPendientesPago() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(pendientesPago).orderBy(desc(pendientesPago.diasVencido));
}

export async function deletePendientesByFolio(folio: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(pendientesPago).where(eq(pendientesPago.folio, folio));
}

export async function clearAllPendientes() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(pendientesPago);
}

// ============ Historial de Cargas ============
export async function createHistorialCarga(historial: InsertHistorialCarga) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(historialCargas).values(historial);
  return result;
}

export async function updateHistorialCarga(id: number, updates: Partial<InsertHistorialCarga>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(historialCargas).set(updates).where(eq(historialCargas.id, id));
}

export async function getAllHistorialCargas() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(historialCargas).orderBy(desc(historialCargas.createdAt)).limit(100);
}

// ============ Configuración ============
export async function getConfiguracion(clave: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(configuracion).where(eq(configuracion.clave, clave)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function setConfiguracion(config: InsertConfiguracion) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(configuracion).values(config).onDuplicateKeyUpdate({
    set: {
      valor: config.valor,
      tipo: config.tipo,
      descripcion: config.descripcion,
      updatedBy: config.updatedBy,
    },
  });
}

export async function getAllConfiguracion() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(configuracion);
}

// ============ Audit Logs ============
export async function createAuditLog(log: InsertAuditLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(auditLogs).values(log);
  return result;
}

export async function getAuditLogs(limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
}

// ============ Google Sheets Config ============
export async function getGoogleSheetsConfig() {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(googleSheetsConfig).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertGoogleSheetsConfig(config: InsertGoogleSheetsConfig) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getGoogleSheetsConfig();
  
  if (existing) {
    await db.update(googleSheetsConfig).set(config).where(eq(googleSheetsConfig.id, existing.id));
  } else {
    await db.insert(googleSheetsConfig).values(config);
  }
}

// ============ Dashboard Stats ============
export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return null;
  
  const totalCarteraVencida = await db
    .select({ total: sql<number>`COALESCE(SUM(${facturas.totalConIntereses}), 0)` })
    .from(facturas)
    .where(and(
      eq(facturas.estadoPago, 'pendiente'),
      sql`${facturas.diasAtraso} > 0`
    ));
  
  const clientesConAtraso = await db
    .select({ count: sql<number>`COUNT(DISTINCT ${facturas.clienteId})` })
    .from(facturas)
    .where(and(
      eq(facturas.estadoPago, 'pendiente'),
      sql`${facturas.diasAtraso} > 0`
    ));
  
  const facturasPendientes = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(facturas)
    .where(eq(facturas.estadoPago, 'pendiente'));
  
  return {
    totalCarteraVencida: totalCarteraVencida[0]?.total || 0,
    clientesConAtraso: clientesConAtraso[0]?.count || 0,
    facturasPendientes: facturasPendientes[0]?.count || 0,
  };
}


// ============ User Administration ============

/**
 * Obtener todos los usuarios del sistema
 */
export async function getAllUsers() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get users: database not available");
    return [];
  }

  try {
    const result = await db.select().from(users).orderBy(users.createdAt);
    return result;
  } catch (error) {
    console.error("[Database] Failed to get users:", error);
    return [];
  }
}

/**
 * Obtener usuario por ID
 */
export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  try {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to get user by id:", error);
    return undefined;
  }
}

/**
 * Actualizar rol de un usuario
 */
export async function updateUserRole(userId: number, newRole: "admin" | "operador" | "consulta") {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    await db.update(users)
      .set({ role: newRole, updatedAt: new Date() })
      .where(eq(users.id, userId));
    
    return true;
  } catch (error) {
    console.error("[Database] Failed to update user role:", error);
    throw error;
  }
}

/**
 * Activar o desactivar cuenta de usuario
 */
export async function updateUserStatus(userId: number, activo: boolean) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    await db.update(users)
      .set({ activo, updatedAt: new Date() })
      .where(eq(users.id, userId));
    
    return true;
  } catch (error) {
    console.error("[Database] Failed to update user status:", error);
    throw error;
  }
}

/**
 * Obtener estadísticas de usuarios
 */
export async function getUserStats() {
  const db = await getDb();
  if (!db) {
    return {
      total: 0,
      activos: 0,
      inactivos: 0,
      porRol: { admin: 0, operador: 0, consulta: 0 }
    };
  }

  try {
    const allUsers = await db.select().from(users);
    
    const stats = {
      total: allUsers.length,
      activos: allUsers.filter(u => u.activo).length,
      inactivos: allUsers.filter(u => !u.activo).length,
      porRol: {
        admin: allUsers.filter(u => u.role === 'admin').length,
        operador: allUsers.filter(u => u.role === 'operador').length,
        consulta: allUsers.filter(u => u.role === 'consulta').length,
      }
    };
    
    return stats;
  } catch (error) {
    console.error("[Database] Failed to get user stats:", error);
    return {
      total: 0,
      activos: 0,
      inactivos: 0,
      porRol: { admin: 0, operador: 0, consulta: 0 }
    };
  }
}

// ============ Grupos de Clientes ============
export async function getAllGrupos() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(gruposClientes).orderBy(gruposClientes.nombre);
}

export async function getGrupoById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(gruposClientes).where(eq(gruposClientes.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createGrupo(grupo: InsertGrupoCliente) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(gruposClientes).values(grupo);
  return result[0].insertId;
}

export async function updateGrupo(id: number, grupo: Partial<InsertGrupoCliente>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(gruposClientes).set(grupo).where(eq(gruposClientes.id, id));
}

export async function deleteGrupo(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Primero desasociar todos los clientes del grupo
  await db.update(clientes).set({ grupoId: null }).where(eq(clientes.grupoId, id));
  
  // Luego eliminar el grupo
  await db.delete(gruposClientes).where(eq(gruposClientes.id, id));
}

// ============ Clientes Avanzado ============
export async function getClienteById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(clientes).where(eq(clientes.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getClientesByGrupo(grupoId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(clientes).where(eq(clientes.grupoId, grupoId)).orderBy(clientes.nombre);
}

export async function updateCliente(id: number, cliente: Partial<InsertCliente>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(clientes).set(cliente).where(eq(clientes.id, id));
}

export async function deleteCliente(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(clientes).where(eq(clientes.id, id));
}

export async function asignarClienteAGrupo(clienteId: number, grupoId: number | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(clientes).set({ grupoId }).where(eq(clientes.id, clienteId));
}

export async function getClientesConGrupo() {
  const db = await getDb();
  if (!db) return [];
  
  // Realizar un LEFT JOIN para obtener clientes con información de su grupo
  const result = await db
    .select({
      id: clientes.id,
      nombre: clientes.nombre,
      rfc: clientes.rfc,
      alias: clientes.alias,
      grupoId: clientes.grupoId,
      responsableCobranza: clientes.responsableCobranza,
      correoCobranza: clientes.correoCobranza,
      telefono: clientes.telefono,
      direccion: clientes.direccion,
      notas: clientes.notas,
      activo: clientes.activo,
      createdAt: clientes.createdAt,
      updatedAt: clientes.updatedAt,
      grupoNombre: gruposClientes.nombre,
      grupoDescripcion: gruposClientes.descripcion,
    })
    .from(clientes)
    .leftJoin(gruposClientes, eq(clientes.grupoId, gruposClientes.id))
    .orderBy(clientes.nombre);
  
  return result;
}


// ============ Contratos Management ============

export async function createContrato(contrato: InsertContrato) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(contratos).values(contrato);
  return result;
}

export async function getContratoByNumero(numeroContrato: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(contratos)
    .where(eq(contratos.numeroContrato, numeroContrato))
    .limit(1);
  return result[0] || null;
}

export async function getAllContratos() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(contratos)
    .orderBy(desc(contratos.createdAt));
}

export async function getContratosActivos() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(contratos)
    .where(eq(contratos.activo, true))
    .orderBy(desc(contratos.fechaProximaRenta));
}

export async function getContratosByCliente(clienteId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(contratos)
    .where(eq(contratos.clienteId, clienteId))
    .orderBy(desc(contratos.createdAt));
}

export async function getContratosByEmpresa(empresa: 'tim_transp' | 'tim_value') {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(contratos)
    .where(eq(contratos.empresa, empresa))
    .orderBy(desc(contratos.createdAt));
}

export async function updateContrato(numeroContrato: string, updates: Partial<InsertContrato>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(contratos)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(contratos.numeroContrato, numeroContrato));
}

export async function upsertContrato(contrato: InsertContrato) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getContratoByNumero(contrato.numeroContrato);
  
  if (existing) {
    await updateContrato(contrato.numeroContrato, contrato);
    return existing.id;
  } else {
    const result = await createContrato(contrato);
    return result[0].insertId;
  }
}

export async function getContratosProximosAVencer(limite: number = 10) {
  const db = await getDb();
  if (!db) return [];
  
  // Contratos donde quedan 3 o menos rentas
  return await db.select().from(contratos)
    .where(
      and(
        eq(contratos.activo, true),
        sql`(${contratos.totalRentas} - ${contratos.rentaActual}) <= 3 AND (${contratos.totalRentas} - ${contratos.rentaActual}) > 0`
      )
    )
    .orderBy(sql`(${contratos.totalRentas} - ${contratos.rentaActual})`)
    .limit(limite);
}

// ============ Proyección Mensual Management ============

export async function createProyeccion(proyeccion: InsertProyeccionMensual) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(proyeccionMensual).values(proyeccion);
  return result;
}

export async function getProyeccionesByContrato(contratoId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(proyeccionMensual)
    .where(eq(proyeccionMensual.contratoId, contratoId))
    .orderBy(proyeccionMensual.mes);
}

export async function getProyeccionByMes(mes: Date) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(proyeccionMensual)
    .where(eq(proyeccionMensual.mes, mes))
    .orderBy(proyeccionMensual.contratoId);
}

export async function deleteProyeccionesByContrato(contratoId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(proyeccionMensual)
    .where(eq(proyeccionMensual.contratoId, contratoId));
}

export async function getProyeccionConsolidada(fechaInicio: Date, fechaFin: Date) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select({
    mes: proyeccionMensual.mes,
    totalProyectado: sql<number>`SUM(${proyeccionMensual.montoProyectado})`,
    totalReal: sql<number>`SUM(COALESCE(${proyeccionMensual.montoReal}, 0))`,
    cantidadContratos: sql<number>`COUNT(DISTINCT ${proyeccionMensual.contratoId})`,
  })
  .from(proyeccionMensual)
  .where(
    and(
      sql`${proyeccionMensual.mes} >= ${fechaInicio}`,
      sql`${proyeccionMensual.mes} <= ${fechaFin}`
    )
  )
  .groupBy(proyeccionMensual.mes)
  .orderBy(proyeccionMensual.mes);
}

export async function getProyeccionPorEmpresa(fechaInicio: Date, fechaFin: Date) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select({
    mes: proyeccionMensual.mes,
    empresa: contratos.empresa,
    totalProyectado: sql<number>`SUM(${proyeccionMensual.montoProyectado})`,
    cantidadContratos: sql<number>`COUNT(DISTINCT ${proyeccionMensual.contratoId})`,
  })
  .from(proyeccionMensual)
  .innerJoin(contratos, eq(proyeccionMensual.contratoId, contratos.id))
  .where(
    and(
      sql`${proyeccionMensual.mes} >= ${fechaInicio}`,
      sql`${proyeccionMensual.mes} <= ${fechaFin}`
    )
  )
  .groupBy(proyeccionMensual.mes, contratos.empresa)
  .orderBy(proyeccionMensual.mes, contratos.empresa);
}

export async function getProyeccionPorGrupo(fechaInicio: Date, fechaFin: Date) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select({
    mes: proyeccionMensual.mes,
    grupoId: clientes.grupoId,
    grupoNombre: gruposClientes.nombre,
    totalProyectado: sql<number>`SUM(${proyeccionMensual.montoProyectado})`,
    cantidadContratos: sql<number>`COUNT(DISTINCT ${proyeccionMensual.contratoId})`,
  })
  .from(proyeccionMensual)
  .innerJoin(contratos, eq(proyeccionMensual.contratoId, contratos.id))
  .leftJoin(clientes, eq(contratos.clienteId, clientes.id))
  .leftJoin(gruposClientes, eq(clientes.grupoId, gruposClientes.id))
  .where(
    and(
      sql`${proyeccionMensual.mes} >= ${fechaInicio}`,
      sql`${proyeccionMensual.mes} <= ${fechaFin}`
    )
  )
  .groupBy(proyeccionMensual.mes, clientes.grupoId, gruposClientes.nombre)
  .orderBy(proyeccionMensual.mes);
}

// ============ Partidas de Factura Management ============

export async function createPartidaFactura(partida: InsertPartidaFactura) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(partidasFactura).values(partida);
  return result;
}

export async function getPartidasByFactura(facturaId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(partidasFactura)
    .where(eq(partidasFactura.facturaId, facturaId))
    .orderBy(partidasFactura.id);
}

export async function getPartidasByContrato(contratoId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(partidasFactura)
    .where(eq(partidasFactura.contratoId, contratoId))
    .orderBy(desc(partidasFactura.createdAt));
}

// ============ Proyección Matricial ============
export async function getProyeccionMatricial(
  anio: number,
  empresa?: 'todas' | 'tim_transp' | 'tim_value',
  grupoId?: number
) {
  const db = await getDb();
  if (!db) return { contratos: [], meses: [], datos: {} };

  // Construir filtros
  const filters: any[] = [eq(contratos.activo, true)];
  
  if (empresa && empresa !== 'todas') {
    filters.push(eq(contratos.empresa, empresa));
  }
  
  if (grupoId) {
    // Obtener clientes del grupo
    const clientesDelGrupo = await db.select().from(clientes)
      .where(eq(clientes.grupoId, grupoId));
    
    const clienteIds = clientesDelGrupo.map(c => c.id);
    if (clienteIds.length > 0) {
      filters.push(inArray(contratos.clienteId, clienteIds));
    } else {
      // Si no hay clientes en el grupo, retornar vacío
      return { contratos: [], meses: [], datos: {} };
    }
  }

  // Obtener contratos filtrados con información de cliente y grupo
  const contratosData = await db
    .select({
      id: contratos.id,
      numeroContrato: contratos.numeroContrato,
      clienteId: contratos.clienteId,
      empresa: contratos.empresa,
      activo: contratos.activo,
      nombreCliente: clientes.nombre,
      grupoId: clientes.grupoId,
      grupoNombre: gruposClientes.nombre,
    })
    .from(contratos)
    .leftJoin(clientes, eq(contratos.clienteId, clientes.id))
    .leftJoin(gruposClientes, eq(clientes.grupoId, gruposClientes.id))
    .where(and(...filters))
    .orderBy(gruposClientes.nombre, clientes.nombre, contratos.numeroContrato);

  // Generar array de meses del año
  const meses = Array.from({ length: 12 }, (_, i) => {
    const mes = new Date(anio, i, 1);
    return {
      numero: i + 1,
      nombre: mes.toLocaleString('es-MX', { month: 'long' }),
      fecha: mes,
    };
  });

  // Obtener proyecciones del año
  const fechaInicio = new Date(anio, 0, 1);
  const fechaFin = new Date(anio, 11, 31);

  const proyecciones = await db.select().from(proyeccionMensual)
    .where(
      and(
        gte(proyeccionMensual.mes, fechaInicio),
        lte(proyeccionMensual.mes, fechaFin)
      )
    );

  // Construir matriz de datos: { contratoId: { mesNumero: monto } }
  const datos: Record<number, Record<number, number>> = {};
  
  for (const contrato of contratosData) {
    datos[contrato.id] = {};
    
    // Inicializar todos los meses en 0
    for (let i = 1; i <= 12; i++) {
      datos[contrato.id][i] = 0;
    }
  }

  // Llenar con proyecciones reales
  for (const proyeccion of proyecciones) {
    const mesNumero = new Date(proyeccion.mes).getMonth() + 1;
    const contratoId = proyeccion.contratoId;
    
    if (datos[contratoId]) {
      datos[contratoId][mesNumero] = parseFloat(proyeccion.montoProyectado);
    }
  }

  // Calcular totales por mes
  const totalesPorMes: Record<number, number> = {};
  for (let i = 1; i <= 12; i++) {
    totalesPorMes[i] = 0;
  }

  for (const contratoId in datos) {
    for (const mesNumero in datos[contratoId]) {
      totalesPorMes[parseInt(mesNumero)] += datos[contratoId][parseInt(mesNumero)];
    }
  }

  // Calcular totales por contrato
  const totalesPorContrato: Record<number, number> = {};
  for (const contrato of contratosData) {
    totalesPorContrato[contrato.id] = 0;
    for (let i = 1; i <= 12; i++) {
      totalesPorContrato[contrato.id] += datos[contrato.id][i];
    }
  }

  return {
    contratos: contratosData,
    meses,
    datos,
    totalesPorMes,
    totalesPorContrato,
  };
}

// ============ Estados de Cuenta ============
export async function getFacturasPendientesPorCliente(clienteId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      folio: facturas.folio,
      fecha: facturas.fecha,
      importeTotal: facturas.importeTotal,
      diasAtraso: facturas.diasAtraso,
      interesesMoratorios: facturas.interesesMoratorios,
      estadoPago: facturas.estadoPago,
      sistema: facturas.sistema,
    })
    .from(facturas)
    .where(and(
      eq(facturas.clienteId, clienteId),
      eq(facturas.estadoPago, 'pendiente')
    ))
    .orderBy(facturas.fecha);

  return result;
}

export async function getFacturasPendientesPorGrupo(grupoId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      folio: facturas.folio,
      fecha: facturas.fecha,
      importeTotal: facturas.importeTotal,
      diasAtraso: facturas.diasAtraso,
      interesesMoratorios: facturas.interesesMoratorios,
      estadoPago: facturas.estadoPago,
      sistema: facturas.sistema,
      clienteNombre: clientes.nombre,
    })
    .from(facturas)
    .innerJoin(clientes, eq(facturas.clienteId, clientes.id))
    .where(and(
      eq(clientes.grupoId, grupoId),
      eq(facturas.estadoPago, 'pendiente')
    ))
    .orderBy(clientes.nombre, facturas.fecha);

  return result;
}

export async function getEstadoCuentaCliente(clienteId: number) {
  const db = await getDb();
  if (!db) return null;

  const cliente = await db
    .select()
    .from(clientes)
    .where(eq(clientes.id, clienteId))
    .limit(1);

  if (cliente.length === 0) return null;

  const facturasResult = await getFacturasPendientesPorCliente(clienteId);
  
  const totalPendiente = facturasResult.reduce((sum, f) => sum + Number(f.importeTotal || 0), 0);
  const totalIntereses = facturasResult.reduce((sum, f) => sum + Number(f.interesesMoratorios || 0), 0);

  return {
    cliente: cliente[0],
    facturas: facturasResult,
    totalPendiente,
    totalIntereses,
    totalGeneral: totalPendiente + totalIntereses,
  };
}

export async function getEstadoCuentaGrupo(grupoId: number) {
  const db = await getDb();
  if (!db) return null;

  const grupo = await db
    .select()
    .from(gruposClientes)
    .where(eq(gruposClientes.id, grupoId))
    .limit(1);

  if (grupo.length === 0) return null;

  const facturasResult = await getFacturasPendientesPorGrupo(grupoId);
  
  const totalPendiente = facturasResult.reduce((sum, f) => sum + Number(f.importeTotal || 0), 0);
  const totalIntereses = facturasResult.reduce((sum, f) => sum + Number(f.interesesMoratorios || 0), 0);

  return {
    grupo: grupo[0],
    facturas: facturasResult,
    totalPendiente,
    totalIntereses,
    totalGeneral: totalPendiente + totalIntereses,
  };
}

// ============ Clientes y Grupos con Deuda ============
export async function getClientesConDeuda() {
  const db = await getDb();
  if (!db) return [];

  // Consulta optimizada: obtener clientes que tienen facturas pendientes
  const clientesConFacturasPendientes = await db
    .selectDistinct({ 
      id: clientes.id,
      nombre: clientes.nombre,
      rfc: clientes.rfc,
      alias: clientes.alias,
      grupoId: clientes.grupoId,
      responsableCobranza: clientes.responsableCobranza,
      correoCobranza: clientes.correoCobranza,
      telefono: clientes.telefono,
      direccion: clientes.direccion,
      createdAt: clientes.createdAt,
      updatedAt: clientes.updatedAt,
    })
    .from(clientes)
    .innerJoin(facturas, eq(facturas.clienteId, clientes.id))
    .where(eq(facturas.estadoPago, 'pendiente'));
  
  return clientesConFacturasPendientes;
}

export async function getGruposConDeuda() {
  const db = await getDb();
  if (!db) return [];

  // Consulta optimizada: obtener grupos que tienen clientes con facturas pendientes
  const gruposConFacturasPendientes = await db
    .selectDistinct({ 
      id: gruposClientes.id,
      nombre: gruposClientes.nombre,
      descripcion: gruposClientes.descripcion,
      createdAt: gruposClientes.createdAt,
      updatedAt: gruposClientes.updatedAt,
    })
    .from(gruposClientes)
    .innerJoin(clientes, eq(clientes.grupoId, gruposClientes.id))
    .innerJoin(facturas, eq(facturas.clienteId, clientes.id))
    .where(eq(facturas.estadoPago, 'pendiente'));
  
  return gruposConFacturasPendientes;
}

import { eq, desc, and, sql, inArray, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
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
  partidasFactura, PartidaFactura, InsertPartidaFactura,
  facturasFaltantes, FacturaFaltante, InsertFacturaFaltante,
  auditoriaBajasContratos, AuditoriaBajaContrato, InsertAuditoriaBajaContrato,
  magicLinks, MagicLink, InsertMagicLink
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      });
      _db = drizzle(pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ User Management ============
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.email) {
    throw new Error("User email is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      email: user.email,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "loginMethod"] as const;
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
    } else if (user.email === ENV.adminEmail) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }
    
    // Asignar permisos por defecto según el rol al crear usuario
    if (user.permisos === undefined) {
      const { PERMISOS_POR_ROL } = await import('../shared/modulos');
      const role = values.role || 'consulta';
      values.permisos = PERMISOS_POR_ROL[role] || [];
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.email,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);

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
  
  const result = await db.insert(clientes).values(cliente).returning({ id: clientes.id });
  return result[0].id;
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
  
  await db.insert(clientes).values(insertData).onConflictDoUpdate({
    target: clientes.nombre,
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
  const result = await db.insert(gruposClientes).values(grupo).returning({ id: gruposClientes.id });
  return { id: result[0].id, ...grupo };
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
  
  const result = await db.insert(facturas).values(factura).returning({ id: facturas.id });
  return { id: result[0].id, ...factura };
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
  
  // Si se marca como pagado, resetear diasAtraso a 0 (ya no tiene sentido mostrar días de atraso)
  const updateData: Record<string, unknown> = { estadoPago };
  if (estadoPago === 'pagado') {
    updateData.diasAtraso = 0;
    updateData.interesesMoratorios = '0.00';
    updateData.totalConIntereses = null;
  }
  await db.update(facturas).set(updateData as any).where(eq(facturas.folio, folio));
}

export async function updateFacturaSaldoPendiente(folio: string, saldoPendiente: number, estadoPago: 'pendiente' | 'pagado') {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Si se marca como pagado, resetear diasAtraso a 0 (ya no tiene sentido mostrar días de atraso)
  const updateData: Record<string, unknown> = { 
    saldoPendiente: saldoPendiente.toString(),
    estadoPago 
  };
  if (estadoPago === 'pagado') {
    updateData.diasAtraso = 0;
    updateData.interesesMoratorios = '0.00';
    updateData.totalConIntereses = null;
  }
  await db.update(facturas).set(updateData as any).where(eq(facturas.folio, folio));
}

export async function upsertFactura(factura: InsertFactura) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(facturas).values(factura).onConflictDoUpdate({
    target: facturas.folio,
    set: {
      clienteId: factura.clienteId,
      nombreCliente: factura.nombreCliente,
      fecha: factura.fecha,
      fechaVencimiento: factura.fechaVencimiento,
      importeTotal: factura.importeTotal,
      saldoPendiente: factura.saldoPendiente,
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
  
  const result = await db.insert(historialCargas).values(historial).returning({ id: historialCargas.id });
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
  
  await db.insert(configuracion).values(config).onConflictDoUpdate({
    target: configuracion.clave,
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
  
  // Total cartera pendiente (saldoPendiente de todas las facturas pendientes)
  const totalCarteraPendiente = await db
    .select({ total: sql<number>`COALESCE(SUM(${facturas.saldoPendiente}), 0)` })
    .from(facturas)
    .where(eq(facturas.estadoPago, 'pendiente'));
  
  // Cartera vencida con más de 8 días
  const carteraVencidaMayor8Dias = await db
    .select({ total: sql<number>`COALESCE(SUM(${facturas.saldoPendiente}), 0)` })
    .from(facturas)
    .where(and(
      eq(facturas.estadoPago, 'pendiente'),
      sql`${facturas.diasAtraso} > 8`
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
    totalCarteraPendiente: totalCarteraPendiente[0]?.total || 0,
    carteraVencidaMayor8Dias: carteraVencidaMayor8Dias[0]?.total || 0,
    clientesConAtraso: clientesConAtraso[0]?.count || 0,
    facturasPendientes: facturasPendientes[0]?.count || 0,
  };
}

export async function getFacturasCarteraPendiente() {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select({
      folio: facturas.folio,
      nombreCliente: facturas.nombreCliente,
      sistema: facturas.sistema,
      fechaVencimiento: facturas.fechaVencimiento,
      diasAtraso: facturas.diasAtraso,
      saldoPendiente: facturas.saldoPendiente,
    })
    .from(facturas)
    .where(eq(facturas.estadoPago, 'pendiente'))
    .orderBy(desc(facturas.diasAtraso));
}

export async function getFacturasCarteraVencidaMayor8Dias() {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select({
      folio: facturas.folio,
      nombreCliente: facturas.nombreCliente,
      sistema: facturas.sistema,
      fechaVencimiento: facturas.fechaVencimiento,
      diasAtraso: facturas.diasAtraso,
      saldoPendiente: facturas.saldoPendiente,
    })
    .from(facturas)
    .where(and(
      eq(facturas.estadoPago, 'pendiente'),
      sql`${facturas.diasAtraso} > 8`
    ))
    .orderBy(desc(facturas.diasAtraso));
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
 * Actualizar permisos de un usuario
 */
export async function updateUserPermisos(userId: number, permisos: string[]) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    await db.update(users)
      .set({ permisos, updatedAt: new Date() })
      .where(eq(users.id, userId));
    
    return true;
  } catch (error) {
    console.error("[Database] Failed to update user permisos:", error);
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
 * Actualizar formato de moneda de un usuario
 */
export async function updateUserFormatoMoneda(userId: number, formato: "completo" | "miles" | "millones") {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    await db.update(users)
      .set({ formatoMoneda: formato, updatedAt: new Date() })
      .where(eq(users.id, userId));
    
    return true;
  } catch (error) {
    console.error("[Database] Failed to update user formato moneda:", error);
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
  
  const result = await db.insert(gruposClientes).values(grupo).returning({ id: gruposClientes.id });
  return result[0].id;
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
    return result;
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

  // Obtener contratos filtrados con información completa
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
      fechaInicio: contratos.fechaInicio,
      fechaTermino: contratos.fechaTermino,
      plazo: contratos.plazo,
      montoMensual: contratos.montoMensual,
      rentaAdministracion: contratos.rentaAdministracion,
      rentaClubTim: contratos.rentaClubTim,
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

  // Obtener todas las partidas de todos los contratos en una sola consulta
  const numerosContratos = contratosData.map(c => c.numeroContrato);
  const todasLasPartidas = numerosContratos.length > 0 ? await db.select({
    numeroContrato: partidasFactura.numeroContrato,
    descripcion: partidasFactura.descripcion,
    fecha: facturas.fecha,
    facturaId: partidasFactura.facturaId,
    importeTotal: facturas.importeTotal,
    monto: partidasFactura.monto
  })
  .from(partidasFactura)
  .innerJoin(facturas, eq(partidasFactura.facturaId, facturas.id))
  .where(inArray(partidasFactura.numeroContrato, numerosContratos))
  .orderBy(desc(facturas.fecha)) : [];
  
  // Procesar partidas para encontrar la última renta de cada contrato
  const ultimasRentasPorContrato: Record<number, number> = {};
  
  for (const contrato of contratosData) {
    let ultimaRenta = 0;
    
    // Filtrar partidas de este contrato
    const partidasContrato = todasLasPartidas.filter(p => p.numeroContrato === contrato.numeroContrato);
    
    // Buscar en las partidas el patrón "RENTA X DE Y"
    for (const partida of partidasContrato) {
      const match = partida.descripcion?.match(/RENTA\s+(\d+)\s+DE\s+(\d+)/i);
      if (match) {
        const rentaActual = parseInt(match[1]);
        if (rentaActual > ultimaRenta) {
          ultimaRenta = rentaActual;
        }
      }
    }
    
    ultimasRentasPorContrato[contrato.id] = ultimaRenta;
  }

  // Construir matriz de datos: { contratoId: { mesNumero: monto } }
  const datos: Record<number, Record<number, number>> = {};
  
  for (const contrato of contratosData) {
    datos[contrato.id] = {};
    
    // Inicializar todos los meses en 0
    for (let i = 1; i <= 12; i++) {
      datos[contrato.id][i] = 0;
    }

    // Calcular proyección mes a mes desde el contrato
    if (contrato.fechaInicio && contrato.fechaTermino && contrato.plazo) {
      const fechaInicio = new Date(contrato.fechaInicio);
      const fechaTermino = new Date(contrato.fechaTermino);
      const plazoTotal = Number(contrato.plazo);
      const ultimaRentaPagada = ultimasRentasPorContrato[contrato.id] || 0;
      const rentasFaltantes = plazoTotal - ultimaRentaPagada;
      
      // Calcular renta total mensual (suma de todas las rentas)
      const rentaTotal = 
        (Number(contrato.montoMensual) || 0) + 
        (Number(contrato.rentaAdministracion) || 0) + 
        (Number(contrato.rentaClubTim) || 0);
      
      // Calcular fecha de inicio de proyección (desde la última renta pagada)
      const mesesPagados = ultimaRentaPagada;
      const fechaInicioProyeccion = new Date(fechaInicio);
      fechaInicioProyeccion.setMonth(fechaInicioProyeccion.getMonth() + mesesPagados);
      
      // Iterar por cada mes del año
      let rentasProyectadas = 0;
      for (let mesNumero = 1; mesNumero <= 12 && rentasProyectadas < rentasFaltantes; mesNumero++) {
        const primerDiaMes = new Date(anio, mesNumero - 1, 1);
        const ultimoDiaMes = new Date(anio, mesNumero, 0);
        
        // Verificar si el mes está dentro del periodo de proyección
        if (primerDiaMes >= fechaInicioProyeccion && primerDiaMes <= fechaTermino) {
          datos[contrato.id][mesNumero] = rentaTotal;
          rentasProyectadas++;
        }
      }
    } else {
      // Contratos sin fechas: usar información de facturas para proyectar
      // Buscar el total de rentas y la última renta pagada desde las facturas
      const partidasContrato = todasLasPartidas.filter(p => p.numeroContrato === contrato.numeroContrato);
      
      let totalRentas = 0;
      let rentaActual = 0;
      let montoRenta = 0;
      
      // Buscar el patrón "RENTA X DE Y" en las partidas
      for (const partida of partidasContrato) {
        const match = partida.descripcion?.match(/RENTA\s+(\d+)\s+DE\s+(\d+)/i);
        if (match) {
          const x = parseInt(match[1]);
          const y = parseInt(match[2]);
          
          if (x > rentaActual) {
            rentaActual = x;
          }
          if (y > totalRentas) {
            totalRentas = y;
          }
        }
      }
      
      // Obtener monto de renta desde el contrato o desde las facturas
      if (contrato.montoMensual && Number(contrato.montoMensual) > 0) {
        montoRenta = (Number(contrato.montoMensual) || 0) + 
                     (Number(contrato.rentaAdministracion) || 0) + 
                     (Number(contrato.rentaClubTim) || 0);
      } else if (partidasContrato.length > 0) {
        // Usar el monto de la última partida como referencia
        const ultimaPartida = partidasContrato[0]; // Ya están ordenadas por fecha desc
        montoRenta = Number(ultimaPartida.monto) || 0;
      }
      
      // Si tenemos información suficiente, proyectar
      if (totalRentas > 0 && rentaActual > 0 && montoRenta > 0) {
        const rentasFaltantes = totalRentas - rentaActual;
        
        // Proyectar todas las rentas faltantes distribuyéndolas en los meses del año
        let rentasProyectadas = 0;
        
        for (let mesNumero = 1; mesNumero <= 12 && rentasProyectadas < rentasFaltantes; mesNumero++) {
          datos[contrato.id][mesNumero] = montoRenta;
          rentasProyectadas++;
        }
      }
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

  // Primero obtener el nombre del cliente
  const cliente = await db.select({ nombre: clientes.nombre }).from(clientes).where(eq(clientes.id, clienteId)).limit(1);
  if (cliente.length === 0) return [];

  // Buscar facturas por nombreCliente (no por clienteId)
  // Incluir número de contrato de la primera partida (si existe)
  // Usar subconsulta para obtener solo la primera partida y evitar duplicados
  const result = await db
    .select({
      folio: facturas.folio,
      fecha: facturas.fecha,
      fechaVencimiento: facturas.fechaVencimiento,
      importeTotal: facturas.importeTotal,
      saldoPendiente: facturas.saldoPendiente,
      diasAtraso: facturas.diasAtraso,  // Usar campo almacenado en lugar de calcular
      interesesMoratorios: facturas.interesesMoratorios,
      estadoPago: facturas.estadoPago,
      sistema: facturas.sistema,
      numeroContrato: facturas.numeroContrato,
    })
    .from(facturas)
    .where(and(
      eq(facturas.nombreCliente, cliente[0].nombre),
      sql`CAST(${facturas.saldoPendiente} AS NUMERIC) > 0`
    ))
    .orderBy(facturas.fecha);

  return result;
}

export async function getFacturasPendientesPorGrupo(grupoId: number) {
  const db = await getDb();
  if (!db) return [];

  // Buscar facturas por nombreCliente (no por clienteId)
  // Incluir número de contrato de la primera partida (si existe)
  // Usar subconsulta para obtener solo la primera partida y evitar duplicados
  const result = await db
    .select({
      folio: facturas.folio,
      fecha: facturas.fecha,
      fechaVencimiento: facturas.fechaVencimiento,
      importeTotal: facturas.importeTotal,
      saldoPendiente: facturas.saldoPendiente,
      diasAtraso: facturas.diasAtraso,  // Usar campo almacenado en lugar de calcular
      interesesMoratorios: facturas.interesesMoratorios,
      estadoPago: facturas.estadoPago,
      sistema: facturas.sistema,
      clienteNombre: clientes.nombre,
      numeroContrato: facturas.numeroContrato,
    })
    .from(facturas)
    .innerJoin(clientes, eq(facturas.nombreCliente, clientes.nombre))
    .where(and(
      eq(clientes.grupoId, grupoId),
      sql`CAST(${facturas.saldoPendiente} AS NUMERIC) > 0`
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
  // Nota: Las facturas se relacionan por nombreCliente (texto), no por clienteId
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
    .innerJoin(facturas, eq(facturas.nombreCliente, clientes.nombre))
    .where(sql`CAST(${facturas.saldoPendiente} AS NUMERIC) > 0`)
    .orderBy(clientes.nombre);
  
  return clientesConFacturasPendientes;
}

export async function getGruposConDeuda() {
  const db = await getDb();
  if (!db) return [];

  // Consulta optimizada: obtener grupos que tienen clientes con facturas pendientes
  // Nota: Las facturas se relacionan por nombreCliente (texto), no por clienteId
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
    .innerJoin(facturas, eq(facturas.nombreCliente, clientes.nombre))
    .where(sql`CAST(${facturas.saldoPendiente} AS NUMERIC) > 0`)
    .orderBy(gruposClientes.nombre);
  
  return gruposConFacturasPendientes;
}

// ============ Análisis de Cobranza ============
export async function getEvolucionCobranza() {
  const db = await getDb();
  if (!db) return [];

  try {
    // Usar SQL raw con números de posición para evitar problemas con GROUP BY
    const result: any = await db.execute(sql`
      SELECT 
        TO_CHAR(fecha, 'YYYY-MM') as mes,
        "estadoPago",
        COUNT(*) as cantidad,
        SUM("importeTotal"::numeric) as monto
      FROM facturas
      WHERE fecha IS NOT NULL
      GROUP BY 1, 2
      ORDER BY 1
    `);

    console.log('[getEvolucionCobranza] Result:', result);
    return Array.isArray(result) ? result : (result.rows || []);
  } catch (error) {
    console.error('[getEvolucionCobranza] Error:', error);
    return [];
  }
}

export async function getTopDeudores(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  // Primero obtener el total de cartera para calcular porcentajes
  const totalCarteraResult = await db
    .select({
      total: sql<number>`SUM(COALESCE(${facturas.saldoPendiente}, ${facturas.importeTotal}))`
    })
    .from(facturas)
    .where(eq(facturas.estadoPago, 'pendiente'));
  
  const totalCartera = Number(totalCarteraResult[0]?.total || 0);

  // Obtener clientes con mayor deuda pendiente
  const result = await db
    .select({
      cliente: facturas.nombreCliente,
      cantidadFacturas: sql<number>`COUNT(*)`,
      totalDeuda: sql<number>`SUM(COALESCE(${facturas.saldoPendiente}, ${facturas.importeTotal}))`,
      diasPromedioAtraso: sql<number>`AVG(${facturas.diasAtraso})`,
    })
    .from(facturas)
    .where(eq(facturas.estadoPago, 'pendiente'))
    .groupBy(facturas.nombreCliente)
    .orderBy(sql`SUM(COALESCE(${facturas.saldoPendiente}, ${facturas.importeTotal})) DESC`)
    .limit(limit);

  // Agregar porcentaje a cada cliente
  return result.map(r => ({
    ...r,
    porcentaje: totalCartera > 0 ? (Number(r.totalDeuda) / totalCartera) * 100 : 0
  }));
}

export async function getDistribucionPorAntiguedad() {
  const db = await getDb();
  if (!db) return [];

  try {
    // Usar SQL raw sin ORDER BY complejo
    const result: any = await db.execute(sql`
      SELECT 
        CASE 
          WHEN CURRENT_DATE - fecha::date BETWEEN 1 AND 30 THEN '1-30 días'
          WHEN CURRENT_DATE - fecha::date BETWEEN 31 AND 60 THEN '31-60 días'
          WHEN CURRENT_DATE - fecha::date BETWEEN 61 AND 90 THEN '61-90 días'
          WHEN CURRENT_DATE - fecha::date > 90 THEN '+90 días'
          ELSE '0 días'
        END as rango,
        COUNT(*) as "cantidadFacturas",
        SUM("importeTotal"::numeric) as "montoTotal"
      FROM facturas
      WHERE "estadoPago" = 'pendiente'
      GROUP BY 1
    `);

    const rows = Array.isArray(result) ? result : (result.rows || []);
    
    // Ordenar manualmente en JavaScript
    const ordenRangos: Record<string, number> = {
      '0 días': 0,
      '1-30 días': 1,
      '31-60 días': 2,
      '61-90 días': 3,
      '+90 días': 4,
    };
    
    rows.sort((a: any, b: any) => {
      const ordenA = ordenRangos[a.rango] || 0;
      const ordenB = ordenRangos[b.rango] || 0;
      return ordenA - ordenB;
    });

    console.log('[getDistribucionPorAntiguedad] Result:', rows.length, 'rows');
    return rows;
  } catch (error) {
    console.error('[getDistribucionPorAntiguedad] Error:', error);
    return [];
  }
}

// ============ Análisis de Contratos ============
export async function getFacturasPorContrato(numeroContrato: string) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      folio: facturas.folio,
      fecha: facturas.fecha,
      fechaVencimiento: facturas.fechaVencimiento,
      nombreCliente: facturas.nombreCliente,
      importeTotal: facturas.importeTotal,
      saldoPendiente: facturas.saldoPendiente,
      diasAtraso: facturas.diasAtraso,  // Usar campo almacenado en lugar de calcular
      sistema: facturas.sistema,
      estadoPago: facturas.estadoPago,
      descripcion: facturas.descripcion,
    })
    .from(facturas)
    .where(and(
      eq(facturas.numeroContrato, numeroContrato),
      eq(facturas.estadoPago, 'pendiente')
    ))
    .orderBy(desc(facturas.fecha));

  return result;
}

export async function getContratosPorCliente(clienteId: number) {
  const db = await getDb();
  if (!db) return [];

  // Obtener nombre del cliente
  const cliente = await db
    .select()
    .from(clientes)
    .where(eq(clientes.id, clienteId))
    .limit(1);

  if (cliente.length === 0) return [];

  // Obtener todos los contratos activos del cliente desde la tabla contratos
  const contratosActivos = await db
    .select()
    .from(contratos)
    .where(
      and(
        eq(contratos.nombreCliente, cliente[0].nombre),
        eq(contratos.activo, true)
      )
    );

  // Para cada contrato, calcular información de facturas y proyección
  const resultado = [];
  
  for (const contrato of contratosActivos) {
    // Calcular pagos faltantes
    const pagosFaltantes = contrato.totalRentas - contrato.rentaActual;
    
    // Obtener saldo pendiente actual de facturas del contrato
    const facturasPendientes = await db
      .select()
      .from(facturas)
      .where(
        and(
          eq(facturas.numeroContrato, contrato.numeroContrato),
          eq(facturas.estadoPago, 'pendiente')
        )
      );
    
    const saldoPendienteActual = facturasPendientes.reduce(
      (sum, f) => sum + Number(f.saldoPendiente), 
      0
    );
    
    // Calcular deuda proyectada total (adeudo actual + pagos futuros)
    const deudaProyectada = saldoPendienteActual + (pagosFaltantes * Number(contrato.montoMensual));
    
    resultado.push({
      numeroContrato: contrato.numeroContrato,
      pagosFaltantes: pagosFaltantes,
      deudaProyectada: deudaProyectada
    });
  }

  // También incluir facturas sin contrato ("Otros")
  const facturasSinContrato: any = await db.execute(sql`
    SELECT 
      'Otros' as numeroContrato,
      COUNT(*) as totalFacturas,
      SUM(f1.saldoPendiente) as totalAdeudado
    FROM facturas f1
    WHERE f1.nombreCliente = ${cliente[0].nombre}
      AND f1.estadoPago = 'pendiente'
      AND (f1.numeroContrato IS NULL OR f1.numeroContrato = '')
  `);

  const facturasSinContratoRows = Array.isArray(facturasSinContrato) 
    ? facturasSinContrato 
    : (facturasSinContrato.rows || []);

  if (facturasSinContratoRows.length > 0 && facturasSinContratoRows[0].totalFacturas > 0) {
    resultado.push({
      numeroContrato: 'Otros',
      pagosFaltantes: null,
      deudaProyectada: facturasSinContratoRows[0].totalAdeudado || 0
    });
  }

  return resultado;
}


// ============ Facturas Faltantes Management ============
export async function insertFacturaFaltante(faltante: InsertFacturaFaltante) {
  const db = await getDb();
  if (!db) return null;
  
  // Verificar si ya existe una factura faltante con el mismo folio no resuelta
  const existente = await db
    .select()
    .from(facturasFaltantes)
    .where(
      and(
        eq(facturasFaltantes.folio, faltante.folio),
        eq(facturasFaltantes.resuelta, false)
      )
    );
  
  // Si ya existe, no insertar duplicado
  if (existente.length > 0) {
    return existente[0];
  }
  
  const result = await db.insert(facturasFaltantes).values(faltante);
  return result;
}

export async function getFacturasFaltantesNoResueltas() {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(facturasFaltantes)
    .where(eq(facturasFaltantes.resuelta, false))
    .orderBy(desc(facturasFaltantes.detectadoEn));
}

export async function marcarFacturaFaltanteResuelta(folio: string) {
  const db = await getDb();
  if (!db) return;
  
  await db
    .update(facturasFaltantes)
    .set({ 
      resuelta: true,
      resueltaEn: new Date()
    })
    .where(
      and(
        eq(facturasFaltantes.folio, folio),
        eq(facturasFaltantes.resuelta, false)
      )
    );
}

export async function deleteFacturasFaltantesResueltas() {
  const db = await getDb();
  if (!db) return;
  
  await db
    .delete(facturasFaltantes)
    .where(eq(facturasFaltantes.resuelta, true));
}

// ============ Deuda Total con Proyección ============

/**
 * Calcula la deuda total de un cliente incluyendo:
 * - Cartera vencida (facturas pendientes actuales)
 * - Proyección de contratos (pagos futuros)
 * 
 * Agrupa facturas por contrato+periodo y clasifica por tipo:
 * - Arrendamiento (sin prefijo)
 * - Administración (A + número)
 * - Club Tim (C + número)
 * - Otros (O + número o sin contrato)
 */
export async function getDeudaTotalCliente(clienteId: number) {
  const db = await getDb();
  if (!db) return null;

  // Obtener nombre del cliente
  const clienteResult = await db
    .select()
    .from(clientes)
    .where(eq(clientes.id, clienteId))
    .limit(1);

  if (clienteResult.length === 0) return null;
  const nombreCliente = clienteResult[0].nombre;

  // 1. CARTERA VENCIDA: Todas las facturas pendientes
  const facturasVencidas = await db
    .select()
    .from(facturas)
    .where(
      and(
        eq(facturas.nombreCliente, nombreCliente),
        sql`CAST(${facturas.saldoPendiente} AS NUMERIC) > 0`
      )
    );

  const totalCarteraVencida = facturasVencidas.reduce(
    (sum, f) => sum + Number(f.saldoPendiente),
    0
  );

  // 2. PROYECCIÓN DE CONTRATOS
  // Obtener TODOS los contratos activos del cliente desde la tabla contratos
  const contratosActivos = await db
    .select()
    .from(contratos)
    .where(
      and(
        eq(contratos.clienteId, clienteId),
        eq(contratos.activo, true)
      )
    );

  const proyeccionContratos: Array<{
    numeroContrato: string;
    linea: string;
    tipo: string;
    pagosFaltantes: number;
    precioMensual: number;
    proyeccion: number;
  }> = [];

  let totalProyeccion = 0;
  let proyeccionTT = 0;
  let proyeccionTV = 0;
  let fechaTerminoTT: Date | null = null;
  let fechaTerminoTV: Date | null = null;

  for (const contrato of contratosActivos) {
    // Calcular pagos restantes: totalRentas - rentaActual
    const pagosFaltantes = contrato.totalRentas - contrato.rentaActual;

    // Si no hay pagos faltantes, saltar este contrato
    if (pagosFaltantes <= 0) continue;

    // Agregar línea de Arrendamiento (sin prefijo)
    if (contrato.montoMensual && Number(contrato.montoMensual) > 0) {
      const proyeccion = pagosFaltantes * Number(contrato.montoMensual);
      totalProyeccion += proyeccion;
      
      // Acumular por empresa
      if (contrato.empresa === 'tim_transp') {
        proyeccionTT += proyeccion;
        if (!fechaTerminoTT || (contrato.fechaTermino && contrato.fechaTermino > fechaTerminoTT)) {
          fechaTerminoTT = contrato.fechaTermino;
        }
      } else if (contrato.empresa === 'tim_value') {
        proyeccionTV += proyeccion;
        if (!fechaTerminoTV || (contrato.fechaTermino && contrato.fechaTermino > fechaTerminoTV)) {
          fechaTerminoTV = contrato.fechaTermino;
        }
      }
      proyeccionContratos.push({
        numeroContrato: contrato.numeroContrato,
        linea: contrato.numeroContrato,
        tipo: 'Arrendamiento',
        pagosFaltantes,
        precioMensual: Number(contrato.montoMensual),
        proyeccion
      });
    }

    // Agregar línea de Administración (prefijo A)
    if (contrato.rentaAdministracion && Number(contrato.rentaAdministracion) > 0) {
      const proyeccion = pagosFaltantes * Number(contrato.rentaAdministracion);
      totalProyeccion += proyeccion;
      proyeccionContratos.push({
        numeroContrato: contrato.numeroContrato,
        linea: 'A' + contrato.numeroContrato,
        tipo: 'Administración',
        pagosFaltantes,
        precioMensual: Number(contrato.rentaAdministracion),
        proyeccion
      });
    }

    // Agregar línea de Club Tim (prefijo C)
    if (contrato.rentaClubTim && Number(contrato.rentaClubTim) > 0) {
      const proyeccion = pagosFaltantes * Number(contrato.rentaClubTim);
      totalProyeccion += proyeccion;
      proyeccionContratos.push({
        numeroContrato: contrato.numeroContrato,
        linea: 'C' + contrato.numeroContrato,
        tipo: 'Club Tim',
        pagosFaltantes,
        precioMensual: Number(contrato.rentaClubTim),
        proyeccion
      });
    }
  }

  return {
    cliente: clienteResult[0],
    carteraVencida: totalCarteraVencida,
    proyeccionContratos: totalProyeccion,
    totalAdeudado: totalCarteraVencida + totalProyeccion,
    detalleProyeccion: proyeccionContratos,
    facturasPendientes: facturasVencidas.length,
    proyeccionTT,
    proyeccionTV,
    fechaTerminoTT: fechaTerminoTT?.toISOString().split('T')[0] || null,
    fechaTerminoTV: fechaTerminoTV?.toISOString().split('T')[0] || null,
    fechaTerminoTotal: (fechaTerminoTT && fechaTerminoTV ? (fechaTerminoTT > fechaTerminoTV ? fechaTerminoTT : fechaTerminoTV) : (fechaTerminoTT || fechaTerminoTV))?.toISOString().split('T')[0] || null
  };
}

/**
 * Calcula la deuda total de un grupo de clientes
 */
export async function getDeudaTotalGrupo(grupoId: number) {
  const db = await getDb();
  if (!db) return null;

  // Obtener grupo
  const grupoResult = await db
    .select()
    .from(gruposClientes)
    .where(eq(gruposClientes.id, grupoId))
    .limit(1);

  if (grupoResult.length === 0) return null;

  // Obtener clientes del grupo
  const clientesGrupo = await db
    .select()
    .from(clientes)
    .where(eq(clientes.grupoId, grupoId));

  // Calcular deuda de cada cliente
  const deudaPorCliente = [];
  let totalCarteraVencida = 0;
  let totalProyeccion = 0;
  let totalFacturasPendientes = 0;

  for (const cliente of clientesGrupo) {
    const deuda = await getDeudaTotalCliente(cliente.id);
    if (deuda) {
      deudaPorCliente.push({
        cliente: deuda.cliente,
        carteraVencida: deuda.carteraVencida,
        proyeccionContratos: deuda.proyeccionContratos,
        totalAdeudado: deuda.totalAdeudado,
        detalleProyeccion: deuda.detalleProyeccion
      });

      totalCarteraVencida += deuda.carteraVencida;
      totalProyeccion += deuda.proyeccionContratos;
      totalFacturasPendientes += deuda.facturasPendientes;
    }
  }

  return {
    grupo: grupoResult[0],
    carteraVencida: totalCarteraVencida,
    proyeccionContratos: totalProyeccion,
    totalAdeudado: totalCarteraVencida + totalProyeccion,
    clientesCount: clientesGrupo.length,
    facturasPendientes: totalFacturasPendientes,
    deudaPorCliente
  };
}


/**
 * Obtiene lista de clientes que tienen contratos activos (facturas con formato "X de Y" o contratos en tabla contratos)
 */
export async function getClientesConContratosActivos() {
  const db = await getDb();
  if (!db) return [];

  const result: any = await db.execute(sql`
    SELECT DISTINCT c.id, c.nombre
    FROM clientes c
    WHERE EXISTS (
      SELECT 1 FROM facturas f 
      WHERE f.nombreCliente = c.nombre 
        AND f.descripcion ~ '[0-9]+ de [0-9]+'
        AND CAST(f."saldoPendiente" AS NUMERIC) > 0
    )
    OR EXISTS (
      SELECT 1 FROM contratos ct
      WHERE ct.clienteId = c.id
        AND ct.activo = true
    )
    ORDER BY c.nombre ASC
  `);

  // Drizzle devuelve un array de arrays: [[{id, nombre}, ...]] en lugar de [{id, nombre}, ...]
  const rows = Array.isArray(result) ? (result[0] || []) : (result.rows || []);
  return rows;
}

/**
 * Obtiene lista de grupos que tienen clientes con contratos activos
 */
export async function getGruposConContratosActivos() {
  const db = await getDb();
  if (!db) return [];

  const result: any = await db.execute(sql`
    SELECT DISTINCT g.id, g.nombre
    FROM gruposClientes g
    INNER JOIN clientes c ON c.grupoId = g.id
    WHERE EXISTS (
      SELECT 1 FROM facturas f 
      WHERE f.nombreCliente = c.nombre 
        AND f.descripcion ~ '[0-9]+ de [0-9]+'
        AND CAST(f."saldoPendiente" AS NUMERIC) > 0
    )
    OR EXISTS (
      SELECT 1 FROM contratos ct
      WHERE ct.clienteId = c.id
        AND ct.activo = true
    )
    ORDER BY g.nombre ASC
  `);

  // Drizzle devuelve un array de arrays: [[{id, nombre}, ...]] en lugar de [{id, nombre}, ...]
  const rows = Array.isArray(result) ? (result[0] || []) : (result.rows || []);
  return rows;
}


/**
 * Obtiene los totales globales de proyección por empresa (TT, TV, TT+TV)
 * Suma todos los contratos activos de todos los clientes e incluye detalle de cada contrato
 */
export async function getTotalesGlobalesPorEmpresa() {
  const db = await getDb();
  if (!db) return null;

  // Obtener TODOS los contratos activos con información del cliente
  const result: any = await db.execute(sql`
    SELECT 
      c.id,
      c.numeroContrato,
      c.empresa,
      c.totalRentas,
      c.rentaActual,
      c.montoMensual,
      c.rentaAdministracion,
      c.rentaClubTim,
      c.fechaTermino,
      cl.nombre as nombreCliente
    FROM contratos c
    LEFT JOIN clientes cl ON c.clienteId = cl.id
    WHERE c.activo = true
  `);

  const contratosActivos = Array.isArray(result) ? (result[0] || []) : (result.rows || []);

  let proyeccionTT = 0;
  let proyeccionTV = 0;
  let fechaTerminoTT: Date | null = null;
  let fechaTerminoTV: Date | null = null;
  const detalleContratosTT: any[] = [];
  const detalleContratosTV: any[] = [];

  for (const contrato of contratosActivos) {
    // Calcular pagos restantes: totalRentas - rentaActual
    const pagosFaltantes = contrato.totalRentas - contrato.rentaActual;

    // Si no hay pagos faltantes, saltar este contrato
    if (pagosFaltantes <= 0) continue;

    let proyeccionContrato = 0;

    // Calcular proyección de Arrendamiento
    if (contrato.montoMensual && Number(contrato.montoMensual) > 0) {
      const proyeccion = pagosFaltantes * Number(contrato.montoMensual);
      proyeccionContrato += proyeccion;
      
      // Acumular por empresa
      if (contrato.empresa === 'tim_transp') {
        proyeccionTT += proyeccion;
        const fechaTermino = contrato.fechaTermino ? new Date(contrato.fechaTermino) : null;
        if (!fechaTerminoTT || (fechaTermino && fechaTermino > fechaTerminoTT)) {
          fechaTerminoTT = fechaTermino;
        }
      } else if (contrato.empresa === 'tim_value') {
        proyeccionTV += proyeccion;
        const fechaTermino = contrato.fechaTermino ? new Date(contrato.fechaTermino) : null;
        if (!fechaTerminoTV || (fechaTermino && fechaTermino > fechaTerminoTV)) {
          fechaTerminoTV = fechaTermino;
        }
      }
    }

    // Calcular proyección de Administración
    if (contrato.rentaAdministracion && Number(contrato.rentaAdministracion) > 0) {
      const proyeccion = pagosFaltantes * Number(contrato.rentaAdministracion);
      proyeccionContrato += proyeccion;
      
      if (contrato.empresa === 'tim_transp') {
        proyeccionTT += proyeccion;
      } else if (contrato.empresa === 'tim_value') {
        proyeccionTV += proyeccion;
      }
    }

    // Calcular proyección de Club Tim
    if (contrato.rentaClubTim && Number(contrato.rentaClubTim) > 0) {
      const proyeccion = pagosFaltantes * Number(contrato.rentaClubTim);
      proyeccionContrato += proyeccion;
      
      if (contrato.empresa === 'tim_transp') {
        proyeccionTT += proyeccion;
      } else if (contrato.empresa === 'tim_value') {
        proyeccionTV += proyeccion;
      }
    }

    // Agregar detalle del contrato al array correspondiente
    if (proyeccionContrato > 0) {
      const fechaTermino = contrato.fechaTermino ? new Date(contrato.fechaTermino) : null;
      const detalleContrato = {
        numeroContrato: contrato.numeroContrato,
        cliente: contrato.nombreCliente || 'Desconocido',
        proyeccion: proyeccionContrato,
        fechaTermino: fechaTermino?.toISOString().split('T')[0] || null,
        pagosFaltantes
      };

      if (contrato.empresa === 'tim_transp') {
        detalleContratosTT.push(detalleContrato);
      } else if (contrato.empresa === 'tim_value') {
        detalleContratosTV.push(detalleContrato);
      }
    }
  }

  return {
    proyeccionTT,
    proyeccionTV,
    proyeccionTotal: proyeccionTT + proyeccionTV,
    fechaTerminoTT: fechaTerminoTT?.toISOString().split('T')[0] || null,
    fechaTerminoTV: fechaTerminoTV?.toISOString().split('T')[0] || null,
    fechaTerminoTotal: (fechaTerminoTT && fechaTerminoTV ? (fechaTerminoTT > fechaTerminoTV ? fechaTerminoTT : fechaTerminoTV) : (fechaTerminoTT || fechaTerminoTV))?.toISOString().split('T')[0] || null,
    detalleContratosTT,
    detalleContratosTV,
    detalleContratosTodos: [...detalleContratosTT, ...detalleContratosTV]
  };
}

/**
 * Inserta o actualiza un contrato desde archivo de contratos activos
 */
export async function upsertContratoFromFile(contrato: {
  numeroContrato: string;
  nombreCliente: string;
  fechaInicio: Date | null;
  plazo: number | null;
  fechaTerminacion: Date | null;
  rentaMensual: number;
  rentaAdministracion: number | null;
  rentaClubTim: number | null;
  descripcion: string;
  numeroSerie: string;
  estado: string;
}) {
  const db = await getDb();
  if (!db) return null;

  // Buscar cliente por nombre
  const clienteResult: any = await db.execute(sql`
    SELECT id FROM clientes WHERE nombre = ${contrato.nombreCliente} LIMIT 1
  `);
  const clienteRows = Array.isArray(clienteResult) ? clienteResult : (clienteResult.rows || []);
  const clienteId = clienteRows.length > 0 ? clienteRows[0].id : null;

  // Determinar empresa (por defecto tim_value si no se especifica)
  const empresa = 'tim_value';

  await db.insert(contratos).values({
    numeroContrato: contrato.numeroContrato,
    clienteId,
    nombreCliente: contrato.nombreCliente,
    empresa,
    tipoServicio: 'ARRENDAMIENTO',
    descripcionActivo: contrato.descripcion,
    numeroSerie: contrato.numeroSerie,
    totalRentas: contrato.plazo || 0,
    rentaActual: 0, // Se actualizará cuando se procesen facturas
    montoMensual: contrato.rentaMensual.toString(),
    rentaAdministracion: contrato.rentaAdministracion?.toString() || null,
    rentaClubTim: contrato.rentaClubTim?.toString() || null,
    plazo: contrato.plazo,
    fechaInicio: contrato.fechaInicio,
    fechaTermino: contrato.fechaTerminacion,
    activo: contrato.estado === 'ACTIVO',
  }).onConflictDoUpdate({
    target: contratos.numeroContrato,
    set: {
      nombreCliente: contrato.nombreCliente,
      clienteId,
      descripcionActivo: contrato.descripcion,
      numeroSerie: contrato.numeroSerie,
      totalRentas: contrato.plazo || 0,
      montoMensual: contrato.rentaMensual.toString(),
      rentaAdministracion: contrato.rentaAdministracion?.toString() || null,
      rentaClubTim: contrato.rentaClubTim?.toString() || null,
      plazo: contrato.plazo,
      fechaInicio: contrato.fechaInicio,
      fechaTermino: contrato.fechaTerminacion,
      activo: contrato.estado === 'ACTIVO',
    },
  });

  return true;
}

// ============ Baja de Contratos ============

/**
 * Valida que un contrato existe, está activo y pertenece al cliente indicado
 */
export async function validarContratoParaBaja(numeroContrato: string, clienteId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const contrato = await db
    .select()
    .from(contratos)
    .where(eq(contratos.numeroContrato, numeroContrato))
    .limit(1);

  if (contrato.length === 0) {
    return { valido: false, mensaje: "El contrato no existe" };
  }

  const contratoData = contrato[0];

  if (!contratoData.activo) {
    return { valido: false, mensaje: "El contrato ya está dado de baja" };
  }

  if (contratoData.clienteId !== clienteId) {
    return { valido: false, mensaje: "El contrato no pertenece al cliente seleccionado" };
  }

  // Calcular proyección pendiente
  const totalRentas = contratoData.totalRentas || 0;
  const rentaActual = contratoData.rentaActual || 0;
  const rentasFaltantes = totalRentas - rentaActual;
  const montoMensual = parseFloat(contratoData.montoMensual?.toString() || "0");
  const montoProyeccion = rentasFaltantes * montoMensual;

  return {
    valido: true,
    contrato: contratoData,
    rentasFaltantes,
    montoProyeccion
  };
}

/**
 * Da de baja un contrato y registra la auditoría
 */
export async function darDeBajaContrato(
  numeroContrato: string,
  clienteId: number,
  usuarioId: number,
  nombreUsuario: string,
  emailUsuario: string | null
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Validar primero
  const validacion = await validarContratoParaBaja(numeroContrato, clienteId);
  if (!validacion.valido) {
    throw new Error(validacion.mensaje);
  }

  const contratoData = validacion.contrato!;
  const motivoBaja = "Equipo vendido - baja manual por administrador";

  // Actualizar contrato
  await db
    .update(contratos)
    .set({
      activo: false,
      motivoBaja,
      fechaBaja: new Date(),
      usuarioBajaId: usuarioId,
    })
    .where(eq(contratos.numeroContrato, numeroContrato));

  // Registrar auditoría
  await db.insert(auditoriaBajasContratos).values({
    contratoId: contratoData.id,
    numeroContrato: contratoData.numeroContrato,
    clienteId: contratoData.clienteId,
    nombreCliente: contratoData.nombreCliente,
    empresa: contratoData.empresa,
    motivoBaja,
    usuarioId,
    nombreUsuario,
    emailUsuario,
    montoProyeccionEliminado: validacion.montoProyeccion?.toString() || "0",
    rentasFaltantes: validacion.rentasFaltantes,
  });

  return {
    success: true,
    mensaje: "Contrato dado de baja exitosamente",
    contratoId: contratoData.id,
    numeroContrato: contratoData.numeroContrato,
  };
}

/**
 * Obtiene el historial de bajas de contratos
 */
export async function getHistorialBajasContratos(limit: number = 50) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(auditoriaBajasContratos)
    .orderBy(desc(auditoriaBajasContratos.fechaBaja))
    .limit(limit);

  return result;
}

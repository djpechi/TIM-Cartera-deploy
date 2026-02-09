import { eq, desc, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  clientes, Cliente, InsertCliente,
  facturas, Factura, InsertFactura,
  pendientesPago, PendientePago, InsertPendientePago,
  historialCargas, HistorialCarga, InsertHistorialCarga,
  configuracion, Configuracion, InsertConfiguracion,
  auditLogs, AuditLog, InsertAuditLog,
  googleSheetsConfig, GoogleSheetsConfig, InsertGoogleSheetsConfig
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
  
  const result = await db.insert(clientes).values(cliente);
  return result;
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

export async function upsertCliente(cliente: InsertCliente) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(clientes).values(cliente).onDuplicateKeyUpdate({
    set: {
      alias: cliente.alias,
      grupo: cliente.grupo,
      asignado: cliente.asignado,
      correoCobranza: cliente.correoCobranza,
      telefono: cliente.telefono,
    },
  });
}

// ============ Facturas ============
export async function createFactura(factura: InsertFactura) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(facturas).values(factura);
  return result;
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

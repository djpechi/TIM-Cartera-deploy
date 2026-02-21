import { boolean, date, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["admin", "operador", "consulta"]).default("consulta").notNull(),
  permisos: json("permisos").$type<string[]>(),
  formatoMoneda: mysqlEnum("formatoMoneda", ["completo", "miles", "millones"]).default("completo").notNull(),
  activo: boolean("activo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Grupos de Clientes - Para agrupar múltiples razones sociales
 */
export const gruposClientes = mysqlTable("gruposClientes", {
  id: int("id").autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 255 }).notNull().unique(),
  descripcion: text("descripcion"),
  responsable: varchar("responsable", { length: 100 }),
  activo: boolean("activo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GrupoCliente = typeof gruposClientes.$inferSelect;
export type InsertGrupoCliente = typeof gruposClientes.$inferInsert;

/**
 * Clientes - Master data de clientes
 */
export const clientes = mysqlTable("clientes", {
  id: int("id").autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 255 }).notNull().unique(),
  rfc: varchar("rfc", { length: 13 }),
  alias: varchar("alias", { length: 100 }),
  grupoId: int("grupoId").references(() => gruposClientes.id),
  responsableCobranza: varchar("responsableCobranza", { length: 100 }),
  correoCobranza: varchar("correoCobranza", { length: 320 }),
  telefono: varchar("telefono", { length: 50 }),
  direccion: text("direccion"),
  notas: text("notas"),
  activo: boolean("activo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Cliente = typeof clientes.$inferSelect;
export type InsertCliente = typeof clientes.$inferInsert;

/**
 * Facturas - Consolidado de ambos sistemas de facturación
 */
export const facturas = mysqlTable("facturas", {
  id: int("id").autoincrement().primaryKey(),
  folio: varchar("folio", { length: 50 }).notNull().unique(),
  sistema: mysqlEnum("sistema", ["tim_transp", "tim_value"]).notNull(),
  clienteId: int("clienteId").references(() => clientes.id),
  nombreCliente: varchar("nombreCliente", { length: 255 }).notNull(),
  fecha: timestamp("fecha").notNull(),
  fechaVencimiento: timestamp("fechaVencimiento"),
  importeTotal: decimal("importeTotal", { precision: 15, scale: 2 }).notNull(),
  saldoPendiente: decimal("saldoPendiente", { precision: 15, scale: 2 }).default("0.00").notNull(),
  descripcion: text("descripcion"),
  numeroContrato: varchar("numeroContrato", { length: 50 }),
  estatus: mysqlEnum("estatus", ["normal", "cancelada"]).default("normal").notNull(),
  estadoPago: mysqlEnum("estadoPago", ["pendiente", "pagado"]).default("pendiente").notNull(),
  diasAtraso: int("diasAtraso").default(0),
  interesesMoratorios: decimal("interesesMoratorios", { precision: 15, scale: 2 }).default("0.00"),
  totalConIntereses: decimal("totalConIntereses", { precision: 15, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Factura = typeof facturas.$inferSelect;
export type InsertFactura = typeof facturas.$inferInsert;

/**
 * Pendientes de Pago - Registro de folios pendientes
 */
export const pendientesPago = mysqlTable("pendientesPago", {
  id: int("id").autoincrement().primaryKey(),
  facturaId: int("facturaId").references(() => facturas.id),
  folio: varchar("folio", { length: 50 }).notNull(),
  clienteId: int("clienteId").references(() => clientes.id),
  nombreCliente: varchar("nombreCliente", { length: 255 }).notNull(),
  alias: varchar("alias", { length: 100 }),
  descripcion: text("descripcion"),
  diasVencido: int("diasVencido").default(0),
  saldo: decimal("saldo", { precision: 15, scale: 2 }).notNull(),
  interesesMoratorios: decimal("interesesMoratorios", { precision: 15, scale: 2 }).default("0.00"),
  totalConMoratorios: decimal("totalConMoratorios", { precision: 15, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PendientePago = typeof pendientesPago.$inferSelect;
export type InsertPendientePago = typeof pendientesPago.$inferInsert;

/**
 * Historial de Cargas - Registro de archivos procesados
 */
export const historialCargas = mysqlTable("historialCargas", {
  id: int("id").autoincrement().primaryKey(),
  tipoArchivo: mysqlEnum("tipoArchivo", ["tim_transp", "tim_value", "pendientes", "contratos"]).notNull(),
  nombreArchivo: varchar("nombreArchivo", { length: 255 }).notNull(),
  registrosProcesados: int("registrosProcesados").default(0),
  registrosExitosos: int("registrosExitosos").default(0),
  registrosError: int("registrosError").default(0),
  estatus: mysqlEnum("estatus", ["procesando", "completado", "error"]).default("procesando").notNull(),
  errores: json("errores").$type<string[]>(),
  usuarioId: int("usuarioId").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type HistorialCarga = typeof historialCargas.$inferSelect;
export type InsertHistorialCarga = typeof historialCargas.$inferInsert;

/**
 * Configuración del Sistema
 */
export const configuracion = mysqlTable("configuracion", {
  id: int("id").autoincrement().primaryKey(),
  clave: varchar("clave", { length: 100 }).notNull().unique(),
  valor: text("valor").notNull(),
  tipo: mysqlEnum("tipo", ["string", "number", "boolean", "json"]).default("string").notNull(),
  descripcion: text("descripcion"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  updatedBy: int("updatedBy").references(() => users.id),
});

export type Configuracion = typeof configuracion.$inferSelect;
export type InsertConfiguracion = typeof configuracion.$inferInsert;

/**
 * Logs de Auditoría
 */
export const auditLogs = mysqlTable("auditLogs", {
  id: int("id").autoincrement().primaryKey(),
  usuarioId: int("usuarioId").references(() => users.id),
  accion: varchar("accion", { length: 100 }).notNull(),
  entidad: varchar("entidad", { length: 100 }),
  entidadId: int("entidadId"),
  detalles: json("detalles").$type<Record<string, unknown>>(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

/**
 * Integración Google Sheets
 */
export const googleSheetsConfig = mysqlTable("googleSheetsConfig", {
  id: int("id").autoincrement().primaryKey(),
  spreadsheetId: varchar("spreadsheetId", { length: 255 }).notNull(),
  spreadsheetUrl: text("spreadsheetUrl"),
  credenciales: text("credenciales"), // JSON encriptado
  ultimaSincronizacion: timestamp("ultimaSincronizacion"),
  estatusSincronizacion: mysqlEnum("estatusSincronizacion", ["activo", "error", "deshabilitado"]).default("activo"),
  mensajeError: text("mensajeError"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GoogleSheetsConfig = typeof googleSheetsConfig.$inferSelect;
export type InsertGoogleSheetsConfig = typeof googleSheetsConfig.$inferInsert;

/**
 * Contratos de Arrendamiento - Para proyección de facturación
 */
export const contratos = mysqlTable("contratos", {
  id: int("id").autoincrement().primaryKey(),
  numeroContrato: varchar("numeroContrato", { length: 50 }).notNull().unique(), // EXP
  clienteId: int("clienteId").references(() => clientes.id),
  nombreCliente: varchar("nombreCliente", { length: 255 }).notNull(),
  empresa: mysqlEnum("empresa", ["tim_transp", "tim_value"]).notNull(),
  tipoServicio: varchar("tipoServicio", { length: 100 }).notNull(), // ARRENDAMIENTO
  descripcionActivo: text("descripcionActivo"), // CHEVROLET - AVEO - 2022
  numeroSerie: varchar("numeroSerie", { length: 50 }), // NS
  totalRentas: int("totalRentas").notNull(),
  rentaActual: int("rentaActual").notNull(),
  montoMensual: decimal("montoMensual", { precision: 15, scale: 2 }).notNull(),
  rentaAdministracion: decimal("rentaAdministracion", { precision: 15, scale: 2 }),
  rentaClubTim: decimal("rentaClubTim", { precision: 15, scale: 2 }),
  plazo: int("plazo"), // Duración total en meses
  fechaInicio: date("fechaInicio"),
  fechaProximaRenta: date("fechaProximaRenta"),
  fechaTermino: date("fechaTermino"),
  activo: boolean("activo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Contrato = typeof contratos.$inferSelect;
export type InsertContrato = typeof contratos.$inferInsert;

/**
 * Proyección Mensual - Ingresos proyectados por contrato
 */
export const proyeccionMensual = mysqlTable("proyeccionMensual", {
  id: int("id").autoincrement().primaryKey(),
  contratoId: int("contratoId").references(() => contratos.id).notNull(),
  mes: date("mes").notNull(), // Primer día del mes proyectado
  montoProyectado: decimal("montoProyectado", { precision: 15, scale: 2 }).notNull(),
  rentaNumero: int("rentaNumero").notNull(), // Número de renta proyectada
  esUltimaRenta: boolean("esUltimaRenta").default(false).notNull(),
  montoReal: decimal("montoReal", { precision: 15, scale: 2 }), // Se llena cuando se factura
  facturaId: int("facturaId").references(() => facturas.id),
  generadoEn: timestamp("generadoEn").defaultNow().notNull(),
});

export type ProyeccionMensual = typeof proyeccionMensual.$inferSelect;
export type InsertProyeccionMensual = typeof proyeccionMensual.$inferInsert;

/**
 * Partidas de Factura - Detalle de cada línea de factura
 */
export const partidasFactura = mysqlTable("partidasFactura", {
  id: int("id").autoincrement().primaryKey(),
  facturaId: int("facturaId").references(() => facturas.id).notNull(),
  contratoId: int("contratoId").references(() => contratos.id),
  descripcion: text("descripcion").notNull(),
  monto: decimal("monto", { precision: 15, scale: 2 }).notNull(),
  // Campos extraídos del parser
  tipoServicio: varchar("tipoServicio", { length: 100 }),
  numeroContrato: varchar("numeroContrato", { length: 50 }), // EXP
  numeroSerie: varchar("numeroSerie", { length: 50 }), // NS
  descripcionActivo: text("descripcionActivo"),
  rentaActual: int("rentaActual"),
  totalRentas: int("totalRentas"),
  periodoInicio: date("periodoInicio"),
  periodoFin: date("periodoFin"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PartidaFactura = typeof partidasFactura.$inferSelect;
export type InsertPartidaFactura = typeof partidasFactura.$inferInsert;

/**
 * Facturas Faltantes - Registro de facturas detectadas en archivo de pendientes pero no encontradas en BD
 */
export const facturasFaltantes = mysqlTable("facturasFaltantes", {
  id: int("id").autoincrement().primaryKey(),
  folio: varchar("folio", { length: 50 }).notNull(),
  saldo: decimal("saldo", { precision: 15, scale: 2 }).notNull(),
  fecha: date("fecha"),
  fechaVencimiento: date("fechaVencimiento"),
  archivoOrigen: varchar("archivoOrigen", { length: 255 }), // Nombre del archivo donde se detectó
  detectadoEn: timestamp("detectadoEn").defaultNow().notNull(),
  resuelta: boolean("resuelta").default(false).notNull(), // Se marca como true cuando se carga la factura
  resueltaEn: timestamp("resueltaEn"),
});

export type FacturaFaltante = typeof facturasFaltantes.$inferSelect;
export type InsertFacturaFaltante = typeof facturasFaltantes.$inferInsert;

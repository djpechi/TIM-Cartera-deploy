# ARCHITECTURE.md — Sistema de Automatización de Cartera Vencida (TIM VALUE)

> **Documento para sub-agentes y directores de desarrollo.**
> Este archivo describe la arquitectura completa del sistema, sus convenciones, rutas, base de datos, módulos y tareas pendientes. Cualquier agente (ClaudeCode, Codex, Antigravity, etc.) debe leer este documento **antes** de tocar cualquier archivo del proyecto.

---

## 1. Visión General del Producto

El sistema es una aplicación web interna para las empresas **Tim Transportes (Tim Transp)** y **Tim Value**, diseñada para automatizar la gestión de cartera vencida, proyección de facturación, estados de cuenta y análisis de cobranza. Reemplaza un proceso manual basado en Google Sheets.

**Usuarios objetivo:** Personal financiero y directivo de Leasing TIM (`@leasingtim.mx`) y BPADS (`@bpads.mx`). El acceso está restringido exclusivamente a estos dos dominios de correo.

**URL de producción:** `https://carterauto-busgvjzr.manus.space`
**Repositorio GitHub:** `https://github.com/gerardotames/TIM-Cartera` (privado)

---

## 2. Stack Tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Frontend framework | React | 19 |
| Estilos | Tailwind CSS | 4 |
| Componentes UI | shadcn/ui + Radix UI | — |
| Routing frontend | Wouter | 3.x |
| Gráficas | Recharts | 2.x |
| Backend framework | Express | 4 |
| API layer | tRPC | 11 |
| ORM | Drizzle ORM | 0.44 |
| Base de datos | MySQL / TiDB | — |
| Validación de esquemas | Zod | 4 |
| Autenticación | Manus OAuth (JWT + cookies) | — |
| Generación de PDF | PDFKit | 0.17 |
| Procesamiento Excel | xlsx + exceljs | — |
| Almacenamiento de archivos | AWS S3 (Manus Storage) | — |
| Lenguaje | TypeScript | 5.9 |
| Build tool | Vite | 7 |
| Testing | Vitest | 2 |
| Runtime | Node.js | 22 |
| Package manager | pnpm | 10 |

---

## 3. Estructura de Directorios

```
cartera_vencida_automation/
├── client/                        # Frontend React
│   ├── public/                    # Assets estáticos servidos en /
│   └── src/
│       ├── components/
│       │   ├── ui/                # Componentes shadcn/ui (NO editar directamente)
│       │   ├── DashboardLayout.tsx        # Layout principal con sidebar
│       │   ├── DashboardLayoutSkeleton.tsx
│       │   ├── NuevoContratoDialog.tsx    # Modal de creación de contratos
│       │   └── ManusDialog.tsx
│       ├── contexts/
│       │   └── ThemeContext.tsx    # Proveedor de tema light/dark
│       ├── hooks/
│       │   ├── useDomainValidation.ts     # Valida dominio del usuario logueado
│       │   ├── usePermissions.ts          # Verifica permisos del usuario
│       │   └── useMobile.tsx
│       ├── pages/                 # Una página por ruta
│       │   ├── Dashboard.tsx
│       │   ├── Upload.tsx
│       │   ├── Facturas.tsx
│       │   ├── Proyeccion.tsx
│       │   ├── TablaProyeccion.tsx
│       │   ├── EstadosCuenta.tsx
│       │   ├── AnalisisCobranza.tsx
│       │   ├── AnalisisContratos.tsx
│       │   ├── ProyeccionContratos.tsx
│       │   ├── DetalleContrato.tsx
│       │   ├── Reportes.tsx
│       │   ├── GestionClientes.tsx
│       │   ├── Configuracion.tsx
│       │   ├── Usuarios.tsx
│       │   └── AccessDenied.tsx
│       ├── lib/
│       │   └── trpc.ts            # Cliente tRPC + React Query
│       ├── const.ts               # getLoginUrl() y constantes globales
│       ├── App.tsx                # Router principal (Wouter)
│       └── main.tsx               # Entry point, interceptor de errores 401
│
├── server/                        # Backend Express + tRPC
│   ├── _core/                     # Infraestructura (NO tocar salvo extensión)
│   │   ├── index.ts               # Punto de entrada del servidor Express
│   │   ├── context.ts             # Contexto tRPC (autenticación + dominio)
│   │   ├── trpc.ts                # publicProcedure, protectedProcedure, adminProcedure
│   │   ├── oauth.ts               # Callback de Manus OAuth
│   │   ├── sdk.ts                 # SDK de Manus (sesiones JWT, getUserInfo)
│   │   ├── env.ts                 # Variables de entorno tipadas
│   │   ├── llm.ts                 # Helper para LLM (Manus AI)
│   │   └── notification.ts        # notifyOwner() helper
│   ├── routers/
│   │   └── proyeccionContratos.ts # Router de contratos de proyección manual
│   ├── routers.ts                 # Router principal (appRouter) — todos los endpoints
│   ├── db.ts                      # Funciones de acceso a base de datos (query helpers)
│   ├── adminMiddleware.ts         # adminProcedure y activeProcedure
│   ├── domainValidator.ts         # Validación de dominios permitidos
│   ├── xlsxProcessor.ts           # Parsers de archivos Excel (Tim Transp, Tim Value, Pendientes)
│   ├── contratosProcessor.ts      # Parser de archivo de contratos
│   ├── partidaParser.ts           # Parser de descripciones de partidas (EXP, NS, RENTA X de Y)
│   ├── pdfGenerator.ts            # Generador de estados de cuenta en PDF
│   ├── calculosFinancieros.ts     # Cálculos de IVA, rentas, amortización
│   ├── storage.ts                 # Helpers S3 (storagePut, storageGet)
│   └── *.test.ts                  # Tests Vitest por módulo
│
├── drizzle/
│   ├── schema.ts                  # Definición de todas las tablas (fuente de verdad)
│   ├── relations.ts               # Relaciones Drizzle ORM
│   └── meta/                      # Snapshots de migraciones
│
├── shared/
│   ├── const.ts                   # COOKIE_NAME, ONE_YEAR_MS
│   ├── modulos.ts                 # MODULOS_SISTEMA, PERMISOS_POR_ROL
│   ├── formatoMoneda.ts           # Formateadores de moneda (completo/miles/millones)
│   └── types.ts                   # Re-exporta tipos del schema
│
├── scripts/                       # Scripts de utilidad (importación de datos, inspección)
├── ARCHITECTURE.md                # Este documento
├── todo.md                        # Lista de tareas pendientes del proyecto
├── package.json
├── drizzle.config.ts
├── vite.config.ts
└── vitest.config.ts
```

---

## 4. Base de Datos — Esquema Completo

La base de datos es **MySQL/TiDB**. El ORM es **Drizzle**. El archivo fuente de verdad es `drizzle/schema.ts`. Para aplicar cambios al schema se usa `pnpm db:push`.

### 4.1 Tabla: `users`

Usuarios del sistema. Se crea automáticamente al hacer login por primera vez vía Manus OAuth.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | int PK | Autoincremental |
| `openId` | varchar(64) UNIQUE | Identificador de Manus OAuth |
| `name` | text | Nombre del usuario |
| `email` | varchar(320) | Correo electrónico |
| `loginMethod` | varchar(64) | `google`, `email`, `microsoft` |
| `role` | enum | `admin` \| `operador` \| `consulta` |
| `permisos` | json | Array de IDs de módulos permitidos |
| `formatoMoneda` | enum | `completo` \| `miles` \| `millones` |
| `activo` | boolean | Si la cuenta está habilitada |
| `createdAt` | timestamp | Fecha de creación |
| `lastSignedIn` | timestamp | Último acceso |

### 4.2 Tabla: `clientes`

Razones sociales de los arrendatarios.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | int PK | Autoincremental |
| `nombre` | varchar(255) UNIQUE | Razón social |
| `rfc` | varchar(13) | RFC del cliente |
| `grupoId` | int FK → `gruposClientes` | Grupo al que pertenece |
| `contacto`, `telefono`, `email`, `direccion` | varchar/text | Datos de contacto |
| `activo` | boolean | Estado del cliente |

### 4.3 Tabla: `gruposClientes`

Agrupaciones de clientes (ej. "Grupo LPG", "Ready to Lease").

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | int PK | Autoincremental |
| `nombre` | varchar(255) UNIQUE | Nombre del grupo |
| `responsable` | varchar(100) | Persona responsable |
| `activo` | boolean | Estado del grupo |

### 4.4 Tabla: `facturas`

Facturas emitidas por Tim Transp y Tim Value. Es la tabla central del sistema.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | int PK | Autoincremental |
| `folio` | varchar(50) UNIQUE | Folio de la factura (`AA####` o `AB####`) |
| `empresa` | enum | `tim_transp` \| `tim_value` |
| `clienteId` | int FK → `clientes` | Cliente asociado |
| `nombreCliente` | varchar(255) | Nombre del cliente (desnormalizado) |
| `fecha` | timestamp | Fecha de emisión |
| `fechaVencimiento` | timestamp | Fecha de vencimiento |
| `importeTotal` | decimal(15,2) | Importe original |
| `saldoPendiente` | decimal(15,2) | Saldo sin pagar |
| `descripcion` | text | Descripción de la partida (EXP, NS, RENTA X de Y) |
| `numeroContrato` | varchar(50) | Número de contrato extraído de la descripción |
| `estatus` | enum | `normal` \| `cancelada` |
| `estadoPago` | enum | `pendiente` \| `pagado` |
| `diasAtraso` | int | Días de atraso (0 si está pagada) |
| `interesesMoratorios` | decimal(15,2) | Intereses calculados |
| `totalConIntereses` | decimal(15,2) | Saldo + intereses |

> **Regla de negocio crítica:** Cuando `estadoPago = 'pagado'`, los campos `diasAtraso`, `interesesMoratorios` y `totalConIntereses` deben ser 0/null. Esto se aplica en `db.ts` en las funciones `updateFacturaSaldoPendiente` y `updateFacturaEstadoPago`.

### 4.5 Tabla: `pendientesPago`

Snapshot del archivo de "Pendientes de Pago" cargado periódicamente. Sirve para cruzar contra `facturas` y determinar qué facturas siguen sin pagar.

| Campo | Tipo | Descripción |
|---|---|---|
| `folio` | varchar(50) | Folio de la factura |
| `saldo` | decimal(15,2) | Saldo pendiente según el archivo |
| `diasVencido` | int | Días vencidos según el archivo |
| `facturaId` | int FK → `facturas` | Factura asociada (si existe) |

### 4.6 Tabla: `historialCargas`

Registro de cada archivo procesado por el sistema.

| Campo | Tipo | Descripción |
|---|---|---|
| `tipoArchivo` | enum | `tim_transp` \| `tim_value` \| `pendientes` \| `contratos` |
| `nombreArchivo` | varchar(255) | Nombre del archivo subido |
| `registrosProcesados` | int | Total de filas en el archivo |
| `registrosExitosos` | int | Filas guardadas correctamente |
| `registrosError` | int | Filas rechazadas |
| `estatus` | enum | `procesando` \| `completado` \| `error` |
| `errores` | json | Array de mensajes de error por fila |
| `usuarioId` | int FK → `users` | Usuario que subió el archivo |

### 4.7 Tabla: `contratos`

Contratos de arrendamiento extraídos automáticamente de las descripciones de las facturas (campo `descripcion` con formato `EXP XXXXX NS XXXXX RENTA X DE Y`).

| Campo | Tipo | Descripción |
|---|---|---|
| `numeroContrato` | varchar(50) UNIQUE | Número EXP del contrato |
| `clienteId` | int FK → `clientes` | Cliente arrendatario |
| `empresa` | enum | `tim_transp` \| `tim_value` |
| `descripcionActivo` | text | Descripción del activo (ej. "CHEVROLET AVEO 2022") |
| `numeroSerie` | varchar(50) | Número de serie del activo |
| `totalRentas` | int | Total de rentas del contrato |
| `rentaActual` | int | Número de renta más reciente |
| `montoMensual` | decimal(15,2) | Monto de la renta mensual |
| `activo` | boolean | Si el contrato está vigente |
| `motivoBaja` | text | Motivo de cancelación |
| `fechaBaja` | timestamp | Fecha de cancelación |

### 4.8 Tabla: `configuracion`

Parámetros del sistema editables desde la interfaz.

| Clave | Descripción | Valor por defecto |
|---|---|---|
| `tasa_interes_moratoria` | Tasa anual de interés moratorio (%) | `24` |
| `dias_gracia` | Días de gracia antes de aplicar intereses | `8` |
| `empresa_nombre` | Nombre de la empresa para PDFs | `Leasing TIM` |

### 4.9 Tabla: `auditLogs`

Registro de acciones importantes para auditoría (cambios de rol, activación/desactivación de usuarios, bajas de contratos).

### 4.10 Tabla: `contratosProyeccion`

Contratos creados **manualmente** en el módulo de Proyección de Contratos (diferente a `contratos` que se genera automáticamente desde facturas).

| Campo | Tipo | Descripción |
|---|---|---|
| `numeroContrato` | varchar(100) UNIQUE | Número de contrato |
| `clienteId` | int FK → `clientes` | Cliente |
| `vendedorId` | int FK → `vendedores` | Vendedor asignado |
| `tipoContrato` | enum | `arrendamiento_puro` \| `arrendamiento_financiero` \| `credito_simple` |
| `fechaInicio` | date | Inicio del contrato |
| `plazo` | int | Plazo en meses (12, 24, 36, 48, 60) |
| `estatus` | enum | `activo` \| `cancelado` |

### 4.11 Tabla: `lineItemsContrato`

Equipos/conceptos dentro de un contrato de proyección. Cada contrato puede tener múltiples line items.

### 4.12 Tabla: `proyeccionMensualManual`

Pagos proyectados mes a mes para cada line item de contrato. Se genera automáticamente al crear un contrato.

### 4.13 Tabla: `vendedores`

Vendedores asignados a contratos de proyección.

---

## 5. Autenticación y Control de Acceso

### 5.1 Flujo de Autenticación

El sistema usa **Manus OAuth** con sesiones JWT almacenadas en cookies `httpOnly`.

```
Usuario → clic "Sign in"
  → getLoginUrl() construye URL con origin + appId
  → Redirige a portal.manus.im/app-auth
  → Usuario se autentica en Manus
  → Manus redirige a /api/oauth/callback?code=...&state=...
  → Servidor intercambia code por accessToken
  → Obtiene userInfo (openId, email, name)
  → Valida dominio: @leasingtim.mx o @bpads.mx
  → Crea/actualiza usuario en BD
  → Genera JWT firmado con JWT_SECRET
  → Guarda en cookie manus_session (1 año)
  → Redirige a /
```

> **Problema conocido:** El login requiere que el usuario tenga cuenta en Manus. Usuarios sin cuenta en Manus no pueden autenticarse. **Tarea pendiente:** Migrar a Google OAuth directo.

### 5.2 Middleware de Autorización

Definido en `server/_core/trpc.ts` y `server/adminMiddleware.ts`:

| Middleware | Uso | Condición |
|---|---|---|
| `publicProcedure` | Endpoints sin autenticación | Sin restricciones |
| `protectedProcedure` | Endpoints para usuarios logueados | `ctx.user !== null` |
| `adminProcedure` | Solo administradores | `ctx.user.role === 'admin'` |
| `activeProcedure` | Solo cuentas activas | `ctx.user.activo === true` |

### 5.3 Roles y Permisos

Los permisos se almacenan como array de IDs de módulos en `users.permisos`. La asignación por defecto según rol está en `shared/modulos.ts`:

| Rol | Módulos permitidos |
|---|---|
| `admin` | Todos los módulos |
| `operador` | dashboard, cargar-archivos, facturas, proyeccion, tabla-proyeccion, estados-cuenta, analisis-cobranza, reportes, clientes |
| `consulta` | dashboard, facturas, proyeccion, tabla-proyeccion, estados-cuenta, analisis-cobranza, reportes, clientes |

### 5.4 Validación de Dominio

Implementada en dos capas:

- **Backend** (`server/domainValidator.ts` + `server/_core/context.ts`): Si el email del usuario no es `@leasingtim.mx` o `@bpads.mx`, el contexto devuelve `user = null` aunque la sesión JWT sea válida.
- **Frontend** (`client/src/hooks/useDomainValidation.ts`): Si el usuario tiene sesión pero dominio inválido, redirige a `/access-denied`.

---

## 6. API — Rutas tRPC

Todas las rutas están bajo `/api/trpc`. Se consumen en el frontend con `trpc.*.useQuery()` o `trpc.*.useMutation()`.

### 6.1 `auth`

| Procedimiento | Tipo | Acceso | Descripción |
|---|---|---|---|
| `auth.me` | query | public | Devuelve el usuario actual o null |
| `auth.logout` | mutation | public | Elimina la cookie de sesión |
| `auth.updateFormatoMoneda` | mutation | protected | Cambia el formato de moneda del usuario |

### 6.2 `dashboard`

| Procedimiento | Tipo | Acceso | Descripción |
|---|---|---|---|
| `dashboard.stats` | query | protected | Totales: cartera pendiente, facturas, clientes con atraso, cargas |
| `dashboard.facturasPendientes` | query | protected | Top 5 facturas con mayor atraso |
| `dashboard.historialCargas` | query | protected | Últimas 10 cargas de archivos |
| `dashboard.facturasFaltantes` | query | protected | Facturas en pendientes que no existen en BD |

### 6.3 `upload`

| Procedimiento | Tipo | Acceso | Descripción |
|---|---|---|---|
| `upload.processFile` | mutation | protected | Procesa un archivo Excel (base64). Input: `{ tipoArchivo, fileName, fileData }` |

Los tipos de archivo aceptados son: `tim_transp`, `tim_value`, `pendientes`, `contratos`.

### 6.4 `facturas`

| Procedimiento | Tipo | Acceso | Descripción |
|---|---|---|---|
| `facturas.list` | query | protected | Todas las facturas con filtros opcionales |
| `facturas.pendientes` | query | protected | Solo facturas con `estadoPago = 'pendiente'` |
| `facturas.byFolio` | query | protected | Factura por folio específico |

### 6.5 `config`

| Procedimiento | Tipo | Acceso | Descripción |
|---|---|---|---|
| `config.get` | query | protected | Obtiene un parámetro por clave |
| `config.getAll` | query | protected | Todos los parámetros de configuración |
| `config.set` | mutation | protected | Actualiza un parámetro |

### 6.6 `reportes`

| Procedimiento | Tipo | Acceso | Descripción |
|---|---|---|---|
| `reportes.carteraVencida` | query | protected | Reporte completo de cartera vencida por cliente |
| `reportes.evolucionTemporal` | query | protected | Evolución histórica de cobranza por mes |

### 6.7 `admin.users`

| Procedimiento | Tipo | Acceso | Descripción |
|---|---|---|---|
| `admin.users.list` | query | admin | Lista todos los usuarios |
| `admin.users.updateRole` | mutation | admin | Cambia el rol de un usuario |
| `admin.users.updateStatus` | mutation | admin | Activa/desactiva una cuenta |
| `admin.users.updatePermisos` | mutation | admin | Modifica permisos individuales |
| `admin.users.stats` | query | admin | Estadísticas de usuarios por rol |

### 6.8 `clientes`

| Procedimiento | Tipo | Acceso | Descripción |
|---|---|---|---|
| `clientes.list` | query | protected | Lista de clientes con filtros |
| `clientes.getById` | query | protected | Cliente por ID |
| `clientes.getByGrupo` | query | protected | Clientes de un grupo |
| `clientes.create` | mutation | protected | Crear cliente |
| `clientes.update` | mutation | protected | Actualizar cliente |
| `clientes.delete` | mutation | protected | Eliminar cliente |
| `clientes.asignarGrupo` | mutation | protected | Asignar cliente a grupo |

### 6.9 `grupos`

| Procedimiento | Tipo | Acceso | Descripción |
|---|---|---|---|
| `grupos.list` | query | protected | Lista de grupos |
| `grupos.getById` | query | protected | Grupo por ID |
| `grupos.create` | mutation | protected | Crear grupo |
| `grupos.update` | mutation | protected | Actualizar grupo |
| `grupos.delete` | mutation | protected | Eliminar grupo |

### 6.10 `proyeccion`

| Procedimiento | Tipo | Acceso | Descripción |
|---|---|---|---|
| `proyeccion.contratos` | query | protected | Todos los contratos |
| `proyeccion.contratosActivos` | query | protected | Solo contratos activos |
| `proyeccion.contratosProximosAVencer` | query | protected | Contratos con ≤3 rentas pendientes |
| `proyeccion.contratosByCliente` | query | protected | Contratos de un cliente |
| `proyeccion.contratosByEmpresa` | query | protected | Contratos por empresa |
| `proyeccion.proyeccionConsolidada` | query | protected | Proyección total consolidada |
| `proyeccion.proyeccionPorEmpresa` | query | protected | Proyección separada por empresa |
| `proyeccion.proyeccionPorGrupo` | query | protected | Proyección agrupada por grupo de clientes |
| `proyeccion.proyeccionMatricial` | query | protected | Tabla matricial contratos × meses |
| `proyeccion.contratoDetalle` | query | protected | Detalle completo de un contrato |

### 6.11 `estadosCuenta`

| Procedimiento | Tipo | Acceso | Descripción |
|---|---|---|---|
| `estadosCuenta.clientesConDeuda` | query | protected | Clientes que tienen facturas pendientes |
| `estadosCuenta.gruposConDeuda` | query | protected | Grupos con facturas pendientes |
| `estadosCuenta.cliente` | query | protected | Facturas pendientes de un cliente |
| `estadosCuenta.grupo` | query | protected | Facturas pendientes de un grupo |
| `estadosCuenta.generarPDFCliente` | mutation | protected | Genera PDF de estado de cuenta por cliente |
| `estadosCuenta.generarPDFGrupo` | mutation | protected | Genera PDF de estado de cuenta por grupo |
| `estadosCuenta.generarPDFsMasivos` | mutation | protected | Genera PDFs de todos los clientes con deuda |

### 6.12 `analisis`

| Procedimiento | Tipo | Acceso | Descripción |
|---|---|---|---|
| `analisis.evolucionCobranza` | query | protected | Evolución histórica de pagos |
| `analisis.topDeudores` | query | protected | Clientes con mayor deuda |
| `analisis.distribucionAntiguedad` | query | protected | Distribución por rangos de días de atraso |
| `analisis.facturasPorContrato` | query | protected | Facturas agrupadas por contrato |
| `analisis.contratosPorCliente` | query | protected | Contratos de un cliente específico |
| `analisis.deudaTotalCliente` | query | protected | Deuda total de un cliente |
| `analisis.deudaTotalGrupo` | query | protected | Deuda total de un grupo |
| `analisis.totalesGlobalesPorEmpresa` | query | protected | Proyección global TT + TV |

### 6.13 `bajasContratos`

| Procedimiento | Tipo | Acceso | Descripción |
|---|---|---|---|
| `bajasContratos.validarContrato` | query | protected | Verifica si un contrato puede darse de baja |
| `bajasContratos.darDeBaja` | mutation | protected | Da de baja un contrato con motivo |
| `bajasContratos.historial` | query | protected | Historial de bajas de contratos |

### 6.14 `proyeccionContratos`

Router separado en `server/routers/proyeccionContratos.ts` para el módulo de contratos manuales.

| Procedimiento | Tipo | Acceso | Descripción |
|---|---|---|---|
| `proyeccionContratos.list` | query | protected | Lista contratos de proyección |
| `proyeccionContratos.getById` | query | protected | Detalle de un contrato |
| `proyeccionContratos.create` | mutation | admin | Crear contrato con line items |
| `proyeccionContratos.cancelar` | mutation | admin | Cancelar contrato |
| `proyeccionContratos.listVendedores` | query | protected | Lista de vendedores |
| `proyeccionContratos.createVendedor` | mutation | admin | Crear vendedor |
| `proyeccionContratos.listByGrupo` | query | protected | Contratos por grupo |
| `proyeccionContratos.getDetalle` | query | protected | Detalle completo con proyección |

---

## 7. Módulos de Procesamiento

### 7.1 Parser de Archivos Excel (`server/xlsxProcessor.ts`)

El parser usa detección de columnas **por contenido** (no por nombre de encabezado), lo que permite procesar archivos con columnas desordenadas.

**Lógica de detección:**
1. Lee la primera fila de datos (no encabezados)
2. Detecta la columna de **fecha** buscando valores en rango de números de serie Excel (40000–60000) o strings con formato de fecha
3. Detecta la columna de **folio** buscando strings que empiecen con `AA` o `AB`
4. Detecta la columna de **cliente** buscando el string más largo que no sea folio
5. Detecta la columna de **importe** buscando números > 100 que NO sean números de serie de fecha

**Funciones exportadas:**

| Función | Descripción |
|---|---|
| `processTimTranspFile(buffer)` | Procesa facturas Tim Transportes (folios AB####) |
| `processTimValueFile(buffer)` | Procesa facturas Tim Value (folios AA####) |
| `processPendientesFile(buffer)` | Procesa archivo de saldos pendientes |
| `calcularAtrasoEIntereses(factura, config)` | Calcula días de atraso e intereses moratorios |

### 7.2 Parser de Partidas (`server/partidaParser.ts`)

Extrae información estructurada de la descripción de las facturas.

**Formato de descripción esperado:**
```
ARRENDAMIENTO EXP 12345 NS ABC123456 RENTA 5 DE 36 CHEVROLET AVEO 2022
```

**Funciones exportadas:**

| Función | Descripción |
|---|---|
| `parsearPartida(descripcion)` | Extrae EXP, NS, renta actual, total rentas, descripción del activo |
| `calcularRentasPendientes(actual, total)` | Rentas que faltan por pagar |
| `calcularFechaTermino(fecha, pendientes)` | Fecha estimada de fin del contrato |
| `generarProyeccionMensual(contrato)` | Genera array de pagos proyectados mes a mes |
| `estaProximoAVencer(actual, total)` | True si quedan ≤3 rentas |

### 7.3 Generador de PDF (`server/pdfGenerator.ts`)

Genera estados de cuenta en PDF usando **PDFKit**. Los PDFs se generan en memoria (Buffer) y se devuelven como base64 al frontend para descarga directa.

**Funciones exportadas:**

| Función | Descripción |
|---|---|
| `generarEstadoCuentaClientePDF(clienteId, facturas, config)` | PDF de un cliente |
| `generarEstadoCuentaGrupoPDF(grupoId, facturas, config)` | PDF de un grupo |

### 7.4 Cálculos Financieros (`server/calculosFinancieros.ts`)

Módulo de cálculos para el módulo de Proyección de Contratos manual.

| Función | Descripción |
|---|---|
| `calcularIVA(monto)` | IVA al 16% |
| `calcularTotalConIVA(monto)` | Monto + IVA |
| `calcularPago(principal, tasaAnual, plazo)` | Pago mensual por amortización |
| `calcularLineItemPuro(input)` | Cálculo completo para arrendamiento puro |
| `calcularLineItemFinanciero(input)` | Cálculo para arrendamiento financiero |
| `calcularLineItemCredito(input)` | Cálculo para crédito simple |
| `generarProyeccionMensual(contrato, lineItems)` | Proyección mes a mes |

---

## 8. Rutas del Frontend

Definidas en `client/src/App.tsx` usando **Wouter**. Todas las rutas están envueltas en `DashboardLayout`.

| Ruta | Componente | Descripción |
|---|---|---|
| `/` | `Dashboard` | Panel principal con KPIs y alertas |
| `/upload` | `Upload` | Carga de archivos Excel |
| `/facturas` | `Facturas` | Lista y filtros de facturas |
| `/proyeccion` | `Proyeccion` | Dashboard de proyección de ingresos |
| `/tabla-proyeccion` | `TablaProyeccion` | Vista matricial contratos × meses |
| `/estados-cuenta` | `EstadosCuenta` | Generación de PDFs de estados de cuenta |
| `/analisis-cobranza` | `AnalisisCobranza` | Análisis de cartera por antigüedad |
| `/analisis-contratos` | `AnalisisContratos` | Análisis por contrato y cliente |
| `/proyeccion-contratos` | `ProyeccionContratos` | Lista de contratos manuales |
| `/proyeccion-contratos/:id` | `DetalleContrato` | Detalle de un contrato manual |
| `/reportes` | `Reportes` | Reportes exportables |
| `/gestion-clientes` | `GestionClientes` | CRUD de clientes y grupos |
| `/configuracion` | `Configuracion` | Parámetros del sistema |
| `/usuarios` | `Usuarios` | Administración de usuarios (solo admin) |
| `/access-denied` | `AccessDenied` | Página de acceso denegado |

---

## 9. Variables de Entorno

Todas las variables de entorno están tipadas en `server/_core/env.ts`. **Nunca se hardcodean en el código.**

| Variable | Uso |
|---|---|
| `DATABASE_URL` | Conexión MySQL/TiDB |
| `JWT_SECRET` | Firma de cookies de sesión |
| `VITE_APP_ID` | ID de la app en Manus OAuth |
| `OAUTH_SERVER_URL` | URL del servidor OAuth de Manus (backend) |
| `VITE_OAUTH_PORTAL_URL` | URL del portal de login de Manus (frontend) |
| `OWNER_OPEN_ID` | OpenID del dueño del proyecto (se asigna rol admin automáticamente) |
| `BUILT_IN_FORGE_API_URL` | URL de las APIs internas de Manus (LLM, Storage, etc.) |
| `BUILT_IN_FORGE_API_KEY` | Token para APIs internas de Manus (server-side) |
| `VITE_FRONTEND_FORGE_API_KEY` | Token para APIs de Manus (client-side) |

---

## 10. Convenciones de Desarrollo

### 10.1 Reglas de Código

- **Nunca usar `fetch` o `axios` en el frontend** para llamar al backend. Siempre usar `trpc.*.useQuery()` o `trpc.*.useMutation()`.
- **Nunca almacenar bytes de archivos en la base de datos.** Usar S3 para archivos y guardar solo la URL en BD.
- **Siempre usar UTC** para timestamps internos. Convertir a zona local solo en la UI con `new Date(utcTimestamp).toLocaleString()`.
- **Siempre resetear `diasAtraso = 0`** cuando una factura se marca como pagada.
- **Los procedimientos admin** deben usar `adminProcedure` de `server/adminMiddleware.ts`, no `protectedProcedure` con verificación manual.

### 10.2 Flujo de Trabajo para Nuevas Funcionalidades

1. Actualizar `drizzle/schema.ts` si se necesita nueva tabla o campo
2. Ejecutar `pnpm db:push` para aplicar la migración
3. Agregar función de acceso en `server/db.ts`
4. Crear o extender procedimiento en `server/routers.ts` (o en `server/routers/[feature].ts` si el router supera ~150 líneas)
5. Crear o actualizar página en `client/src/pages/`
6. Registrar ruta en `client/src/App.tsx` si es nueva
7. Agregar módulo en `shared/modulos.ts` si requiere permiso
8. Escribir test en `server/*.test.ts`
9. Marcar tarea en `todo.md`

### 10.3 Formato de Folios

| Prefijo | Empresa | Ejemplo |
|---|---|---|
| `AA` | Tim Value | `AA1681` |
| `AB` | Tim Transportes | `AB11359` |

---

## 11. Tareas Pendientes Prioritarias

Las siguientes tareas están identificadas y listas para ser delegadas a sub-agentes:

### P1 — Crítico: Migración de Autenticación a Google OAuth

**Problema:** El login actual usa Manus OAuth, que requiere que los usuarios tengan cuenta en Manus. Los empleados de Leasing TIM no tienen cuenta en Manus y no pueden acceder.

**Solución requerida:** Implementar Google OAuth 2.0 directamente:
- Agregar `passport-google-oauth20` o `googleapis` al backend
- Crear endpoint `GET /api/auth/google` y `GET /api/auth/google/callback`
- Mantener la validación de dominio (`@leasingtim.mx` y `@bpads.mx`) después del login
- Actualizar el botón de login en `DashboardLayout.tsx` para mostrar "Iniciar sesión con Google"
- Requiere: `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en variables de entorno

**Archivos a modificar:** `server/_core/oauth.ts`, `server/_core/sdk.ts` (o crear `server/_core/googleAuth.ts`), `client/src/const.ts`, `client/src/components/DashboardLayout.tsx`

### P2 — Importante: Recálculo Dinámico de Días de Atraso

**Problema:** El campo `diasAtraso` se calcula al momento de importar el archivo y no se actualiza automáticamente cada día.

**Solución:** Calcular `diasAtraso` dinámicamente en las queries SQL usando `DATEDIFF(NOW(), fechaVencimiento)` para facturas pendientes, en lugar de depender del campo almacenado.

**Archivos a modificar:** `server/db.ts` (funciones de consulta de facturas pendientes)

### P3 — Importante: Integración con Google Sheets

**Problema:** El proceso de importación de datos aún es manual (subir archivos Excel). El origen de datos es Google Sheets.

**Solución:** Implementar sincronización automática con Google Sheets API v4:
- Leer hoja "Facturacion Tim Transp 2025" y "Facturacion Tim Value 2025"
- Leer hoja "Actualizar folios pendientes"
- Guardar credenciales de service account en tabla `googleSheetsConfig`
- Crear endpoint de sincronización manual y/o cron job

**Archivos a crear:** `server/googleSheetsSync.ts`, nuevo router `sync` en `server/routers.ts`

### P4 — Mejora: Alertas de Contratos por Vencer

**Problema:** No hay notificaciones cuando un contrato está próximo a vencer (≤3 rentas).

**Solución:** Agregar widget en Dashboard y notificación por email usando `notifyOwner()`.

### P5 — Mejora: Comparativo Real vs Proyectado

**Problema:** No existe vista que compare ingresos reales (facturas pagadas) vs proyectados (contratos activos).

**Solución:** Nueva página o sección en `/proyeccion` con gráfica de barras comparativa por mes.

---

## 12. Tests

Los tests están en archivos `*.test.ts` dentro de `server/`. Se ejecutan con `pnpm test`.

| Archivo de test | Qué cubre |
|---|---|
| `server/auth.logout.test.ts` | Flujo de logout |
| `server/admin.test.ts` | Gestión de usuarios (roles, activación) |
| `server/clientes.test.ts` | CRUD de clientes |
| `server/domainValidator.test.ts` | Validación de dominios permitidos |
| `server/estadosCuenta.test.ts` | Generación de estados de cuenta |
| `server/formatoMoneda.test.ts` | Formateadores de moneda |
| `server/pdfGenerator.test.ts` | Generación de PDFs |
| `server/proyeccion.test.ts` | Motor de proyección |
| `server/uniqueness.test.ts` | Validaciones de unicidad en BD |
| `server/xlsxProcessor.test.ts` | Parsers de archivos Excel |

---

## 13. Comandos Útiles

```bash
# Desarrollo
pnpm dev                  # Inicia servidor en modo desarrollo (puerto 3000)

# Base de datos
pnpm db:push              # Genera y aplica migraciones (drizzle-kit generate + migrate)

# Tests
pnpm test                 # Ejecuta todos los tests con Vitest

# Build
pnpm build                # Build de producción (Vite + esbuild)
pnpm start                # Inicia servidor en modo producción

# Verificación de tipos
pnpm check                # TypeScript type check sin compilar
```

---

*Documento generado el 18 de marzo de 2026. Actualizar este archivo cada vez que se agregue un módulo, tabla o ruta nueva.*

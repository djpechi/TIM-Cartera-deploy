# Project TODO - Sistema de Automatización de Cartera Vencida

## Base de Datos y Arquitectura
- [x] Diseñar esquema de base de datos (clientes, facturas, pendientes, configuración, historial)
- [x] Implementar tablas para Tim Transp y Tim Value
- [x] Crear tabla de configuración del sistema
- [x] Implementar tabla de auditoría y logs

## Backend - Procesamiento de Archivos
- [x] Instalar y configurar librería para lectura de XLSX (xlsx o exceljs)
- [x] Crear endpoint para carga de archivos XLSX
- [x] Implementar validación de estructura de archivos
- [x] Desarrollar parser para Facturación Tim Transp (folios AB)
- [x] Desarrollar parser para Facturación Tim Value (folios AA)
- [x] Desarrollar parser para Pendientes de Pago
- [x] Implementar detección de duplicados
- [x] Crear sistema de validación de integridad referencial

## Backend - Lógica de Negocio
- [x] Implementar motor de consolidación de datos
- [x] Desarrollar lógica de determinación de estado de pago
- [x] Implementar cálculo de días de atraso
- [x] Desarrollar cálculo de intereses moratorios
- [x] Crear sistema de configuración de parámetros (tasa, días de gracia, etc.)
- [x] Implementar generación de reportes consolidados

## Integración Google Sheets
- [ ] Configurar Google Sheets API credentials
- [ ] Implementar lectura de master data (Clientes y Grupos)
- [ ] Desarrollar actualización automática de "Actualizar folios pendientes"
- [ ] Implementar actualización de "Overdue Summary"
- [ ] Desarrollar actualización de "Estados de cuenta"
- [ ] Crear sistema de sincronización bidireccional

## Frontend - Interfaz de Usuario
- [x] Diseñar y aplicar paleta de colores y tipografía
- [x] Crear layout principal con navegación
- [x] Implementar página de inicio/dashboard
- [x] Desarrollar componente de carga de archivos XLSX
- [x] Crear interfaz de validación de archivos
- [x] Implementar visualización de estado de procesamiento
- [x] Desarrollar historial de cargas realizadas

## Frontend - Dashboard y Reportes
- [x] Crear dashboard con métricas clave
- [x] Implementar visualización de total de cartera vencida
- [x] Desarrollar lista de clientes con mayor atraso
- [x] Crear gráficos de evolución temporal de cobranza
- [x] Implementar reportes por cliente
- [x] Desarrollar reportes por grupo
- [x] Crear exportación de reportes a CSV

## Configuración y Administración
- [x] Crear página de configuración del sistema
- [x] Implementar formulario de parámetros (tasa de interés, días de gracia)
- [ ] Desarrollar gestión de credenciales de Google Sheets
- [ ] Crear sistema de backup y restauración

## Testing y Validación
- [x] Crear tests unitarios para parsers de XLSX
- [x] Implementar tests para cálculos de atraso e intereses
- [ ] Desarrollar tests de integración con Google Sheets
- [ ] Crear tests end-to-end del flujo completo

## Documentación y Entrega
- [x] Documentar estructura de archivos XLSX esperados
- [x] Crear guía de usuario del sistema
- [ ] Documentar configuración de Google Sheets API
- [x] Preparar checkpoint final

## Control de Acceso por Dominio
- [x] Implementar middleware de validación de dominio en el backend
- [x] Crear lista de dominios permitidos (@leasingtim.mx, @bpads.mx)
- [x] Actualizar lógica de autenticación para validar dominio
- [x] Crear página de acceso denegado
- [x] Agregar mensajes informativos en login
- [x] Crear tests para validación de dominios
- [x] Actualizar documentación con política de acceso

## Módulo de Administración de Usuarios
- [x] Actualizar esquema de base de datos con nuevos roles (admin, operador, consulta)
- [x] Agregar campo de estado activo/inactivo a usuarios
- [x] Crear procedimientos backend para listar usuarios
- [x] Implementar endpoint para cambiar rol de usuario
- [x] Implementar endpoint para activar/desactivar cuenta
- [x] Crear página de administración de usuarios
- [x] Implementar tabla con listado de usuarios
- [x] Agregar búsqueda y filtros por rol y estado
- [x] Crear diálogos para cambiar rol y estado
- [x] Implementar middleware de autorización solo para admins
- [x] Agregar tests para gestión de usuarios
- [x] Documentar roles y permisos del sistema

## Módulo de Gestión de Clientes
- [x] Actualizar esquema de base de datos con tabla de clientes
- [x] Crear tabla de grupos de clientes
- [x] Implementar relación muchos-a-uno entre clientes y grupos
- [x] Crear procedimientos backend para CRUD de clientes
- [x] Implementar procedimientos para gestión de grupos
- [x] Desarrollar endpoints para asignación de clientes a grupos
- [x] Crear página de gestión de clientes
- [x] Implementar formulario de creación/edición de clientes
- [x] Desarrollar gestión de grupos con modal
- [x] Agregar búsqueda y filtros por grupo
- [x] Implementar visualización de relaciones cliente-grupo
- [x] Crear tests para módulo de clientes
- [x] Documentar estructura de clientes y grupos

## Módulo de Proyección de Facturación Mensual
- [x] Actualizar esquema de base de datos con tabla de contratos
- [x] Crear tabla de proyección mensual
- [x] Implementar parser de descripción de partidas (extraer EXP, NS, RENTA X DE Y)
- [x] Desarrollar motor de cálculo de rentas pendientes
- [x] Implementar generación automática de proyección mensual
- [x] Crear procedimientos backend para gestión de contratos
- [x] Desarrollar endpoints para proyección por grupo, empresa y contrato
- [x] Crear página de proyección con dashboard
- [x] Implementar gráficos de ingresos proyectados
- [x] Desarrollar tabla de contratos próximos a vencer
- [x] Agregar filtros por grupo, empresa, cliente y contrato
- [x] Integrar parser con carga de archivos XLSX
- [x] Implementar actualización automática de proyección
- [ ] Crear alertas de contratos por vencer
- [ ] Desarrollar comparativo Real vs Proyectado
- [x] Crear tests para parser y motor de proyección
- [x] Documentar sistema de proyección

## Vista de Tabla de Proyección Matricial
- [x] Crear endpoint backend para proyección en formato matricial (contratos x meses)
- [x] Implementar agrupación por año
- [x] Desarrollar componente de tabla con meses como columnas
- [x] Agregar totales por mes y por contrato
- [x] Implementar selector de año
- [x] Agregar exportación de tabla a CSV/Excel

## Carga Inicial de Datos desde Google Sheets
- [x] Extraer datos de la hoja "Clientes y Gupos"
- [x] Extraer datos de "Facturacion Tim Transp 2025"
- [x] Extraer datos de "Facturacion Tim Value 2025"
- [x] Extraer datos de "Actualizar folios pendientes"
- [x] Crear script de importación de datos
- [x] Importar clientes y grupos al sistema
- [x] Importar facturas de ambas empresas
- [x] Importar pendientes de pago
- [x] Procesar partidas y generar contratos automáticamente
- [x] Generar proyecciones mensuales
- [x] Verificar integridad de datos cargados

## Corrección de Errores
- [x] Suprimir warning de ResizeObserver en consola del navegador

## Corrección de Carga de Archivos
- [x] Diagnosticar problema de carga de archivos de facturas
- [x] Corregir funcionalidad de upload
- [x] Verificar que la carga funcione correctamente

## Corrección de Error JSON
- [ ] Diagnosticar error "Unexpected token '<', '<!DOCTYPE '... is not valid JSON"
- [ ] Corregir respuesta del servidor
- [ ] Verificar que la carga funcione correctamente

## Plantillas de Carga
- [x] Crear plantilla Excel para Tim Transp
- [x] Crear plantilla Excel para Tim Value
- [x] Crear plantilla Excel para Pendientes de Pago
- [x] Agregar funcionalidad de descarga en la interfaz

## Revisión y Eliminación de Duplicados
- [x] Analizar tabla de facturas para detectar duplicados por folio
- [x] Analizar tabla de clientes para detectar duplicados por nombre/razón social
- [x] Crear script para eliminar duplicados en facturas
- [x] Crear script para eliminar duplicados en clientes
- [x] Implementar validación de unicidad en backend (facturas)
- [x] Implementar validación de unicidad en backend (clientes)
- [x] Agregar índices únicos en base de datos
- [x] Crear tests para validaciones de unicidad

## Verificación de Carga de Folios Pendientes
- [x] Analizar estructura del archivo de folios pendientes proporcionado
- [x] Verificar que el procesador reconozca correctamente las columnas
- [x] Probar carga del archivo en el sistema
- [x] Verificar que la lógica de estado de pago funcione correctamente
- [x] Documentar formato esperado del archivo

## Reorganización de Tabla de Proyección
- [x] Analizar estructura actual de la tabla de proyección
- [x] Implementar organización jerárquica: Grupo → Razón Social → Contratos Activos
- [x] Filtrar años en cero (solo mostrar años con operación)
- [x] Agregar opción de vista consolidada vs detallada
- [x] Implementar toggle para alternar entre vistas
- [x] Probar funcionalidad con datos reales

## Correcciones de Tabla de Proyección
- [x] Mostrar clientes sin grupo como grupos independientes (usar razón social como nombre de grupo)
- [x] Filtrar contratos que no tienen operaciones en el año seleccionado
- [x] Probar que solo aparezcan contratos con al menos una factura en el año

## Módulo de Estados de Cuenta en PDF
- [x] Diseñar estructura de consulta para obtener facturas pendientes por cliente
- [x] Diseñar estructura de consulta para obtener facturas pendientes por grupo
- [x] Implementar generador de PDF con información de facturas pendientes
- [x] Crear diseño profesional del estado de cuenta (encabezado, tabla, totales)
- [x] Implementar cálculo de totales y subtotales en el PDF
- [x] Crear página de estados de cuenta en el frontend
- [x] Implementar selector de cliente o grupo
- [x] Agregar botón de generación y descarga de PDF
- [x] Crear tests para generación de PDFs
- [x] Documentar funcionalidad de estados de cuenta

## Filtrado de Clientes/Grupos sin Deuda en Estados de Cuenta
- [x] Crear consulta para obtener solo clientes con facturas pendientes
- [x] Crear consulta para obtener solo grupos con facturas pendientes
- [x] Actualizar endpoints de tRPC para usar listas filtradas
- [x] Modificar interfaz para usar nuevos endpoints filtrados
- [x] Probar que solo aparezcan clientes/grupos con deuda

## Corrección de Filtro de Clientes con Deuda
- [x] Investigar valores reales del campo estadoPago en facturas
- [x] Corregir consulta de clientes con deuda según valores reales
- [x] Corregir consulta de grupos con deuda según valores reales
- [x] Probar que aparezcan clientes con facturas pendientes

## Ocultar Campo de Intereses Moratorios
- [x] Identificar todas las vistas que muestran intereses moratorios
- [x] Ocultar columna de intereses en vista previa de estado de cuenta
- [x] Ocultar intereses en PDF generado de estado de cuenta
- [x] Ocultar intereses en tabla de facturas del dashboard
- [x] Ocultar intereses en vista detallada de facturas
- [x] Ajustar cálculo de totales para no incluir intereses
- [x] Probar que los reportes se vean limpios sin el campo de intereses

## Dashboard de Análisis de Cobranza
- [x] Crear consulta para evolución temporal de cobranza (pagadas vs pendientes por mes)
- [x] Crear consulta para top 10 clientes con mayores deudas
- [x] Crear consulta para distribución de cartera por rangos de antigüedad (1-30, 31-60, 61-90, +90 días)
- [x] Implementar endpoints tRPC para datos de gráficos
- [x] Instalar y configurar Chart.js o Recharts
- [x] Crear página de dashboard con gráficos interactivos
- [x] Implementar gráfico de líneas para evolución temporal
- [x] Implementar gráfico de barras para top deudores
- [x] Implementar gráfico de dona/pie para distribución por rangos
- [ ] Agregar filtros de fecha y exportación de datos
- [x] Probar visualizaciones con datos reales

## Corrección de Errores SQL en Dashboard de Análisis
- [x] Corregir consulta de distribución por antigüedad (calcular diasAtraso con DATEDIFF)
- [x] Corregir consulta de evolución temporal (manejar fechas NULL)
- [x] Usar SQL raw con números de posición para compatibilidad con ONLY_FULL_GROUP_BY
- [x] Probar que ambos gráficos carguen correctamente (parcialmente: gráficos funcionan pero requieren datos históricos)

## Corrección de Error de React Key Prop
- [x] Identificar elementos sin key prop en AnalisisCobranza
- [x] Agregar keys únicos a todos los elementos de lista
- [x] Verificar que el error desaparezca

## Eliminación de Distribución por Antigüedad
- [x] Eliminar consulta getDistribucionPorAntiguedad de db.ts (no es necesario, solo no se usa)
- [x] Eliminar endpoint de distribución por antigüedad de routers.ts (no es necesario, solo no se usa)
- [x] Eliminar gráfico de distribución por antigüedad de AnalisisCobranza.tsx
- [x] Probar que el dashboard cargue sin errores

## Modificación de Modal de Contratos Próximos a Vencer
- [x] Identificar archivo de la página de Proyecciones
- [x] Localizar modal de contratos próximos a vencer
- [x] Agregar tabla con lista de contratos (cliente, número, fecha vencimiento, días restantes)
- [x] Probar modal con datos reales

## Habilitar Intereses Moratorios y Número de Contrato en Estados de Cuenta
- [x] Revisar código del generador de PDFs en EstadosCuenta.tsx
- [x] Agregar columna de intereses moratorios en tabla del PDF
- [x] Agregar columna de número de contrato en tabla del PDF
- [x] Actualizar cálculo de totales para incluir intereses moratorios
- [x] Actualizar vista previa si muestra la tabla
- [x] Probar generación de PDF con nuevas columnas

## Corrección de Discrepancia en Carga de Archivo Excel
- [x] Analizar archivo Excel "10febrero.xlsx" (221 partidas, $2,222,685.33)
- [x] Identificar que dashboard solo mostraba facturas con atraso > 0 ($1,561,431.26)
- [x] Identificar 6 folios faltantes en BD (AB12140, AB12142, AA1644, AA1645, AA1642, AA1643)
- [x] Agregar métrica totalCarteraPendiente en getDashboardStats()
- [x] Actualizar Dashboard para mostrar cartera total pendiente ($2,185,402.47)
- [x] Modificar procesador de pendientes para crear facturas faltantes automáticamente
- [x] Validar correcciones con tests unitarios

## Implementar Nueva Lógica de Saldo Pendiente
- [x] Agregar campo saldoPendiente a tabla facturas en schema.ts
- [x] Ejecutar migración de base de datos (pnpm db:push)
- [x] Modificar procesador de pendientes para actualizar saldoPendiente
- [x] Marcar facturas ausentes en archivo como saldoPendiente = 0
- [x] Agregar input de tasa de interés moratorio en Estados de Cuenta
- [x] Actualizar vista previa para calcular intereses con tasa editable
- [x] Modificar generador de PDF para usar saldoPendiente y tasa configurable
- [x] Actualizar getDashboardStats para usar saldoPendiente
- [x] Crear funciones para obtener detalles de facturas para modales
- [ ] Agregar endpoints tRPC para modales
- [ ] Actualizar Dashboard.tsx para mostrar modales al hacer clic
- [ ] Probar carga de archivo de pendientes con nueva lógica
- [ ] Probar generación de estados de cuenta con diferentes tasas
- [ ] Validar dashboard y modales

## Sistema de Permisos por Rol
- [x] Agregar campo permisos (JSON) a tabla users en schema.ts
- [x] Ejecutar migración de base de datos
- [x] Inicializar permisos para usuarios existentes
- [x] Definir constante de módulos disponibles con rutas y nombres
- [x] Crear funciones en db.ts para actualizar permisos
- [x] Crear interfaz en página Usuarios para asignar permisos por usuario
- [x] Actualizar DashboardLayout/sidebar para filtrar menús según permisos
- [x] Crear hook usePermissions para verificar permisos en el frontend
- [x] Probar sistema con diferentes roles y permisos

## Agregar Columna de Correo en Tabla de Clientes
- [x] Verificar campo correoCobranza en schema de clientes
- [x] Actualizar tabla en página Clientes para mostrar columna de correo
- [x] Probar visualización de correos en la tabla

## Mejorar Análisis de Cobranza
- [x] Revisar código actual de AnalisisCobranza.tsx
- [x] Eliminar primera gráfica de la página
- [x] Actualizar backend para calcular métricas adicionales (porcentaje, días promedio, número de facturas)
- [x] Expandir Top 10 a Top 15 clientes
- [x] Agregar filtro superior para seleccionar métrica a visualizar
- [x] Implementar visualización dinámica según filtro seleccionado
- [x] Probar todas las opciones de filtro

## Ajustar Tamaño de Fuente en Gráfica de Análisis de Cobranza
- [x] Reducir tamaño de fuente de nombres de clientes en eje Y
- [x] Probar visualización mejorada

## Exportación Masiva de Estados de Cuenta
- [x] Crear endpoint backend para generar múltiples PDFs
- [x] Implementar compresión de PDFs en archivo ZIP
- [x] Agregar checkboxes de selección en lista de clientes
- [x] Agregar botón "Exportar Seleccionados" en frontend
- [x] Implementar lógica de selección múltiple
- [x] Probar exportación masiva con múltiples clientes

## Cálculo Dinámico de Días de Atraso en Estados de Cuenta
- [x] Modificar consultas de estados de cuenta para calcular días de atraso en tiempo real
- [x] Actualizar generador de PDFs para recalcular días de atraso al momento de generación
- [x] Actualizar cálculo de intereses moratorios para usar días de atraso dinámicos
- [x] Probar en vista previa y PDFs que los días de atraso se calculan correctamente

## Reorganizar Exportación Masiva en Tab Dedicada
- [x] Agregar tercera tab "Exportación Masiva" en Estados de Cuenta
- [x] Mover checkboxes y lista de clientes a la nueva tab
- [x] Reorganizar interfaz para mejor visualización
- [x] Probar funcionalidad en la nueva tab

## Sistema de Formateo de Cifras Monetarias
- [x] Agregar campo formatoMoneda a tabla users en schema.ts
- [x] Ejecutar migración de base de datos (pnpm db:push)
- [x] Crear función utilitaria de formateo con 3 opciones (Completo sin decimales, Miles K, Millones M)
- [x] Crear endpoint tRPC para actualizar preferencia de formato
- [x] Agregar selector de formato en página Configuración
- [x] Aplicar formato en cards del Dashboard
- [x] Aplicar formato en modales de Dashboard (Próximos a Vencer, etc.)
- [x] Aplicar formato en página de Proyección
- [x] Aplicar formato en gráficas de Análisis de Cobranza
- [x] Aplicar formato en tooltips de gráficas
- [x] Probar sistema con las 3 opciones de formato

## Corrección de Cálculos en Estados de Cuenta
- [x] Investigar por qué los días de atraso no se calculan correctamente
- [x] Investigar por qué los intereses moratorios no se calculan correctamente
- [x] Corregir lógica de cálculo de días de atraso en generación de estados de cuenta
- [x] Corregir lógica de cálculo de intereses moratorios en generación de estados de cuenta
- [x] Probar generación de estados de cuenta con datos reales
- [x] Verificar que los cálculos sean correctos en el PDF generado

## Corrección de Error al Editar Clientes
- [x] Revisar logs del navegador y servidor para identificar el error
- [x] Investigar código de edición de clientes en frontend
- [x] Investigar endpoint de actualización de clientes en backend
- [x] Corregir error identificado (SelectItem con value vacío)
- [x] Probar edición de clientes con datos reales
- [x] Verificar que la edición funcione correctamente

## Corrección de Intereses Moratorios para TT y TV
- [x] Investigar por qué intereses moratorios solo se calculan para TIM VALUE (TV)
- [x] Revisar código de generación de estados de cuenta para identificar filtro por empresa
- [x] Identificar problema: facturas TT no tienen fechas de vencimiento configuradas
- [x] Investigar por qué las facturas TT no tienen fechas de vencimiento
- [x] Revisar código de carga de archivos para identificar dónde se importan fechas
- [x] Corregir importación de columna "Vence" a fechaVencimiento para facturas TT
- [x] Actualizar fechas de vencimiento de facturas TT existentes en base de datos
- [x] Probar generación de estados de cuenta con facturas TT actualizadas

## Corrección de Folios Duplicados en Vista Previa de Estados de Cuenta
- [x] Consultar base de datos para identificar folios duplicados (no hay duplicados en BD)
- [x] Confirmar que folio AA1513 aparece duplicado en vista previa
- [x] Identificar que el problema está en la consulta de facturas para estado de cuenta
- [x] Revisar función getEstadoCuentaCliente en db.ts
- [x] Revisar endpoint de estados de cuenta en routers.ts
- [x] Identificar por qué la consulta retorna facturas duplicadas (LEFT JOIN con partidasFactura)
- [x] Corregir consulta para evitar duplicados (usar subconsulta en lugar de LEFT JOIN)
- [x] Probar vista previa de estado de cuenta con BOTANAS CAMPESINAS

## Identificación y Clasificación de Folios sin Contrato
- [x] Consultar base de datos para identificar folios sin contrato asignado (87 folios encontrados)
- [x] Analizar descripción de cada folio para clasificar tipo
- [x] Clasificar folios como: servicio, refrendo, póliza de seguro o membresía
- [x] Crear lista de folios con su clasificación correspondiente (66 tienen contrato, 10 Club TIM, 2 seguros, 9 otros)
- [x] Actualizar base de datos con números de contrato según clasificación (78 folios actualizados)
- [x] PROBLEMA: Vista previa muestra N/A aunque BD tiene contratos correctos
- [x] Decidir agregar campo numeroContrato directamente a tabla facturas
- [x] Agregar campo numeroContrato a schema.ts
- [x] Ejecutar migración de base de datos
- [x] Actualizar xlsxProcessor para extraer numeroContrato de descripción
- [x] Migrar contratos existentes de partidasFactura a facturas
- [x] Actualizar consultas de estados de cuenta para usar numeroContrato de facturas
- [x] Probar estados de cuenta con contratos visibles (0047 visible correctamente)

## Módulo de Análisis de Contratos
- [x] Crear función en db.ts para buscar facturas por número de contrato
- [x] Crear función en db.ts para obtener contratos por cliente con saldos
- [x] Crear endpoints tRPC para análisis de contratos
- [x] Crear página AnalisisContratos.tsx con tabs de búsqueda
- [x] Implementar búsqueda por número de contrato
- [x] Implementar búsqueda por cliente con lista de contratos
- [x] Agrupar facturas sin contrato como "Otros"
- [x] Agregar ruta en App.tsx
- [x] Agregar enlace en DashboardLayout
- [x] Probar búsquedas y verificar cálculos de saldos

## Corrección de Análisis de Contratos - Proyección de Pagos
- [x] Actualizar función getFacturasPorContrato para extraer "X de Y" de descripción
- [x] Calcular pagos faltantes (Y - X) y deuda proyectada
- [x] Crear tabla de proyección mensual similar a Tabla Proyección
- [x] Actualizar función getContratosPorCliente con misma lógica
- [x] Facturas sin contrato: mostrar solo como pendiente (sin proyección)
- [x] Solo aplicar proyección a facturas con formato "X de Y"
- [x] Probar con contrato 0047 y cliente BOTANAS CAMPESINAS

## Corrección de Error SQL en Análisis de Contratos por Cliente
- [x] Corregir consulta getContratosPorCliente para evitar error de GROUP BY
- [x] Probar búsqueda por cliente AFIMSA
- [x] Verificar que no haya errores SQL

## Simplificación de Tabla por Cliente en Análisis de Contratos
- [x] Simplificar tabla de búsqueda por cliente para mostrar solo: Número de Contrato, Pagos Faltantes, Deuda Proyectada

## Corrección de Error en Búsqueda por Cliente - Análisis de Contratos
- [x] Diagnosticar error en búsqueda por cliente (no funciona)
- [x] Revisar logs del servidor y navegador
- [x] Identificar causa raíz del problema (servidor no reiniciado)
- [x] Implementar corrección (reiniciar servidor)
- [x] Probar con múltiples clientes (AFIMSA, AA DE SAN LUIS)

## Corrección: Búsqueda por Cliente debe mostrar todos los contratos activos
- [x] Revisar estructura de tabla contratos en schema
- [x] Modificar getContratosPorCliente para consultar tabla contratos en lugar de solo facturas pendientes
- [x] Calcular pagos faltantes y deuda proyectada desde información del contrato
- [x] Probar con cliente SACAR (debe mostrar contrato 263)
- [x] Verificar que otros clientes con contratos también funcionen correctamente

## Corrección: Proyección de deuda no se muestra correctamente
- [x] Verificar datos del contrato 263 (totalRentas, rentaActual, montoMensual)
- [x] Revisar cálculo de deuda proyectada en getContratosPorCliente (incluir saldo pendiente actual)
- [x] Corregir lógica de cálculo en backend (adeudo actual + pagos futuros)
- [x] Corregir frontend para usar datos directos del backend en lugar de calcularProyeccion()
- [x] Probar con contrato 263 y BOTANAS CAMPESINAS - funcionando correctamente

## Revisión: Cálculo de Días de Atraso en Estados de Cuenta
- [x] Revisar código del generador de estados de cuenta (EstadosCuenta.tsx)
- [x] Verificar cálculo de días de atraso en backend (db.ts)
- [x] Identificar lógica actual de cálculo (fecha de vencimiento vs fecha actual)
- [x] Probar con facturas reales para validar precisión
- [x] Documentar hallazgos: Cálculo es correcto usando DATEDIFF(CURDATE(), fechaVencimiento)

## ERROR CRÍTICO: Cálculo Incorrecto de Días de Atraso
- [x] Investigar factura AB11711 que muestra 2 días de atraso en lugar de 29 días
- [x] Verificar fechaVencimiento real en base de datos para AB11711
- [x] Identificar si el problema es en el cálculo SQL o en los datos almacenados
- [x] Corregir procesamiento de archivos para leer columnas Fecha y Vence
- [x] Modificar routers.ts para usar fechas del archivo en lugar de calcularlas
- [x] Modificar código para actualizar fechas de facturas EXISTENTES (no solo nuevas)
- [x] Recargar archivo de pendientes para actualizar fechas existentes
- [x] Probar con múltiples facturas para asegurar corrección global (AB11711 y AA1455)

## Corrección: DATEDIFF muestra 30 días en lugar de 29
- [x] Identificar consultas SQL que usan DATEDIFF(CURDATE(), fechaVencimiento)
- [x] Cambiar para usar el campo diasAtraso almacenado en 3 funciones
- [x] Verificar que todas las vistas muestren 29 días correctamente

## ERROR CRÍTICO: Archivo de Saldos Pendientes no sobrescribe correctamente
- [x] Revisar archivo Libro1.xlsx con datos de Outokumpu (3 facturas en archivo: AB11850, AB12136, AB11902)
- [x] Verificar cuántas facturas de Outokumpu hay en base de datos (65 total, 2 pendientes)
- [x] Comparar estados de cuenta vs archivo Excel (falta AB12136)
- [x] Identificar por qué solo muestra 2 facturas en lugar de 3 (AB12136 tiene "CLIENTE DESCONOCIDO")
- [x] Identificar causa raíz: archivo pendientes CREA facturas nuevas sin cliente
- [x] Modificar código para que pendientes NO cree facturas nuevas
- [x] Agregar reporte de facturas faltantes (no encontradas en BD)
- [ ] Probar recarga y verificar mensaje de facturas faltantes

## ERROR: Discrepancia en Total de Cartera Pendiente
- [x] Verificar total de cartera pendiente mostrado en el sistema ($1,352K)
- [x] Comparar con total del archivo de pendientes ($1,844,447.72 real)
- [x] Identificar facturas faltantes: 5 facturas (AB12136, AB12140, AB12142, AA1674, AA1680)
- [x] Causa: Solo se cargaron 5 facturas TT/TV, faltan 135 facturas del archivo de pendientes
- [ ] Cargar archivos completos de TT y TV con todas las facturas
- [ ] Recargar archivo de pendientes para actualizar saldos
- [ ] Verificar que totales coincidan

## Nueva Funcionalidad: Dashboard de Facturas Faltantes
- [x] Crear tabla en base de datos para almacenar facturas faltantes
- [x] Modificar backend para guardar facturas faltantes detectadas durante carga
- [x] Crear endpoint para obtener lista de facturas faltantes
- [x] Crear componente visual en dashboard con tabla de facturas faltantes
- [x] Implementar botón de exportación a CSV (frontend)
- [ ] Probar funcionalidad completa con carga de pendientes

## Cambio de Lógica: Archivo de Pendientes Define Estado de Pago
- [ ] Modificar lógica de carga de pendientes: facturas EN el archivo = pendiente, resto = pagado
- [ ] Agregar validación automática de totales después de cada carga
- [ ] Mostrar mensaje de error si totales no coinciden
- [ ] Probar con archivo Libro1.xlsx y verificar que suma sea $1,795,886.72

## Validación de Fecha Mínima en Carga de Pendientes
- [x] Identificar fecha más antigua en archivo de pendientes
- [x] Modificar lógica para solo actualizar facturas con fecha >= fecha mínima del archivo
- [x] Ignorar facturas históricas (anteriores a fecha mínima) en actualización automática
- [x] Agregar logs para mostrar fecha mínima detectada y facturas excluidas
- [ ] Probar que facturas históricas mantienen su estado actual sin modificarse

- [x] BUG: Factura AA1455 aparece en estados de cuenta cuando NO está en archivo de pendientes (debería estar marcada como pagada)

## Mejoras en Estados de Cuenta
- [x] Ordenar selectores de clientes y grupos alfabéticamente por nombre
- [x] Agregar validador en modal que muestre cuántas facturas aparecerán en el estado de cuenta antes de generarlo
- [x] Corregir consulta de estados de cuenta para filtrar por saldoPendiente > 0
- [x] Actualizar manualmente AA1455 a saldo 0 para que no aparezca en estados de cuenta

## Análisis de Contratos - Deuda Total con Proyección
- [x] Crear función de backend para agrupar facturas por contrato+periodo
- [x] Implementar clasificación de líneas de contrato (Arrendamiento, Administración A, Club Tim C, Otros O)
- [x] Calcular cartera vencida (facturas con saldoPendiente > 0)
- [x] Calcular proyección de contratos (pagos faltantes × precio mensual por línea)
- [x] Crear endpoint tRPC para obtener deuda total por cliente
- [x] Crear endpoint tRPC para obtener deuda total por grupo
- [x] Diseñar UI para mostrar desglose: Vencidas | Proyectadas | Total
- [x] Mostrar detalle de cada contrato con sus líneas (234, A234, C234, O234)
- [x] Agregar tab "Resumen de Deuda" en página de Análisis de Contratos
- [ ] Probar cálculos con casos reales

- [x] Filtrar selectores de Resumen de Deuda para mostrar solo clientes/grupos con contratos activos

- [x] BUG: Error "Cannot read properties of undefined (reading 'toString')" en Análisis de Contratos


## Tabla de Contratos Activos
- [x] Crear tabla `contratos` en schema con campos: numeroContrato, cliente, fechaInicio, plazo, rentaMensual, rentaAdministracion, rentaClubTim, estado
- [ ] Migrar schema a base de datos (pnpm db:push) - PENDIENTE: Ejecutar manualmente
- [x] Crear procesador de archivo ContratosactivosTIM.xlsx
- [ ] Agregar opción de carga en página "Cargar Archivos"
- [ ] Actualizar lógica de proyección de deuda para usar datos reales de contratos
- [ ] Validar que proyecciones coincidan con información de contratos activos

- [x] Agregar endpoint tRPC para procesar archivo de contratos activos
- [x] Actualizar UI de Cargar Archivos para incluir opción "Contratos Activos"
- [ ] Probar carga de archivo ContratosactivosTIM.xlsx

- [x] BUG: Error "XLSX.readFile is not a function" al cargar archivo de contratos

- [x] BUG: Carga de archivo de contratos resultó en 0 registros exitosos

- [ ] BUG: Error "Unexpected token '<', '<!doctype '... is not valid JSON" al cargar archivos en /upload

- [x] BUG: Resumen de deuda no se despliega después de cargar archivo de contratos

- [x] BUG: Select.Item con valor vacío en Análisis de Contratos
- [x] BUG: Elementos de lista sin key prop en Análisis de Contratos

- [x] BUG: Cliente "Sacar del centro mexico" solo muestra 4 contratos en lugar de 31 contratos activos

- [x] Crear tab "Resumen General por Empresa" con totales globales de TT, TV y TT+TV de todos los contratos

- [x] Agregar modales clickeables a cards de Resumen Global con detalle de contratos por empresa

- [x] Modificar Tabla de Proyección para basarse en contratos activos en lugar de facturas con patrón "X de Y"

- [ ] BUG: Tabla de Proyección no muestra contratos de Tim Transp (TT)

## Módulo de Baja de Contratos Activos
- [ ] Actualizar schema con campos activo, motivoBaja, fechaBaja en tabla contratos
- [ ] Crear tabla auditoriaBajasContratos para trazabilidad
- [ ] Ejecutar migración de base de datos
- [ ] Crear procedimiento backend para validar contrato (existe, activo, pertenece al cliente)
- [ ] Crear procedimiento backend para dar de baja contrato
- [ ] Implementar registro de auditoría en tabla auditoriaBajasContratos
- [ ] Crear nueva pestaña "Dar de Baja Contrato" en Análisis de Contratos
- [ ] Implementar selector de cliente reutilizando lógica existente
- [ ] Agregar campo de número de contrato con validación
- [ ] Crear modal de confirmación con detalles del contrato
- [ ] Implementar lógica de baja (marcar inactivo, eliminar proyecciones)
- [ ] Restringir visibilidad solo a usuarios con rol admin
- [ ] Probar flujo completo de baja de contrato
- [ ] Crear tests para validación y baja de contratos

## Funcionalidad de Dar de Baja Contrato (Admin)
- [x] Actualizar esquema de base de datos con campos de baja (motivoBaja, fechaBaja, usuarioBajaId)
- [x] Crear tabla de auditoría de bajas (auditoriaBajasContratos)
- [x] Implementar función validarContratoParaBaja en backend
- [x] Implementar función darDeBajaContrato en backend
- [x] Crear router tRPC bajasContratos con procedimientos validarContrato y darDeBaja
- [x] Exportar router bajasContratos en appRouter
- [x] Crear tab "Dar de Baja Contrato" en página de Análisis de Contratos (solo admin)
- [x] Implementar UI de selección de cliente y número de contrato
- [x] Implementar modal de confirmación con detalles del contrato
- [x] Probar flujo completo de validación y baja de contrato
- [x] Verificar que contratos inactivos se excluyan de proyecciones
- [ ] Agregar tests unitarios para funcionalidad de baja de contratos

## Bug: Contratos Inactivos Aparecen en Resumen de Deuda
- [x] Verificar estado del contrato 171 en la base de datos
- [x] Revisar función getDeudaTotalCliente() para verificar filtro de contratos activos
- [x] Revisar función getDeudaTotalGrupo() para verificar filtro de contratos activos
- [x] Corregir queries para excluir contratos con activo = false
- [x] Corregir getClientesConContratosActivos() para filtrar contratos activos
- [x] Corregir getGruposConContratosActivos() para filtrar contratos activos
- [x] Corregir getTotalesGlobalesPorEmpresa() para filtrar contratos activos
- [x] Probar que contratos inactivos no aparezcan en Resumen de Deuda
- [x] Verificar que tampoco aparezcan en Resumen Global

## Módulo: Proyección de Contratos Manual

### Fase 1: Schema de Base de Datos
- [x] Crear tabla `contratos_proyeccion` (cabecera de contratos)
- [x] Crear tabla `line_items_contrato` (equipos por contrato)
- [x] Crear tabla `proyeccion_mensual` (pagos proyectados)
- [x] Crear tabla `vendedores` (catálogo de vendedores)
- [x] Agregar relaciones entre tablas
- [x] Ejecutar migraciones con SQL directo

### Fase 2: Routers tRPC y Lógica de Negocio
- [x] Crear router `proyeccionContratos` con procedures CRUD
- [x] Implementar lógica de cálculo para Arrendamiento Puro
- [x] Implementar lógica de cálculo para Arrendamiento Financiero
- [x] Implementar lógica de cálculo para Arrendamiento Crédito Simple
- [x] Implementar cálculo automático de IVA (16%)
- [x] Implementar generación de proyección mensual
- [ ] Implementar cálculo de rentas vencidas vs pendientes
- [x] Agregar validación de permisos (admin para editar/baja)

### Fase 3: Frontend - Gestión de Contratos
- [x] Agregar "Proyección de Contratos" al menú lateral
- [x] Crear página de listado de contratos
- [ ] Crear formulario de captura de contrato nuevo
- [ ] Implementar captura de line items (equipos)
- [ ] Mostrar cálculos automáticos en tiempo real
- [ ] Crear vista de detalle de contrato con proyección
- [ ] Implementar funcionalidad de dar de baja contrato
- [ ] Agregar filtros y búsqueda

### Fase 4: Reportes
- [ ] Crear reporte de proyección por cliente
- [ ] Crear reporte de proyección por grupo de clientes
- [ ] Crear reporte de comisiones por vendedor
- [ ] Agregar exportación a Excel

### Fase 5: Pruebas y Entrega
- [ ] Probar creación de contrato Arrendamiento Puro
- [ ] Probar creación de contrato Arrendamiento Financiero
- [ ] Probar creación de contrato Arrendamiento Crédito Simple
- [ ] Verificar cálculos de proyección mensual
- [ ] Verificar permisos de usuario (admin vs consulta)
- [ ] Probar reportes
- [ ] Guardar checkpoint final

## Formulario de Captura de Contratos Manuales

### Componentes y Funcionalidad
- [x] Crear componente NuevoContratoDialog con Dialog de shadcn/ui
- [x] Implementar campos básicos: número contrato, cliente, vendedor, empresa, tipo, fecha, plazo
- [x] Agregar selección de cliente con búsqueda
- [x] Agregar selección de vendedor con búsqueda
- [x] Implementar sección de line items dinámica (agregar/eliminar equipos)
- [x] Mostrar campos específicos según tipo de arrendamiento
- [x] Implementar cálculos automáticos en tiempo real (IVA, totales)
- [x] Agregar validación de formulario
- [x] Conectar con mutation tRPC para crear contrato
- [x] Mostrar feedback de éxito/error
- [x] Actualizar lista de contratos después de crear

## Página de Detalle de Contrato

### Backend
- [ ] Crear procedure `getContratoDetalle` en proyeccionContratos router
- [ ] Incluir información del contrato, cliente, vendedor
- [ ] Incluir todos los line items del contrato
- [ ] Incluir proyección mensual completa
- [ ] Calcular estado de cada mes (pendiente/vencido) según fecha actual

### Frontend
- [ ] Crear página DetalleContrato.tsx
- [ ] Mostrar información básica del contrato en card
- [ ] Mostrar lista de equipos/line items con sus montos
- [ ] Crear tabla de proyección mensual con columnas: Mes, Fecha, Renta, Estado
- [ ] Aplicar estilos condicionales según estado (pendiente/vencido)
- [ ] Agregar resumen financiero (totales)
- [ ] Conectar navegación desde lista de contratos
- [ ] Agregar ruta en App.tsx

## Agrupación por Grupo de Clientes en Proyección de Contratos

### Backend
- [x] Crear procedure `listByGrupo` en router proyeccionContratos
- [x] Implementar consulta que agrupe contratos por grupo de clientes
- [x] Calcular totales por grupo (número de contratos, proyección total)
- [x] Incluir información del grupo y lista de contratos

### Frontend
- [x] Agregar filtro de agrupación en ProyeccionContratos.tsx (Individual / Por Grupo)
- [x] Crear vista agrupada con cards de grupos
- [x] Mostrar totales por grupo
- [x] Implementar navegación desde grupos a contratos individuales
- [x] Probar funcionalidad completa

## Corrección de Schema y Prueba Completa de Creación de Contratos

### Verificación y Corrección de Schema
- [ ] Verificar estructura de tabla `contratosProyeccion`
- [ ] Verificar estructura de tabla `lineItemsContrato`
- [ ] Verificar estructura de tabla `proyeccionMensualManual`
- [ ] Verificar estructura de tabla `vendedores`
- [ ] Corregir columnas faltantes o con tipo incorrecto
- [ ] Ejecutar migraciones necesarias

### Corrección del Formulario
- [ ] Revisar validación de fecha en NuevoContratoDialog
- [ ] Revisar validación de campos requeridos
- [ ] Corregir manejo de errores en mutation
- [ ] Agregar feedback visual de validación

### Prueba Completa
- [ ] Crear contrato de prueba desde formulario
- [ ] Verificar que se crea en base de datos correctamente
- [ ] Verificar que se crean line items
- [ ] Verificar que se genera proyección mensual
- [ ] Navegar a detalle y verificar visualización
- [ ] Probar vista por grupo de clientes

## Bug: Carga de archivos procesa pero dice "0 exitosos"
- [x] Diagnosticar el problema de carga de archivos
- [x] Revisar parser de Tim Transp para identificar por qué no reconoce registros
- [x] Verificar nombres de columnas esperadas vs archivo real
- [x] Revisar formato de datos (fechas, números, etc.)
- [x] Corregir el problema identificado en el parser (detección automática de columnas)
- [x] Probar la carga de archivos con archivo real
- [x] Investigar por qué los 12 registros procesados no se guardan (0 exitosos)
- [x] Revisar lógica de inserción en el router de carga de archivos
- [x] Identificar validaciones o errores que impiden guardar
- [x] Identificar problema: archivo tiene folios AA pero se seleccionó tipo Tim Transp (AB)
- [ ] Probar carga con tipo de archivo correcto (Tim Value para folios AA)
- [ ] Verificar que el procesamiento funcione correctamente

## Mejora: Mostrar Errores Específicos por Fila en Carga de Archivos

### Backend - Parser
- [x] Mejorar parser para incluir número de fila en cada error
- [x] Agregar detección de tipo de folio incorrecto (AA vs AB)
- [x] Incluir folio en mensaje de error cuando esté disponible
- [x] Devolver advertencias además de errores (ej: tipo de archivo incorrecto)

### Frontend - Interfaz
- [x] Crear componente de lista de errores detallados
- [x] Mostrar número de fila, folio y motivo para cada error
- [x] Agregar sección expandible para errores (scroll para más de 50 errores)
- [x] Mostrar advertencia destacada cuando tipo de archivo no coincide con folios
- [x] Agregar resumen visual (exitosos vs rechazados)
- [x] Usar colores y iconos para diferenciar errores y advertencias

### Pruebas
- [x] Probar con archivo que tiene folios AA en tipo Tim Transp
- [x] Verificar que se muestren todos los errores con detalles
- [x] Verificar que se muestre el contador de errores
- [x] Verificar que los errores incluyan número de fila y folio
- [ ] Verificar que la advertencia de tipo incorrecto se muestre

## Bug CRÍTICO: Importes incorrectos en importación de archivos
- [ ] Diagnosticar por qué los importes se están multiplicando o concatenando incorrectamente
- [ ] Revisar la lógica de lectura de la columna de importes en xlsxProcessor.ts
- [ ] Verificar el tipo de dato de la columna (número vs texto)
- [ ] Revisar si hay alguna transformación incorrecta de los valores
- [ ] Corregir la lógica de lectura de importes
- [ ] Probar con archivo real para verificar que los importes sean correctos
- [ ] Verificar que los importes en la base de datos sean correctos

### Ejemplos de importes incorrectos:
- $20,259,122,692.00 (debería ser ~$100-$200)
- $2,026,130,388.00 (debería ser ~$100-$200)
- $20,260,092,716.00 (debería ser ~$100-$200)

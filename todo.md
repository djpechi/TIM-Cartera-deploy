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

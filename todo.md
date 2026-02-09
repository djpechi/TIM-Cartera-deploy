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

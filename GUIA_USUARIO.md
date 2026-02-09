# Guía de Usuario - Sistema de Automatización de Cartera Vencida

## Introducción

Este sistema permite automatizar la gestión de cartera vencida consolidando información de dos sistemas de facturación (Tim Transp y Tim Value) y determinando estados de pago mediante el cruce con archivos de pendientes.

## Características Principales

- **Carga automática de archivos XLSX** de facturación y pendientes
- **Consolidación** de datos de ambos sistemas de facturación
- **Cálculo automático** de días de atraso e intereses moratorios
- **Dashboard** con métricas clave en tiempo real
- **Reportes consolidados** por cliente y evolución temporal
- **Exportación** de datos a CSV
- **Configuración flexible** de parámetros del sistema

## Estructura de Archivos XLSX

### 1. Facturación Tim Transp (Folios AB)

El archivo debe contener las siguientes columnas:

| Columna | Descripción | Ejemplo |
|---------|-------------|---------|
| Folio | Identificador único que inicia con "AB" | AB12345 |
| Fecha | Fecha de emisión de la factura | 15/01/2025 |
| Cliente | Nombre del cliente | EMPRESA SA DE CV |
| Importe Total | Monto total de la factura | 10,000.00 |
| Descripción | Concepto de la factura | Servicios de transporte |
| Estatus | Estado de la factura | Normal / Cancelada |

### 2. Facturación Tim Value (Folios AA)

El archivo debe contener las siguientes columnas:

| Columna | Descripción | Ejemplo |
|---------|-------------|---------|
| Folio | Identificador único que inicia con "AA" | AA67890 |
| Fecha | Fecha de emisión de la factura | 20/01/2025 |
| Cliente | Nombre del cliente | COMERCIAL XYZ SA |
| Importe Total | Monto total de la factura | 15,000.00 |
| Descripción | Concepto de la factura | Servicios profesionales |
| Estatus | Estado de la factura | Normal / Cancelada |

### 3. Pendientes de Pago

El archivo debe contener las siguientes columnas:

| Columna | Descripción | Ejemplo |
|---------|-------------|---------|
| Folio | Identificador de la factura (AB o AA) | AB12345 |
| Alias | Alias del cliente | EMPRESA |
| Cliente | Nombre completo del cliente | EMPRESA SA DE CV |
| Descripción | Detalle del pendiente | Factura vencida |
| Días Vencido | Número de días de atraso | 30 |
| Saldo | Monto pendiente de pago | 10,000.00 |

## Flujo de Trabajo

### 1. Carga de Archivos

1. Accede a la sección **"Cargar Archivos"** desde el menú lateral
2. Selecciona el tipo de archivo que vas a cargar:
   - Facturación Tim Transp
   - Facturación Tim Value
   - Pendientes de Pago
3. Haz clic en **"Seleccionar Archivo"** y elige el archivo XLSX
4. Presiona **"Procesar Archivo"**
5. El sistema validará y procesará el archivo automáticamente
6. Verás un resumen del procesamiento con:
   - Registros procesados
   - Registros exitosos
   - Errores encontrados (si los hay)

### 2. Determinación de Estado de Pago

El sistema determina automáticamente el estado de pago de cada factura:

- **PAGADO**: Si el folio NO aparece en el archivo de "Pendientes de Pago"
- **PENDIENTE**: Si el folio SÍ aparece en el archivo de "Pendientes de Pago"

**Importante**: Para actualizar los estados de pago, primero carga los archivos de facturación y luego el archivo de pendientes.

### 3. Cálculo de Intereses Moratorios

El sistema calcula automáticamente los intereses moratorios usando la fórmula:

```
Intereses = Saldo × (Tasa / 100) × (Días Atraso / 30)
```

Donde:
- **Saldo**: Importe total de la factura
- **Tasa**: Tasa de interés mensual configurada (por defecto 1.5%)
- **Días Atraso**: Días transcurridos desde la fecha de vencimiento

**Ejemplo**:
- Saldo: $10,000.00
- Tasa: 1.5% mensual
- Días de atraso: 30 días
- Intereses = 10,000 × (1.5 / 100) × (30 / 30) = $150.00
- Total con intereses = $10,150.00

### 4. Dashboard

El dashboard muestra métricas clave:

- **Total Cartera Vencida**: Suma de todos los saldos pendientes con intereses
- **Clientes con Atraso**: Número de clientes con pagos vencidos
- **Facturas Pendientes**: Total de facturas sin pagar
- **Últimas Cargas**: Historial de archivos procesados

También incluye:
- Top 5 facturas con mayor atraso
- Historial de cargas recientes
- Accesos rápidos a funciones principales

### 5. Consulta de Facturas

En la sección **"Facturas"** puedes:

- Ver listado completo de todas las facturas
- Filtrar por:
  - Folio o nombre de cliente (búsqueda)
  - Estado de pago (Pendiente / Pagado)
  - Sistema (Tim Transp / Tim Value)
- Ver detalles de cada factura:
  - Folio
  - Sistema de origen
  - Cliente
  - Fecha de emisión
  - Importe original
  - Días de atraso
  - Total con intereses
  - Estado de pago
- Exportar resultados a CSV

### 6. Reportes

La sección **"Reportes"** ofrece:

#### Cartera Vencida por Cliente
- Resumen consolidado por cliente
- Número de facturas pendientes
- Total de saldo
- Total de intereses moratorios
- Total con intereses
- Exportación a CSV

#### Evolución Temporal
- Análisis mensual de los últimos 6 meses
- Total facturado por mes
- Total pendiente
- Total pagado
- Porcentaje de cobranza
- Exportación a CSV

### 7. Configuración

En **"Configuración"** puedes ajustar:

#### Tasa de Interés Moratorio Mensual
- Porcentaje que se aplicará sobre el saldo vencido
- Por defecto: 1.5%
- Ejemplo: 1.5% mensual

#### Días de Gracia
- Número de días después del vencimiento antes de empezar a calcular intereses
- Por defecto: 0 días
- Útil si tienes políticas de gracia con clientes

## Recomendaciones de Uso

### Orden de Carga de Archivos

Para mejores resultados, sigue este orden:

1. **Primero**: Carga los archivos de facturación (Tim Transp y Tim Value)
2. **Después**: Carga el archivo de Pendientes de Pago

Esto permite que el sistema actualice correctamente los estados de pago.

### Frecuencia de Actualización

Se recomienda actualizar los archivos:

- **Facturación**: Cada vez que haya nuevas facturas emitidas
- **Pendientes**: Diariamente o semanalmente para mantener estados actualizados

### Validación de Datos

Antes de cargar archivos, verifica:

- ✅ Los folios tengan el prefijo correcto (AB o AA)
- ✅ Las fechas estén en formato válido
- ✅ Los importes sean numéricos
- ✅ Los nombres de clientes sean consistentes
- ✅ No haya filas vacías o incompletas

### Manejo de Errores

Si el sistema reporta errores durante la carga:

1. Revisa el detalle de errores en el resultado del procesamiento
2. Corrige los datos en el archivo Excel original
3. Vuelve a cargar el archivo

Los errores comunes incluyen:
- Datos incompletos (falta folio, cliente o importe)
- Formatos de fecha incorrectos
- Folios duplicados
- Valores no numéricos en campos de importe

## Exportación de Datos

El sistema permite exportar datos a CSV desde:

- **Facturas**: Listado completo con filtros aplicados
- **Cartera Vencida**: Resumen por cliente
- **Evolución Temporal**: Análisis mensual

Los archivos CSV pueden abrirse en Excel para análisis adicional.

## Soporte

Para dudas o problemas con el sistema, contacta al administrador del sistema.

## Notas Importantes

- El sistema NO modifica los archivos originales
- Los datos se almacenan de forma segura en la base de datos
- Se mantiene un historial completo de todas las cargas realizadas
- Los cálculos de intereses se actualizan automáticamente cada vez que se carga un archivo
- Las facturas canceladas NO se consideran en los cálculos de cartera vencida

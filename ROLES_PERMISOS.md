# Roles y Permisos del Sistema

## Resumen

El sistema de automatización de cartera vencida implementa un sistema de control de acceso basado en roles (RBAC - Role-Based Access Control) con tres niveles de permisos: **Administrador**, **Operador** y **Consulta**.

## Roles Disponibles

### 1. Administrador (admin)

**Descripción**: Acceso completo al sistema con capacidades de gestión de usuarios y configuración avanzada.

**Permisos**:
- ✅ Ver dashboard y métricas
- ✅ Cargar archivos XLSX (Tim Transp, Tim Value, Pendientes)
- ✅ Ver y gestionar facturas
- ✅ Generar y exportar reportes
- ✅ Gestionar clientes y grupos
- ✅ Modificar configuración del sistema
- ✅ **Administrar usuarios** (ver, cambiar roles, activar/desactivar)
- ✅ Acceder a logs de auditoría
- ✅ Configurar parámetros del sistema (tasas, días de gracia)

**Casos de uso**:
- Gerentes de cobranza
- Administradores del sistema
- Personal de TI

**Restricciones**:
- No puede cambiar su propio rol
- No puede desactivar su propia cuenta

---

### 2. Operador (operador)

**Descripción**: Acceso operativo para gestión diaria de cartera vencida sin capacidades administrativas.

**Permisos**:
- ✅ Ver dashboard y métricas
- ✅ Cargar archivos XLSX (Tim Transp, Tim Value, Pendientes)
- ✅ Ver y gestionar facturas
- ✅ Generar y exportar reportes
- ✅ Gestionar clientes y grupos
- ❌ Modificar configuración del sistema
- ❌ Administrar usuarios
- ❌ Acceder a logs de auditoría

**Casos de uso**:
- Personal de cobranza
- Analistas de crédito
- Ejecutivos de cuenta

**Restricciones**:
- No puede acceder al módulo de administración de usuarios
- No puede modificar parámetros del sistema

---

### 3. Consulta (consulta)

**Descripción**: Acceso de solo lectura para visualización de información sin capacidad de modificación.

**Permisos**:
- ✅ Ver dashboard y métricas
- ❌ Cargar archivos XLSX
- ✅ Ver facturas (solo lectura)
- ✅ Ver reportes
- ✅ Ver clientes y grupos (solo lectura)
- ❌ Modificar configuración del sistema
- ❌ Administrar usuarios
- ❌ Acceder a logs de auditoría

**Casos de uso**:
- Directores y gerentes (solo supervisión)
- Auditores externos
- Personal de finanzas (consulta)

**Restricciones**:
- No puede realizar ninguna operación de escritura
- No puede cargar archivos
- No puede modificar datos

---

## Matriz de Permisos

| Funcionalidad | Administrador | Operador | Consulta |
|--------------|---------------|----------|----------|
| Ver Dashboard | ✅ | ✅ | ✅ |
| Cargar Archivos XLSX | ✅ | ✅ | ❌ |
| Ver Facturas | ✅ | ✅ | ✅ |
| Editar Facturas | ✅ | ✅ | ❌ |
| Generar Reportes | ✅ | ✅ | ✅ |
| Exportar Reportes | ✅ | ✅ | ✅ |
| Gestionar Clientes | ✅ | ✅ | ❌ |
| Ver Clientes | ✅ | ✅ | ✅ |
| Configuración del Sistema | ✅ | ❌ | ❌ |
| Administrar Usuarios | ✅ | ❌ | ❌ |
| Ver Logs de Auditoría | ✅ | ❌ | ❌ |
| Cambiar Roles | ✅ | ❌ | ❌ |
| Activar/Desactivar Usuarios | ✅ | ❌ | ❌ |

---

## Asignación de Roles

### Rol por Defecto

Todos los nuevos usuarios que ingresan al sistema reciben automáticamente el rol de **Consulta**. Un administrador debe cambiar manualmente el rol si se requiere mayor acceso.

### Cambio de Rol

Solo los **Administradores** pueden cambiar el rol de un usuario:

1. Acceder al módulo "Usuarios" en el menú lateral
2. Buscar el usuario en la lista
3. Hacer clic en "Cambiar Rol"
4. Seleccionar el nuevo rol:
   - **Administrador** - Acceso completo
   - **Operador** - Gestión de cartera
   - **Consulta** - Solo lectura
5. Confirmar el cambio

**Restricciones**:
- Un administrador no puede cambiar su propio rol
- Los cambios de rol se registran en el log de auditoría

---

## Activación y Desactivación de Cuentas

### Desactivar Usuario

Los administradores pueden desactivar cuentas de usuario sin eliminarlas:

1. Acceder al módulo "Usuarios"
2. Buscar el usuario en la lista
3. Hacer clic en "Desactivar"
4. Confirmar la acción

**Efectos**:
- El usuario no podrá iniciar sesión
- Las sesiones activas se invalidan
- Los datos del usuario se conservan
- La acción se registra en auditoría

### Reactivar Usuario

Para reactivar una cuenta desactivada:

1. Filtrar por "Inactivos" en el módulo de Usuarios
2. Seleccionar el usuario
3. Hacer clic en "Activar"
4. Confirmar la acción

**Restricciones**:
- Un administrador no puede desactivar su propia cuenta
- Solo los administradores pueden activar/desactivar cuentas

---

## Auditoría y Trazabilidad

Todas las acciones administrativas se registran automáticamente en el sistema de auditoría:

### Eventos Registrados

- `update_user_role`: Cambio de rol de usuario
- `activate_user`: Activación de cuenta
- `deactivate_user`: Desactivación de cuenta

### Información Capturada

Para cada evento se registra:
- **Usuario que realiza la acción**: ID y correo del administrador
- **Usuario afectado**: ID del usuario modificado
- **Acción realizada**: Tipo de operación
- **Detalles**: Información específica (nuevo rol, estado, etc.)
- **Fecha y hora**: Timestamp preciso de la operación
- **Dirección IP**: IP desde donde se realizó la acción (si está disponible)

---

## Implementación Técnica

### Backend

**Middleware de Autorización**:
```typescript
// server/adminMiddleware.ts
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Solo los administradores pueden realizar esta acción',
    });
  }
  return next({ ctx });
});
```

**Endpoints Protegidos**:
- `admin.users.list` - Listar usuarios (solo admin)
- `admin.users.stats` - Estadísticas de usuarios (solo admin)
- `admin.users.updateRole` - Cambiar rol (solo admin)
- `admin.users.updateStatus` - Activar/desactivar (solo admin)

### Frontend

**Menú Condicional**:
```typescript
// client/src/components/DashboardLayout.tsx
const getMenuItems = (userRole?: string) => {
  const baseItems = [...];
  
  if (userRole === 'admin') {
    baseItems.push({ icon: Shield, label: "Usuarios", path: "/usuarios" });
  }
  
  return baseItems;
};
```

**Protección de Rutas**:
```typescript
// client/src/pages/Usuarios.tsx
if (user?.role !== 'admin') {
  return <AccessDeniedMessage />;
}
```

---

## Seguridad

### Validación en Múltiples Capas

1. **Backend**: Validación principal en el servidor (no puede ser evadida)
2. **Frontend**: Validación adicional para mejor UX
3. **Base de Datos**: Restricciones a nivel de esquema

### Prevención de Escalación de Privilegios

- Los roles se validan en cada petición
- No se permite auto-modificación de roles
- Los cambios de rol requieren autenticación de administrador
- Todas las operaciones sensibles se auditan

### Estado de Cuenta

El campo `activo` en la tabla de usuarios controla el acceso:
- `true`: Usuario puede acceder al sistema
- `false`: Usuario no puede iniciar sesión

La validación del estado activo se realiza durante la autenticación.

---

## Mejores Prácticas

### Para Administradores

1. **Principio de mínimo privilegio**: Asigna el rol mínimo necesario
2. **Revisión periódica**: Audita los roles asignados regularmente
3. **Desactivación inmediata**: Desactiva cuentas de usuarios que ya no requieren acceso
4. **Documentación**: Mantén registro de por qué se asignó cada rol

### Para Operadores

1. **No compartir credenciales**: Cada usuario debe tener su propia cuenta
2. **Reportar anomalías**: Notificar al administrador sobre accesos sospechosos
3. **Uso responsable**: Utilizar el sistema solo para funciones autorizadas

### Para Usuarios de Consulta

1. **Acceso de solo lectura**: No intentar modificar datos
2. **Exportación responsable**: Proteger los reportes exportados
3. **Solicitud de permisos**: Contactar al administrador si se requiere mayor acceso

---

## Preguntas Frecuentes

### ¿Cómo sé qué rol tengo asignado?

Tu rol se muestra en la esquina inferior izquierda del menú lateral, junto a tu nombre y correo electrónico.

### ¿Puedo tener múltiples roles?

No. Cada usuario tiene un único rol asignado. Si necesitas permisos de múltiples roles, contacta al administrador.

### ¿Qué pasa si intento acceder a una función sin permisos?

Verás un mensaje de "Acceso Restringido" indicando que no tienes los permisos necesarios.

### ¿Los cambios de rol son inmediatos?

Sí. Los cambios de rol se aplican inmediatamente. Es posible que necesites recargar la página para ver los cambios reflejados en el menú.

### ¿Se pueden recuperar cuentas desactivadas?

Sí. Un administrador puede reactivar cualquier cuenta desactivada. Los datos del usuario se conservan intactos.

### ¿Quién es el primer administrador?

El propietario del sistema (identificado por `OWNER_OPEN_ID`) recibe automáticamente el rol de administrador al iniciar sesión por primera vez.

---

## Soporte

Para solicitudes de cambio de rol, activación de cuentas o problemas relacionados con permisos, contacta al administrador del sistema.

---

**Última actualización**: Febrero 2026  
**Versión**: 1.0

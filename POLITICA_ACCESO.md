# Política de Control de Acceso

## Resumen

El sistema de automatización de cartera vencida implementa un control de acceso estricto basado en dominios de correo electrónico. Solo usuarios con correos corporativos autorizados pueden acceder al sistema.

## Dominios Autorizados

El acceso al sistema está restringido únicamente a usuarios con correos electrónicos de los siguientes dominios:

- **@leasingtim.mx** - Personal de Leasing TIM
- **@bpads.mx** - Personal de BPADS

## Funcionamiento

### Proceso de Autenticación

1. El usuario inicia sesión a través del sistema de autenticación OAuth de Manus
2. El sistema valida la identidad del usuario
3. **Validación de dominio**: El sistema extrae el dominio del correo electrónico del usuario
4. Si el dominio está en la lista de dominios autorizados, se permite el acceso
5. Si el dominio NO está autorizado, se deniega el acceso y se muestra una página informativa

### Validación en Backend

La validación se realiza en el servidor (backend) para garantizar la seguridad:

- **Ubicación**: `server/_core/context.ts` y `server/domainValidator.ts`
- **Momento**: Durante la creación del contexto de cada petición
- **Comportamiento**: Si el usuario tiene un dominio no autorizado, el contexto lo trata como no autenticado

```typescript
// Ejemplo de validación
const accessValidation = validateUserAccess(authenticatedUser);

if (accessValidation.allowed) {
  // Usuario autorizado - permitir acceso
  user = authenticatedUser;
} else {
  // Usuario NO autorizado - denegar acceso
  console.warn(`[Access Denied] User ${authenticatedUser.email} - ${accessValidation.reason}`);
  user = null;
}
```

### Validación en Frontend

El frontend también valida el dominio para proporcionar retroalimentación inmediata:

- **Hook personalizado**: `useDomainValidation()` en `client/src/hooks/useDomainValidation.ts`
- **Redirección automática**: Si se detecta un dominio no autorizado, el usuario es redirigido a `/access-denied`
- **Página informativa**: Explica por qué se denegó el acceso y qué dominios están autorizados

## Mensajes de Error

### Acceso Denegado

Cuando un usuario intenta acceder con un dominio no autorizado, verá:

- **Título**: "Acceso Denegado"
- **Mensaje**: Explicación clara de que solo usuarios autorizados pueden acceder
- **Lista de dominios**: Muestra los dominios permitidos (@leasingtim.mx, @bpads.mx)
- **Acciones**: Botón para cerrar sesión e intentar con otra cuenta

### Mensajes en Login

La pantalla de inicio de sesión incluye un mensaje informativo:

> "Accede al sistema de gestión de cartera vencida. Solo usuarios con correos @leasingtim.mx o @bpads.mx pueden ingresar."

## Casos de Uso

### ✅ Acceso Permitido

- `usuario@leasingtim.mx` → **Acceso concedido**
- `admin@bpads.mx` → **Acceso concedido**
- `USUARIO@LEASINGTIM.MX` → **Acceso concedido** (no sensible a mayúsculas)

### ❌ Acceso Denegado

- `usuario@gmail.com` → **Acceso denegado** (dominio no autorizado)
- `usuario@outlook.com` → **Acceso denegado** (dominio no autorizado)
- `usuario@empresa.com` → **Acceso denegado** (dominio no autorizado)
- Sin correo electrónico → **Acceso denegado** (correo requerido)

## Seguridad

### Validación en Múltiples Capas

1. **Backend (servidor)**: Validación principal que no puede ser evadida
2. **Frontend (cliente)**: Validación adicional para mejor experiencia de usuario
3. **OAuth**: Autenticación base proporcionada por Manus

### Registro de Accesos Denegados

Todos los intentos de acceso denegados se registran en los logs del servidor:

```
[Access Denied] User usuario@gmail.com - El dominio @gmail.com no está autorizado para acceder al sistema
```

Esto permite:
- Monitorear intentos de acceso no autorizado
- Auditar el uso del sistema
- Detectar posibles problemas de configuración

## Agregar Nuevos Dominios

Si necesitas autorizar un nuevo dominio de correo electrónico:

1. Edita el archivo `server/domainValidator.ts`
2. Agrega el nuevo dominio al array `ALLOWED_DOMAINS`:

```typescript
const ALLOWED_DOMAINS = [
  'leasingtim.mx',
  'bpads.mx',
  'nuevodominio.com', // ← Agregar aquí
];
```

3. Actualiza también el hook del frontend en `client/src/hooks/useDomainValidation.ts`
4. Actualiza esta documentación
5. Reinicia el servidor
6. Ejecuta los tests para verificar que todo funcione correctamente

## Tests

El sistema incluye tests unitarios completos para la validación de dominios:

- **Ubicación**: `server/domainValidator.test.ts`
- **Cobertura**: 18 tests que validan todos los casos de uso
- **Ejecución**: `pnpm test`

Los tests verifican:
- ✅ Dominios autorizados son aceptados
- ✅ Dominios no autorizados son rechazados
- ✅ Validación no sensible a mayúsculas
- ✅ Manejo correcto de emails inválidos
- ✅ Manejo de valores null/undefined
- ✅ Extracción correcta de dominios

## Preguntas Frecuentes

### ¿Qué pasa si un usuario cambia de correo?

Si un usuario autorizado cambia su correo a un dominio no autorizado, perderá acceso al sistema en su próximo inicio de sesión.

### ¿Pueden los usuarios con dominios no autorizados ver alguna información?

No. La validación se realiza en el backend antes de que cualquier dato sea accesible. Los usuarios no autorizados solo ven la página de acceso denegado.

### ¿El sistema guarda información de usuarios no autorizados?

No. Los usuarios con dominios no autorizados no se registran en la base de datos. Solo se registra un mensaje en los logs del servidor.

### ¿Cómo sé si mi dominio está autorizado?

La pantalla de login muestra claramente los dominios autorizados. Si intentas acceder con un dominio no autorizado, verás un mensaje explicativo.

## Soporte

Para solicitudes de acceso o problemas relacionados con la autenticación, contacta al administrador del sistema.

---

**Última actualización**: Febrero 2026  
**Versión**: 1.0

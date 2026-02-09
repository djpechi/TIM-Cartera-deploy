/**
 * Middleware de validación de dominios de correo electrónico
 * Solo permite acceso a usuarios con correos de dominios autorizados
 */

const ALLOWED_DOMAINS = [
  'leasingtim.mx',
  'bpads.mx',
];

/**
 * Valida si un correo electrónico pertenece a un dominio permitido
 */
export function isEmailDomainAllowed(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }

  const emailLower = email.toLowerCase().trim();
  const domain = emailLower.split('@')[1];

  if (!domain) {
    return false;
  }

  return ALLOWED_DOMAINS.includes(domain);
}

/**
 * Obtiene el dominio de un correo electrónico
 */
export function getEmailDomain(email: string | null | undefined): string | null {
  if (!email) {
    return null;
  }

  const emailLower = email.toLowerCase().trim();
  const parts = emailLower.split('@');
  
  // Validar que tenga exactamente 2 partes y que ambas tengan contenido
  if (parts.length === 2 && parts[0] && parts[1]) {
    return parts[1];
  }
  
  return null;
}

/**
 * Obtiene la lista de dominios permitidos
 */
export function getAllowedDomains(): string[] {
  return [...ALLOWED_DOMAINS];
}

/**
 * Valida si un usuario tiene acceso al sistema
 */
export function validateUserAccess(user: { email?: string | null }): {
  allowed: boolean;
  reason?: string;
} {
  if (!user.email) {
    return {
      allowed: false,
      reason: 'No se proporcionó correo electrónico',
    };
  }

  const domain = getEmailDomain(user.email);
  
  if (!domain) {
    return {
      allowed: false,
      reason: 'Formato de correo electrónico inválido',
    };
  }

  if (!ALLOWED_DOMAINS.includes(domain)) {
    return {
      allowed: false,
      reason: `El dominio @${domain} no está autorizado para acceder al sistema`,
    };
  }

  return {
    allowed: true,
  };
}

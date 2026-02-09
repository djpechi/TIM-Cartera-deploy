import { useAuth } from "@/_core/hooks/useAuth";
import { useMemo } from "react";

const ALLOWED_DOMAINS = ['leasingtim.mx', 'bpads.mx'];

export function useDomainValidation() {
  const { user, loading } = useAuth();

  const validation = useMemo(() => {
    if (loading) {
      return {
        isValidDomain: false,
        isDenied: false,
        loading: true,
        domain: null,
        reason: null,
      };
    }

    if (!user || !user.email) {
      return {
        isValidDomain: false,
        isDenied: false,
        loading: false,
        domain: null,
        reason: null,
      };
    }

    const email = user.email.toLowerCase().trim();
    const domain = email.split('@')[1];

    if (!domain) {
      return {
        isValidDomain: false,
        isDenied: true,
        loading: false,
        domain: null,
        reason: 'Formato de correo electrónico inválido',
      };
    }

    const isValid = ALLOWED_DOMAINS.includes(domain);

    return {
      isValidDomain: isValid,
      isDenied: !isValid,
      loading: false,
      domain,
      reason: isValid ? null : `El dominio @${domain} no está autorizado`,
    };
  }, [user, loading]);

  return validation;
}

export function getAllowedDomains(): string[] {
  return [...ALLOWED_DOMAINS];
}

import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { validateUserAccess } from "../domainValidator";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    const authenticatedUser = await sdk.authenticateRequest(opts.req);
    
    // Validar que el usuario tenga un dominio de correo permitido
    if (authenticatedUser) {
      const accessValidation = validateUserAccess(authenticatedUser);
      
      if (accessValidation.allowed) {
        user = authenticatedUser;
      } else {
        // Usuario autenticado pero sin dominio permitido
        console.warn(`[Access Denied] User ${authenticatedUser.email} - ${accessValidation.reason}`);
        user = null;
      }
    }
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}

import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "./_core/trpc";

/**
 * Middleware que verifica que el usuario sea administrador
 */
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Solo los administradores pueden realizar esta acción',
    });
  }

  return next({ ctx });
});

/**
 * Middleware que verifica que el usuario esté activo
 */
export const activeProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.user.activo) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Tu cuenta ha sido desactivada. Contacta al administrador.',
    });
  }

  return next({ ctx });
});

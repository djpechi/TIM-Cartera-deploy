import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@leasingtim.mx",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    activo: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function createOperadorContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "operador-user",
    email: "operador@leasingtim.mx",
    name: "Operador User",
    loginMethod: "manus",
    role: "operador",
    activo: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("admin.users", () => {
  describe("list", () => {
    it("should allow admin to list all users", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.admin.users.list();
      
      expect(Array.isArray(result)).toBe(true);
    });

    it("should deny non-admin access to list users", async () => {
      const ctx = createOperadorContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.admin.users.list()).rejects.toThrow("Solo los administradores pueden realizar esta acción");
    });
  });

  describe("stats", () => {
    it("should return user statistics for admin", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.admin.users.stats();
      
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("activos");
      expect(result).toHaveProperty("inactivos");
      expect(result).toHaveProperty("porRol");
      expect(result.porRol).toHaveProperty("admin");
      expect(result.porRol).toHaveProperty("operador");
      expect(result.porRol).toHaveProperty("consulta");
    });

    it("should deny non-admin access to stats", async () => {
      const ctx = createOperadorContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.admin.users.stats()).rejects.toThrow("Solo los administradores pueden realizar esta acción");
    });
  });

  describe("updateRole", () => {
    it("should prevent admin from changing their own role", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.admin.users.updateRole({
          userId: 1, // Same as admin's ID
          newRole: "operador",
        })
      ).rejects.toThrow("No puedes cambiar tu propio rol");
    });

    it("should deny non-admin from updating roles", async () => {
      const ctx = createOperadorContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.admin.users.updateRole({
          userId: 3,
          newRole: "admin",
        })
      ).rejects.toThrow("Solo los administradores pueden realizar esta acción");
    });
  });

  describe("updateStatus", () => {
    it("should prevent admin from deactivating their own account", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.admin.users.updateStatus({
          userId: 1, // Same as admin's ID
          activo: false,
        })
      ).rejects.toThrow("No puedes desactivar tu propia cuenta");
    });

    it("should deny non-admin from updating user status", async () => {
      const ctx = createOperadorContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.admin.users.updateStatus({
          userId: 3,
          activo: false,
        })
      ).rejects.toThrow("Solo los administradores pueden realizar esta acción");
    });
  });
});

describe("adminProcedure middleware", () => {
  it("should allow admin access", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Should not throw
    await expect(caller.admin.users.list()).resolves.toBeDefined();
  });

  it("should deny operador access", async () => {
    const ctx = createOperadorContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.admin.users.list()).rejects.toThrow("Solo los administradores pueden realizar esta acción");
  });

  it("should deny consulta access", async () => {
    const user: AuthenticatedUser = {
      id: 3,
      openId: "consulta-user",
      email: "consulta@leasingtim.mx",
      name: "Consulta User",
      loginMethod: "manus",
      role: "consulta",
      activo: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };

    const ctx: TrpcContext = {
      user,
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);

    await expect(caller.admin.users.list()).rejects.toThrow("Solo los administradores pueden realizar esta acción");
  });
});

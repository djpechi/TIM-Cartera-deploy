import { describe, expect, it } from "vitest";
import { calcularAtrasoEIntereses } from "./xlsxProcessor";

describe("xlsxProcessor", () => {
  describe("calcularAtrasoEIntereses", () => {
    it("should return zero values when no vencimiento date is provided", () => {
      const result = calcularAtrasoEIntereses(null, 1000, 1.5);
      
      expect(result.diasAtraso).toBe(0);
      expect(result.interesesMoratorios).toBe(0);
      expect(result.totalConIntereses).toBe(1000);
    });

    it("should return zero values when fecha vencimiento is in the future", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      
      const result = calcularAtrasoEIntereses(futureDate, 1000, 1.5);
      
      expect(result.diasAtraso).toBe(0);
      expect(result.interesesMoratorios).toBe(0);
      expect(result.totalConIntereses).toBe(1000);
    });

    it("should calculate correct interest for 30 days overdue", () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 30);
      
      const result = calcularAtrasoEIntereses(pastDate, 1000, 1.5);
      
      expect(result.diasAtraso).toBe(30);
      // 1000 * (1.5 / 100) * (30 / 30) = 15
      expect(result.interesesMoratorios).toBe(15);
      expect(result.totalConIntereses).toBe(1015);
    });

    it("should calculate correct interest for 60 days overdue", () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 60);
      
      const result = calcularAtrasoEIntereses(pastDate, 1000, 1.5);
      
      expect(result.diasAtraso).toBe(60);
      // 1000 * (1.5 / 100) * (60 / 30) = 30
      expect(result.interesesMoratorios).toBe(30);
      expect(result.totalConIntereses).toBe(1030);
    });

    it("should calculate correct interest for 15 days overdue (half month)", () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 15);
      
      const result = calcularAtrasoEIntereses(pastDate, 1000, 1.5);
      
      expect(result.diasAtraso).toBe(15);
      // 1000 * (1.5 / 100) * (15 / 30) = 7.5
      expect(result.interesesMoratorios).toBe(7.5);
      expect(result.totalConIntereses).toBe(1007.5);
    });

    it("should handle different interest rates correctly", () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 30);
      
      const result = calcularAtrasoEIntereses(pastDate, 1000, 2.0);
      
      expect(result.diasAtraso).toBe(30);
      // 1000 * (2.0 / 100) * (30 / 30) = 20
      expect(result.interesesMoratorios).toBe(20);
      expect(result.totalConIntereses).toBe(1020);
    });

    it("should handle large amounts correctly", () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 30);
      
      const result = calcularAtrasoEIntereses(pastDate, 100000, 1.5);
      
      expect(result.diasAtraso).toBe(30);
      // 100000 * (1.5 / 100) * (30 / 30) = 1500
      expect(result.interesesMoratorios).toBe(1500);
      expect(result.totalConIntereses).toBe(101500);
    });

    it("should round interest to 2 decimal places", () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 17);
      
      const result = calcularAtrasoEIntereses(pastDate, 1234.56, 1.5);
      
      expect(result.diasAtraso).toBe(17);
      // 1234.56 * (1.5 / 100) * (17 / 30) = 10.49376
      expect(result.interesesMoratorios).toBe(10.49);
      expect(result.totalConIntereses).toBe(1245.05);
    });
  });
});

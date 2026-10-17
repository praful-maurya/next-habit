import { describe, expect, it } from "vitest";
import { dateSchema, foodLogSchema } from "@/lib/validation";

describe("request validation", () => {
  it("accepts valid local calendar dates and rejects normalized invalid dates", () => {
    expect(dateSchema.safeParse("2024-02-29").success).toBe(true);
    expect(dateSchema.safeParse("2026-02-29").success).toBe(false);
    expect(dateSchema.safeParse("2026-13-01").success).toBe(false);
  });

  it("keeps per-100-g and per-serving units distinct", () => {
    const common = {
      date: "2026-10-17",
      foodName: "Paneer",
      meal: "Lunch",
      quantity: 150,
      caloriesPerBasis: 265,
      proteinPerBasis: 18,
    };
    expect(foodLogSchema.safeParse({ ...common, basis: "100g", unit: "g" }).success).toBe(true);
    expect(foodLogSchema.safeParse({ ...common, basis: "100g", unit: "cup" }).success).toBe(false);
    expect(foodLogSchema.safeParse({ ...common, basis: "serving", unit: "serving" }).success).toBe(true);
  });
});

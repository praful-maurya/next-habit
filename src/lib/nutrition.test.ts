import { describe, expect, it } from "vitest";
import { calculateNutrition, sumNutrition } from "@/lib/nutrition";

describe("nutrition calculations", () => {
  it("scales per-100-g values to the eaten amount", () => {
    expect(calculateNutrition(150, "100g", 265, 18)).toEqual({
      calories: 397.5,
      protein: 27,
    });
  });

  it("scales per-serving values by number of servings", () => {
    expect(calculateNutrition(1.5, "serving", 210, 12.4)).toEqual({
      calories: 315,
      protein: 18.6,
    });
  });

  it("rounds calculated values to two decimal places", () => {
    expect(calculateNutrition(33.33, "100g", 99.99, 1.01)).toEqual({
      calories: 33.33,
      protein: 0.34,
    });
  });

  it("rejects non-finite nutrition values and negative quantities", () => {
    expect(() => calculateNutrition(-1, "100g", 100, 2)).toThrow();
    expect(() => calculateNutrition(2, "serving", Number.NaN, 2)).toThrow();
  });

  it("sums saved entries without treating absent days as zero entries", () => {
    expect(sumNutrition([{ calories: 100.25, protein: 5 }, { calories: 50.5, protein: 2.5 }])).toEqual({
      calories: 150.75,
      protein: 7.5,
    });
    expect(sumNutrition([])).toEqual({ calories: 0, protein: 0 });
  });
});

export type NutritionBasis = "100g" | "serving";

export function calculateNutrition(
  quantity: number,
  basis: NutritionBasis,
  caloriesPerBasis: number,
  proteinPerBasis: number,
) {
  if (![quantity, caloriesPerBasis, proteinPerBasis].every(Number.isFinite) || quantity < 0) {
    throw new Error("Nutrition values must be finite numbers and quantity cannot be negative.");
  }
  const multiplier = basis === "100g" ? quantity / 100 : quantity;
  const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
  return {
    calories: round(caloriesPerBasis * multiplier),
    protein: round(proteinPerBasis * multiplier),
  };
}

export function sumNutrition(entries: Array<{ calories: number; protein: number }>) {
  return entries.reduce(
    (total, entry) => ({
      calories: total.calories + entry.calories,
      protein: total.protein + entry.protein,
    }),
    { calories: 0, protein: 0 },
  );
}

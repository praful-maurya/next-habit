import { z } from "zod";

export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Enter a real calendar date.");

export const completionSchema = z.object({
  habitId: z.string().min(1),
  date: dateSchema,
  completed: z.boolean(),
  requestId: z.string().uuid(),
});

export const foodLogSchema = z.object({
  date: dateSchema,
  foodName: z.string().trim().min(1).max(120),
  brand: z.string().trim().max(120).optional().default(""),
  meal: z.enum(["Breakfast", "Morning snack", "Lunch", "Evening snack", "Dinner", "Other"]),
  quantity: z.number().positive().max(100000),
  unit: z.string().trim().min(1).max(30),
  basis: z.enum(["100g", "serving"]),
  caloriesPerBasis: z.number().min(0).max(10000),
  proteinPerBasis: z.number().min(0).max(1000),
  notes: z.string().trim().max(500).optional().default(""),
  foodId: z.string().optional(),
  saveFood: z.boolean().optional().default(false),
}).refine(
  (entry) =>
    (entry.basis === "100g" && entry.unit === "g") ||
    (entry.basis === "serving" && ["serving", "piece", "slice", "cup", "bowl", "glass", "scoop"].includes(entry.unit)),
  "Choose grams for per-100-g nutrition or servings for per-serving nutrition.",
).refine((entry) => !entry.saveFood || !entry.foodId, "Choose a custom food to save it for reuse.");

export const journalSchema = z.object({
  date: dateSchema,
  morning: z.record(z.string(), z.string().max(2000)),
  evening: z.record(z.string(), z.string().max(2000)),
  freeWrite: z.string().max(10000),
  mood: z.string().max(40),
  energy: z.number().int().min(1).max(5).nullable(),
});

export const targetSchema = z.object({
  calories: z.number().int().min(0).max(10000),
  protein: z.number().min(0).max(1000),
});

export const redemptionSchema = z.object({
  rewardId: z.string().min(1),
  requestId: z.string().uuid(),
});

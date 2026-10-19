import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { authenticateApiRequest } from "@/lib/auth/app-user";
import { dateFromString } from "@/lib/dates";
import { calculateNutrition } from "@/lib/nutrition";
import { prisma } from "@/lib/prisma";
import { foodLogSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const authentication = await authenticateApiRequest();
  if (!authentication.authenticated) return authentication.response;

  const payload = foodLogSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) return NextResponse.json({ error: "Check the food details and try again." }, { status: 400 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Configure DATABASE_URL to save changes." }, { status: 503 });

  try {
    const user = authentication.user;
    const entry = payload.data;
    if (entry.foodId) {
      const food = await prisma.food.findFirst({
        where: { id: entry.foodId, OR: [{ userId: user.id }, { userId: null }] },
      });
      if (!food) return NextResponse.json({ error: "That food is no longer available." }, { status: 404 });
    }
    const calculated = calculateNutrition(
      entry.quantity,
      entry.basis,
      entry.caloriesPerBasis,
      entry.proteinPerBasis,
    );
    const log = await prisma.$transaction(async (transaction) => {
      let foodId = entry.foodId;
      if (entry.saveFood) {
        const existing = await transaction.food.findFirst({
          where: { userId: user.id, isCustom: true, name: { equals: entry.foodName, mode: "insensitive" } },
        });
        const food =
          existing ??
          (await transaction.food.create({
            data: {
              userId: user.id,
              name: entry.foodName,
              brand: entry.brand || null,
              category: "Custom",
              basis: entry.basis,
              servingUnit: entry.unit,
              calories: new Prisma.Decimal(entry.caloriesPerBasis),
              protein: new Prisma.Decimal(entry.proteinPerBasis),
              isCustom: true,
              isEstimate: false,
            },
          }));
        foodId = food.id;
      }
      return transaction.foodLog.create({
        data: {
          userId: user.id,
          foodId: foodId || null,
          date: dateFromString(entry.date),
          foodName: entry.foodName,
          brand: entry.brand || null,
          meal: entry.meal,
          quantity: new Prisma.Decimal(entry.quantity),
          unit: entry.unit,
          basis: entry.basis,
          caloriesPerBasis: new Prisma.Decimal(entry.caloriesPerBasis),
          proteinPerBasis: new Prisma.Decimal(entry.proteinPerBasis),
          calories: new Prisma.Decimal(calculated.calories),
          protein: new Prisma.Decimal(calculated.protein),
          notes: entry.notes,
        },
      });
    });
    return NextResponse.json({ id: log.id }, { status: 201 });
  } catch (error) {
    console.error("Unable to save food log entry.", error);
    return NextResponse.json({ error: "Unable to save this food entry. Please try again." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { authenticateApiRequest } from "@/lib/auth/app-user";
import { dateFromString } from "@/lib/dates";
import { calculateNutrition } from "@/lib/nutrition";
import { prisma } from "@/lib/prisma";
import { dateSchema } from "@/lib/validation";
import { z } from "zod";

const updateSchema = z.object({
  quantity: z.number().positive().max(100000),
  meal: z.enum(["Breakfast", "Morning snack", "Lunch", "Evening snack", "Dinner", "Other"]),
});

const duplicateSchema = z.object({ date: dateSchema });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authentication = await authenticateApiRequest();
  if (!authentication.authenticated) return authentication.response;

  const payload = updateSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) return NextResponse.json({ error: "Enter a positive quantity and a valid meal." }, { status: 400 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Configure DATABASE_URL to save changes." }, { status: 503 });
  try {
    const user = authentication.user;
    const { id } = await params;
    const existing = await prisma.foodLog.findFirst({ where: { id, userId: user.id } });
    if (!existing) return NextResponse.json({ error: "Food entry not found." }, { status: 404 });
    const calculated = calculateNutrition(
      payload.data.quantity,
      existing.basis as "100g" | "serving",
      Number(existing.caloriesPerBasis),
      Number(existing.proteinPerBasis),
    );
    await prisma.foodLog.update({
      where: { id },
      data: {
        quantity: new Prisma.Decimal(payload.data.quantity),
        meal: payload.data.meal,
        calories: new Prisma.Decimal(calculated.calories),
        protein: new Prisma.Decimal(calculated.protein),
      },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unable to update food log entry.", error);
    return NextResponse.json({ error: "Unable to update this food entry. Please try again." }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authentication = await authenticateApiRequest();
  if (!authentication.authenticated) return authentication.response;

  const payload = duplicateSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) return NextResponse.json({ error: "Choose a valid date for the copied entry." }, { status: 400 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Configure DATABASE_URL to save changes." }, { status: 503 });
  try {
    const user = authentication.user;
    const { id } = await params;
    const existing = await prisma.foodLog.findFirst({ where: { id, userId: user.id } });
    if (!existing) return NextResponse.json({ error: "Food entry not found." }, { status: 404 });
    const duplicate = await prisma.foodLog.create({
      data: {
        userId: user.id,
        foodId: existing.foodId,
        date: dateFromString(payload.data.date),
        foodName: existing.foodName,
        brand: existing.brand,
        meal: existing.meal,
        quantity: existing.quantity,
        unit: existing.unit,
        basis: existing.basis,
        caloriesPerBasis: existing.caloriesPerBasis,
        proteinPerBasis: existing.proteinPerBasis,
        calories: existing.calories,
        protein: existing.protein,
        notes: existing.notes,
      },
    });
    return NextResponse.json({ id: duplicate.id }, { status: 201 });
  } catch (error) {
    console.error("Unable to duplicate food log entry.", error);
    return NextResponse.json({ error: "Unable to duplicate this food entry. Please try again." }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authentication = await authenticateApiRequest();
  if (!authentication.authenticated) return authentication.response;

  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Configure DATABASE_URL to save changes." }, { status: 503 });
  try {
    const user = authentication.user;
    const { id } = await params;
    const result = await prisma.foodLog.deleteMany({ where: { id, userId: user.id } });
    if (result.count === 0) return NextResponse.json({ error: "Food entry not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unable to delete food log entry.", error);
    return NextResponse.json({ error: "Unable to delete this food entry. Please try again." }, { status: 500 });
  }
}

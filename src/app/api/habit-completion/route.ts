import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { dateFromString, isFutureDate } from "@/lib/dates";
import { getLocalUser } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { completionSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const payload = completionSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) return NextResponse.json({ error: "Check the habit completion details." }, { status: 400 });
  const { habitId, date, completed, requestId } = payload.data;
  if (isFutureDate(date)) return NextResponse.json({ error: "Future dates cannot be marked complete." }, { status: 400 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Configure DATABASE_URL to save changes." }, { status: 503 });

  try {
    const user = await getLocalUser();
    const result = await prisma.$transaction(
      async (transaction) => {
        const existingRequest = await transaction.pointTransaction.findUnique({ where: { eventKey: requestId } });
        if (existingRequest) return { ok: true };

        const habit = await transaction.habit.findFirst({ where: { id: habitId, userId: user.id, status: "ACTIVE" } });
        if (!habit) return { error: "That habit is no longer available." };
        const dbDate = dateFromString(date);
        const weekday = dbDate.getUTCDay();
        if (!habit.weekdays.includes(weekday) || dbDate < habit.startDate) {
          return { error: "This habit is not scheduled for the selected date." };
        }

        const previous = await transaction.habitCompletion.findUnique({
          where: { habitId_date: { habitId, date: dbDate } },
        });
        if ((previous?.completed ?? false) === completed) return { ok: true };
        if (!completed) {
          const balance = await transaction.pointTransaction.aggregate({
            where: { userId: user.id },
            _sum: { amount: true },
          });
          if ((balance._sum.amount ?? 0) < habit.points) {
            return { error: "These points have already been spent. Earn enough points before undoing this completion." };
          }
        }

        await transaction.habitCompletion.upsert({
          where: { habitId_date: { habitId, date: dbDate } },
          update: { completed },
          create: { userId: user.id, habitId, date: dbDate, completed },
        });
        await transaction.pointTransaction.create({
          data: {
            userId: user.id,
            eventKey: requestId,
            amount: completed ? habit.points : -habit.points,
            reason: `${completed ? "Completed" : "Undid"}: ${habit.name}`,
          },
        });
        return { ok: true };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 409 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unable to save habit completion.", error);
    return NextResponse.json({ error: "Unable to save this habit update. Please try again." }, { status: 500 });
  }
}

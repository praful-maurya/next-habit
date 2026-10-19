import { NextRequest, NextResponse } from "next/server";
import { dateFromString, weekdayFromString, previousDate } from "@/lib/dates";
import { authenticateApiRequest } from "@/lib/auth/app-user";
import { prisma } from "@/lib/prisma";
import { dateSchema } from "@/lib/validation";
import { z } from "zod";

const reviewSchema = z.object({
  date: dateSchema,
  answers: z.record(z.string(), z.string().max(2000)),
});

export async function PUT(request: NextRequest) {
  const authentication = await authenticateApiRequest();
  if (!authentication.authenticated) return authentication.response;

  const payload = reviewSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) return NextResponse.json({ error: "Check the weekly reflection fields and try again." }, { status: 400 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Configure DATABASE_URL to save changes." }, { status: 503 });
  try {
    const user = authentication.user;
    const weekStart = dateFromString(previousDate(payload.data.date, (weekdayFromString(payload.data.date) + 6) % 7));
    await prisma.weeklyReview.upsert({
      where: { userId_weekStart: { userId: user.id, weekStart } },
      update: { answers: payload.data.answers },
      create: { userId: user.id, weekStart, answers: payload.data.answers },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unable to save weekly review.", error);
    return NextResponse.json({ error: "Unable to save this weekly review. Please try again." }, { status: 500 });
  }
}

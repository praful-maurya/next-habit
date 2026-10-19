import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/auth/app-user";
import { dateFromString, localDateString } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createHabitSchema = z.object({
  name: z.string().trim().min(1).max(100),
  category: z.string().trim().min(1).max(50),
  points: z.number().int().min(0).max(1000),
  weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
});

export async function POST(request: NextRequest) {
  const authentication = await authenticateApiRequest();
  if (!authentication.authenticated) return authentication.response;

  const payload = createHabitSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) return NextResponse.json({ error: "Enter a name, category, point value, and at least one weekday." }, { status: 400 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Configure DATABASE_URL to save changes." }, { status: 503 });

  try {
    const user = authentication.user;
    const habit = await prisma.habit.create({
      data: {
        ...payload.data,
        weekdays: Array.from(new Set(payload.data.weekdays)),
        userId: user.id,
        startDate: dateFromString(localDateString()),
      },
    });
    return NextResponse.json({ id: habit.id }, { status: 201 });
  } catch (error) {
    console.error("Unable to create habit.", error);
    return NextResponse.json({ error: "Unable to create this habit. Please try again." }, { status: 500 });
  }
}

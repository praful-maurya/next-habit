import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/auth/app-user";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const statusSchema = z.object({ status: z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]) });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authentication = await authenticateApiRequest();
  if (!authentication.authenticated) return authentication.response;

  const payload = statusSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) return NextResponse.json({ error: "Choose a valid habit status." }, { status: 400 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Configure DATABASE_URL to save changes." }, { status: 503 });
  try {
    const user = authentication.user;
    const { id } = await params;
    const result = await prisma.habit.updateMany({
      where: { id, userId: user.id },
      data: { status: payload.data.status },
    });
    if (!result.count) return NextResponse.json({ error: "Habit not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unable to update habit.", error);
    return NextResponse.json({ error: "Unable to update this habit. Please try again." }, { status: 500 });
  }
}

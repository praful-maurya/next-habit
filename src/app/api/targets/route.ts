import { NextRequest, NextResponse } from "next/server";
import { getLocalUser } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { targetSchema } from "@/lib/validation";

export async function PUT(request: NextRequest) {
  const payload = targetSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) return NextResponse.json({ error: "Targets must be valid non-negative numbers." }, { status: 400 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Configure DATABASE_URL to save changes." }, { status: 503 });

  try {
    const user = await getLocalUser();
    await prisma.nutritionTarget.upsert({
      where: { userId: user.id },
      update: payload.data,
      create: { userId: user.id, ...payload.data },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unable to save nutrition targets.", error);
    return NextResponse.json({ error: "Unable to save nutrition targets. Please try again." }, { status: 500 });
  }
}

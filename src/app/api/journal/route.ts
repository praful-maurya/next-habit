import { NextRequest, NextResponse } from "next/server";
import { dateFromString } from "@/lib/dates";
import { getLocalUser } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { journalSchema } from "@/lib/validation";

export async function PUT(request: NextRequest) {
  const payload = journalSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) return NextResponse.json({ error: "Check the journal fields and try again." }, { status: 400 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Configure DATABASE_URL to save changes." }, { status: 503 });

  try {
    const user = await getLocalUser();
    const { date, ...entry } = payload.data;
    await prisma.journalEntry.upsert({
      where: { userId_date: { userId: user.id, date: dateFromString(date) } },
      update: entry,
      create: { ...entry, userId: user.id, date: dateFromString(date) },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unable to save journal entry.", error);
    return NextResponse.json({ error: "Unable to save your journal entry. Please try again." }, { status: 500 });
  }
}

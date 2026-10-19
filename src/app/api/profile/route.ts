import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/auth/app-user";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const profileSchema = z.object({
  displayName: z.string().trim().min(1).max(60),
});

export async function PUT(request: NextRequest) {
  const authentication = await authenticateApiRequest();
  if (!authentication.authenticated) return authentication.response;

  const payload = profileSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) {
    return NextResponse.json({ error: "Enter a display name between 1 and 60 characters." }, { status: 400 });
  }

  try {
    const profile = await prisma.user.update({
      where: { id: authentication.user.id },
      data: { displayName: payload.data.displayName },
      select: { displayName: true, email: true },
    });
    return NextResponse.json(profile);
  } catch (error) {
    console.error("Unable to update account profile.", error);
    return NextResponse.json({ error: "Unable to save your profile. Please try again." }, { status: 500 });
  }
}

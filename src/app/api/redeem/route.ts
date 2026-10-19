import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { authenticateApiRequest } from "@/lib/auth/app-user";
import { prisma } from "@/lib/prisma";
import { redemptionSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const authentication = await authenticateApiRequest();
  if (!authentication.authenticated) return authentication.response;

  const payload = redemptionSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) return NextResponse.json({ error: "Check the reward selection and try again." }, { status: 400 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Configure DATABASE_URL to save changes." }, { status: 503 });

  try {
    const user = authentication.user;
    const result = await prisma.$transaction(
      async (transaction) => {
        if (
          await transaction.rewardRedemption.findUnique({
            where: { userId_eventKey: { userId: user.id, eventKey: payload.data.requestId } },
          })
        ) return { ok: true };
        const reward = await transaction.reward.findFirst({
          where: { id: payload.data.rewardId, userId: user.id, isAvailable: true },
        });
        if (!reward) return { error: "This reward is no longer available." };
        const balance = await transaction.pointTransaction.aggregate({ where: { userId: user.id }, _sum: { amount: true } });
        const points = balance._sum.amount ?? 0;
        if (points < reward.cost) return { error: "You do not have enough points for this reward." };

        await transaction.rewardRedemption.create({
          data: {
            userId: user.id,
            rewardId: reward.id,
            eventKey: payload.data.requestId,
            rewardName: reward.name,
            pointsSpent: reward.cost,
          },
        });
        await transaction.pointTransaction.create({
          data: {
            userId: user.id,
            eventKey: `redeem:${payload.data.requestId}`,
            amount: -reward.cost,
            reason: `Redeemed: ${reward.name}`,
          },
        });
        return { ok: true };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 409 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unable to redeem reward.", error);
    return NextResponse.json({ error: "Unable to redeem this reward. Please try again." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { authenticateApiRequest } from "@/lib/auth/app-user";
import { localDateString } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { evaluateWeeklyDisciplineScore } from "@/lib/reward-vault";
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
        const weeklyScore = await evaluateWeeklyDisciplineScore(
          transaction,
          user.id,
          localDateString(),
        );
        if (!weeklyScore.isEligible) return { error: "Reach 80% of this week's planned habits to unlock rewards." };

        const reward = await transaction.reward.findFirst({
          where: { id: payload.data.rewardId, userId: user.id, isActive: true },
        });
        if (!reward) return { error: "This reward is no longer available." };

        const existingRedemption = await transaction.rewardRedemption.findUnique({
          where: { weeklyScoreId_rewardId: { weeklyScoreId: weeklyScore.id, rewardId: reward.id } },
        });
        if (existingRedemption) return { error: "You have already redeemed this reward this week." };

        const existingRequest = await transaction.rewardRedemption.findUnique({
          where: { userId_eventKey: { userId: user.id, eventKey: payload.data.requestId } },
        });
        if (existingRequest) return { error: "This redemption request has already been used." };

        await transaction.rewardRedemption.create({
          data: {
            userId: user.id,
            rewardId: reward.id,
            weeklyScoreId: weeklyScore.id,
            eventKey: payload.data.requestId,
            rewardName: reward.name,
            pointsSpent: 0,
          },
        });
        return { ok: true };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 409 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "This reward has already been redeemed for this week." }, { status: 409 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return NextResponse.json({ error: "The reward vault changed while redeeming. Refresh and try again." }, { status: 409 });
    }
    console.error("Unable to redeem reward.", error);
    return NextResponse.json({ error: "Unable to redeem this reward. Please try again." }, { status: 500 });
  }
}

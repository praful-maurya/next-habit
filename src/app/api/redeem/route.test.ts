import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateApiRequest: vi.fn(),
  evaluateWeeklyDisciplineScore: vi.fn(),
  transaction: {
    reward: { findFirst: vi.fn() },
    rewardRedemption: { findUnique: vi.fn(), create: vi.fn() },
  },
  prismaTransaction: vi.fn(),
}));

vi.mock("@/lib/auth/app-user", () => ({
  authenticateApiRequest: mocks.authenticateApiRequest,
}));
vi.mock("@/lib/reward-vault", () => ({
  evaluateWeeklyDisciplineScore: mocks.evaluateWeeklyDisciplineScore,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: mocks.prismaTransaction },
}));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/redeem/route";

describe("reward redemption authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = "test-database-url";
    mocks.authenticateApiRequest.mockResolvedValue({
      authenticated: true,
      user: { id: "authenticated-user" },
    });
    mocks.evaluateWeeklyDisciplineScore.mockResolvedValue({
      id: "current-week-score",
      isEligible: true,
    });
    mocks.transaction.reward.findFirst.mockResolvedValue({
      id: "reward-owned-by-user",
      name: "Movie night",
    });
    mocks.transaction.rewardRedemption.findUnique.mockResolvedValue(null);
    mocks.prismaTransaction.mockImplementation((callback) => callback(mocks.transaction));
  });

  it("scopes reward access and redemption to the authenticated user, not the request body", async () => {
    const request = new NextRequest("http://localhost/api/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rewardId: "reward-owned-by-user",
        requestId: "17f0ac5e-2a9e-447a-a4f5-9d841a563b29",
        userId: "another-user",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mocks.evaluateWeeklyDisciplineScore).toHaveBeenCalledWith(
      mocks.transaction,
      "authenticated-user",
      expect.any(String),
    );
    expect(mocks.transaction.reward.findFirst).toHaveBeenCalledWith({
      where: { id: "reward-owned-by-user", userId: "authenticated-user", isActive: true },
    });
    expect(mocks.transaction.rewardRedemption.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "authenticated-user",
        rewardId: "reward-owned-by-user",
        weeklyScoreId: "current-week-score",
        pointsSpent: 0,
      }),
    });
  });

  it("blocks a reward already redeemed for the current weekly score", async () => {
    mocks.transaction.rewardRedemption.findUnique.mockImplementation(({ where }) => (
      Promise.resolve("weeklyScoreId_rewardId" in where ? { id: "existing-redemption" } : null)
    ));
    const request = new NextRequest("http://localhost/api/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rewardId: "reward-owned-by-user",
        requestId: "17f0ac5e-2a9e-447a-a4f5-9d841a563b29",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(409);
    expect(mocks.transaction.rewardRedemption.create).not.toHaveBeenCalled();
  });
});

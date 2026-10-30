import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { dateFromString } from "@/lib/dates";
import { evaluateWeeklyDisciplineScore, getWeeklyDisciplineScore } from "@/lib/reward-vault";

const mocks = vi.hoisted(() => ({
  prismaTransaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: mocks.prismaTransaction },
}));

describe("weekly score persistence", () => {
  it("retries an expired transaction with an extended transaction timeout", async () => {
    const expiredTransaction = new Prisma.PrismaClientKnownRequestError(
      "Transaction not found.",
      { code: "P2028", clientVersion: "test" },
    );
    mocks.prismaTransaction
      .mockRejectedValueOnce(expiredTransaction)
      .mockResolvedValueOnce({ id: "score-for-week" });

    await expect(getWeeklyDisciplineScore("authenticated-user", "2026-10-19"))
      .resolves.toEqual({ id: "score-for-week" });

    expect(mocks.prismaTransaction).toHaveBeenCalledTimes(2);
    expect(mocks.prismaTransaction.mock.calls[0][1]).toEqual({
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 10_000,
      timeout: 15_000,
    });
  });

  it("upserts a single score using the user and week unique key on repeated evaluation", async () => {
    const upsert = vi.fn().mockResolvedValue({ id: "score-for-week" });
    const transaction = {
      weeklyDisciplineScore: {
        findUnique: vi.fn().mockResolvedValue(null),
        upsert,
      },
      habit: {
        findMany: vi.fn().mockResolvedValue([{
          id: "habit-1",
          startDate: dateFromString("2026-10-19"),
          weekdays: [1],
        }]),
      },
      habitCompletion: {
        findMany: vi.fn().mockResolvedValue([{
          habitId: "habit-1",
          date: dateFromString("2026-10-19"),
        }]),
      },
    } as unknown as Prisma.TransactionClient;

    await evaluateWeeklyDisciplineScore(transaction, "authenticated-user", "2026-10-19");
    await evaluateWeeklyDisciplineScore(transaction, "authenticated-user", "2026-10-19");

    expect(upsert).toHaveBeenCalledTimes(2);
    for (const [input] of upsert.mock.calls) {
      expect(input.where).toEqual({
        userId_weekStartDate: {
          userId: "authenticated-user",
          weekStartDate: dateFromString("2026-10-19"),
        },
      });
      expect(input.create.userId).toBe("authenticated-user");
    }
  });
});

import { Prisma } from "@prisma/client";
import { calculateWeeklyDisciplineScore } from "@/lib/discipline-score";
import { databaseDateString, dateFromString, previousDate, weekPeriod } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

export const WEEKLY_DISCIPLINE_THRESHOLD = 80;

export async function evaluateWeeklyDisciplineScore(
  transaction: Prisma.TransactionClient,
  userId: string,
  today: string,
  finalizeWeek = false,
) {
  const { weekStartDate, weekEndDate } = weekPeriod(today);
  const weekStart = dateFromString(weekStartDate);
  const existing = await transaction.weeklyDisciplineScore.findUnique({
    where: { userId_weekStartDate: { userId, weekStartDate: weekStart } },
  });
  if (existing?.finalizedAt) return existing;

  const [habits, completions] = await Promise.all([
    transaction.habit.findMany({
      where: { userId, status: "ACTIVE" },
      select: { id: true, startDate: true, weekdays: true },
    }),
    transaction.habitCompletion.findMany({
      where: {
        userId,
        completed: true,
        date: { gte: weekStart, lte: dateFromString(weekEndDate) },
      },
      select: { habitId: true, date: true },
    }),
  ]);

  const result = calculateWeeklyDisciplineScore(
    today,
    habits.map((habit) => ({
      id: habit.id,
      startDate: databaseDateString(habit.startDate),
      weekdays: habit.weekdays,
    })),
    completions.map((completion) => ({
      habitId: completion.habitId,
      date: databaseDateString(completion.date),
    })),
    finalizeWeek,
    WEEKLY_DISCIPLINE_THRESHOLD,
  );
  const data = {
    weekEndDate: dateFromString(result.weekEndDate),
    plannedCount: result.plannedCount,
    completedCount: result.completedCount,
    score: new Prisma.Decimal(result.score.toFixed(2)),
    requiredThreshold: result.requiredThreshold,
    isEligible: result.isEligible,
    evaluatedAt: new Date(),
    finalizedAt: finalizeWeek ? new Date() : null,
  };

  return transaction.weeklyDisciplineScore.upsert({
    where: { userId_weekStartDate: { userId, weekStartDate: weekStart } },
    create: { userId, weekStartDate: weekStart, ...data },
    update: data,
  });
}

export async function getWeeklyDisciplineScore(userId: string, today: string) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(async (transaction) => {
        const currentWeekStart = weekPeriod(today).weekStartDate;
        const previousWeekDate = previousDate(currentWeekStart);
        await evaluateWeeklyDisciplineScore(transaction, userId, previousWeekDate, true);
        return evaluateWeeklyDisciplineScore(transaction, userId, today);
      }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 10_000,
        timeout: 15_000,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2034" || error.code === "P2002" || error.code === "P2028") &&
        attempt < 2
      ) {
        await new Promise((resolve) => setTimeout(resolve, 50 * (attempt + 1)));
        continue;
      }
      throw error;
    }
  }

  throw new Error("Unable to evaluate the weekly discipline score after retrying.");
}

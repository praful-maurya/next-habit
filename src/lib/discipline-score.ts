import { previousDate, weekPeriod, weekdayFromString } from "@/lib/dates";

export type PlannedHabit = {
  id: string;
  startDate: string;
  weekdays: number[];
};

export type CompletedOccurrence = {
  habitId: string;
  date: string;
};

export type WeeklyDisciplineResult = {
  weekStartDate: string;
  weekEndDate: string;
  plannedCount: number;
  completedCount: number;
  score: number;
  requiredThreshold: number;
  isEligible: boolean;
};

export function calculateWeeklyDisciplineScore(
  today: string,
  habits: PlannedHabit[],
  completions: CompletedOccurrence[],
  finalizeWeek = false,
  requiredThreshold = 80,
): WeeklyDisciplineResult {
  const { weekStartDate, weekEndDate } = weekPeriod(today);
  const completed = new Set(completions.map(({ habitId, date }) => `${habitId}:${date}`));
  let plannedCount = 0;
  let completedCount = 0;

  for (let date = weekStartDate; date <= weekEndDate; date = previousDate(date, -1)) {
    for (const habit of habits) {
      const key = `${habit.id}:${date}`;
      const isCompleted = completed.has(key);
      const isScheduled = habit.startDate <= date && habit.weekdays.includes(weekdayFromString(date));
      const hasPassed = date < today || (finalizeWeek && date <= weekEndDate);
      if (!isScheduled || (!hasPassed && !isCompleted)) continue;
      plannedCount += 1;
      if (isCompleted) completedCount += 1;
    }
  }

  const score = plannedCount === 0
    ? 0
    : Math.round((completedCount / plannedCount) * 10_000) / 100;

  return {
    weekStartDate,
    weekEndDate,
    plannedCount,
    completedCount,
    score,
    requiredThreshold,
    isEligible: plannedCount > 0 && completedCount * 100 >= plannedCount * requiredThreshold,
  };
}

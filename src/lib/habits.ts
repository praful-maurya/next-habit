import { previousDate, weekdayFromString } from "@/lib/dates";

export type StreakHabit = {
  id: string;
  startDate: string;
  weekdays: number[];
};

export function calculateHabitStreaks(
  throughDate: string,
  today: string,
  habits: StreakHabit[],
  completedEntries: Array<{ habitId: string; date: string }>,
) {
  if (habits.length === 0) return { current: 0, longest: 0 };

  const completed = new Set(completedEntries.map((entry) => `${entry.habitId}:${entry.date}`));
  const firstDate = habits.reduce(
    (earliest, habit) => (habit.startDate < earliest ? habit.startDate : earliest),
    habits[0].startDate,
  );
  const days: Array<{ date: string; completed: boolean }> = [];

  for (let date = throughDate; date >= firstDate; date = previousDate(date)) {
    const scheduled = habits.filter(
      (habit) => habit.startDate <= date && habit.weekdays.includes(weekdayFromString(date)),
    );
    if (scheduled.length === 0) continue;
    days.push({
      date,
      completed: scheduled.every((habit) => completed.has(`${habit.id}:${date}`)),
    });
  }

  let current = 0;
  for (const day of days) {
    if (day.date === today && !day.completed) continue;
    if (!day.completed) break;
    current += 1;
  }

  let longest = 0;
  let run = 0;
  for (const day of [...days].reverse()) {
    if (day.completed) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
  }
  return { current, longest };
}

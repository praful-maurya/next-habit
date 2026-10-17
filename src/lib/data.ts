import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calculateHabitStreaks } from "@/lib/habits";
import {
  databaseDateString,
  dateFromString,
  localDateString,
  monthDates,
  previousDate,
  weekdayFromString,
  weekdayLabel,
} from "@/lib/dates";
import type { DashboardSnapshot, DailyTrend } from "@/lib/types";

const LOCAL_USER_EMAIL = "local@my-discipline-journal.invalid";

const sampleHabits = [
  { name: "Move my body", category: "Fitness", icon: "activity", points: 10 },
  { name: "Read for 10 minutes", category: "Learning", icon: "book-open", points: 10 },
  { name: "Plan my priorities", category: "Mindfulness", icon: "list-checks", points: 10 },
  { name: "Write a journal entry", category: "Personal Growth", icon: "notebook-pen", points: 10 },
];

const sampleRewards = [
  { name: "A slow Sunday morning", description: "Make time for a restful start.", icon: "coffee", cost: 60 },
  { name: "Movie night", description: "Pick a film and settle in.", icon: "clapperboard", cost: 120 },
  { name: "A little something", description: "Choose a small treat for yourself.", icon: "gift", cost: 250 },
];

const starterFoods = [
  { name: "Egg, whole, cooked", category: "Protein", calories: 155, protein: 13, basis: "100g" },
  { name: "Milk, whole", category: "Dairy", calories: 61, protein: 3.2, basis: "100g" },
  { name: "Plain yogurt", category: "Dairy", calories: 61, protein: 3.5, basis: "100g" },
  { name: "Chicken breast, cooked", category: "Protein", calories: 165, protein: 31, basis: "100g" },
  { name: "Paneer", category: "Protein", calories: 265, protein: 18, basis: "100g" },
  { name: "Cooked white rice", category: "Grains", calories: 130, protein: 2.7, basis: "100g" },
  { name: "Whole wheat roti", category: "Grains", calories: 297, protein: 9.8, basis: "100g" },
  { name: "Oats, dry", category: "Grains", calories: 379, protein: 13.2, basis: "100g" },
  { name: "Banana", category: "Fruit", calories: 89, protein: 1.1, basis: "100g" },
  { name: "Apple with skin", category: "Fruit", calories: 52, protein: 0.3, basis: "100g" },
  { name: "Almonds", category: "Nuts", calories: 579, protein: 21.2, basis: "100g" },
  { name: "Cooked lentils (dal)", category: "Protein", calories: 116, protein: 9, basis: "100g" },
];

export async function getLocalUser() {
  const user = await prisma.user.upsert({
    where: { email: LOCAL_USER_EMAIL },
    update: {},
    create: { email: LOCAL_USER_EMAIL, displayName: "Friend" },
  });

  const [targetSeeded, habitSeeded, rewardSeeded, foodSeeded] = await Promise.all([
    prisma.nutritionTarget.findUnique({ where: { userId: user.id }, select: { id: true } }),
    prisma.habit.findUnique({ where: { id: `seed-${sampleHabits[0].icon}` }, select: { id: true } }),
    prisma.reward.findUnique({ where: { id: `seed-${sampleRewards[0].icon}` }, select: { id: true } }),
    prisma.food.findUnique({
      where: { id: `seed-food-${starterFoods[0].name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` },
      select: { id: true },
    }),
  ]);

  if (!targetSeeded || !habitSeeded || !rewardSeeded || !foodSeeded) {
    await prisma.$transaction(
      async (transaction) => {
        await transaction.$executeRaw`SELECT pg_advisory_xact_lock(20261017, 1)`;
        await transaction.nutritionTarget.upsert({
          where: { userId: user.id },
          update: {},
          create: { userId: user.id, calories: 2200, protein: 120 },
        });
        for (const habit of sampleHabits) {
          await transaction.habit.upsert({
            where: { id: `seed-${habit.icon}` },
            update: {},
            create: {
              id: `seed-${habit.icon}`,
              userId: user.id,
              ...habit,
              startDate: dateFromString(localDateString()),
            },
          });
        }
        for (const reward of sampleRewards) {
          await transaction.reward.upsert({
            where: { id: `seed-${reward.icon}` },
            update: {},
            create: { id: `seed-${reward.icon}`, userId: user.id, ...reward },
          });
        }
        for (const food of starterFoods) {
          await transaction.food.upsert({
            where: { id: `seed-food-${food.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` },
            update: {},
            create: {
              id: `seed-food-${food.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
              ...food,
              calories: new Prisma.Decimal(food.calories),
              protein: new Prisma.Decimal(food.protein),
              isEstimate: true,
            },
          });
        }
      },
      { maxWait: 30_000, timeout: 60_000 },
    );
  }

  return user;
}

export async function getDashboardSnapshot(date = localDateString()): Promise<DashboardSnapshot> {
  const user = await getLocalUser();
  const dbDate = dateFromString(date);
  const weekStart = dateFromString(previousDate(date, 6));
  const datesInMonth = monthDates(date);
  const monthStart = dateFromString(datesInMonth[0]);
  const monthEnd = dateFromString(datesInMonth[datesInMonth.length - 1]);
  const reviewWeekStartDate = previousDate(date, (weekdayFromString(date) + 6) % 7);
  const reviewWeekStart = dateFromString(reviewWeekStartDate);
  const habits = await prisma.habit.findMany({
    where: { userId: user.id, status: { not: "ARCHIVED" } },
    orderBy: { createdAt: "asc" },
  });
  const [
    completions,
    foodLogs,
    foods,
    rewards,
    target,
    transactions,
    journal,
    weekHabits,
    weekCompletions,
    weekLogs,
    monthCompletions,
    historyCompletions,
    review,
  ] =
    await Promise.all([
      prisma.habitCompletion.findMany({ where: { userId: user.id, date: dbDate } }),
      prisma.foodLog.findMany({ where: { userId: user.id, date: dbDate }, orderBy: { createdAt: "desc" } }),
      prisma.food.findMany({
        where: { OR: [{ userId: user.id }, { userId: null }] },
        orderBy: [{ isCustom: "asc" }, { name: "asc" }],
      }),
      prisma.reward.findMany({ where: { userId: user.id, isAvailable: true }, orderBy: { cost: "asc" } }),
      prisma.nutritionTarget.findUnique({ where: { userId: user.id } }),
      prisma.pointTransaction.aggregate({ where: { userId: user.id }, _sum: { amount: true } }),
      prisma.journalEntry.findUnique({ where: { userId_date: { userId: user.id, date: dbDate } } }),
      prisma.habit.findMany({ where: { userId: user.id, status: "ACTIVE" } }),
      prisma.habitCompletion.findMany({ where: { userId: user.id, date: { gte: weekStart, lte: dbDate }, completed: true } }),
      prisma.foodLog.findMany({ where: { userId: user.id, date: { gte: weekStart, lte: dbDate } } }),
      prisma.habitCompletion.findMany({ where: { userId: user.id, date: { gte: monthStart, lte: monthEnd }, completed: true } }),
      prisma.habitCompletion.findMany({ where: { userId: user.id, date: { lte: dbDate }, completed: true } }),
      prisma.weeklyReview.findUnique({
        where: { userId_weekStart: { userId: user.id, weekStart: reviewWeekStart } },
      }),
    ]);

  const completedIds = new Set(completions.filter((item) => item.completed).map((item) => item.habitId));
  const completionLookup = new Set(weekCompletions.map((item) => `${item.habitId}:${databaseDateString(item.date)}`));
  const trend: DailyTrend[] = Array.from({ length: 7 }, (_, index) => {
    const dayString = previousDate(date, 6 - index);
    const dayLogs = weekLogs.filter((item) => databaseDateString(item.date) === dayString);
    const tracked = dayLogs.length > 0;
    return {
      date: dayString,
      day: weekdayLabel(dayString),
      calories: tracked ? dayLogs.reduce((total, item) => total + Number(item.calories), 0) : null,
      protein: tracked ? dayLogs.reduce((total, item) => total + Number(item.protein), 0) : null,
    };
  });
  const weeklyDue = weekHabits.reduce((total, habit) => {
    return total + Array.from({ length: 7 }, (_, index) => {
      const dayString = previousDate(date, 6 - index);
      return habit.weekdays.includes(weekdayFromString(dayString)) && databaseDateString(habit.startDate) <= dayString ? 1 : 0;
    }).reduce<number>((a, b) => a + b, 0);
  }, 0);
  const weeklyDone = Array.from(completionLookup).filter((key) => {
    const [habitId, dateString] = key.split(":");
    const habit = weekHabits.find((item) => item.id === habitId);
    return habit?.weekdays.includes(weekdayFromString(dateString)) && databaseDateString(habit.startDate) <= dateString;
  }).length;
  const habitTrend = Array.from({ length: 7 }, (_, index) => {
    const dayString = previousDate(date, 6 - index);
    const due = weekHabits.filter(
      (habit) => habit.weekdays.includes(weekdayFromString(dayString)) && databaseDateString(habit.startDate) <= dayString,
    );
    return {
      date: dayString,
      day: weekdayLabel(dayString),
      scheduled: due.length,
      completed: due.filter((habit) => completionLookup.has(`${habit.id}:${dayString}`)).length,
    };
  });
  const habitPerformance = weekHabits.map((habit) => {
    const scheduled = habitTrend.filter((day) =>
      habit.weekdays.includes(weekdayFromString(day.date)) && databaseDateString(habit.startDate) <= day.date,
    );
    return {
      id: habit.id,
      name: habit.name,
      scheduled: scheduled.length,
      completed: scheduled.filter((day) => completionLookup.has(`${habit.id}:${day.date}`)).length,
    };
  });
  const monthCompleted = new Set(monthCompletions.map((item) => `${item.habitId}:${databaseDateString(item.date)}`));
  const calendar = datesInMonth.map((dayString) => {
    const scheduled = habits.filter(
      (habit) => habit.status === "ACTIVE" && habit.weekdays.includes(weekdayFromString(dayString)) && databaseDateString(habit.startDate) <= dayString,
    );
    return {
      date: dayString,
      scheduled: scheduled.length,
      completed: scheduled.filter((habit) => monthCompleted.has(`${habit.id}:${dayString}`)).length,
    };
  });
  const activeHabitsForStreak = habits.filter((habit) => habit.status === "ACTIVE");
  const activeHabitIds = new Set(activeHabitsForStreak.map((habit) => habit.id));
  const streaks = calculateHabitStreaks(
    date,
    localDateString(),
    activeHabitsForStreak.map((habit) => ({
      id: habit.id,
      startDate: databaseDateString(habit.startDate),
      weekdays: habit.weekdays,
    })),
    historyCompletions
      .filter((item) => activeHabitIds.has(item.habitId))
      .map((item) => ({ habitId: item.habitId, date: databaseDateString(item.date) })),
  );

  return {
    configured: true,
    date,
    displayName: user.displayName,
    habits: habits.map((habit) => ({
      id: habit.id,
      name: habit.name,
      category: habit.category,
      icon: habit.icon,
      points: habit.points,
      weekdays: habit.weekdays,
      completed: completedIds.has(habit.id),
      status: habit.status as "ACTIVE" | "PAUSED",
    })),
    foodLogs: foodLogs.map((log) => ({
      id: log.id,
      foodName: log.foodName,
      meal: log.meal,
      quantity: Number(log.quantity),
      unit: log.unit,
      basis: log.basis,
      caloriesPerBasis: Number(log.caloriesPerBasis),
      proteinPerBasis: Number(log.proteinPerBasis),
      calories: Number(log.calories),
      protein: Number(log.protein),
      notes: log.notes,
    })),
    foods: foods.map((food) => ({
      id: food.id,
      name: food.name,
      brand: food.brand,
      calories: Number(food.calories),
      protein: Number(food.protein),
      category: food.category,
      basis: food.basis,
      servingUnit: food.servingUnit,
      isEstimate: food.isEstimate,
      isCustom: food.isCustom,
    })),
    rewards: rewards.map((reward) => ({
      id: reward.id,
      name: reward.name,
      description: reward.description,
      icon: reward.icon,
      cost: reward.cost,
      isAvailable: reward.isAvailable,
    })),
    points: transactions._sum.amount ?? 0,
    caloriesTarget: target?.calories ?? 2200,
    proteinTarget: target ? Number(target.protein) : 120,
    journal: journal
      ? {
          morning: journal.morning as Record<string, string>,
          evening: journal.evening as Record<string, string>,
          freeWrite: journal.freeWrite,
          mood: journal.mood ?? "",
          energy: journal.energy,
        }
      : null,
    weeklyConsistency: weeklyDue > 0 ? Math.round((weeklyDone / weeklyDue) * 100) : null,
    trend,
    calendar,
    streaks,
    habitTrend,
    habitPerformance,
    weeklyScheduled: weeklyDue,
    weeklyCompleted: weeklyDone,
    weeklyReview: review ? (review.answers as Record<string, string>) : null,
  };
}

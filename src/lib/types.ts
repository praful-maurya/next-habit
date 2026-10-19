export type HabitItem = {
  id: string;
  name: string;
  category: string;
  icon: string;
  points: number;
  weekdays: number[];
  completed: boolean;
  status: "ACTIVE" | "PAUSED";
};

export type FoodItem = {
  id: string;
  name: string;
  brand: string | null;
  calories: number;
  protein: number;
  category: string;
  basis: string;
  servingUnit: string;
  isEstimate: boolean;
  isCustom: boolean;
};

export type FoodLogItem = {
  id: string;
  foodName: string;
  meal: string;
  quantity: number;
  unit: string;
  basis: string;
  caloriesPerBasis: number;
  proteinPerBasis: number;
  calories: number;
  protein: number;
  notes: string;
};

export type RewardItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  isActive: boolean;
};

export type WeeklyDisciplineItem = {
  id: string;
  weekStartDate: string;
  weekEndDate: string;
  plannedCount: number;
  completedCount: number;
  score: number;
  requiredThreshold: number;
  isEligible: boolean;
  finalized: boolean;
};

export type RewardRedemptionItem = {
  id: string;
  rewardId: string;
  rewardName: string;
  redeemedAt: string;
};

export type JournalItem = {
  morning: Record<string, string>;
  evening: Record<string, string>;
  freeWrite: string;
  mood: string;
  energy: number | null;
};

export type DailyTrend = {
  date: string;
  day: string;
  calories: number | null;
  protein: number | null;
};

export type HabitTrend = {
  date: string;
  day: string;
  scheduled: number;
  completed: number;
};

export type HabitPerformance = {
  id: string;
  name: string;
  scheduled: number;
  completed: number;
};

export type CalendarDay = {
  date: string;
  scheduled: number;
  completed: number;
};

export type HabitStreaks = {
  current: number;
  longest: number;
};

export type DashboardSnapshot = {
  configured: boolean;
  date: string;
  displayName: string;
  habits: HabitItem[];
  foodLogs: FoodLogItem[];
  foods: FoodItem[];
  rewards: RewardItem[];
  weeklyDiscipline: WeeklyDisciplineItem;
  rewardRedemptions: RewardRedemptionItem[];
  points: number;
  caloriesTarget: number;
  proteinTarget: number;
  journal: JournalItem | null;
  weeklyConsistency: number | null;
  trend: DailyTrend[];
  calendar: CalendarDay[];
  streaks: HabitStreaks;
  habitTrend: HabitTrend[];
  habitPerformance: HabitPerformance[];
  weeklyScheduled: number;
  weeklyCompleted: number;
  weeklyReview: Record<string, string> | null;
};

export const emptySnapshot = (date: string): DashboardSnapshot => ({
  configured: false,
  date,
  displayName: "Friend",
  habits: [],
  foodLogs: [],
  foods: [],
  rewards: [],
  weeklyDiscipline: {
    id: "",
    weekStartDate: date,
    weekEndDate: date,
    plannedCount: 0,
    completedCount: 0,
    score: 0,
    requiredThreshold: 80,
    isEligible: false,
    finalized: false,
  },
  rewardRedemptions: [],
  points: 0,
  caloriesTarget: 2200,
  proteinTarget: 120,
  journal: null,
  weeklyConsistency: null,
  trend: [],
  calendar: [],
  streaks: { current: 0, longest: 0 },
  habitTrend: [],
  habitPerformance: [],
  weeklyScheduled: 0,
  weeklyCompleted: 0,
  weeklyReview: null,
});

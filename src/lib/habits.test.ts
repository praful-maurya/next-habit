import { describe, expect, it } from "vitest";
import { calculateHabitStreaks } from "@/lib/habits";

const dailyHabit = { id: "daily", startDate: "2026-10-01", weekdays: [0, 1, 2, 3, 4, 5, 6] };

describe("habit streak calculations", () => {
  it("skips days with no scheduled habits", () => {
    const habits = [
      { id: "weekdays", startDate: "2026-10-12", weekdays: [1, 2, 3, 4, 5] },
    ];
    const completedEntries = ["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16"]
      .map((date) => ({ habitId: "weekdays", date }));
    expect(calculateHabitStreaks("2026-10-17", "2026-10-17", habits, completedEntries)).toEqual({
      current: 5,
      longest: 5,
    });
  });

  it("retains yesterday's streak when today's scheduled habit is not done yet", () => {
    const entries = ["2026-10-15", "2026-10-16"].map((date) => ({ habitId: "daily", date }));
    expect(calculateHabitStreaks("2026-10-17", "2026-10-17", [dailyHabit], entries).current).toBe(2);
  });

  it("breaks the current streak on an incomplete past day and keeps the historical best", () => {
    const entries = ["2026-10-14", "2026-10-15"].map((date) => ({ habitId: "daily", date }));
    expect(calculateHabitStreaks("2026-10-17", "2026-10-18", [dailyHabit], entries)).toEqual({
      current: 0,
      longest: 2,
    });
  });

  it("returns zero when there are no habits", () => {
    expect(calculateHabitStreaks("2026-10-17", "2026-10-17", [], [])).toEqual({ current: 0, longest: 0 });
  });
});

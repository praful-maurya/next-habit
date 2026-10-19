import { describe, expect, it } from "vitest";
import { calculateWeeklyDisciplineScore } from "@/lib/discipline-score";
import { weekPeriod } from "@/lib/dates";

describe("weekly discipline score", () => {
  it("uses Monday through Sunday, including weeks across year boundaries", () => {
    expect(weekPeriod("2026-01-01")).toEqual({
      weekStartDate: "2025-12-29",
      weekEndDate: "2026-01-04",
    });
  });

  it("counts each scheduled occurrence, not just distinct habits", () => {
    const result = calculateWeeklyDisciplineScore(
      "2026-10-19",
      [{ id: "habit-1", startDate: "2026-10-19", weekdays: [1, 3, 5, 0] }],
      [
        { habitId: "habit-1", date: "2026-10-19" },
        { habitId: "habit-1", date: "2026-10-21" },
      ],
      true,
    );

    expect(result.plannedCount).toBe(4);
    expect(result.completedCount).toBe(2);
    expect(result.score).toBe(50);
    expect(result.isEligible).toBe(false);
  });

  it("unlocks at exactly 80 percent and rejects scores below the threshold", () => {
    const weekdays = [1, 2, 3, 4, 5];
    const fourCompleted = weekdays.slice(0, 4).map((weekday) => ({
      habitId: "habit-1",
      date: `2026-10-${String(19 + weekday - 1).padStart(2, "0")}`,
    }));
    const exactThreshold = calculateWeeklyDisciplineScore(
      "2026-10-19",
      [{ id: "habit-1", startDate: "2026-10-19", weekdays }],
      fourCompleted,
      true,
    );
    const belowThreshold = calculateWeeklyDisciplineScore(
      "2026-10-19",
      [{ id: "habit-1", startDate: "2026-10-19", weekdays: [1, 3, 5, 0] }],
      [
        { habitId: "habit-1", date: "2026-10-19" },
        { habitId: "habit-1", date: "2026-10-21" },
        { habitId: "habit-1", date: "2026-10-23" },
      ],
      true,
    );

    expect(exactThreshold.score).toBe(80);
    expect(exactThreshold.isEligible).toBe(true);
    expect(belowThreshold.score).toBe(75);
    expect(belowThreshold.isEligible).toBe(false);
  });

  it("excludes future and unfinished current-day occurrences from the live denominator", () => {
    const result = calculateWeeklyDisciplineScore(
      "2026-10-22",
      [{ id: "habit-1", startDate: "2026-10-19", weekdays: [1, 3, 4, 5] }],
      [
        { habitId: "habit-1", date: "2026-10-19" },
        { habitId: "habit-1", date: "2026-10-21" },
      ],
    );

    expect(result.plannedCount).toBe(2);
    expect(result.completedCount).toBe(2);
    expect(result.isEligible).toBe(true);
  });

  it("counts a completed future occurrence but ignores unrelated completion dates", () => {
    const result = calculateWeeklyDisciplineScore(
      "2026-10-22",
      [{ id: "habit-1", startDate: "2026-10-19", weekdays: [1, 5] }],
      [
        { habitId: "habit-1", date: "2026-10-23" },
        { habitId: "habit-1", date: "2026-10-20" },
      ],
    );

    expect(result.plannedCount).toBe(2);
    expect(result.completedCount).toBe(1);
    expect(result.score).toBe(50);
  });

  it("does not count commitments before a habit starts or grant eligibility with no planned occurrences", () => {
    const result = calculateWeeklyDisciplineScore(
      "2026-10-19",
      [{ id: "habit-1", startDate: "2026-10-20", weekdays: [1] }],
      [{ habitId: "habit-1", date: "2026-10-19" }],
      true,
    );
    const noHabits = calculateWeeklyDisciplineScore("2026-10-19", [], [], true);

    expect(result.plannedCount).toBe(0);
    expect(result.score).toBe(0);
    expect(result.isEligible).toBe(false);
    expect(noHabits.plannedCount).toBe(0);
    expect(noHabits.isEligible).toBe(false);
  });
});

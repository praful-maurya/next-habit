import { describe, expect, it } from "vitest";
import {
  dateFromString,
  databaseDateString,
  monthDates,
  previousDate,
  weekdayFromString,
} from "@/lib/dates";

describe("local calendar dates", () => {
  it("round-trips a date-only value without timezone movement", () => {
    expect(databaseDateString(dateFromString("2026-10-17"))).toBe("2026-10-17");
  });

  it("moves across month and year boundaries", () => {
    expect(previousDate("2026-03-01")).toBe("2026-02-28");
    expect(previousDate("2026-01-01")).toBe("2025-12-31");
  });

  it("returns the right weekday using the date-only calendar day", () => {
    expect(weekdayFromString("2026-10-17")).toBe(6);
  });

  it("generates every day in the selected month including leap day", () => {
    const days = monthDates("2024-02-12");
    expect(days).toHaveLength(29);
    expect(days[0]).toBe("2024-02-01");
    expect(days.at(-1)).toBe("2024-02-29");
  });
});

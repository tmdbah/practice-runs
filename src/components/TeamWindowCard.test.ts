import { describe, it, expect } from "vitest";
import { computeDefaultIndex, type DayWindowEntry } from "@/components/TeamWindowCard";

const LABELS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const SHORT_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function makeEntries(
  counts: number[],
  dates: string[] = ["2026-07-20", "2026-07-21", "2026-07-22", "2026-07-23", "2026-07-24", "2026-07-25", "2026-07-26"],
): DayWindowEntry[] {
  return DAY_ORDER.map((dayOfWeek, i) => ({
    dayOfWeek,
    label: LABELS[i],
    shortLabel: SHORT_LABELS[i],
    teamWindow: {
      date: dates[i],
      dayOfWeek,
      availableCount: counts[i],
      window: counts[i] > 0 ? { from: "18:00", to: "21:00" } : null,
    },
  }));
}

describe("computeDefaultIndex", () => {
  it("picks the day with the highest availableCount", () => {
    const entries = makeEntries([1, 2, 5, 0, 3, 2, 1]);
    expect(computeDefaultIndex(entries)).toBe(2); // Wednesday
  });

  it("breaks ties by earliest date", () => {
    const entries = makeEntries([3, 3, 1, 0, 0, 0, 0]);
    expect(computeDefaultIndex(entries)).toBe(0); // Monday, earlier date than Tuesday
  });

  it("defaults to the first day when every day has zero availability", () => {
    const entries = makeEntries([0, 0, 0, 0, 0, 0, 0]);
    expect(computeDefaultIndex(entries)).toBe(0);
  });

  it("handles undefined teamWindow entries as zero availability", () => {
    const entries = makeEntries([0, 0, 4, 0, 0, 0, 0]);
    entries[2].teamWindow = undefined;
    expect(computeDefaultIndex(entries)).toBe(0);
  });
});

import { describe, it, expect } from "vitest";
import { computeSlotTally } from "@/lib/slot-scoring";

describe("computeSlotTally", () => {
  it("should count turnout as Prefer + OK, regardless of preference strength", () => {
    const result = computeSlotTally(
      [
        { playerId: "p1", level: "PREFER" },
        { playerId: "p2", level: "OK" },
        { playerId: "p3", level: "CANT" },
      ],
      ["p1", "p2", "p3"],
    );

    expect(result.turnout).toBe(2); // p1 + p2, not weighted by preference
    expect(result.preferCount).toBe(1);
    expect(result.okCount).toBe(1);
    expect(result.cantCount).toBe(1);
    expect(result.noResponseCount).toBe(0);
  });

  it("should rank higher turnout above stronger preference (more OK beats fewer Prefer)", () => {
    // 8 people all Prefer a slot
    const slotA = computeSlotTally(
      Array.from({ length: 8 }, (_, i) => ({
        playerId: `a${i}`,
        level: "PREFER" as const,
      })),
      Array.from({ length: 8 }, (_, i) => `a${i}`),
    );
    // 11 people all just OK with another slot
    const slotB = computeSlotTally(
      Array.from({ length: 11 }, (_, i) => ({
        playerId: `b${i}`,
        level: "OK" as const,
      })),
      Array.from({ length: 11 }, (_, i) => `b${i}`),
    );

    expect(slotA.turnout).toBe(8);
    expect(slotB.turnout).toBe(11);
    expect(slotB.turnout).toBeGreaterThan(slotA.turnout);
  });

  it("should count a roster player who never voted as a separate no-response bucket, not as an explicit Can't", () => {
    const result = computeSlotTally(
      [{ playerId: "p1", level: "PREFER" }],
      ["p1", "p2", "p3"],
    );

    expect(result.turnout).toBe(1);
    expect(result.cantCount).toBe(0); // nobody explicitly declined
    expect(result.noResponseCount).toBe(2); // p2 and p3, both silent
  });

  it("should return an all-no-response tally when nobody has voted", () => {
    const result = computeSlotTally([], ["p1", "p2"]);

    expect(result.turnout).toBe(0);
    expect(result.cantCount).toBe(0);
    expect(result.noResponseCount).toBe(2);
  });

  it("should return a zero tally for an empty roster", () => {
    const result = computeSlotTally(
      [{ playerId: "p1", level: "PREFER" }],
      [],
    );

    expect(result).toEqual({
      turnout: 0,
      preferCount: 0,
      okCount: 0,
      cantCount: 0,
      noResponseCount: 0,
    });
  });

  it("should ignore a vote from a player no longer on the roster", () => {
    const result = computeSlotTally(
      [{ playerId: "ghost", level: "PREFER" }],
      ["p1"],
    );

    expect(result.turnout).toBe(0);
    expect(result.noResponseCount).toBe(1);
  });
});

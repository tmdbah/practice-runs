import { describe, it, expect } from "vitest";
import { headcountStatus } from "@/components/SessionSummary";

describe("headcountStatus", () => {
  it("returns null when minPlayers is not set", () => {
    expect(headcountStatus("PRACTICE", null, 3)).toBeNull();
    expect(headcountStatus("GAME", null, 3)).toBeNull();
  });

  it("PRACTICE, below threshold: neutral amber 'need more' wording", () => {
    const result = headcountStatus("PRACTICE", 10, 6);
    expect(result).toEqual({
      text: "Need 4 more",
      className: "text-yellow-400 text-xs",
    });
  });

  it("PRACTICE, at/above threshold: green 'enough to book' wording", () => {
    expect(headcountStatus("PRACTICE", 10, 10)).toEqual({
      text: "✓ Enough to book",
      className: "text-green-400 text-xs font-semibold",
    });
    expect(headcountStatus("PRACTICE", 10, 12)).toEqual({
      text: "✓ Enough to book",
      className: "text-green-400 text-xs font-semibold",
    });
  });

  it("GAME, below threshold: urgent red 'avoid forfeit' wording", () => {
    const result = headcountStatus("GAME", 5, 3);
    expect(result).toEqual({
      text: "Need 2 more to avoid forfeit",
      className: "text-red-400 text-xs font-semibold",
    });
  });

  it("GAME, at/above threshold: green 'have enough to play' wording", () => {
    expect(headcountStatus("GAME", 5, 5)).toEqual({
      text: "✓ Have enough to play",
      className: "text-green-400 text-xs font-semibold",
    });
    expect(headcountStatus("GAME", 5, 7)).toEqual({
      text: "✓ Have enough to play",
      className: "text-green-400 text-xs font-semibold",
    });
  });
});

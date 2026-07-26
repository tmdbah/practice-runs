import type { VoteLevel } from "@/types/api";

export interface SlotTally {
  turnout: number; // players who said Prefer or OK — can make this slot, regardless of strength
  preferCount: number;
  okCount: number;
  cantCount: number; // explicit CANT votes
  noResponseCount: number; // roster players with no vote at all
}

/**
 * Tallies one slot's votes against the full team roster, not just the players who
 * voted. Turnout (Prefer + OK) is the primary signal for comparing slots — more
 * players who can make it outranks a smaller group with a stronger preference,
 * since the point is getting the best turnout, not optimizing for enthusiasm.
 * Preference strength (Prefer vs. OK) is informational only, a tiebreaker at
 * most — there's no blended score. A roster player with no vote counts the same
 * as an explicit Can't for turnout purposes (matches the app's "nobody is
 * assumed free until they say so" rule), but is tracked separately so the group
 * can tell "declined" apart from "hasn't looked yet."
 */
export function computeSlotTally(
  votes: { playerId: string; level: VoteLevel }[],
  rosterPlayerIds: string[],
): SlotTally {
  const levelByPlayerId = new Map(votes.map((v) => [v.playerId, v.level]));

  let preferCount = 0;
  let okCount = 0;
  let cantCount = 0;
  let noResponseCount = 0;

  for (const playerId of rosterPlayerIds) {
    const level = levelByPlayerId.get(playerId);
    if (level === "PREFER") preferCount++;
    else if (level === "OK") okCount++;
    else if (level === "CANT") cantCount++;
    else noResponseCount++;
  }

  return {
    turnout: preferCount + okCount,
    preferCount,
    okCount,
    cantCount,
    noResponseCount,
  };
}

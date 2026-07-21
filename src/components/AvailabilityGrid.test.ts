import { describe, it, expect } from "vitest";
import {
  groupSessionsByDate,
  hasSessionOnDate,
  isSessionConfirmedOnDate,
  isPlayerRsvpdIn,
} from "@/components/AvailabilityGrid";
import type { SessionResponse } from "@/types/api";

function makeSession(
  overrides: Partial<SessionResponse> = {},
): SessionResponse {
  return {
    id: "session-1",
    teamId: "team-1",
    venue: null,
    date: "2026-07-24T00:00:00.000Z",
    fromTime: "18:00",
    toTime: "20:00",
    costTotal: null,
    minPlayers: null,
    proposedById: null,
    status: "PROPOSED",
    rsvps: [],
    ...overrides,
  };
}

describe("groupSessionsByDate", () => {
  it("groups a session under its date (YYYY-MM-DD slice)", () => {
    const session = makeSession({ id: "s1", date: "2026-07-24T00:00:00.000Z" });
    const byDate = groupSessionsByDate([session]);
    expect(byDate.get("2026-07-24")).toEqual([session]);
  });

  it("groups multiple sessions on the same date into one array entry", () => {
    const s1 = makeSession({ id: "s1", date: "2026-07-24T00:00:00.000Z" });
    const s2 = makeSession({ id: "s2", date: "2026-07-24T00:00:00.000Z" });
    const byDate = groupSessionsByDate([s1, s2]);
    expect(byDate.get("2026-07-24")).toEqual([s1, s2]);
  });

  it("keeps sessions on different dates in separate entries", () => {
    const s1 = makeSession({ id: "s1", date: "2026-07-24T00:00:00.000Z" });
    const s2 = makeSession({ id: "s2", date: "2026-07-25T00:00:00.000Z" });
    const byDate = groupSessionsByDate([s1, s2]);
    expect(byDate.get("2026-07-24")).toEqual([s1]);
    expect(byDate.get("2026-07-25")).toEqual([s2]);
  });

  it("returns an empty map for an empty sessions array", () => {
    expect(groupSessionsByDate([]).size).toBe(0);
  });
});

describe("hasSessionOnDate", () => {
  it("returns true when a session exists on the date", () => {
    const byDate = groupSessionsByDate([
      makeSession({ date: "2026-07-24T00:00:00.000Z" }),
    ]);
    expect(hasSessionOnDate(byDate, "2026-07-24")).toBe(true);
  });

  it("returns false for a date with no sessions", () => {
    const byDate = groupSessionsByDate([
      makeSession({ date: "2026-07-24T00:00:00.000Z" }),
    ]);
    expect(hasSessionOnDate(byDate, "2026-07-25")).toBe(false);
  });

  it("returns false for an empty map", () => {
    expect(hasSessionOnDate(new Map(), "2026-07-24")).toBe(false);
  });

  it("returns false when the only session on that date is cancelled", () => {
    const byDate = groupSessionsByDate([
      makeSession({ date: "2026-07-24T00:00:00.000Z", status: "CANCELLED" }),
    ]);
    expect(hasSessionOnDate(byDate, "2026-07-24")).toBe(false);
  });

  it("returns true when a confirmed session exists on the date", () => {
    const byDate = groupSessionsByDate([
      makeSession({ date: "2026-07-24T00:00:00.000Z", status: "CONFIRMED" }),
    ]);
    expect(hasSessionOnDate(byDate, "2026-07-24")).toBe(true);
  });

  it("returns true when at least one of multiple sessions that day is live", () => {
    const s1 = makeSession({
      id: "s1",
      date: "2026-07-24T00:00:00.000Z",
      status: "CANCELLED",
    });
    const s2 = makeSession({
      id: "s2",
      date: "2026-07-24T00:00:00.000Z",
      status: "PROPOSED",
    });
    const byDate = groupSessionsByDate([s1, s2]);
    expect(hasSessionOnDate(byDate, "2026-07-24")).toBe(true);
  });
});

describe("isSessionConfirmedOnDate", () => {
  it("returns true when a confirmed session exists on the date", () => {
    const byDate = groupSessionsByDate([
      makeSession({ date: "2026-07-24T00:00:00.000Z", status: "CONFIRMED" }),
    ]);
    expect(isSessionConfirmedOnDate(byDate, "2026-07-24")).toBe(true);
  });

  it("returns false when the session is only proposed", () => {
    const byDate = groupSessionsByDate([
      makeSession({ date: "2026-07-24T00:00:00.000Z", status: "PROPOSED" }),
    ]);
    expect(isSessionConfirmedOnDate(byDate, "2026-07-24")).toBe(false);
  });

  it("returns false when the session is cancelled", () => {
    const byDate = groupSessionsByDate([
      makeSession({ date: "2026-07-24T00:00:00.000Z", status: "CANCELLED" }),
    ]);
    expect(isSessionConfirmedOnDate(byDate, "2026-07-24")).toBe(false);
  });

  it("returns false when no session exists on that date", () => {
    expect(isSessionConfirmedOnDate(new Map(), "2026-07-24")).toBe(false);
  });
});

describe("isPlayerRsvpdIn", () => {
  it("returns true when the player RSVP'd ANYTIME on a session that date", () => {
    const byDate = groupSessionsByDate([
      makeSession({
        date: "2026-07-24T00:00:00.000Z",
        rsvps: [{ playerId: "p1", playerName: "Josh", status: "ANYTIME" }],
      }),
    ]);
    expect(isPlayerRsvpdIn(byDate, "2026-07-24", "p1")).toBe(true);
  });

  it("returns false when the player RSVP'd UNAVAILABLE (out)", () => {
    const byDate = groupSessionsByDate([
      makeSession({
        date: "2026-07-24T00:00:00.000Z",
        rsvps: [{ playerId: "p1", playerName: "Josh", status: "UNAVAILABLE" }],
      }),
    ]);
    expect(isPlayerRsvpdIn(byDate, "2026-07-24", "p1")).toBe(false);
  });

  it("returns false when the session has no RSVPs yet", () => {
    const byDate = groupSessionsByDate([
      makeSession({ date: "2026-07-24T00:00:00.000Z", rsvps: [] }),
    ]);
    expect(isPlayerRsvpdIn(byDate, "2026-07-24", "p1")).toBe(false);
  });

  it("returns false when no session exists on that date", () => {
    const byDate = groupSessionsByDate([
      makeSession({
        date: "2026-07-24T00:00:00.000Z",
        rsvps: [{ playerId: "p1", playerName: "Josh", status: "ANYTIME" }],
      }),
    ]);
    expect(isPlayerRsvpdIn(byDate, "2026-07-25", "p1")).toBe(false);
  });

  it("returns false for a different player on the same session", () => {
    const byDate = groupSessionsByDate([
      makeSession({
        date: "2026-07-24T00:00:00.000Z",
        rsvps: [{ playerId: "p1", playerName: "Josh", status: "ANYTIME" }],
      }),
    ]);
    expect(isPlayerRsvpdIn(byDate, "2026-07-24", "p2")).toBe(false);
  });

  it("returns true when at least one of multiple sessions that day has the RSVP", () => {
    const s1 = makeSession({
      id: "s1",
      date: "2026-07-24T00:00:00.000Z",
      rsvps: [{ playerId: "p1", playerName: "Josh", status: "UNAVAILABLE" }],
    });
    const s2 = makeSession({
      id: "s2",
      date: "2026-07-24T00:00:00.000Z",
      rsvps: [{ playerId: "p1", playerName: "Josh", status: "ANYTIME" }],
    });
    const byDate = groupSessionsByDate([s1, s2]);
    expect(isPlayerRsvpdIn(byDate, "2026-07-24", "p1")).toBe(true);
  });

  it("returns false when the matching session is cancelled, even with an ANYTIME RSVP", () => {
    const byDate = groupSessionsByDate([
      makeSession({
        date: "2026-07-24T00:00:00.000Z",
        status: "CANCELLED",
        rsvps: [{ playerId: "p1", playerName: "Josh", status: "ANYTIME" }],
      }),
    ]);
    expect(isPlayerRsvpdIn(byDate, "2026-07-24", "p1")).toBe(false);
  });
});

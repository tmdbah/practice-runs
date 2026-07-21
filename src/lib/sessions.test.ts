import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    session: { findMany: vi.fn(), findFirst: vi.fn() },
  },
}));

import {
  toSessionResponse,
  getSessionsForTeam,
  getSessionForTeam,
} from "@/lib/sessions";
import { prisma } from "@/lib/prisma";

const mockSessionFindMany = vi.mocked(prisma.session.findMany);
const mockSessionFindFirst = vi.mocked(prisma.session.findFirst);

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    id: "s1",
    teamId: "team1",
    venueId: "v1",
    venue: {
      id: "v1",
      name: "INSZN",
      type: "RENTED_GYM" as const,
      address: "Chicago, IL",
      bookingUrl: "https://insznbasketball.com",
      costPerHour: 10000,
    },
    proposedById: "p1",
    date: new Date("2026-07-25T00:00:00.000Z"),
    fromTime: "18:00",
    toTime: "20:00",
    costTotal: 10000,
    minPlayers: 10,
    rsvps: [
      {
        playerId: "p1",
        status: "ANYTIME" as const,
        player: { id: "p1", name: "Marcus" },
      },
      {
        playerId: "p2",
        status: "UNAVAILABLE" as const,
        player: { id: "p2", name: "Darius" },
      },
    ],
    ...overrides,
  };
}

describe("toSessionResponse", () => {
  it("should map all scalar fields correctly", () => {
    const result = toSessionResponse(makeSession() as never);

    expect(result.id).toBe("s1");
    expect(result.teamId).toBe("team1");
    expect(result.fromTime).toBe("18:00");
    expect(result.toTime).toBe("20:00");
    expect(result.costTotal).toBe(10000);
    expect(result.minPlayers).toBe(10);
    expect(result.proposedById).toBe("p1");
  });

  it("should convert date to ISO string", () => {
    const result = toSessionResponse(makeSession() as never);
    expect(result.date).toBe("2026-07-25T00:00:00.000Z");
  });

  it("should map venue fields when venue is present", () => {
    const result = toSessionResponse(makeSession() as never);

    expect(result.venue).not.toBeNull();
    expect(result.venue?.id).toBe("v1");
    expect(result.venue?.name).toBe("INSZN");
    expect(result.venue?.type).toBe("RENTED_GYM");
    expect(result.venue?.address).toBe("Chicago, IL");
    expect(result.venue?.bookingUrl).toBe("https://insznbasketball.com");
    expect(result.venue?.costPerHour).toBe(10000);
  });

  it("should return null venue when venue is null", () => {
    const result = toSessionResponse(
      makeSession({ venueId: null, venue: null }) as never,
    );
    expect(result.venue).toBeNull();
  });

  it("should map rsvps with playerName", () => {
    const result = toSessionResponse(makeSession() as never);

    expect(result.rsvps).toHaveLength(2);
    expect(result.rsvps[0]).toEqual({
      playerId: "p1",
      playerName: "Marcus",
      status: "ANYTIME",
    });
    expect(result.rsvps[1]).toEqual({
      playerId: "p2",
      playerName: "Darius",
      status: "UNAVAILABLE",
    });
  });

  it("should return empty rsvps array when there are no RSVPs", () => {
    const result = toSessionResponse(makeSession({ rsvps: [] }) as never);
    expect(result.rsvps).toEqual([]);
  });

  it("should return null proposedById when proposedById is null", () => {
    const result = toSessionResponse(
      makeSession({ proposedById: null }) as never,
    );
    expect(result.proposedById).toBeNull();
  });
});

describe("getSessionsForTeam", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should query sessions scoped to the given teamId, ordered by date", async () => {
    mockSessionFindMany.mockResolvedValueOnce([makeSession()] as never);

    await getSessionsForTeam("team1");

    expect(mockSessionFindMany).toHaveBeenCalledWith({
      where: { teamId: "team1" },
      orderBy: { date: "asc" },
      include: expect.any(Object),
    });
  });

  it("should map results through toSessionResponse", async () => {
    mockSessionFindMany.mockResolvedValueOnce([makeSession()] as never);

    const result = await getSessionsForTeam("team1");

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("s1");
  });

  it("should return an empty array when the team has no sessions", async () => {
    mockSessionFindMany.mockResolvedValueOnce([]);

    const result = await getSessionsForTeam("team1");

    expect(result).toEqual([]);
  });
});

describe("getSessionForTeam", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should query scoped to both sessionId and teamId", async () => {
    mockSessionFindFirst.mockResolvedValueOnce(makeSession() as never);

    await getSessionForTeam("team1", "s1");

    expect(mockSessionFindFirst).toHaveBeenCalledWith({
      where: { id: "s1", teamId: "team1" },
      include: expect.any(Object),
    });
  });

  it("should map the result through toSessionResponse when found", async () => {
    mockSessionFindFirst.mockResolvedValueOnce(makeSession() as never);

    const result = await getSessionForTeam("team1", "s1");

    expect(result?.id).toBe("s1");
    expect(result?.teamId).toBe("team1");
  });

  it("should return null when no session matches (not found, or belongs to another team)", async () => {
    mockSessionFindFirst.mockResolvedValueOnce(null);

    const result = await getSessionForTeam("team1", "s1");

    expect(result).toBeNull();
  });
});

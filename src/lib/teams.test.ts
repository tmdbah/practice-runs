import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTeamGrid } from "@/lib/teams";

// Mock the prisma module so tests don't touch the real DB
vi.mock("@/lib/prisma", () => ({
  prisma: {
    team: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

const mockFindUnique = vi.mocked(prisma.team.findUnique);

function makePlayer(overrides: {
  id?: string;
  name?: string;
  number?: number | null;
  defaults?: Array<{
    dayOfWeek: number;
    status: "ANYTIME" | "SPECIFIC" | "UNAVAILABLE";
    fromTime?: string | null;
    toTime?: string | null;
    note?: string | null;
  }>;
}) {
  return {
    id: overrides.id ?? "player-1",
    name: overrides.name ?? "Marcus",
    number: overrides.number ?? null,
    defaults: (overrides.defaults ?? []).map((d) => ({
      id: `default-${d.dayOfWeek}`,
      playerId: overrides.id ?? "player-1",
      fromTime: null,
      toTime: null,
      note: null,
      ...d,
    })),
    overrides: [],
  };
}

describe("getTeamGrid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return null when team slug is not found", async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    const result = await getTeamGrid("unknown-slug");

    expect(result).toBeNull();
  });

  it("should return team metadata and players", async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: "team-1",
      slug: "demo-team",
      name: "Demo Squad",
      players: [makePlayer({ id: "p1", name: "Darius", number: 5, defaults: [] })],
    } as never);

    const result = await getTeamGrid("demo-team");

    expect(result?.team).toEqual({ slug: "demo-team", name: "Demo Squad" });
    expect(result?.players).toHaveLength(1);
    expect(result?.players[0].name).toBe("Darius");
    expect(result?.players[0].number).toBe(5);
  });

  it("should always return exactly 7 schedule entries per player", async () => {
    // Player has no DayDefault rows at all
    mockFindUnique.mockResolvedValueOnce({
      id: "team-1",
      slug: "demo-team",
      name: "Demo Squad",
      players: [makePlayer({ id: "p1", defaults: [] })],
    } as never);

    const result = await getTeamGrid("demo-team");

    expect(result?.players[0].schedule).toHaveLength(7);
  });

  it("should fill missing DayDefault rows with UNAVAILABLE", async () => {
    // Only Monday (1) and Friday (5) have rows; the rest are missing
    mockFindUnique.mockResolvedValueOnce({
      id: "team-1",
      slug: "demo-team",
      name: "Demo Squad",
      players: [
        makePlayer({
          id: "p1",
          defaults: [
            { dayOfWeek: 1, status: "ANYTIME" },
            { dayOfWeek: 5, status: "SPECIFIC", fromTime: "18:00", toTime: "21:00" },
          ],
        }),
      ],
    } as never);

    const result = await getTeamGrid("demo-team");
    const schedule = result!.players[0].schedule;

    expect(schedule).toHaveLength(7);
    // Days 0,2,3,4,6 should be UNAVAILABLE
    [0, 2, 3, 4, 6].forEach((day) => {
      expect(schedule[day].status).toBe("UNAVAILABLE");
      expect(schedule[day].fromTime).toBeNull();
      expect(schedule[day].toTime).toBeNull();
    });
    // Day 1 preserved
    expect(schedule[1].status).toBe("ANYTIME");
    // Day 5 preserved with times
    expect(schedule[5].status).toBe("SPECIFIC");
    expect(schedule[5].fromTime).toBe("18:00");
    expect(schedule[5].toTime).toBe("21:00");
  });

  it("should include dayOfWeek on every schedule entry", async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: "team-1",
      slug: "demo-team",
      name: "Demo Squad",
      players: [makePlayer({ id: "p1", defaults: [] })],
    } as never);

    const result = await getTeamGrid("demo-team");
    const schedule = result!.players[0].schedule;

    schedule.forEach((entry, i) => {
      expect(entry.dayOfWeek).toBe(i);
    });
  });

  it("should include note from DayDefault row", async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: "team-1",
      slug: "demo-team",
      name: "Demo Squad",
      players: [
        makePlayer({
          id: "p1",
          defaults: [{ dayOfWeek: 0, status: "UNAVAILABLE", note: "church" }],
        }),
      ],
    } as never);

    const result = await getTeamGrid("demo-team");

    expect(result?.players[0].schedule[0].note).toBe("church");
  });
});

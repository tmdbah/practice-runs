import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getTeamGrid, formatTime } from "@/lib/teams";

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
      players: [
        makePlayer({ id: "p1", name: "Darius", number: 5, defaults: [] }),
      ],
    } as never);

    const result = await getTeamGrid("demo-team");

    expect(result?.team).toEqual({
      id: "team-1",
      slug: "demo-team",
      name: "Demo Squad",
    });
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
            {
              dayOfWeek: 5,
              status: "SPECIFIC",
              fromTime: "18:00",
              toTime: "21:00",
            },
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

describe("formatTime", () => {
  it("should format a morning time", () => {
    expect(formatTime("09:30")).toBe("9:30am");
  });

  it("should format an afternoon time", () => {
    expect(formatTime("18:00")).toBe("6:00pm");
  });

  it("should format noon as pm", () => {
    expect(formatTime("12:00")).toBe("12:00pm");
  });

  it("should format midnight as am", () => {
    expect(formatTime("00:00")).toBe("12:00am");
  });
});

describe("getTeamGrid — Phase 2 thisWeek and teamWindows", () => {
  // Pin to 2026-07-19 UTC (Sunday=0); dates[0..6] = Jul 19–25, dow 0–6
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-19T06:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return thisWeek with 7 entries per player", async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: "team-1",
      slug: "demo-team",
      name: "Demo",
      players: [makePlayer({ id: "p1", defaults: [] })],
    } as never);

    const result = await getTeamGrid("demo-team");

    expect(result?.players[0].thisWeek).toHaveLength(7);
  });

  it("should set isOverridden false and use DayDefault when no override exists", async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: "team-1",
      slug: "demo-team",
      name: "Demo",
      players: [
        makePlayer({
          id: "p1",
          defaults: [{ dayOfWeek: 1, status: "ANYTIME" }],
        }),
      ],
    } as never);

    const result = await getTeamGrid("demo-team");
    const monCell = result!.players[0].thisWeek.find((c) => c.dayOfWeek === 1);

    expect(monCell?.isOverridden).toBe(false);
    expect(monCell?.effectiveStatus).toBe("ANYTIME");
  });

  it("should fall back to UNAVAILABLE for all days when player has no defaults", async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: "team-1",
      slug: "demo-team",
      name: "Demo",
      players: [makePlayer({ id: "p1", defaults: [] })],
    } as never);

    const result = await getTeamGrid("demo-team");

    result!.players[0].thisWeek.forEach((cell) => {
      expect(cell.effectiveStatus).toBe("UNAVAILABLE");
      expect(cell.isOverridden).toBe(false);
    });
  });

  it("should set isOverridden true and use override values when override exists", async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: "team-1",
      slug: "demo-team",
      name: "Demo",
      players: [
        {
          id: "p1",
          name: "Marcus",
          number: null,
          defaults: [
            {
              id: "d1",
              playerId: "p1",
              dayOfWeek: 0,
              status: "UNAVAILABLE",
              fromTime: null,
              toTime: null,
              note: null,
            },
          ],
          overrides: [
            {
              id: "o1",
              playerId: "p1",
              date: new Date("2026-07-19T00:00:00.000Z"), // Sunday = dow 0
              status: "ANYTIME",
              fromTime: null,
              toTime: null,
              note: "game day",
            },
          ],
        },
      ],
    } as never);

    const result = await getTeamGrid("demo-team");
    const sunCell = result!.players[0].thisWeek.find((c) => c.dayOfWeek === 0);

    expect(sunCell?.isOverridden).toBe(true);
    expect(sunCell?.effectiveStatus).toBe("ANYTIME");
    expect(sunCell?.note).toBe("game day");
  });

  it("should return teamWindows with 7 entries", async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: "team-1",
      slug: "demo-team",
      name: "Demo",
      players: [makePlayer({ id: "p1", defaults: [] })],
    } as never);

    const result = await getTeamGrid("demo-team");

    expect(result?.teamWindows).toHaveLength(7);
  });

  it("should return availableCount=0 and window=null when all players UNAVAILABLE", async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: "team-1",
      slug: "demo-team",
      name: "Demo",
      players: [makePlayer({ id: "p1", defaults: [] })],
    } as never);

    const result = await getTeamGrid("demo-team");

    result!.teamWindows.forEach((tw) => {
      expect(tw.availableCount).toBe(0);
      expect(tw.window).toBeNull();
    });
  });

  it("should compute window as full day for an ANYTIME player", async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: "team-1",
      slug: "demo-team",
      name: "Demo",
      players: [
        makePlayer({
          id: "p1",
          defaults: [{ dayOfWeek: 1, status: "ANYTIME" }], // Monday
        }),
      ],
    } as never);

    const result = await getTeamGrid("demo-team");
    const monWindow = result!.teamWindows.find((w) => w.dayOfWeek === 1);

    expect(monWindow?.availableCount).toBe(1);
    expect(monWindow?.window).toEqual({ from: "00:00", to: "23:59" });
  });

  it("should return window=null when players have no overlapping time", async () => {
    // Player A: Mon 18:00–21:00 / Player B: Mon 08:00–10:00 — no overlap
    mockFindUnique.mockResolvedValueOnce({
      id: "team-1",
      slug: "demo-team",
      name: "Demo",
      players: [
        makePlayer({
          id: "p1",
          defaults: [
            {
              dayOfWeek: 1,
              status: "SPECIFIC",
              fromTime: "18:00",
              toTime: "21:00",
            },
          ],
        }),
        makePlayer({
          id: "p2",
          defaults: [
            {
              dayOfWeek: 1,
              status: "SPECIFIC",
              fromTime: "08:00",
              toTime: "10:00",
            },
          ],
        }),
      ],
    } as never);

    const result = await getTeamGrid("demo-team");
    const monWindow = result!.teamWindows.find((w) => w.dayOfWeek === 1);

    expect(monWindow?.availableCount).toBe(2);
    expect(monWindow?.window).toBeNull();
  });

  it("should compute the correct overlapping window for multiple SPECIFIC players", async () => {
    // Player A: Mon 17:00–22:00 / Player B: Mon 18:00–21:00 → overlap 18:00–21:00
    mockFindUnique.mockResolvedValueOnce({
      id: "team-1",
      slug: "demo-team",
      name: "Demo",
      players: [
        makePlayer({
          id: "p1",
          defaults: [
            {
              dayOfWeek: 1,
              status: "SPECIFIC",
              fromTime: "17:00",
              toTime: "22:00",
            },
          ],
        }),
        makePlayer({
          id: "p2",
          defaults: [
            {
              dayOfWeek: 1,
              status: "SPECIFIC",
              fromTime: "18:00",
              toTime: "21:00",
            },
          ],
        }),
      ],
    } as never);

    const result = await getTeamGrid("demo-team");
    const monWindow = result!.teamWindows.find((w) => w.dayOfWeek === 1);

    expect(monWindow?.availableCount).toBe(2);
    expect(monWindow?.window).toEqual({ from: "18:00", to: "21:00" });
  });
});

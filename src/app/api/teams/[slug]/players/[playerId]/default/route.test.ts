import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    player: { findFirst: vi.fn() },
    dayDefault: { upsert: vi.fn() },
  },
}));

import { PATCH } from "@/app/api/teams/[slug]/players/[playerId]/default/route";
import { prisma } from "@/lib/prisma";

const mockFindFirst = vi.mocked(prisma.player.findFirst);
const mockUpsert = vi.mocked(prisma.dayDefault.upsert);

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/teams/demo-team/players/p1/default", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeParams(slug = "demo-team", playerId = "p1") {
  return { params: Promise.resolve({ slug, playerId }) };
}

describe("PATCH /api/teams/[slug]/players/[playerId]/default", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: player exists
    mockFindFirst.mockResolvedValue({ id: "p1" } as never);
    mockUpsert.mockResolvedValue({} as never);
  });

  it("should return 404 when player is not found in team", async () => {
    mockFindFirst.mockResolvedValueOnce(null);

    const res = await PATCH(
      makeRequest({ dayOfWeek: 1, status: "ANYTIME" }),
      makeParams()
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Player not found");
  });

  it("should return 400 for dayOfWeek below 0", async () => {
    const res = await PATCH(
      makeRequest({ dayOfWeek: -1, status: "ANYTIME" }),
      makeParams()
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid dayOfWeek");
  });

  it("should return 400 for dayOfWeek above 6", async () => {
    const res = await PATCH(
      makeRequest({ dayOfWeek: 7, status: "ANYTIME" }),
      makeParams()
    );

    expect(res.status).toBe(400);
  });

  it("should return 400 for non-integer dayOfWeek", async () => {
    const res = await PATCH(
      makeRequest({ dayOfWeek: 1.5, status: "ANYTIME" }),
      makeParams()
    );

    expect(res.status).toBe(400);
  });

  it("should return 400 for invalid status value", async () => {
    const res = await PATCH(
      makeRequest({ dayOfWeek: 1, status: "FREE" }),
      makeParams()
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid status");
  });

  it("should return 200 and upsert for a valid ANYTIME request", async () => {
    const res = await PATCH(
      makeRequest({ dayOfWeek: 1, status: "ANYTIME" }),
      makeParams()
    );

    expect(res.status).toBe(200);
    expect(mockUpsert).toHaveBeenCalledOnce();
  });

  it("should persist fromTime and toTime when status is SPECIFIC", async () => {
    await PATCH(
      makeRequest({ dayOfWeek: 3, status: "SPECIFIC", fromTime: "18:00", toTime: "21:00" }),
      makeParams()
    );

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ fromTime: "18:00", toTime: "21:00" }),
        create: expect.objectContaining({ fromTime: "18:00", toTime: "21:00" }),
      })
    );
  });

  it("should clear fromTime and toTime when status is ANYTIME", async () => {
    await PATCH(
      makeRequest({ dayOfWeek: 1, status: "ANYTIME", fromTime: "18:00", toTime: "21:00" }),
      makeParams()
    );

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ fromTime: null, toTime: null }),
        create: expect.objectContaining({ fromTime: null, toTime: null }),
      })
    );
  });

  it("should clear fromTime and toTime when status is UNAVAILABLE", async () => {
    await PATCH(
      makeRequest({ dayOfWeek: 1, status: "UNAVAILABLE", fromTime: "18:00" }),
      makeParams()
    );

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ fromTime: null, toTime: null }),
      })
    );
  });

  it("should persist note regardless of status", async () => {
    await PATCH(
      makeRequest({ dayOfWeek: 2, status: "UNAVAILABLE", note: "church" }),
      makeParams()
    );

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ note: "church" }),
        create: expect.objectContaining({ note: "church" }),
      })
    );
  });

  it("should upsert with the correct playerId and dayOfWeek composite key", async () => {
    await PATCH(
      makeRequest({ dayOfWeek: 4, status: "ANYTIME" }),
      makeParams("demo-team", "player-xyz")
    );

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { playerId_dayOfWeek: { playerId: "player-xyz", dayOfWeek: 4 } },
      })
    );
  });
});

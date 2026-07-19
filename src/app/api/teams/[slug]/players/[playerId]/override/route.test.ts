import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    player: { findFirst: vi.fn() },
    dateOverride: { upsert: vi.fn() },
  },
}));

import { PATCH } from "@/app/api/teams/[slug]/players/[playerId]/override/route";
import { prisma } from "@/lib/prisma";

const mockFindFirst = vi.mocked(prisma.player.findFirst);
const mockUpsert = vi.mocked(prisma.dateOverride.upsert);

function makeRequest(body: unknown): Request {
  return new Request(
    "http://localhost/api/teams/demo-team/players/p1/override",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

function makeParams(slug = "demo-team", playerId = "p1") {
  return { params: Promise.resolve({ slug, playerId }) };
}

describe("PATCH /api/teams/[slug]/players/[playerId]/override", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindFirst.mockResolvedValue({ id: "p1" } as never);
    mockUpsert.mockResolvedValue({} as never);
  });

  it("should return 404 when player is not found in team", async () => {
    mockFindFirst.mockResolvedValueOnce(null);

    const res = await PATCH(
      makeRequest({ date: "2026-07-21", status: "ANYTIME" }),
      makeParams(),
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Player not found");
  });

  it("should return 400 for an invalid date format", async () => {
    const res = await PATCH(
      makeRequest({ date: "07/21/2026", status: "ANYTIME" }),
      makeParams(),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid date format");
  });

  it("should return 400 for an invalid status value", async () => {
    const res = await PATCH(
      makeRequest({ date: "2026-07-21", status: "FREE" }),
      makeParams(),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid status");
  });

  it("should return 200 and upsert for a valid ANYTIME request", async () => {
    const res = await PATCH(
      makeRequest({ date: "2026-07-21", status: "ANYTIME" }),
      makeParams(),
    );

    expect(res.status).toBe(200);
    expect(mockUpsert).toHaveBeenCalledOnce();
  });

  it("should persist fromTime and toTime when status is SPECIFIC", async () => {
    await PATCH(
      makeRequest({
        date: "2026-07-21",
        status: "SPECIFIC",
        fromTime: "18:00",
        toTime: "21:00",
      }),
      makeParams(),
    );

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ fromTime: "18:00", toTime: "21:00" }),
        create: expect.objectContaining({ fromTime: "18:00", toTime: "21:00" }),
      }),
    );
  });

  it("should clear fromTime and toTime when status is ANYTIME", async () => {
    await PATCH(
      makeRequest({
        date: "2026-07-21",
        status: "ANYTIME",
        fromTime: "18:00",
        toTime: "21:00",
      }),
      makeParams(),
    );

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ fromTime: null, toTime: null }),
        create: expect.objectContaining({ fromTime: null, toTime: null }),
      }),
    );
  });

  it("should clear fromTime and toTime when status is UNAVAILABLE", async () => {
    await PATCH(
      makeRequest({
        date: "2026-07-21",
        status: "UNAVAILABLE",
        fromTime: "18:00",
      }),
      makeParams(),
    );

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ fromTime: null, toTime: null }),
      }),
    );
  });

  it("should persist note on the override independently", async () => {
    await PATCH(
      makeRequest({
        date: "2026-07-21",
        status: "UNAVAILABLE",
        note: "church",
      }),
      makeParams(),
    );

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ note: "church" }),
        create: expect.objectContaining({ note: "church" }),
      }),
    );
  });

  it("should upsert using the correct UTC midnight date", async () => {
    await PATCH(
      makeRequest({ date: "2026-07-21", status: "ANYTIME" }),
      makeParams(),
    );

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          playerId_date: expect.objectContaining({
            date: new Date("2026-07-21T00:00:00.000Z"),
          }),
        }),
      }),
    );
  });
});

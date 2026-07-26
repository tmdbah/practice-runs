import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    team: { findUnique: vi.fn() },
    session: { findFirst: vi.fn(), findUnique: vi.fn() },
    player: { findFirst: vi.fn() },
    slotVote: { upsert: vi.fn() },
  },
}));

vi.mock("@/lib/sessions", () => ({
  sessionInclude: {
    venue: true,
    rsvps: { include: { player: { select: { id: true, name: true } } } },
    votes: { include: { player: { select: { id: true, name: true } } } },
  },
  toSessionResponse: vi.fn((s: { id: string }) => ({ id: s.id, _mapped: true })),
}));

import { PUT } from "@/app/api/teams/[slug]/sessions/[sessionId]/vote/route";
import { prisma } from "@/lib/prisma";

const mockTeamFindUnique = vi.mocked(prisma.team.findUnique);
const mockSessionFindFirst = vi.mocked(prisma.session.findFirst);
const mockSessionFindUnique = vi.mocked(prisma.session.findUnique);
const mockPlayerFindFirst = vi.mocked(prisma.player.findFirst);
const mockSlotVoteUpsert = vi.mocked(prisma.slotVote.upsert);

function makeRequest(body: unknown): Request {
  return new Request(
    "http://localhost/api/teams/demo-team/sessions/s1/vote",
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

function makeParams(slug = "demo-team", sessionId = "s1") {
  return { params: Promise.resolve({ slug, sessionId }) };
}

function makeSessionRow(overrides: Record<string, unknown> = {}) {
  return { id: "s1", teamId: "team1", groupId: "g1", status: "PROPOSED", ...overrides };
}

describe("PUT /api/teams/[slug]/sessions/[sessionId]/vote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTeamFindUnique.mockResolvedValue({ id: "team1" } as never);
    mockSessionFindFirst.mockResolvedValue(makeSessionRow() as never);
    mockSessionFindUnique.mockResolvedValue(makeSessionRow() as never);
    mockPlayerFindFirst.mockResolvedValue({ id: "p1" } as never);
    mockSlotVoteUpsert.mockResolvedValue({} as never);
  });

  it("should return 404 when team is not found", async () => {
    mockTeamFindUnique.mockResolvedValueOnce(null);

    const res = await PUT(
      makeRequest({ playerId: "p1", level: "PREFER" }),
      makeParams(),
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Team not found");
  });

  it("should return 404 when session does not belong to team", async () => {
    mockSessionFindFirst.mockResolvedValueOnce(null);

    const res = await PUT(
      makeRequest({ playerId: "p1", level: "PREFER" }),
      makeParams(),
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Session not found");
  });

  it("should return 400 when the session has no groupId", async () => {
    mockSessionFindFirst.mockResolvedValueOnce(
      makeSessionRow({ groupId: null }) as never,
    );

    const res = await PUT(
      makeRequest({ playerId: "p1", level: "PREFER" }),
      makeParams(),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("This session doesn't support slot voting");
    expect(mockSlotVoteUpsert).not.toHaveBeenCalled();
  });

  it("should return 400 when voting is no longer open (e.g. locked in)", async () => {
    mockSessionFindFirst.mockResolvedValueOnce(
      makeSessionRow({ status: "CONFIRMED" }) as never,
    );

    const res = await PUT(
      makeRequest({ playerId: "p1", level: "PREFER" }),
      makeParams(),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Voting is closed for this slot");
    expect(mockSlotVoteUpsert).not.toHaveBeenCalled();
  });

  it("should return 404 when player does not belong to team", async () => {
    mockPlayerFindFirst.mockResolvedValueOnce(null);

    const res = await PUT(
      makeRequest({ playerId: "p1", level: "PREFER" }),
      makeParams(),
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Player not found");
  });

  it("should return 400 when playerId is missing", async () => {
    const res = await PUT(makeRequest({ level: "PREFER" }), makeParams());
    expect(res.status).toBe(400);
  });

  it("should return 400 when level is invalid", async () => {
    const res = await PUT(
      makeRequest({ playerId: "p1", level: "MAYBE" }),
      makeParams(),
    );
    expect(res.status).toBe(400);
  });

  it("should return 400 for invalid JSON", async () => {
    const req = new Request(
      "http://localhost/api/teams/demo-team/sessions/s1/vote",
      { method: "PUT", headers: { "Content-Type": "application/json" }, body: "{bad" },
    );

    const res = await PUT(req, makeParams());

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid JSON");
  });

  it.each(["PREFER", "OK", "CANT"] as const)(
    "should upsert the vote with %s level",
    async (level) => {
      await PUT(makeRequest({ playerId: "p1", level }), makeParams());

      expect(mockSlotVoteUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ playerId: "p1", level }),
          update: { level },
        }),
      );
    },
  );

  it("should return the updated session via toSessionResponse", async () => {
    const res = await PUT(
      makeRequest({ playerId: "p1", level: "PREFER" }),
      makeParams(),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("s1");
  });
});

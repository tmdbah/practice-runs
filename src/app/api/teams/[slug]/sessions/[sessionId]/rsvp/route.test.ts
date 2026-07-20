import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    team: { findUnique: vi.fn() },
    session: { findFirst: vi.fn(), findUnique: vi.fn() },
    player: { findFirst: vi.fn() },
    rsvp: { upsert: vi.fn() },
  },
}));

vi.mock("@/lib/sessions", () => ({
  sessionInclude: { venue: true, rsvps: { include: { player: { select: { id: true, name: true } } } } },
  toSessionResponse: vi.fn((s: { id: string }) => ({ id: s.id, _mapped: true })),
}));

import { PUT } from "@/app/api/teams/[slug]/sessions/[sessionId]/rsvp/route";
import { prisma } from "@/lib/prisma";

const mockTeamFindUnique = vi.mocked(prisma.team.findUnique);
const mockSessionFindFirst = vi.mocked(prisma.session.findFirst);
const mockSessionFindUnique = vi.mocked(prisma.session.findUnique);
const mockPlayerFindFirst = vi.mocked(prisma.player.findFirst);
const mockRsvpUpsert = vi.mocked(prisma.rsvp.upsert);

function makeRequest(body: unknown): Request {
  return new Request(
    "http://localhost/api/teams/demo-team/sessions/s1/rsvp",
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

const fakeSession = { id: "s1", teamId: "team1" };

describe("PUT /api/teams/[slug]/sessions/[sessionId]/rsvp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTeamFindUnique.mockResolvedValue({ id: "team1" } as never);
    mockSessionFindFirst.mockResolvedValue(fakeSession as never);
    mockSessionFindUnique.mockResolvedValue(fakeSession as never);
    mockPlayerFindFirst.mockResolvedValue({ id: "p1" } as never);
    mockRsvpUpsert.mockResolvedValue({} as never);
  });

  it("should return 404 when team is not found", async () => {
    mockTeamFindUnique.mockResolvedValueOnce(null);

    const res = await PUT(
      makeRequest({ playerId: "p1", status: "ANYTIME" }),
      makeParams(),
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Team not found");
  });

  it("should return 404 when session does not belong to team", async () => {
    mockSessionFindFirst.mockResolvedValueOnce(null);

    const res = await PUT(
      makeRequest({ playerId: "p1", status: "ANYTIME" }),
      makeParams(),
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Session not found");
  });

  it("should return 404 when player does not belong to team", async () => {
    mockPlayerFindFirst.mockResolvedValueOnce(null);

    const res = await PUT(
      makeRequest({ playerId: "p1", status: "ANYTIME" }),
      makeParams(),
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Player not found");
  });

  it("should return 400 when playerId is missing", async () => {
    const res = await PUT(
      makeRequest({ status: "ANYTIME" }),
      makeParams(),
    );

    expect(res.status).toBe(400);
  });

  it("should return 400 when status is invalid", async () => {
    const res = await PUT(
      makeRequest({ playerId: "p1", status: "MAYBE" }),
      makeParams(),
    );

    expect(res.status).toBe(400);
  });

  it("should return 400 for invalid JSON", async () => {
    const req = new Request(
      "http://localhost/api/teams/demo-team/sessions/s1/rsvp",
      { method: "PUT", headers: { "Content-Type": "application/json" }, body: "{bad" },
    );

    const res = await PUT(req, makeParams());

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid JSON");
  });

  it("should upsert the RSVP with ANYTIME status", async () => {
    await PUT(makeRequest({ playerId: "p1", status: "ANYTIME" }), makeParams());

    expect(mockRsvpUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ playerId: "p1", status: "ANYTIME" }),
        update: { status: "ANYTIME" },
      }),
    );
  });

  it("should upsert the RSVP with UNAVAILABLE status", async () => {
    await PUT(
      makeRequest({ playerId: "p1", status: "UNAVAILABLE" }),
      makeParams(),
    );

    expect(mockRsvpUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { status: "UNAVAILABLE" },
      }),
    );
  });

  it("should return the updated session via toSessionResponse", async () => {
    const res = await PUT(
      makeRequest({ playerId: "p1", status: "ANYTIME" }),
      makeParams(),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("s1");
  });
});

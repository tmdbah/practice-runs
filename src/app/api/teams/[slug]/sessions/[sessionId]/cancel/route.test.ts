import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    team: { findUnique: vi.fn() },
    session: { findFirst: vi.fn(), update: vi.fn() },
  },
}));

import { PATCH } from "@/app/api/teams/[slug]/sessions/[sessionId]/cancel/route";
import { prisma } from "@/lib/prisma";

const mockTeamFindUnique = vi.mocked(prisma.team.findUnique);
const mockSessionFindFirst = vi.mocked(prisma.session.findFirst);
const mockSessionUpdate = vi.mocked(prisma.session.update);

function makeRequest(): Request {
  return new Request(
    "http://localhost/api/teams/demo-team/sessions/s1/cancel",
    { method: "PATCH" },
  );
}

function makeParams(slug = "demo-team", sessionId = "s1") {
  return { params: Promise.resolve({ slug, sessionId }) };
}

function makeSessionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "s1",
    teamId: "team1",
    venueId: null,
    venue: null,
    proposedById: "p1",
    date: new Date("2026-07-25T00:00:00.000Z"),
    fromTime: "18:00",
    toTime: "20:00",
    costTotal: null,
    minPlayers: null,
    status: "PROPOSED",
    rsvps: [],
    ...overrides,
  };
}

describe("PATCH /api/teams/[slug]/sessions/[sessionId]/cancel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTeamFindUnique.mockResolvedValue({ id: "team1" } as never);
    mockSessionFindFirst.mockResolvedValue(makeSessionRow() as never);
    mockSessionUpdate.mockResolvedValue(
      makeSessionRow({ status: "CANCELLED" }) as never,
    );
  });

  it("should return 404 when the team is not found", async () => {
    mockTeamFindUnique.mockResolvedValueOnce(null);

    const res = await PATCH(makeRequest(), makeParams());

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Team not found");
    expect(mockSessionUpdate).not.toHaveBeenCalled();
  });

  it("should return 404 when the session is not found on this team", async () => {
    mockSessionFindFirst.mockResolvedValueOnce(null);

    const res = await PATCH(makeRequest(), makeParams());

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Session not found");
    expect(mockSessionUpdate).not.toHaveBeenCalled();
  });

  it("should scope the session lookup to the resolved team", async () => {
    await PATCH(makeRequest(), makeParams());

    expect(mockSessionFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "s1", teamId: "team1" } }),
    );
  });

  it("should transition a proposed session to cancelled and return 200", async () => {
    const res = await PATCH(makeRequest(), makeParams());

    expect(res.status).toBe(200);
    expect(mockSessionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "s1" },
        data: { status: "CANCELLED" },
      }),
    );
    const body = await res.json();
    expect(body.status).toBe("CANCELLED");
  });

  it("should transition a confirmed session to cancelled and return 200", async () => {
    mockSessionFindFirst.mockResolvedValueOnce(
      makeSessionRow({ status: "CONFIRMED" }) as never,
    );

    const res = await PATCH(makeRequest(), makeParams());

    expect(res.status).toBe(200);
    expect(mockSessionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "CANCELLED" } }),
    );
  });

  it("should no-op and return 200 when already cancelled", async () => {
    mockSessionFindFirst.mockResolvedValueOnce(
      makeSessionRow({ status: "CANCELLED" }) as never,
    );

    const res = await PATCH(makeRequest(), makeParams());

    expect(res.status).toBe(200);
    expect(mockSessionUpdate).not.toHaveBeenCalled();
    const body = await res.json();
    expect(body.status).toBe("CANCELLED");
  });

  it("should leave existing RSVPs untouched in the response", async () => {
    mockSessionFindFirst.mockResolvedValueOnce(
      makeSessionRow({
        rsvps: [
          {
            playerId: "p2",
            status: "ANYTIME",
            player: { id: "p2", name: "Amir" },
          },
        ],
      }) as never,
    );
    mockSessionUpdate.mockResolvedValueOnce(
      makeSessionRow({
        status: "CANCELLED",
        rsvps: [
          {
            playerId: "p2",
            status: "ANYTIME",
            player: { id: "p2", name: "Amir" },
          },
        ],
      }) as never,
    );

    const res = await PATCH(makeRequest(), makeParams());

    const body = await res.json();
    expect(body.rsvps).toEqual([
      { playerId: "p2", playerName: "Amir", status: "ANYTIME" },
    ]);
  });
});

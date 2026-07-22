import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    team: { findUnique: vi.fn() },
    session: { findFirst: vi.fn(), update: vi.fn(), delete: vi.fn() },
    venue: { findUnique: vi.fn() },
  },
}));

import { PATCH, DELETE } from "@/app/api/teams/[slug]/sessions/[sessionId]/route";
import { prisma } from "@/lib/prisma";

const mockTeamFindUnique = vi.mocked(prisma.team.findUnique);
const mockSessionFindFirst = vi.mocked(prisma.session.findFirst);
const mockSessionUpdate = vi.mocked(prisma.session.update);
const mockSessionDelete = vi.mocked(prisma.session.delete);
const mockVenueFindUnique = vi.mocked(prisma.venue.findUnique);

function makeRequest(body: unknown): Request {
  return new Request(
    "http://localhost/api/teams/demo-team/sessions/s1",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

function makeInvalidJsonRequest(): Request {
  return new Request("http://localhost/api/teams/demo-team/sessions/s1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: "{not json",
  });
}

function makeDeleteRequest(): Request {
  return new Request("http://localhost/api/teams/demo-team/sessions/s1", {
    method: "DELETE",
  });
}

function makeParams(slug = "demo-team", sessionId = "s1") {
  return { params: Promise.resolve({ slug, sessionId }) };
}

const existingSessionRow = { id: "s1", teamId: "team1" };

function makeUpdatedSession(overrides: Record<string, unknown> = {}) {
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
    rsvps: [],
    ...overrides,
  };
}

describe("PATCH /api/teams/[slug]/sessions/[sessionId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTeamFindUnique.mockResolvedValue({ id: "team1" } as never);
    mockSessionFindFirst.mockResolvedValue(existingSessionRow as never);
    mockSessionUpdate.mockResolvedValue(makeUpdatedSession() as never);
    mockVenueFindUnique.mockResolvedValue({ id: "v1" } as never);
  });

  it("should return 404 when the team is not found", async () => {
    mockTeamFindUnique.mockResolvedValueOnce(null);

    const res = await PATCH(
      makeRequest({ date: "2026-07-25", fromTime: "18:00", toTime: "20:00" }),
      makeParams(),
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Team not found");
  });

  it("should return 404 when the session is not found on this team", async () => {
    mockSessionFindFirst.mockResolvedValueOnce(null);

    const res = await PATCH(
      makeRequest({ date: "2026-07-25", fromTime: "18:00", toTime: "20:00" }),
      makeParams(),
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Session not found");
  });

  it("should return 400 for invalid JSON", async () => {
    const res = await PATCH(makeInvalidJsonRequest(), makeParams());

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid JSON");
  });

  it("should return 400 when date, fromTime, or toTime are missing", async () => {
    const res = await PATCH(
      makeRequest({ fromTime: "18:00", toTime: "20:00" }),
      makeParams(),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("date, fromTime, and toTime are required");
  });

  it("should return 400 for an invalid date", async () => {
    const res = await PATCH(
      makeRequest({ date: "not-a-date", fromTime: "18:00", toTime: "20:00" }),
      makeParams(),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid date");
  });

  it("should return 400 when the given venueId doesn't exist", async () => {
    mockVenueFindUnique.mockResolvedValueOnce(null);

    const res = await PATCH(
      makeRequest({
        venueId: "bad-venue",
        date: "2026-07-25",
        fromTime: "18:00",
        toTime: "20:00",
      }),
      makeParams(),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Venue not found");
  });

  it("should update the session and return 200 on success", async () => {
    const res = await PATCH(
      makeRequest({ date: "2026-07-25", fromTime: "18:00", toTime: "20:00" }),
      makeParams(),
    );

    expect(res.status).toBe(200);
    expect(mockSessionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "s1" },
        data: expect.objectContaining({
          venueId: null,
          date: new Date("2026-07-25T00:00:00.000Z"),
          fromTime: "18:00",
          toTime: "20:00",
          costTotal: null,
          minPlayers: null,
        }),
      }),
    );
  });

  it("should clear venue, cost, and minPlayers when omitted", async () => {
    await PATCH(
      makeRequest({
        date: "2026-07-25",
        fromTime: "18:00",
        toTime: "20:00",
      }),
      makeParams(),
    );

    expect(mockSessionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          venueId: null,
          costTotal: null,
          minPlayers: null,
        }),
      }),
    );
  });

  it("should never write proposedById, kind, or rsvps — kind is immutable via edit", async () => {
    await PATCH(
      makeRequest({
        date: "2026-07-25",
        fromTime: "18:00",
        toTime: "20:00",
        kind: "GAME", // even if a caller sends it, EditSessionBody has no such field
      }),
      makeParams(),
    );

    const call = mockSessionUpdate.mock.calls[0]?.[0] as { data: object };
    expect(call.data).not.toHaveProperty("proposedById");
    expect(call.data).not.toHaveProperty("kind");
    expect(call.data).not.toHaveProperty("rsvps");
  });

  it("should leave existing RSVPs untouched in the response", async () => {
    mockSessionUpdate.mockResolvedValueOnce(
      makeUpdatedSession({
        rsvps: [
          {
            playerId: "p2",
            status: "ANYTIME",
            player: { id: "p2", name: "Amir" },
          },
        ],
      }) as never,
    );

    const res = await PATCH(
      makeRequest({ date: "2026-07-25", fromTime: "18:00", toTime: "20:00" }),
      makeParams(),
    );

    const body = await res.json();
    expect(body.rsvps).toEqual([
      { playerId: "p2", playerName: "Amir", status: "ANYTIME" },
    ]);
  });
});

describe("DELETE /api/teams/[slug]/sessions/[sessionId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTeamFindUnique.mockResolvedValue({ id: "team1" } as never);
    mockSessionFindFirst.mockResolvedValue(existingSessionRow as never);
    mockSessionDelete.mockResolvedValue({} as never);
  });

  it("should return 404 when the team is not found", async () => {
    mockTeamFindUnique.mockResolvedValueOnce(null);

    const res = await DELETE(makeDeleteRequest(), makeParams());

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Team not found");
    expect(mockSessionDelete).not.toHaveBeenCalled();
  });

  it("should return 404 when the session is not found on this team", async () => {
    mockSessionFindFirst.mockResolvedValueOnce(null);

    const res = await DELETE(makeDeleteRequest(), makeParams());

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Session not found");
    expect(mockSessionDelete).not.toHaveBeenCalled();
  });

  it("should scope the session lookup to the resolved team", async () => {
    await DELETE(makeDeleteRequest(), makeParams());

    expect(mockSessionFindFirst).toHaveBeenCalledWith({
      where: { id: "s1", teamId: "team1" },
    });
  });

  it("should delete the session and return 204 on success", async () => {
    const res = await DELETE(makeDeleteRequest(), makeParams());

    expect(res.status).toBe(204);
    expect(mockSessionDelete).toHaveBeenCalledWith({ where: { id: "s1" } });
  });

  it("should return an empty body on success", async () => {
    const res = await DELETE(makeDeleteRequest(), makeParams());

    const text = await res.text();
    expect(text).toBe("");
  });
});

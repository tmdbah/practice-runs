import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    team: { findUnique: vi.fn() },
    session: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    player: { findMany: vi.fn() },
    rsvp: { upsert: vi.fn() },
    $transaction: vi.fn(),
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

import { PATCH } from "@/app/api/teams/[slug]/sessions/[sessionId]/lock-in/route";
import { prisma } from "@/lib/prisma";

const mockTeamFindUnique = vi.mocked(prisma.team.findUnique);
const mockSessionFindFirst = vi.mocked(prisma.session.findFirst);
const mockSessionFindUnique = vi.mocked(prisma.session.findUnique);
const mockSessionFindMany = vi.mocked(prisma.session.findMany);
const mockSessionUpdate = vi.mocked(prisma.session.update);
const mockSessionUpdateMany = vi.mocked(prisma.session.updateMany);
const mockPlayerFindMany = vi.mocked(prisma.player.findMany);
const mockRsvpUpsert = vi.mocked(prisma.rsvp.upsert);
const mockTransaction = vi.mocked(prisma.$transaction);

function makeRequest(): Request {
  return new Request(
    "http://localhost/api/teams/demo-team/sessions/s1/lock-in",
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
    groupId: "g1",
    status: "PROPOSED",
    votes: [],
    ...overrides,
  };
}

describe("PATCH /api/teams/[slug]/sessions/[sessionId]/lock-in", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTeamFindUnique.mockResolvedValue({ id: "team1" } as never);
    mockSessionFindFirst.mockResolvedValue(makeSessionRow() as never);
    mockSessionFindUnique.mockResolvedValue(
      makeSessionRow({ status: "CONFIRMED" }) as never,
    );
    mockSessionFindMany.mockResolvedValue([
      makeSessionRow({ id: "s2", status: "CANCELLED" }),
    ] as never);
    mockPlayerFindMany.mockResolvedValue([{ id: "p1" }, { id: "p2" }] as never);
    mockRsvpUpsert.mockResolvedValue({} as never);
    mockSessionUpdate.mockResolvedValue({} as never);
    mockSessionUpdateMany.mockResolvedValue({ count: 1 } as never);
    mockTransaction.mockResolvedValue([] as never);
  });

  it("should return 404 when team is not found", async () => {
    mockTeamFindUnique.mockResolvedValueOnce(null);

    const res = await PATCH(makeRequest(), makeParams());

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Team not found");
  });

  it("should return 404 when session is not found on this team", async () => {
    mockSessionFindFirst.mockResolvedValueOnce(null);

    const res = await PATCH(makeRequest(), makeParams());

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Session not found");
  });

  it("should return 400 when the session has no groupId", async () => {
    mockSessionFindFirst.mockResolvedValueOnce(
      makeSessionRow({ groupId: null }) as never,
    );

    const res = await PATCH(makeRequest(), makeParams());

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("This session has no alternative slots to lock in");
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("should return 400 when the slot is already cancelled", async () => {
    mockSessionFindFirst.mockResolvedValueOnce(
      makeSessionRow({ status: "CANCELLED" }) as never,
    );

    const res = await PATCH(makeRequest(), makeParams());

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Cannot lock in a cancelled slot");
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("should no-op and return the group as an array when already confirmed", async () => {
    mockSessionFindFirst.mockResolvedValueOnce(
      makeSessionRow({ status: "CONFIRMED" }) as never,
    );

    const res = await PATCH(makeRequest(), makeParams());

    expect(res.status).toBe(200);
    expect(mockTransaction).not.toHaveBeenCalled();
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(2); // winner + 1 sibling
  });

  it("should confirm the winner and cancel siblings in one transaction", async () => {
    await PATCH(makeRequest(), makeParams());

    expect(mockSessionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "s1" },
        data: { status: "CONFIRMED" },
      }),
    );
    expect(mockSessionUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { groupId: "g1", teamId: "team1", id: { not: "s1" } },
        data: { status: "CANCELLED" },
      }),
    );
    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  it("should carry PREFER/OK votes over as ANYTIME rsvps and CANT/no-vote as UNAVAILABLE", async () => {
    mockSessionFindFirst.mockResolvedValueOnce(
      makeSessionRow({
        votes: [
          { playerId: "p1", level: "PREFER" },
          { playerId: "p2", level: "CANT" },
        ],
      }) as never,
    );
    mockPlayerFindMany.mockResolvedValueOnce([
      { id: "p1" },
      { id: "p2" },
      { id: "p3" }, // never voted at all
    ] as never);

    await PATCH(makeRequest(), makeParams());

    expect(mockRsvpUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sessionId_playerId: { sessionId: "s1", playerId: "p1" } },
        update: { status: "ANYTIME" },
        create: expect.objectContaining({ playerId: "p1", status: "ANYTIME" }),
      }),
    );
    expect(mockRsvpUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sessionId_playerId: { sessionId: "s1", playerId: "p2" } },
        update: { status: "UNAVAILABLE" },
      }),
    );
    expect(mockRsvpUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sessionId_playerId: { sessionId: "s1", playerId: "p3" } },
        update: { status: "UNAVAILABLE" },
      }),
    );
  });

  it("should treat an OK vote the same as PREFER (both count as in)", async () => {
    mockSessionFindFirst.mockResolvedValueOnce(
      makeSessionRow({ votes: [{ playerId: "p1", level: "OK" }] }) as never,
    );

    await PATCH(makeRequest(), makeParams());

    expect(mockRsvpUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { status: "ANYTIME" },
        create: expect.objectContaining({ playerId: "p1", status: "ANYTIME" }),
      }),
    );
  });

  it("should return the winner followed by its cancelled siblings", async () => {
    const res = await PATCH(makeRequest(), makeParams());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
    expect(body[0].id).toBe("s1");
    expect(body[1].id).toBe("s2");
  });
});

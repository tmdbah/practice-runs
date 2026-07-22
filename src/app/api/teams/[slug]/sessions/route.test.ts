import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    team: { findUnique: vi.fn() },
    session: { findMany: vi.fn(), create: vi.fn() },
    venue: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/sessions", () => ({
  sessionInclude: { venue: true, rsvps: { include: { player: { select: { id: true, name: true } } } } },
  toSessionResponse: vi.fn((s: { id: string }) => ({ id: s.id, _mapped: true })),
}));

import { GET, POST } from "@/app/api/teams/[slug]/sessions/route";
import { prisma } from "@/lib/prisma";

const mockTeamFindUnique = vi.mocked(prisma.team.findUnique);
const mockSessionFindMany = vi.mocked(prisma.session.findMany);
const mockSessionCreate = vi.mocked(prisma.session.create);
const mockVenueFindUnique = vi.mocked(prisma.venue.findUnique);

function makeParams(slug = "demo-team") {
  return { params: Promise.resolve({ slug }) };
}

function makePostRequest(body: unknown): Request {
  return new Request("http://localhost/api/teams/demo-team/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const fakeSession = {
  id: "s1",
  teamId: "team1",
  date: new Date("2026-07-25T00:00:00.000Z"),
};

describe("GET /api/teams/[slug]/sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTeamFindUnique.mockResolvedValue({ id: "team1" } as never);
    mockSessionFindMany.mockResolvedValue([fakeSession] as never);
  });

  it("should return 404 when team is not found", async () => {
    mockTeamFindUnique.mockResolvedValueOnce(null);

    const res = await GET(new Request("http://localhost"), makeParams());

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Team not found");
  });

  it("should return mapped sessions via toSessionResponse", async () => {
    const res = await GET(new Request("http://localhost"), makeParams());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe("s1");
  });

  it("should return an empty array when there are no sessions", async () => {
    mockSessionFindMany.mockResolvedValueOnce([]);

    const res = await GET(new Request("http://localhost"), makeParams());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });
});

describe("POST /api/teams/[slug]/sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTeamFindUnique.mockResolvedValue({ id: "team1" } as never);
    mockSessionCreate.mockResolvedValue(fakeSession as never);
    mockVenueFindUnique.mockResolvedValue({ id: "v1" } as never);
  });

  it("should return 404 when team is not found", async () => {
    mockTeamFindUnique.mockResolvedValueOnce(null);

    const res = await POST(
      makePostRequest({ date: "2026-07-25", fromTime: "18:00", toTime: "20:00" }),
      makeParams(),
    );

    expect(res.status).toBe(404);
  });

  it("should return 400 when date is missing", async () => {
    const res = await POST(
      makePostRequest({ fromTime: "18:00", toTime: "20:00" }),
      makeParams(),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/required/i);
  });

  it("should return 400 when fromTime is missing", async () => {
    const res = await POST(
      makePostRequest({ date: "2026-07-25", toTime: "20:00" }),
      makeParams(),
    );

    expect(res.status).toBe(400);
  });

  it("should return 400 when toTime is missing", async () => {
    const res = await POST(
      makePostRequest({ date: "2026-07-25", fromTime: "18:00" }),
      makeParams(),
    );

    expect(res.status).toBe(400);
  });

  it("should return 400 for an invalid date string", async () => {
    const res = await POST(
      makePostRequest({ date: "not-a-date", fromTime: "18:00", toTime: "20:00" }),
      makeParams(),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid date");
  });

  it("should return 400 when the specified venue does not exist", async () => {
    mockVenueFindUnique.mockResolvedValueOnce(null);

    const res = await POST(
      makePostRequest({
        date: "2026-07-25",
        fromTime: "18:00",
        toTime: "20:00",
        venueId: "nonexistent",
      }),
      makeParams(),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Venue not found");
  });

  it("should return 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/teams/demo-team/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not json",
    });

    const res = await POST(req, makeParams());

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid JSON");
  });

  it("should create a session and return 201", async () => {
    const res = await POST(
      makePostRequest({ date: "2026-07-25", fromTime: "18:00", toTime: "20:00" }),
      makeParams(),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe("s1");
  });

  it("should store proposedById when provided", async () => {
    await POST(
      makePostRequest({
        date: "2026-07-25",
        fromTime: "18:00",
        toTime: "20:00",
        proposedById: "p1",
      }),
      makeParams(),
    );

    expect(mockSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ proposedById: "p1" }),
      }),
    );
  });

  it("should create with kind: GAME and pass it through to session.create", async () => {
    await POST(
      makePostRequest({
        date: "2026-07-25",
        fromTime: "18:00",
        toTime: "20:00",
        kind: "GAME",
      }),
      makeParams(),
    );

    expect(mockSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ kind: "GAME" }),
      }),
    );
  });

  it("should omit kind when not provided, letting the DB default (PRACTICE) apply", async () => {
    await POST(
      makePostRequest({ date: "2026-07-25", fromTime: "18:00", toTime: "20:00" }),
      makeParams(),
    );

    expect(mockSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ kind: undefined }),
      }),
    );
  });

  it("should return 400 for an invalid kind value", async () => {
    const res = await POST(
      makePostRequest({
        date: "2026-07-25",
        fromTime: "18:00",
        toTime: "20:00",
        kind: "SCRIMMAGE",
      }),
      makeParams(),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/kind/i);
  });
});

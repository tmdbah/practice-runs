import { describe, it, expect, vi, beforeEach } from "vitest";
import { putRsvp, putVote, RsvpError } from "@/lib/session-rsvp";

describe("putRsvp", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("should PUT to the session's rsvp endpoint with playerId and status", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "s1" }),
    } as Response);

    await putRsvp("uncrowned-kings", "s1", "p1", "ANYTIME");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/teams/uncrowned-kings/sessions/s1/rsvp",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: "p1", status: "ANYTIME" }),
      },
    );
  });

  it("should return the parsed session response on success", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "s1", teamId: "team1" }),
    } as Response);

    const result = await putRsvp("uncrowned-kings", "s1", "p1", "ANYTIME");

    expect(result).toEqual({ id: "s1", teamId: "team1" });
  });

  it("should throw RsvpError with the server's message on failure", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Session not found" }),
    } as Response);

    await expect(putRsvp("uncrowned-kings", "s1", "p1", "ANYTIME")).rejects.toThrow(
      RsvpError,
    );
    await expect(putRsvp("uncrowned-kings", "s1", "p1", "ANYTIME")).rejects.toThrow(
      "Session not found",
    );
  });

  it("should throw a generic RsvpError when the failure response body isn't valid JSON", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => {
        throw new Error("not json");
      },
    } as unknown as Response);

    await expect(putRsvp("uncrowned-kings", "s1", "p1", "ANYTIME")).rejects.toThrow(
      "RSVP failed",
    );
  });
});

describe("putVote", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("should PUT to the session's vote endpoint with playerId and level", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "s1" }),
    } as Response);

    await putVote("uncrowned-kings", "s1", "p1", "PREFER");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/teams/uncrowned-kings/sessions/s1/vote",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: "p1", level: "PREFER" }),
      },
    );
  });

  it("should return the parsed session response on success", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "s1", teamId: "team1" }),
    } as Response);

    const result = await putVote("uncrowned-kings", "s1", "p1", "OK");

    expect(result).toEqual({ id: "s1", teamId: "team1" });
  });

  it("should throw RsvpError with the server's message on failure", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Voting is closed for this slot" }),
    } as Response);

    await expect(putVote("uncrowned-kings", "s1", "p1", "CANT")).rejects.toThrow(
      RsvpError,
    );
    await expect(putVote("uncrowned-kings", "s1", "p1", "CANT")).rejects.toThrow(
      "Voting is closed for this slot",
    );
  });

  it("should throw a generic RsvpError when the failure response body isn't valid JSON", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => {
        throw new Error("not json");
      },
    } as unknown as Response);

    await expect(putVote("uncrowned-kings", "s1", "p1", "PREFER")).rejects.toThrow(
      "Vote failed",
    );
  });
});

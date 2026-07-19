import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useIdentity } from "@/hooks/use-identity";

describe("useIdentity", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should return null playerId when nothing is stored", () => {
    const { result } = renderHook(() => useIdentity("demo-team"));

    expect(result.current.playerId).toBeNull();
  });

  it("should return isLoaded true on the client", () => {
    const { result } = renderHook(() => useIdentity("demo-team"));

    expect(result.current.isLoaded).toBe(true);
  });

  it("should store playerId in localStorage and return it", () => {
    const { result } = renderHook(() => useIdentity("demo-team"));

    act(() => {
      result.current.setPlayerId("player-123");
    });

    expect(result.current.playerId).toBe("player-123");
  });

  it("should persist the stored playerId across remounts", () => {
    const { result: first } = renderHook(() => useIdentity("demo-team"));
    act(() => {
      first.current.setPlayerId("player-456");
    });

    const { result: second } = renderHook(() => useIdentity("demo-team"));
    expect(second.current.playerId).toBe("player-456");
  });

  it("should scope identity by team slug", () => {
    const { result: teamA } = renderHook(() => useIdentity("team-a"));
    act(() => {
      teamA.current.setPlayerId("player-in-a");
    });

    const { result: teamB } = renderHook(() => useIdentity("team-b"));
    expect(teamB.current.playerId).toBeNull();
  });

  it("should return null when stored JSON is malformed", () => {
    localStorage.setItem("practice-runs:identity:demo-team", "{bad json");

    const { result } = renderHook(() => useIdentity("demo-team"));

    expect(result.current.playerId).toBeNull();
  });
});

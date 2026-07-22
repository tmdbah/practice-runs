import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTourSeen } from "@/hooks/use-tour";

describe("useTourSeen", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should return hasSeenTour false when nothing is stored", () => {
    const { result } = renderHook(() => useTourSeen("demo-team"));

    expect(result.current.hasSeenTour).toBe(false);
  });

  it("should return isLoaded true on the client", () => {
    const { result } = renderHook(() => useTourSeen("demo-team"));

    expect(result.current.isLoaded).toBe(true);
  });

  it("should flip hasSeenTour to true after markTourSeen", () => {
    const { result } = renderHook(() => useTourSeen("demo-team"));

    act(() => {
      result.current.markTourSeen();
    });

    expect(result.current.hasSeenTour).toBe(true);
  });

  it("should persist hasSeenTour across remounts", () => {
    const { result: first } = renderHook(() => useTourSeen("demo-team"));
    act(() => {
      first.current.markTourSeen();
    });

    const { result: second } = renderHook(() => useTourSeen("demo-team"));
    expect(second.current.hasSeenTour).toBe(true);
  });

  it("should scope hasSeenTour by team slug", () => {
    const { result: teamA } = renderHook(() => useTourSeen("team-a"));
    act(() => {
      teamA.current.markTourSeen();
    });

    const { result: teamB } = renderHook(() => useTourSeen("team-b"));
    expect(teamB.current.hasSeenTour).toBe(false);
  });

  it("should treat any stored value other than 'seen' as not-seen", () => {
    localStorage.setItem("practice-runs:tour:demo-team", "true");

    const { result } = renderHook(() => useTourSeen("demo-team"));

    expect(result.current.hasSeenTour).toBe(false);
  });
});

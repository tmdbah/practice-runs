import { describe, it, expect } from "vitest";
import { advanceTour, TOUR_STEP_ORDER, type TourStep } from "@/lib/tour-steps";

describe("advanceTour", () => {
  it("advances usual -> toggle on cell-saved", () => {
    expect(advanceTour("usual", { type: "cell-saved" })).toBe("toggle");
  });

  it("is a no-op on usual for a mismatched event", () => {
    expect(advanceTour("usual", { type: "toggle-tapped" })).toBe("usual");
    expect(advanceTour("usual", { type: "acknowledge" })).toBe("usual");
  });

  it("advances toggle -> overrides on toggle-tapped", () => {
    expect(advanceTour("toggle", { type: "toggle-tapped" })).toBe(
      "overrides",
    );
  });

  it("is a no-op on toggle for a mismatched event", () => {
    expect(advanceTour("toggle", { type: "cell-saved" })).toBe("toggle");
    expect(advanceTour("toggle", { type: "acknowledge" })).toBe("toggle");
  });

  it("advances overrides -> team-window on acknowledge", () => {
    expect(advanceTour("overrides", { type: "acknowledge" })).toBe(
      "team-window",
    );
  });

  it("is a no-op on overrides for a mismatched event", () => {
    expect(advanceTour("overrides", { type: "cell-saved" })).toBe(
      "overrides",
    );
    expect(advanceTour("overrides", { type: "toggle-tapped" })).toBe(
      "overrides",
    );
  });

  it("advances team-window -> sessions on acknowledge", () => {
    expect(advanceTour("team-window", { type: "acknowledge" })).toBe(
      "sessions",
    );
  });

  it("is a no-op on team-window for a mismatched event", () => {
    expect(advanceTour("team-window", { type: "cell-saved" })).toBe(
      "team-window",
    );
    expect(advanceTour("team-window", { type: "toggle-tapped" })).toBe(
      "team-window",
    );
  });

  it("advances sessions -> complete on acknowledge", () => {
    expect(advanceTour("sessions", { type: "acknowledge" })).toBe("complete");
  });

  it("is a no-op on sessions for a mismatched event", () => {
    expect(advanceTour("sessions", { type: "cell-saved" })).toBe("sessions");
    expect(advanceTour("sessions", { type: "toggle-tapped" })).toBe(
      "sessions",
    );
  });

  it("jumps straight to complete on skip from any active step", () => {
    for (const step of TOUR_STEP_ORDER) {
      expect(advanceTour(step, { type: "skip" })).toBe("complete");
    }
  });

  it("is an absorbing terminal state once complete", () => {
    expect(advanceTour("complete", { type: "cell-saved" })).toBe("complete");
    expect(advanceTour("complete", { type: "toggle-tapped" })).toBe(
      "complete",
    );
    expect(advanceTour("complete", { type: "acknowledge" })).toBe("complete");
    expect(advanceTour("complete", { type: "skip" })).toBe("complete");
  });

  it("TOUR_STEP_ORDER matches the reducer's actual sequence end to end", () => {
    const events: Array<{ type: "cell-saved" | "toggle-tapped" | "acknowledge" }> = [
      { type: "cell-saved" },
      { type: "toggle-tapped" },
      { type: "acknowledge" },
      { type: "acknowledge" },
      { type: "acknowledge" },
    ];
    let step: TourStep = TOUR_STEP_ORDER[0];
    for (let i = 0; i < events.length; i++) {
      const expectedNext = TOUR_STEP_ORDER[i + 1] ?? "complete";
      step = advanceTour(step, events[i]);
      expect(step).toBe(expectedNext);
    }
  });
});

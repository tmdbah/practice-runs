export type TourStep =
  | "usual"
  | "toggle"
  | "overrides"
  | "team-window"
  | "sessions"
  | "complete";

export type TourEvent =
  | { type: "cell-saved" }
  | { type: "toggle-tapped" }
  | { type: "acknowledge" }
  | { type: "skip" };

/**
 * Reducer over the tour's step sequence. `"skip"` jumps to `"complete"` from
 * any active step; each step only advances on its own matching event (a
 * mismatched event is a no-op, defensive against stray/duplicate fires);
 * `"complete"` is a terminal, absorbing state.
 */
export function advanceTour(step: TourStep, event: TourEvent): TourStep {
  if (event.type === "skip") return "complete";

  switch (step) {
    case "usual":
      return event.type === "cell-saved" ? "toggle" : step;
    case "toggle":
      return event.type === "toggle-tapped" ? "overrides" : step;
    case "overrides":
      return event.type === "acknowledge" ? "team-window" : step;
    case "team-window":
      return event.type === "acknowledge" ? "sessions" : step;
    case "sessions":
      return event.type === "acknowledge" ? "complete" : step;
    case "complete":
      return "complete";
  }
}

export const TOUR_COPY: Record<
  Exclude<TourStep, "complete">,
  {
    title: string;
    body: string;
    /** null = interactive step (real tap advances it, no button shown besides Skip). Non-null = shown as the primary button. */
    primaryLabel: string | null;
  }
> = {
  usual: {
    title: "Set your usual schedule",
    body: "The app assumes you're unavailable until you say otherwise — this is your default weekly availability. Tap the highlighted box to set Monday.",
    primaryLabel: null,
  },
  toggle: {
    title: "This Week can override it",
    body: 'Need a different answer just for this week? Tap "This Week" to switch views.',
    primaryLabel: null,
  },
  overrides: {
    title: "Inherited vs. overridden",
    body: 'Faded boxes are inherited from your Usual answer. A solid box with a dot means you\'ve overridden just this week — tap it again anytime to change it, or use "Reset to Usual" to revert.',
    primaryLabel: "Next",
  },
  "team-window": {
    title: "Team Window",
    body: "This card shows when the team's availability overlaps each day. Whichever day has the most people free gets highlighted gold — swipe or tap the arrows to see the rest.",
    primaryLabel: "Next",
  },
  sessions: {
    title: "Games & practices",
    body: "Propose a one-off practice or league game (Game Day) below, and RSVP In or Out once one's up.",
    primaryLabel: "Got it",
  },
};

/** Ordered list of active steps, for a "Step X of N" indicator. */
export const TOUR_STEP_ORDER: Exclude<TourStep, "complete">[] = [
  "usual",
  "toggle",
  "overrides",
  "team-window",
  "sessions",
];

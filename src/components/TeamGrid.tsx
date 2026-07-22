"use client";

import type { JSX } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import { useIdentity } from "@/hooks/use-identity";
import { useTourSeen } from "@/hooks/use-tour";
import { NamePicker } from "@/components/NamePicker";
import { AvailabilityGrid } from "@/components/AvailabilityGrid";
import { SessionsView } from "@/components/SessionsView";
import { OnboardingTour } from "@/components/OnboardingTour";
import { advanceTour, type TourEvent, type TourStep } from "@/lib/tour-steps";
import type {
  TeamGridResponse,
  SessionResponse,
  VenueSummary,
} from "@/types/api";

interface TeamGridProps {
  data: TeamGridResponse;
  initialSessions: SessionResponse[];
  venues: VenueSummary[];
}

export function TeamGrid({
  data,
  initialSessions,
  venues,
}: TeamGridProps): JSX.Element {
  const { playerId, setPlayerId, isLoaded } = useIdentity(data.team.slug);
  const { hasSeenTour, markTourSeen } = useTourSeen(data.team.slug);
  const [sessions, setSessions] = useState<SessionResponse[]>(initialSessions);
  const [tourStep, setTourStep] = useState<TourStep | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  // Onboarding-tour target for the "sessions" step: both sections' headers
  // + first row (empty-state text or first card) — a small, bounded target
  // regardless of how many sessions/games exist, unlike the full Game Day +
  // Sessions wrapper this used to spotlight (which could be taller than the
  // viewport and broke the tooltip-placement math). Covers Game Day AND
  // Sessions, not just Game Day, so the spotlight/copy match each other.
  const gameHeaderRef = useRef<HTMLDivElement>(null);
  const gameFirstRowRef = useRef<HTMLElement>(null);
  const sessionsHeaderRef = useRef<HTMLDivElement>(null);
  const sessionsFirstRowRef = useRef<HTMLElement>(null);
  const [sessionsTargetRect, setSessionsTargetRect] = useState<DOMRect | null>(
    null,
  );

  useLayoutEffect(() => {
    function measure(): void {
      if (tourStep !== "sessions" || !gameHeaderRef.current) {
        setSessionsTargetRect(null);
        return;
      }
      const rects = [
        gameHeaderRef.current.getBoundingClientRect(),
        gameFirstRowRef.current?.getBoundingClientRect(),
        sessionsHeaderRef.current?.getBoundingClientRect(),
        sessionsFirstRowRef.current?.getBoundingClientRect(),
      ].filter((r): r is DOMRect => r != null);
      const top = Math.min(...rects.map((r) => r.top));
      const left = Math.min(...rects.map((r) => r.left));
      const right = Math.max(...rects.map((r) => r.right));
      const bottom = Math.max(...rects.map((r) => r.bottom));
      setSessionsTargetRect(new DOMRect(left, top, right - left, bottom - top));
    }
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [tourStep]);

  // Bring the Game Day section into view once when this step starts — it's
  // often below the fold, and the spotlight shouldn't point at something
  // the player hasn't scrolled to yet.
  useEffect(() => {
    if (tourStep === "sessions") {
      gameHeaderRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [tourStep]);

  // Validate stored identity against current roster — clear it if stale
  const isValidPlayer =
    playerId != null && data.players.some((p) => p.id === playerId);

  // If the stored ID is non-null but not in the roster, clear it.
  // useEffect avoids a side effect during render.
  useEffect(() => {
    if (isLoaded && playerId && !isValidPlayer) {
      setPlayerId("");
    }
  }, [isLoaded, playerId, isValidPlayer, setPlayerId]);

  if (!isLoaded) {
    return <div className="min-h-screen bg-bg" />;
  }

  // NamePicker only ever renders when there's no valid stored identity, so
  // any call into onSelect is by construction a brand-new device picking a
  // name for the first time — the one moment to arm the tour.
  function handleNameSelected(id: string): void {
    setPlayerId(id);
    if (!hasSeenTour) setTourStep("usual");
  }

  function handleTourAdvance(event: TourEvent): void {
    const next = advanceTour(tourStep ?? "usual", event);
    if (next === "complete") {
      markTourSeen();
      setTourStep(null);
    } else {
      setTourStep(next);
    }
  }

  if (!playerId || !isValidPlayer) {
    return (
      <NamePicker
        players={data.players}
        onSelect={handleNameSelected}
        isDemo={data.team.slug === "demo-team"}
      />
    );
  }

  const currentPlayer = data.players.find((p) => p.id === playerId);

  return (
    <div className="min-h-screen bg-bg text-text px-3 py-4 flex justify-center">
      <div className="w-full max-w-md lg:max-w-xl">
        <header className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl bg-surface border border-border">
          <Image
            src="/UK_logo.PNG"
            alt=""
            width={28}
            height={28}
            aria-hidden="true"
          />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold leading-tight">
              {data.team.name}
            </div>
            <div className="text-[10px] uppercase tracking-wide text-text-mute leading-tight">
              Grid
            </div>
          </div>
          {currentPlayer && (
            <button
              onClick={() => setPlayerId("")}
              className="text-xs text-text-mute hover:text-text transition-colors shrink-0 flex flex-col items-end"
              aria-label="Switch player"
            >
              <span className="font-medium">{currentPlayer.name}</span>
              <span className="text-[10px] uppercase tracking-wide">
                Switch
              </span>
            </button>
          )}
        </header>
        {data.team.slug === "demo-team" && (
          <div
            role="status"
            className="mb-4 px-3 py-2 rounded-lg bg-gold-soft border border-border-strong text-gold text-xs text-center"
          >
            You&apos;re viewing a public demo — feel free to explore. This is
            sample data, not the real team.
          </div>
        )}
        <AvailabilityGrid
          data={data}
          currentPlayerId={playerId}
          sessions={sessions}
          tourStep={tourStep}
          onTourAdvance={handleTourAdvance}
          onDrawerOpenChange={setIsDrawerOpen}
        />
        <div className="px-1 pb-8 mt-6">
          <SessionsView
            slug={data.team.slug}
            sessions={sessions}
            setSessions={setSessions}
            venues={venues}
            gameHeaderRef={gameHeaderRef}
            gameFirstRowRef={gameFirstRowRef}
            sessionsHeaderRef={sessionsHeaderRef}
            sessionsFirstRowRef={sessionsFirstRowRef}
          />
        </div>
      </div>

      {tourStep === "sessions" && !isDrawerOpen && (
        <OnboardingTour
          step={tourStep}
          targetRect={sessionsTargetRect}
          onSkip={() => handleTourAdvance({ type: "skip" })}
          onAcknowledge={() => handleTourAdvance({ type: "acknowledge" })}
        />
      )}
    </div>
  );
}

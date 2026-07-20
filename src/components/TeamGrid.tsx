"use client";

import type { JSX } from "react";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useIdentity } from "@/hooks/use-identity";
import { NamePicker } from "@/components/NamePicker";
import { AvailabilityGrid } from "@/components/AvailabilityGrid";
import { SessionsView } from "@/components/SessionsView";
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
  const [sessions, setSessions] = useState<SessionResponse[]>(initialSessions);

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

  if (!playerId || !isValidPlayer) {
    return <NamePicker players={data.players} onSelect={setPlayerId} />;
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
        <AvailabilityGrid
          data={data}
          currentPlayerId={playerId}
          sessions={sessions}
        />
        <div className="px-1 pb-8 mt-6">
          <SessionsView
            slug={data.team.slug}
            sessions={sessions}
            setSessions={setSessions}
            venues={venues}
          />
        </div>
      </div>
    </div>
  );
}

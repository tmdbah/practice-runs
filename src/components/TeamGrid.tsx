"use client";

import type { JSX } from "react";
import Image from "next/image";
import { useIdentity } from "@/hooks/use-identity";
import { NamePicker } from "@/components/NamePicker";
import { AvailabilityGrid } from "@/components/AvailabilityGrid";
import type { TeamGridResponse } from "@/types/api";

interface TeamGridProps {
  data: TeamGridResponse;
}

export function TeamGrid({ data }: TeamGridProps): JSX.Element {
  const { playerId, setPlayerId, isLoaded } = useIdentity(data.team.slug);

  // Avoid flash of picker on returning visitors
  if (!isLoaded) {
    return <div className="min-h-screen bg-bg" />;
  }

  if (!playerId) {
    return <NamePicker players={data.players} onSelect={setPlayerId} />;
  }

  return (
    <div className="min-h-screen bg-bg text-text px-3 py-4">
      <header className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl bg-surface border border-border">
        <Image
          src="/UK_logo.PNG"
          alt=""
          width={28}
          height={28}
          aria-hidden="true"
        />
        <div>
          <div className="text-sm font-bold leading-tight">
            {data.team.name}
          </div>
          <div className="text-[10px] uppercase tracking-wide text-text-mute leading-tight">
            Grid
          </div>
        </div>
      </header>
      <AvailabilityGrid data={data} currentPlayerId={playerId} />
    </div>
  );
}

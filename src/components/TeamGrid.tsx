"use client";

import type { JSX } from "react";
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
    return <div className="min-h-screen bg-neutral-950" />;
  }

  if (!playerId) {
    return <NamePicker players={data.players} onSelect={setPlayerId} />;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white px-3 py-4">
      <h1 className="text-lg font-bold mb-4">{data.team.name}</h1>
      <AvailabilityGrid data={data} currentPlayerId={playerId} />
    </div>
  );
}

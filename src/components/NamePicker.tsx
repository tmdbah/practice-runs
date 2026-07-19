"use client";

import type { JSX } from "react";
import Image from "next/image";
import type { PlayerRow } from "@/types/api";

interface NamePickerProps {
  players: PlayerRow[];
  onSelect: (playerId: string) => void;
}

export function NamePicker({
  players,
  onSelect,
}: NamePickerProps): JSX.Element {
  return (
    <div className="flex flex-col items-center min-h-screen px-4 py-10 bg-bg text-text">
      <Image
        src="/UK_logo.PNG"
        alt="Uncrowned Kings"
        width={88}
        height={88}
        className="mb-4"
        priority
      />
      <h1 className="text-xl font-bold">Uncrowned Kings</h1>
      <p className="text-text-dim text-xs mb-8">Practice Runs</p>

      <p className="text-[11px] tracking-wide uppercase text-text-mute mb-3 self-start w-full max-w-sm">
        Which player are you?
      </p>

      <ul className="w-full max-w-sm space-y-2">
        {players.map((player) => (
          <li key={player.id}>
            <button
              type="button"
              onClick={() => onSelect(player.id)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-surface border border-border hover:border-accent active:bg-surface-2 transition-colors text-left"
            >
              <span className="font-medium">{player.name}</span>
              {player.number !== null && (
                <span className="text-text-dim text-sm">
                  #{player.number}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      <p className="text-text-mute text-xs mt-6">
        {players.length} players in roster · remembered on this device
      </p>
    </div>
  );
}

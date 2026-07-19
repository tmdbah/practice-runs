"use client";

import type { JSX } from "react";
import type { PlayerRow } from "@/types/api";

interface NamePickerProps {
  players: PlayerRow[];
  onSelect: (playerId: string) => void;
}

export function NamePicker({ players, onSelect }: NamePickerProps): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8 bg-neutral-950 text-white">
      <h1 className="text-2xl font-bold mb-2">Who are you?</h1>
      <p className="text-neutral-400 text-sm mb-8">Pick your name to get started.</p>
      <ul className="w-full max-w-sm space-y-2">
        {players.map((player) => (
          <li key={player.id}>
            <button
              type="button"
              onClick={() => onSelect(player.id)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 transition-colors text-left"
            >
              <span className="font-medium">{player.name}</span>
              {player.number !== null && (
                <span className="text-neutral-400 text-sm">#{player.number}</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

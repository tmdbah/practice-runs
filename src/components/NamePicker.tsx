"use client";

import { useState } from "react";
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
  const [selectedId, setSelectedId] = useState(players[0]?.id ?? "");

  return (
    <div className="flex items-center justify-center min-h-screen px-4 py-10 bg-bg text-text">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface px-6 py-8 flex flex-col items-center">
        <Image
          src="/UK_logo.PNG"
          alt="Uncrowned Kings"
          width={64}
          height={64}
          className="mb-4"
          priority
        />
        <h1 className="text-xl font-bold">Uncrowned Kings</h1>
        <p className="text-text-dim text-xs mb-8">Practice Runs</p>

        <p className="text-[11px] tracking-wide uppercase text-text-mute mb-2 self-start">
          Which player are you?
        </p>

        <div
          role="listbox"
          aria-label="Select your name"
          className="w-full max-h-52 overflow-y-auto rounded-xl border border-border divide-y divide-border"
        >
          {players.map((player) => (
            <button
              key={player.id}
              role="option"
              aria-selected={selectedId === player.id}
              type="button"
              onClick={() => setSelectedId(player.id)}
              className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors ${
                selectedId === player.id
                  ? "bg-accent text-bg"
                  : "bg-surface-2 text-text hover:bg-surface"
              }`}
            >
              {player.name}
              {player.number !== null ? (
                <span className="ml-1 opacity-60">#{player.number}</span>
              ) : null}
            </button>
          ))}
        </div>

        <p className="text-text-mute text-xs mt-2 mb-6 self-start">
          {players.length} players in roster
        </p>

        <button
          type="button"
          onClick={() => selectedId && onSelect(selectedId)}
          disabled={!selectedId}
          className="w-full py-3 rounded-full bg-accent text-bg font-bold hover:bg-accent-dim transition-colors disabled:opacity-50"
        >
          Continue
        </button>

        <p className="text-text-mute text-[11px] mt-3">
          Remembered on this device
        </p>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import type { JSX } from "react";
import { GridCell } from "@/components/GridCell";
import { EditDrawer } from "@/components/EditDrawer";
import type { TeamGridResponse, PlayerRow, ScheduleEntry } from "@/types/api";

// Mon–Sun display order (ISO-style): 1,2,3,4,5,6,0
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

interface AvailabilityGridProps {
  data: TeamGridResponse;
  currentPlayerId: string;
}

interface DraftEdit {
  playerId: string;
  dayOfWeek: number;
}

export function AvailabilityGrid({
  data,
  currentPlayerId,
}: AvailabilityGridProps): JSX.Element {
  // Local overrides applied optimistically; keyed `${playerId}:${dayOfWeek}`
  const [overrides, setOverrides] = useState<Map<string, ScheduleEntry>>(
    new Map()
  );
  const [cellError, setCellError] = useState<string | null>(null);
  const [activeEdit, setActiveEdit] = useState<DraftEdit | null>(null);

  function getEntry(player: PlayerRow, dayOfWeek: number): ScheduleEntry {
    const key = `${player.id}:${dayOfWeek}`;
    return overrides.get(key) ?? player.schedule[dayOfWeek] ?? {
      dayOfWeek,
      status: "UNAVAILABLE",
      fromTime: null,
      toTime: null,
      note: null,
    };
  }

  function openDrawer(playerId: string, dayOfWeek: number): void {
    setCellError(null);
    setActiveEdit({ playerId, dayOfWeek });
  }

  function closeDrawer(): void {
    setActiveEdit(null);
  }

  async function handleSave(entry: ScheduleEntry): Promise<void> {
    if (!activeEdit) return;
    const { playerId, dayOfWeek } = activeEdit;
    const key = `${playerId}:${dayOfWeek}`;
    const previous = overrides.get(key) ??
      data.players.find((p) => p.id === playerId)?.schedule[dayOfWeek];

    // Optimistic update
    setOverrides((prev) => new Map(prev).set(key, entry));
    closeDrawer();

    const res = await fetch(
      `/api/teams/${data.team.slug}/players/${playerId}/default`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      }
    );

    if (!res.ok) {
      // Revert
      setOverrides((prev) => {
        const next = new Map(prev);
        if (previous) {
          next.set(key, previous);
        } else {
          next.delete(key);
        }
        return next;
      });
      setCellError(`${playerId}:${dayOfWeek}`);
    }
  }

  const activePlayer = activeEdit
    ? data.players.find((p) => p.id === activeEdit.playerId) ?? null
    : null;

  const activeEntry =
    activeEdit && activePlayer
      ? getEntry(activePlayer, activeEdit.dayOfWeek)
      : null;

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[320px] border-separate border-spacing-0">
          <thead>
            <tr>
              {/* Name column header */}
              <th className="text-left py-2 pr-2 text-xs text-neutral-500 font-medium w-24 min-w-[6rem]">
                Player
              </th>
              {DAY_ORDER.map((day, i) => (
                <th
                  key={day}
                  className="text-center py-2 text-xs text-neutral-500 font-medium w-8"
                >
                  {DAY_LABELS[i]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.players.map((player) => {
              const isYou = player.id === currentPlayerId;
              return (
                <tr key={player.id}>
                  <td className="pr-2 py-1 align-middle">
                    <span
                      className={[
                        "text-sm truncate max-w-[6rem] block",
                        isYou ? "text-white font-semibold" : "text-neutral-300",
                      ].join(" ")}
                    >
                      {player.number !== null && (
                        <span className="text-neutral-500 text-xs mr-1">
                          #{player.number}
                        </span>
                      )}
                      {player.name}
                      {isYou && (
                        <span className="ml-1 text-teal-400 text-xs">(you)</span>
                      )}
                    </span>
                  </td>
                  {DAY_ORDER.map((day) => {
                    const entry = getEntry(player, day);
                    const errKey = `${player.id}:${day}`;
                    return (
                      <td key={day} className="py-1 px-0.5">
                        <div className="relative">
                          <GridCell
                            entry={entry}
                            onClick={() => openDrawer(player.id, day)}
                          />
                          {cellError === errKey && (
                            <span className="absolute -bottom-3 left-0 right-0 text-center text-[10px] text-red-400">
                              !
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {activeEdit && activePlayer && activeEntry && (
        <EditDrawer
          key={`${activeEdit.playerId}:${activeEdit.dayOfWeek}`}
          playerName={activePlayer.name}
          dayOfWeek={activeEdit.dayOfWeek}
          entry={activeEntry}
          onSave={handleSave}
          onClose={closeDrawer}
        />
      )}
    </>
  );
}

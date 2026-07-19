"use client";

import { useState } from "react";
import type { JSX } from "react";
import { GridCell } from "@/components/GridCell";
import { EditDrawer } from "@/components/EditDrawer";
import { TeamWindowRow } from "@/components/TeamWindowRow";
import type {
  TeamGridResponse,
  PlayerRow,
  ScheduleEntry,
  DayCell,
  TeamWindow,
} from "@/types/api";

// Mon–Sun display order (ISO-style): 1,2,3,4,5,6,0
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

type GridMode = "usual" | "this-week";

interface AvailabilityGridProps {
  data: TeamGridResponse;
  currentPlayerId: string;
}

interface DraftEdit {
  playerId: string;
  /** dayOfWeek 0-6 when mode=usual; ISO date string when mode=this-week */
  key: number | string;
}

export function AvailabilityGrid({
  data,
  currentPlayerId,
}: AvailabilityGridProps): JSX.Element {
  const [mode, setMode] = useState<GridMode>("usual");

  // Optimistic overrides for Usual mode; keyed `${playerId}:${dayOfWeek}`
  const [usualOverrides, setUsualOverrides] = useState<
    Map<string, ScheduleEntry>
  >(new Map());
  // Optimistic overrides for This Week mode; keyed `${playerId}:${isoDate}`
  const [weekOverrides, setWeekOverrides] = useState<Map<string, DayCell>>(
    new Map(),
  );
  // Optimistic team windows; keyed by isoDate
  const [windowOverrides, setWindowOverrides] = useState<
    Map<string, TeamWindow>
  >(new Map());

  const [cellError, setCellError] = useState<string | null>(null);
  const [activeEdit, setActiveEdit] = useState<DraftEdit | null>(null);

  function getUsualEntry(player: PlayerRow, dayOfWeek: number): ScheduleEntry {
    const key = `${player.id}:${dayOfWeek}`;
    return (
      usualOverrides.get(key) ??
      player.schedule[dayOfWeek] ?? {
        dayOfWeek,
        status: "UNAVAILABLE",
        fromTime: null,
        toTime: null,
        note: null,
      }
    );
  }

  function getWeekCell(player: PlayerRow, dayOfWeek: number): DayCell {
    const base =
      player.thisWeek.find((c) => c.dayOfWeek === dayOfWeek) ??
      ({
        date: "",
        dayOfWeek,
        effectiveStatus: "UNAVAILABLE",
        fromTime: null,
        toTime: null,
        note: null,
        isOverridden: false,
      } as DayCell);
    const key = `${player.id}:${base.date}`;
    return weekOverrides.get(key) ?? base;
  }

  function getTeamWindow(dayOfWeek: number): TeamWindow | undefined {
    const base = data.teamWindows.find((w) => w.dayOfWeek === dayOfWeek);
    if (!base) return undefined;
    return windowOverrides.get(base.date) ?? base;
  }

  function openDrawer(playerId: string, dayOfWeek: number): void {
    setCellError(null);
    if (mode === "usual") {
      setActiveEdit({ playerId, key: dayOfWeek });
    } else {
      const player = data.players.find((p) => p.id === playerId);
      const cell = player?.thisWeek.find((c) => c.dayOfWeek === dayOfWeek);
      if (cell) setActiveEdit({ playerId, key: cell.date });
    }
  }

  function closeDrawer(): void {
    setActiveEdit(null);
  }

  /** Recompute team window for a given date after an optimistic cell edit. */
  function recomputeWindow(isoDate: string, allPlayers: PlayerRow[]): void {
    const base = data.teamWindows.find((w) => w.date === isoDate);
    if (!base) return;

    const cells = allPlayers
      .map((p) => {
        const cell = p.thisWeek.find((c) => c.date === isoDate);
        if (!cell) return null;
        return weekOverrides.get(`${p.id}:${isoDate}`) ?? cell;
      })
      .filter((c): c is DayCell => c !== null);

    const available = cells
      .map((c) => {
        if (c.effectiveStatus === "UNAVAILABLE") return null;
        if (c.effectiveStatus === "ANYTIME")
          return { from: "00:00", to: "23:59" };
        if (c.fromTime && c.toTime) return { from: c.fromTime, to: c.toTime };
        return { from: "00:00", to: "23:59" };
      })
      .filter((t): t is { from: string; to: string } => t !== null);

    const availableCount = available.length;
    let window: { from: string; to: string } | null = null;
    if (availableCount > 0) {
      const latestFrom = available.reduce(
        (max, t) => (t.from > max ? t.from : max),
        available[0].from,
      );
      const earliestTo = available.reduce(
        (min, t) => (t.to < min ? t.to : min),
        available[0].to,
      );
      if (latestFrom < earliestTo)
        window = { from: latestFrom, to: earliestTo };
    }

    setWindowOverrides((prev) =>
      new Map(prev).set(isoDate, {
        ...base,
        availableCount,
        window,
      }),
    );
  }

  async function handleSave(entry: ScheduleEntry): Promise<void> {
    if (!activeEdit) return;
    const { playerId } = activeEdit;

    if (mode === "usual") {
      const dayOfWeek = activeEdit.key as number;
      const key = `${playerId}:${dayOfWeek}`;
      const previous =
        usualOverrides.get(key) ??
        data.players.find((p) => p.id === playerId)?.schedule[dayOfWeek];

      setUsualOverrides((prev) => new Map(prev).set(key, entry));
      closeDrawer();

      const res = await fetch(
        `/api/teams/${data.team.slug}/players/${playerId}/default`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(entry),
        },
      );

      if (!res.ok) {
        setUsualOverrides((prev) => {
          const next = new Map(prev);
          if (previous) next.set(key, previous);
          else next.delete(key);
          return next;
        });
        setCellError(`${playerId}:${dayOfWeek}`);
      }
    } else {
      const isoDate = activeEdit.key as string;
      const player = data.players.find((p) => p.id === playerId);
      const baseCell = player?.thisWeek.find((c) => c.date === isoDate);
      if (!baseCell) return;

      const key = `${playerId}:${isoDate}`;
      const previous = weekOverrides.get(key) ?? baseCell;

      const optimisticCell: DayCell = {
        date: isoDate,
        dayOfWeek: baseCell.dayOfWeek,
        effectiveStatus: entry.status,
        fromTime: entry.fromTime,
        toTime: entry.toTime,
        note: entry.note,
        isOverridden: true,
      };

      setWeekOverrides((prev) => new Map(prev).set(key, optimisticCell));
      closeDrawer();

      // Recompute team window optimistically with the updated cell
      // Build a temporary merged player list for the calculation
      const mergedPlayers = data.players.map((p) => {
        if (p.id !== playerId) return p;
        return {
          ...p,
          thisWeek: p.thisWeek.map((c) =>
            c.date === isoDate ? optimisticCell : c,
          ),
        };
      });
      recomputeWindow(isoDate, mergedPlayers);

      const res = await fetch(
        `/api/teams/${data.team.slug}/players/${playerId}/override`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: isoDate,
            status: entry.status,
            fromTime: entry.fromTime,
            toTime: entry.toTime,
            note: entry.note,
          }),
        },
      );

      if (!res.ok) {
        setWeekOverrides((prev) => {
          const next = new Map(prev);
          next.set(key, previous as DayCell);
          return next;
        });
        // Revert window to base
        setWindowOverrides((prev) => {
          const next = new Map(prev);
          next.delete(isoDate);
          return next;
        });
        setCellError(`${playerId}:${isoDate}`);
      }
    }
  }

  const activePlayer = activeEdit
    ? (data.players.find((p) => p.id === activeEdit.playerId) ?? null)
    : null;

  // Derive the ScheduleEntry the drawer should open with
  const activeEntry: ScheduleEntry | null = (() => {
    if (!activeEdit || !activePlayer) return null;
    if (mode === "usual") {
      return getUsualEntry(activePlayer, activeEdit.key as number);
    }
    const cell = getWeekCell(
      activePlayer,
      data.players
        .find((p) => p.id === activeEdit.playerId)
        ?.thisWeek.find((c) => c.date === activeEdit.key)?.dayOfWeek ?? 0,
    );
    return {
      dayOfWeek: cell.dayOfWeek,
      status: cell.effectiveStatus,
      fromTime: cell.fromTime,
      toTime: cell.toTime,
      note: cell.note,
    };
  })();

  const activeDayOfWeek: number = (() => {
    if (!activeEdit) return 0;
    if (mode === "usual") return activeEdit.key as number;
    return (
      data.players
        .find((p) => p.id === activeEdit.playerId)
        ?.thisWeek.find((c) => c.date === activeEdit.key)?.dayOfWeek ?? 0
    );
  })();

  return (
    <>
      {/* Mode toggle */}
      <div className="flex gap-1 mb-4 p-1 bg-surface rounded-xl border border-border w-fit">
        {(["this-week", "usual"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={[
              "px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors",
              mode === m
                ? "bg-accent text-bg"
                : "text-text-dim hover:text-text",
            ].join(" ")}
          >
            {m === "usual" ? "Usual" : "This Week"}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[320px] border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="text-left py-2 pr-2 text-xs text-text-mute font-medium w-24 min-w-[6rem]">
                Player
              </th>
              {DAY_ORDER.map((day, i) => (
                <th
                  key={day}
                  className="text-center py-2 text-xs text-text-mute font-medium w-8"
                >
                  {DAY_LABELS[i]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Team window row — only in This Week mode */}
            {mode === "this-week" && (
              <tr>
                <td className="pr-2 py-1 text-[10px] text-text-mute align-middle">
                  Window
                </td>
                {DAY_ORDER.map((day) => {
                  const tw = getTeamWindow(day);
                  return (
                    <td key={day} className="py-1 px-0.5">
                      <TeamWindowRow teamWindow={tw} />
                    </td>
                  );
                })}
              </tr>
            )}

            {data.players.map((player) => {
              const isYou = player.id === currentPlayerId;
              return (
                <tr key={player.id}>
                  <td className="pr-2 py-1 align-middle">
                    <span
                      className={[
                        "text-sm truncate max-w-[6rem] block",
                        isYou ? "text-text font-semibold" : "text-text-dim",
                      ].join(" ")}
                    >
                      {player.number !== null && (
                        <span className="text-text-mute text-xs mr-1">
                          #{player.number}
                        </span>
                      )}
                      {player.name}
                      {isYou && (
                        <span className="ml-1 text-accent text-xs">(you)</span>
                      )}
                    </span>
                  </td>
                  {DAY_ORDER.map((day) => {
                    const entry =
                      mode === "usual"
                        ? getUsualEntry(player, day)
                        : getWeekCell(player, day);
                    const errKey =
                      mode === "usual"
                        ? `${player.id}:${day}`
                        : `${player.id}:${(entry as DayCell).date}`;
                    return (
                      <td key={day} className="py-1 px-0.5">
                        <div className="relative">
                          <GridCell
                            entry={entry}
                            thisWeekMode={mode === "this-week"}
                            onClick={() => openDrawer(player.id, day)}
                          />
                          {cellError === errKey && (
                            <span className="absolute -bottom-3 left-0 right-0 text-center text-[10px] text-danger">
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
          key={`${activeEdit.playerId}:${activeEdit.key}`}
          playerName={activePlayer.name}
          dayOfWeek={activeDayOfWeek}
          entry={activeEntry}
          onSave={handleSave}
          onClose={closeDrawer}
        />
      )}
    </>
  );
}

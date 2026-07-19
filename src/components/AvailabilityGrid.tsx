"use client";

import { useState } from "react";
import type { JSX } from "react";
import { GridCell } from "@/components/GridCell";
import { EditDrawer } from "@/components/EditDrawer";
import { TeamWindowCard, type DayWindowEntry } from "@/components/TeamWindowCard";
import type {
  TeamGridResponse,
  PlayerRow,
  ScheduleEntry,
  DayCell,
  TeamWindow,
  Status,
} from "@/types/api";

// Mon–Sun display order (ISO-style): 1,2,3,4,5,6,0
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
const DAY_LABELS_FULL = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const DAY_LABELS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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
  const [mode, setMode] = useState<GridMode>("this-week");

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
    const weekOverride = weekOverrides.get(key);
    if (weekOverride) return weekOverride;

    // No explicit This Week override — this cell inherits the Usual default.
    // If Usual was optimistically edited client-side, reflect that live
    // instead of the stale server snapshot baked into `base`.
    if (!base.isOverridden) {
      const usualEntry = usualOverrides.get(`${player.id}:${dayOfWeek}`);
      if (usualEntry) {
        return {
          date: base.date,
          dayOfWeek,
          effectiveStatus: usualEntry.status,
          fromTime: usualEntry.fromTime,
          toTime: usualEntry.toTime,
          note: usualEntry.note,
          isOverridden: false,
        };
      }
    }

    return base;
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

  /**
   * Compute the team window for a date, substituting `editedPlayerId`'s cell
   * with `editedCell` (the just-saved value, not yet reflected in state) and
   * resolving every other player via `getWeekCell` — which already applies
   * the Usual-inherits-into-This-Week merge above. Used to keep the window
   * live for edits made from either the Usual or This Week screen.
   */
  function computeWindowForDate(
    isoDate: string,
    dayOfWeek: number,
    editedPlayerId: string,
    editedCell: { status: Status; fromTime: string | null; toTime: string | null },
  ): TeamWindow {
    const cells = data.players.map((p) => {
      if (p.id === editedPlayerId) return editedCell;
      const c = getWeekCell(p, dayOfWeek);
      return {
        status: c.effectiveStatus,
        fromTime: c.fromTime,
        toTime: c.toTime,
      };
    });

    const available = cells
      .map((c) => {
        if (c.status === "UNAVAILABLE") return null;
        if (c.status === "ANYTIME") return { from: "00:00", to: "23:59" };
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

    return { date: isoDate, dayOfWeek, availableCount, window };
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

      // If this day isn't explicitly overridden in This Week, it inherits
      // from Usual — recompute that date's team window to match live.
      const teamWindowBase = data.teamWindows.find(
        (w) => w.dayOfWeek === dayOfWeek,
      );
      const thisWeekCell = data.players
        .find((p) => p.id === playerId)
        ?.thisWeek.find((c) => c.dayOfWeek === dayOfWeek);
      if (
        teamWindowBase &&
        thisWeekCell &&
        !weekOverrides.has(`${playerId}:${teamWindowBase.date}`) &&
        !thisWeekCell.isOverridden
      ) {
        const tw = computeWindowForDate(
          teamWindowBase.date,
          dayOfWeek,
          playerId,
          { status: entry.status, fromTime: entry.fromTime, toTime: entry.toTime },
        );
        setWindowOverrides((prev) => new Map(prev).set(teamWindowBase.date, tw));
      }

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
        if (teamWindowBase) {
          setWindowOverrides((prev) => {
            const next = new Map(prev);
            next.delete(teamWindowBase.date);
            return next;
          });
        }
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

      const tw = computeWindowForDate(isoDate, baseCell.dayOfWeek, playerId, {
        status: entry.status,
        fromTime: entry.fromTime,
        toTime: entry.toTime,
      });
      setWindowOverrides((prev) => new Map(prev).set(isoDate, tw));

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

      {mode === "this-week" && (
        <TeamWindowCard
          entries={DAY_ORDER.map(
            (day, i): DayWindowEntry => ({
              dayOfWeek: day,
              label: DAY_LABELS_FULL[i],
              shortLabel: DAY_LABELS_SHORT[i],
              teamWindow: getTeamWindow(day),
            }),
          )}
        />
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[320px] border-separate border-spacing-0 table-fixed">
          <thead>
            <tr>
              <th className="text-left py-2 pr-2 text-xs text-text-mute font-medium w-24">
                Player
              </th>
              {DAY_ORDER.map((day, i) => (
                <th
                  key={day}
                  className="text-center py-2 text-xs text-text-mute font-medium"
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

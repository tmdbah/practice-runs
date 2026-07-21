"use client";

import { useMemo, useState } from "react";
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
  SessionResponse,
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

/** Groups sessions by their calendar date ("YYYY-MM-DD"), matching the grid's own date convention. */
export function groupSessionsByDate(
  sessions: SessionResponse[],
): Map<string, SessionResponse[]> {
  const map = new Map<string, SessionResponse[]>();
  for (const s of sessions) {
    const isoDate = s.date.slice(0, 10);
    const list = map.get(isoDate);
    if (list) list.push(s);
    else map.set(isoDate, [s]);
  }
  return map;
}

/** True when at least one live (non-cancelled) session is proposed for the given date. */
export function hasSessionOnDate(
  byDate: Map<string, SessionResponse[]>,
  isoDate: string,
): boolean {
  const sessions = byDate.get(isoDate);
  if (!sessions) return false;
  return sessions.some((s) => s.status !== "CANCELLED");
}

/** True when at least one CONFIRMED (booked for sure) session exists on the given date. */
export function isSessionConfirmedOnDate(
  byDate: Map<string, SessionResponse[]>,
  isoDate: string,
): boolean {
  const sessions = byDate.get(isoDate);
  if (!sessions) return false;
  return sessions.some((s) => s.status === "CONFIRMED");
}

/** True when `playerId` has RSVP'd "in" (ANYTIME) to any live (non-cancelled) session on the given date. */
export function isPlayerRsvpdIn(
  byDate: Map<string, SessionResponse[]>,
  isoDate: string,
  playerId: string,
): boolean {
  const sessions = byDate.get(isoDate);
  if (!sessions) return false;
  return sessions.some(
    (s) =>
      s.status !== "CANCELLED" &&
      s.rsvps.some((r) => r.playerId === playerId && r.status === "ANYTIME"),
  );
}

type GridMode = "usual" | "this-week";

interface AvailabilityGridProps {
  data: TeamGridResponse;
  currentPlayerId: string;
  sessions: SessionResponse[];
}

interface DraftEdit {
  playerId: string;
  /** dayOfWeek 0-6 when mode=usual; ISO date string when mode=this-week */
  key: number | string;
}

export function AvailabilityGrid({
  data,
  currentPlayerId,
  sessions,
}: AvailabilityGridProps): JSX.Element {
  const [mode, setMode] = useState<GridMode>("this-week");
  const sessionsByDate = useMemo(
    () => groupSessionsByDate(sessions),
    [sessions],
  );

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

  /** Clears a This Week override, reverting that date back to inheriting Usual. */
  async function handleReset(): Promise<void> {
    if (!activeEdit || mode !== "this-week") return;
    const { playerId } = activeEdit;
    const isoDate = activeEdit.key as string;
    const player = data.players.find((p) => p.id === playerId);
    const baseCell = player?.thisWeek.find((c) => c.date === isoDate);
    if (!player || !baseCell) return;

    const key = `${playerId}:${isoDate}`;
    const previous = weekOverrides.get(key) ?? baseCell;

    const usualEntry = getUsualEntry(player, baseCell.dayOfWeek);
    const inheritedCell: DayCell = {
      date: isoDate,
      dayOfWeek: baseCell.dayOfWeek,
      effectiveStatus: usualEntry.status,
      fromTime: usualEntry.fromTime,
      toTime: usualEntry.toTime,
      note: usualEntry.note,
      isOverridden: false,
    };

    setWeekOverrides((prev) => new Map(prev).set(key, inheritedCell));
    closeDrawer();

    const tw = computeWindowForDate(isoDate, baseCell.dayOfWeek, playerId, {
      status: inheritedCell.effectiveStatus,
      fromTime: inheritedCell.fromTime,
      toTime: inheritedCell.toTime,
    });
    setWindowOverrides((prev) => new Map(prev).set(isoDate, tw));

    const res = await fetch(
      `/api/teams/${data.team.slug}/players/${playerId}/override?date=${isoDate}`,
      { method: "DELETE" },
    );

    if (!res.ok) {
      setWeekOverrides((prev) => new Map(prev).set(key, previous as DayCell));
      setWindowOverrides((prev) => {
        const next = new Map(prev);
        next.delete(isoDate);
        return next;
      });
      setCellError(`${playerId}:${isoDate}`);
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

  const activeIsOverridden: boolean =
    mode === "this-week" && activePlayer
      ? getWeekCell(activePlayer, activeDayOfWeek).isOverridden
      : false;

  return (
    <>
      {/* Mode toggle */}
      <div className="flex gap-1 mb-4 p-1 bg-surface rounded-xl border border-border w-full">
        {(["this-week", "usual"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={[
              "flex-1 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors text-center",
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
        <div
          role="table"
          aria-label="Availability grid"
          className="grid w-full gap-1 lg:gap-2 grid-cols-[6rem_repeat(7,minmax(0,1fr))]"
        >
          <div role="row" className="contents">
            <div
              role="columnheader"
              className="text-left pr-2 pb-1 text-xs text-text-mute font-medium"
            >
              Player
            </div>
            {DAY_ORDER.map((day, i) => {
              const isoDate = getTeamWindow(day)?.date;
              const hasSession = isoDate
                ? hasSessionOnDate(sessionsByDate, isoDate)
                : false;
              const confirmed = isoDate
                ? isSessionConfirmedOnDate(sessionsByDate, isoDate)
                : false;
              return (
                <div
                  key={day}
                  role="columnheader"
                  className={[
                    "text-center pb-1 text-xs font-medium rounded-md",
                    confirmed
                      ? "text-gold bg-gold-soft border border-gold/40"
                      : hasSession
                        ? "text-gold border border-gold/40"
                        : "text-text-mute",
                  ].join(" ")}
                >
                  {DAY_LABELS[i]}
                </div>
              );
            })}
          </div>

          {data.players.map((player) => {
            const isYou = player.id === currentPlayerId;
            return (
              <div role="row" className="contents" key={player.id}>
                <div
                  role="rowheader"
                  className="pr-2 flex items-center min-w-0"
                >
                  <span
                    className={[
                      "text-sm truncate flex items-center gap-1",
                      isYou ? "text-text font-semibold" : "text-text-dim",
                    ].join(" ")}
                  >
                    {player.number !== null ? (
                      <span
                        className={
                          isYou
                            ? "shrink-0 inline-flex items-center justify-center h-[1.125rem] px-1.5 rounded-full bg-gold-soft text-gold text-[10px] font-bold border border-gold/40"
                            : "shrink-0 text-text-mute text-xs"
                        }
                      >
                        #{player.number}
                      </span>
                    ) : (
                      isYou && (
                        <span
                          className="shrink-0 w-1.5 h-1.5 rounded-full bg-gold"
                          aria-hidden="true"
                        />
                      )
                    )}
                    <span className="truncate">{player.name}</span>
                    {isYou && <span className="sr-only"> (you)</span>}
                  </span>
                </div>
                {DAY_ORDER.map((day) => {
                  const entry =
                    mode === "usual"
                      ? getUsualEntry(player, day)
                      : getWeekCell(player, day);
                  const errKey =
                    mode === "usual"
                      ? `${player.id}:${day}`
                      : `${player.id}:${(entry as DayCell).date}`;
                  const cellIsoDate = getTeamWindow(day)?.date;
                  const rsvpdIn = cellIsoDate
                    ? isPlayerRsvpdIn(sessionsByDate, cellIsoDate, player.id)
                    : false;
                  return (
                    <div role="cell" key={day} className="relative">
                      <GridCell
                        entry={entry}
                        thisWeekMode={mode === "this-week"}
                        onClick={() => openDrawer(player.id, day)}
                      />
                      {rsvpdIn && (
                        <span
                          className="absolute bottom-0.5 right-0.5 flex items-center justify-center w-2.5 h-2.5 rounded-full bg-gold text-bg text-[7px] leading-none font-bold"
                          aria-hidden="true"
                        >
                          ✓
                        </span>
                      )}
                      {rsvpdIn && (
                        <span className="sr-only">
                          {" "}
                          — RSVP&apos;d in for a proposed session
                        </span>
                      )}
                      {cellError === errKey && (
                        <span className="absolute -bottom-3 left-0 right-0 text-center text-[10px] text-danger">
                          !
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {activeEdit && activePlayer && activeEntry && (
        <EditDrawer
          key={`${activeEdit.playerId}:${activeEdit.key}`}
          playerName={activePlayer.name}
          dayOfWeek={activeDayOfWeek}
          entry={activeEntry}
          onSave={handleSave}
          onClose={closeDrawer}
          isOverridden={activeIsOverridden}
          onReset={mode === "this-week" ? handleReset : undefined}
        />
      )}
    </>
  );
}

"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { JSX } from "react";
import type { TeamWindow } from "@/types/api";

export interface DayWindowEntry {
  dayOfWeek: number;
  /** Full day name, e.g. "Monday" */
  label: string;
  /** Short day abbreviation, e.g. "Fri" */
  shortLabel: string;
  teamWindow: TeamWindow | undefined;
}

interface TeamWindowCardProps {
  /** Length 7, Monday–Sunday order (matches the grid's display order) */
  entries: DayWindowEntry[];
}

/** Formats "HH:MM" → "H:MMam/pm" */
function fmtTime(t: string): string {
  const [hStr, mStr] = t.split(":");
  const h = parseInt(hStr, 10);
  const period = h < 12 ? "am" : "pm";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr}${period}`;
}

/** A single player being free isn't an overlap — need at least two to call it one. */
export const MIN_OVERLAP_PLAYERS = 2;

/**
 * Highest availableCount wins among days with at least MIN_OVERLAP_PLAYERS
 * free; ties broken by earliest date. If no day clears that bar (including
 * all-zero), defaults to day 0.
 */
export function computeDefaultIndex(entries: DayWindowEntry[]): number {
  let bestIndex = 0;
  let bestCount = -1;
  let bestDate = "";
  entries.forEach((entry, i) => {
    const count = entry.teamWindow?.availableCount ?? 0;
    if (count < MIN_OVERLAP_PLAYERS) return;
    const date = entry.teamWindow?.date ?? "";
    const better =
      count > bestCount || (count === bestCount && date !== "" && (bestDate === "" || date < bestDate));
    if (better) {
      bestCount = count;
      bestDate = date;
      bestIndex = i;
    }
  });
  return bestIndex;
}

export function TeamWindowCard({ entries }: TeamWindowCardProps): JSX.Element {
  const bestIndex = computeDefaultIndex(entries);
  const bestAvailableCount = entries[bestIndex]?.teamWindow?.availableCount ?? 0;

  const [index, setIndex] = useState(bestIndex);
  const prevBestIndexRef = useRef(bestIndex);
  const scrollRef = useRef<HTMLDivElement>(null);
  const suppressScrollSync = useRef(false);

  function scrollToIndex(target: number, behavior: ScrollBehavior = "smooth"): void {
    const container = scrollRef.current;
    if (!container) return;
    const clamped = Math.max(0, Math.min(entries.length - 1, target));
    const child = container.children[clamped] as HTMLElement | undefined;
    if (child) {
      suppressScrollSync.current = true;
      child.scrollIntoView({ behavior, inline: "center", block: "nearest" });
    }
    setIndex(clamped);
  }

  // The default index is computed from data (best-availability day), but
  // that alone never moves the actual scroll position — without this the
  // carousel visually opens on day 0 while the dot indicator shows the
  // real default, looking desynced. Jump there instantly, pre-paint, so
  // there's no visible flash of the wrong day.
  useLayoutEffect(() => {
    if (index !== 0) scrollToIndex(index, "instant");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Follow the carousel to the new best-overlap day when an availability
  // edit changes which day that is (skips the initial mount, which is
  // already positioned there by the layout effect above).
  useEffect(() => {
    if (bestIndex !== prevBestIndexRef.current) {
      prevBestIndexRef.current = bestIndex;
      scrollToIndex(bestIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bestIndex]);

  // Keep the active dot/arrows in sync when the user swipes manually,
  // without fighting our own programmatic scrollIntoView calls.
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    let settleTimer: ReturnType<typeof setTimeout>;
    function handleScroll(): void {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(() => {
        if (suppressScrollSync.current) {
          suppressScrollSync.current = false;
          return;
        }
        const node = scrollRef.current;
        if (!node) return;
        let closest = 0;
        let closestDist = Infinity;
        Array.from(node.children).forEach((child, i) => {
          const dist = Math.abs((child as HTMLElement).offsetLeft - node.scrollLeft);
          if (dist < closestDist) {
            closestDist = dist;
            closest = i;
          }
        });
        setIndex(closest);
      }, 120);
    }

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
      clearTimeout(settleTimer);
    };
  }, []);

  const isViewingBest = index === bestIndex && bestAvailableCount >= MIN_OVERLAP_PLAYERS;

  return (
    <div className="mb-4">
      <div
        className={[
          "flex items-center gap-1 rounded-xl border pl-1 pr-2 transition-colors",
          isViewingBest
            ? "bg-gold-soft border-gold"
            : "bg-surface border-border",
        ].join(" ")}
      >
        <button
          type="button"
          onClick={() => scrollToIndex(index - 1)}
          disabled={index === 0}
          aria-label="Previous day"
          className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-text-dim disabled:opacity-20 disabled:cursor-not-allowed hover:text-accent transition-colors"
        >
          ‹
        </button>

        <div
          ref={scrollRef}
          className="flex-1 min-w-0 flex overflow-x-auto snap-x snap-mandatory no-scrollbar"
        >
          {entries.map((entry, i) => {
            const w = entry.teamWindow;
            const availableCount = w?.availableCount ?? 0;
            const isBest = i === bestIndex && availableCount >= MIN_OVERLAP_PLAYERS;
            return (
              <div key={entry.dayOfWeek} className="w-full shrink-0 snap-center py-3">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={[
                      "text-xs font-semibold whitespace-nowrap",
                      isBest ? "text-gold" : "text-text-dim",
                    ].join(" ")}
                  >
                    Team window
                  </span>
                  {availableCount > 0 && w?.window ? (
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-accent-soft text-accent border border-accent-dim whitespace-nowrap">
                      {entry.shortLabel} {fmtTime(w.window.from)}–{fmtTime(w.window.to)}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-surface-2 text-text-mute border border-border whitespace-nowrap">
                      {entry.shortLabel} —
                    </span>
                  )}
                </div>
                <div
                  className={[
                    "text-[11px] mt-0.5",
                    isBest ? "text-gold" : "text-text-mute",
                  ].join(" ")}
                >
                  {availableCount === 0
                    ? "Nobody's free yet"
                    : `${availableCount} free${isBest ? " · best overlap" : ""}`}
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => scrollToIndex(index + 1)}
          disabled={index === entries.length - 1}
          aria-label="Next day"
          className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-text-dim disabled:opacity-20 disabled:cursor-not-allowed hover:text-accent transition-colors"
        >
          ›
        </button>
      </div>

      <div className="flex justify-center gap-1.5 mt-1.5">
        {entries.map((entry, i) => (
          <button
            key={entry.dayOfWeek}
            type="button"
            onClick={() => scrollToIndex(i)}
            aria-label={`Jump to ${entry.label}`}
            aria-current={i === index}
            className={[
              "w-1.5 h-1.5 rounded-full transition-colors",
              i === index ? "bg-accent" : "bg-border-strong hover:bg-text-dim",
            ].join(" ")}
          />
        ))}
      </div>
    </div>
  );
}

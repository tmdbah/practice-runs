"use client";

import { useEffect, useRef, useState } from "react";
import type { JSX } from "react";
import type { TeamWindow } from "@/types/api";

export interface DayWindowEntry {
  dayOfWeek: number;
  /** Full day name, e.g. "Monday" */
  label: string;
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

/** Formats an ISO date "YYYY-MM-DD" → "Jul 24" */
function fmtDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Highest availableCount wins; ties broken by earliest date. All-zero → day 0. */
export function computeDefaultIndex(entries: DayWindowEntry[]): number {
  let bestIndex = 0;
  let bestCount = -1;
  let bestDate = "";
  entries.forEach((entry, i) => {
    const count = entry.teamWindow?.availableCount ?? 0;
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
  const [index, setIndex] = useState(() => computeDefaultIndex(entries));
  const scrollRef = useRef<HTMLDivElement>(null);
  const suppressScrollSync = useRef(false);

  function scrollToIndex(target: number): void {
    const container = scrollRef.current;
    if (!container) return;
    const clamped = Math.max(0, Math.min(entries.length - 1, target));
    const child = container.children[clamped] as HTMLElement | undefined;
    if (child) {
      suppressScrollSync.current = true;
      child.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
    setIndex(clamped);
  }

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

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => scrollToIndex(index - 1)}
          disabled={index === 0}
          aria-label="Previous day"
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-surface border border-border text-text text-lg disabled:opacity-30 disabled:cursor-not-allowed hover:border-accent transition-colors"
        >
          ‹
        </button>

        <div
          ref={scrollRef}
          className="flex-1 flex overflow-x-auto snap-x snap-mandatory no-scrollbar"
        >
          {entries.map((entry) => {
            const w = entry.teamWindow;
            const availableCount = w?.availableCount ?? 0;
            return (
              <div key={entry.dayOfWeek} className="w-full shrink-0 snap-center px-0.5">
                <div className="rounded-xl bg-surface border border-border px-4 py-3 flex flex-col items-center gap-1 text-center min-h-[86px] justify-center">
                  <div className="text-[10px] uppercase tracking-wide text-text-mute">
                    {entry.label}
                    {w?.date ? ` · ${fmtDate(w.date)}` : ""}
                  </div>
                  {availableCount === 0 ? (
                    <div className="text-sm text-text-dim py-1">
                      Nobody&rsquo;s free yet
                    </div>
                  ) : (
                    <>
                      <div className="text-base font-bold text-accent leading-tight">
                        {w?.window
                          ? `${fmtTime(w.window.from)} – ${fmtTime(w.window.to)}`
                          : "No common time"}
                      </div>
                      <div className="text-xs text-text-dim">
                        {availableCount} free
                      </div>
                    </>
                  )}
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
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-surface border border-border text-text text-lg disabled:opacity-30 disabled:cursor-not-allowed hover:border-accent transition-colors"
        >
          ›
        </button>
      </div>

      <div className="flex justify-center gap-1.5 mt-2">
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

"use client";

import type { JSX } from "react";
import type { ScheduleEntry, DayCell } from "@/types/api";

interface GridCellProps {
  entry: ScheduleEntry | DayCell;
  /** When true, renders This Week inherited/overridden styling */
  thisWeekMode?: boolean;
  onClick: () => void;
}

export function GridCell({
  entry,
  thisWeekMode = false,
  onClick,
}: GridCellProps): JSX.Element {
  const status =
    "effectiveStatus" in entry ? entry.effectiveStatus : entry.status;
  const isAvailable = status === "ANYTIME" || status === "SPECIFIC";
  const isOverridden = "isOverridden" in entry ? entry.isOverridden : true;
  const hasNote = entry.note !== null;

  // In This Week mode: inherited cells are faded; overridden cells are full-opacity + dot
  const inherited = thisWeekMode && !isOverridden;

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "relative w-full aspect-square rounded-md flex items-center justify-center transition-colors active:scale-95 border",
        isAvailable
          ? inherited
            ? "bg-accent/30 border-accent/30 hover:bg-accent/40"
            : "bg-accent border-accent hover:bg-accent-dim"
          : inherited
            ? "bg-surface-2/50 border-border/50 hover:border-accent/50"
            : "bg-surface-2 border-border-strong hover:border-accent",
      ].join(" ")}
      aria-label={`Status: ${status}${inherited ? " (inherited)" : ""}`}
    >
      {hasNote && !thisWeekMode && (
        <span
          className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-gold"
          aria-hidden="true"
        />
      )}
      {thisWeekMode && isOverridden && (
        <span
          className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-accent"
          aria-hidden="true"
        />
      )}
    </button>
  );
}

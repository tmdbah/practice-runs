"use client";

import type { JSX } from "react";
import type { ScheduleEntry } from "@/types/api";

interface GridCellProps {
  entry: ScheduleEntry;
  onClick: () => void;
}

export function GridCell({ entry, onClick }: GridCellProps): JSX.Element {
  const isAvailable = entry.status === "ANYTIME" || entry.status === "SPECIFIC";

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "relative w-full aspect-square rounded-md flex items-center justify-center transition-colors active:scale-95 border",
        isAvailable
          ? "bg-accent border-accent hover:bg-accent-dim"
          : "bg-surface-2 border-border-strong hover:border-accent",
      ].join(" ")}
      aria-label={`Status: ${entry.status}`}
    >
      {entry.note && (
        <span
          className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-gold"
          aria-hidden="true"
        />
      )}
    </button>
  );
}

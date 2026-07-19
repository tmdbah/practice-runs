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
        "relative w-full aspect-square rounded-md flex items-center justify-center transition-colors active:scale-95",
        isAvailable
          ? "bg-teal-500 hover:bg-teal-400"
          : "bg-neutral-800 hover:bg-neutral-700",
      ].join(" ")}
      aria-label={`Status: ${entry.status}`}
    >
      {entry.note && (
        <span
          className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400"
          aria-hidden="true"
        />
      )}
    </button>
  );
}

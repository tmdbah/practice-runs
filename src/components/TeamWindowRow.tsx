"use client";

import type { JSX } from "react";
import type { TeamWindow } from "@/types/api";

interface TeamWindowRowProps {
  teamWindow: TeamWindow | undefined;
}

/** Formats "HH:MM" → "H:MMam/pm" */
function fmt(t: string): string {
  const [hStr, mStr] = t.split(":");
  const h = parseInt(hStr, 10);
  const period = h < 12 ? "am" : "pm";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr}${period}`;
}

export function TeamWindowRow({ teamWindow }: TeamWindowRowProps): JSX.Element {
  if (!teamWindow) {
    return <div className="w-full aspect-square" />;
  }

  const { availableCount, window } = teamWindow;

  if (availableCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center w-full aspect-square rounded-md bg-surface-2 border border-border">
        <span className="text-[8px] text-text-mute leading-tight">0</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center w-full aspect-square rounded-md bg-surface border border-border gap-0.5 px-0.5">
      <span className="text-[9px] font-semibold text-accent leading-none">
        {availableCount}
      </span>
      {window ? (
        <>
          <span className="text-[7px] text-text-dim leading-none">
            {fmt(window.from)}
          </span>
          <span className="text-[7px] text-text-mute leading-none">–</span>
          <span className="text-[7px] text-text-dim leading-none">
            {fmt(window.to)}
          </span>
        </>
      ) : (
        <span className="text-[7px] text-text-mute leading-none text-center">
          no common
        </span>
      )}
    </div>
  );
}

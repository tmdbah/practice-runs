import type { Status } from "@/generated/prisma/enums";

export type { Status };

export interface ScheduleEntry {
  dayOfWeek: number;
  status: Status;
  fromTime: string | null;
  toTime: string | null;
  note: string | null;
}

export interface DayCell {
  date: string; // ISO date "YYYY-MM-DD"
  dayOfWeek: number;
  effectiveStatus: Status;
  fromTime: string | null;
  toTime: string | null;
  note: string | null;
  isOverridden: boolean;
}

export interface TeamWindow {
  date: string; // ISO date "YYYY-MM-DD"
  dayOfWeek: number;
  availableCount: number;
  window: { from: string; to: string } | null;
}

export interface PlayerRow {
  id: string;
  name: string;
  number: number | null;
  schedule: ScheduleEntry[]; // Usual (DayDefault), indexed by dayOfWeek
  thisWeek: DayCell[]; // This Week effective view, length 7
}

export interface TeamGridResponse {
  team: { slug: string; name: string };
  players: PlayerRow[];
  teamWindows: TeamWindow[]; // length 7, one per upcoming date
}

export interface ApiError {
  error: string;
}

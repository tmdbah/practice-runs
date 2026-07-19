import type { Status } from "@/generated/prisma/enums";

export type { Status };

export interface ScheduleEntry {
  dayOfWeek: number;
  status: Status;
  fromTime: string | null;
  toTime: string | null;
  note: string | null;
}

export interface PlayerRow {
  id: string;
  name: string;
  number: number | null;
  schedule: ScheduleEntry[];
}

export interface TeamGridResponse {
  team: { slug: string; name: string };
  players: PlayerRow[];
}

export interface ApiError {
  error: string;
}

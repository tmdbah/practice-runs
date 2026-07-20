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
  team: { id: string; slug: string; name: string };
  players: PlayerRow[];
  teamWindows: TeamWindow[]; // length 7, one per upcoming date
}

export interface ApiError {
  error: string;
}

// ─── Phase 3: Sessions & Venues ──────────────────────────────────────────────

export type VenueType = "RENTED_GYM" | "OPEN_GYM" | "PARK";

export interface VenueSummary {
  id: string;
  name: string;
  type: VenueType;
  address: string | null;
  bookingUrl: string | null;
  costPerSession: number | null; // cents
}

export interface RsvpEntry {
  playerId: string;
  playerName: string;
  status: Status; // ANYTIME = in, UNAVAILABLE = out
}

export interface SessionResponse {
  id: string;
  teamId: string;
  venue: VenueSummary | null;
  date: string; // ISO date string
  fromTime: string;
  toTime: string;
  costTotal: number | null; // cents
  minPlayers: number | null;
  proposedById: string | null; // playerId of proposer; null for legacy rows
  rsvps: RsvpEntry[];
}

export interface CreateSessionBody {
  venueId?: string;
  date: string; // ISO date string "YYYY-MM-DD"
  fromTime: string; // "HH:MM"
  toTime: string; // "HH:MM"
  costTotal?: number; // cents, RENTED_GYM only
  minPlayers?: number; // RENTED_GYM only
  proposedById?: string; // playerId of the proposer
}

export interface UpsertRsvpBody {
  playerId: string;
  status: "ANYTIME" | "UNAVAILABLE"; // in or out
}

export interface EditSessionBody {
  venueId?: string | null;
  date: string; // "YYYY-MM-DD"
  fromTime: string; // "HH:MM"
  toTime: string; // "HH:MM"
  costTotal?: number | null; // cents, RENTED_GYM only
  minPlayers?: number | null; // RENTED_GYM only
}

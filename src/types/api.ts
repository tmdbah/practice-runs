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

export type VenueType =
  | "RENTED_GYM"
  | "OPEN_GYM"
  | "PARK"
  | "RECREATION_CENTER";

export const VENUE_TYPE_LABELS: Record<VenueType, string> = {
  RENTED_GYM: "Rented Gym",
  OPEN_GYM: "Open Gym",
  PARK: "Park",
  RECREATION_CENTER: "Recreation Center",
};

export type SessionStatus = "PROPOSED" | "CONFIRMED" | "CANCELLED";

export type SessionKind = "PRACTICE" | "GAME";

export const SESSION_KIND_LABELS: Record<SessionKind, string> = {
  PRACTICE: "Practice Session",
  GAME: "Game",
};

export type VoteLevel = "PREFER" | "OK" | "CANT";

export const VOTE_LEVEL_LABELS: Record<VoteLevel, string> = {
  PREFER: "Prefer",
  OK: "OK",
  CANT: "Can't",
};

export interface VenueSummary {
  id: string;
  name: string;
  type: VenueType;
  address: string | null;
  bookingUrl: string | null;
  costPerHour: number | null; // cents
  openTime: string | null; // "HH:MM"
  closeTime: string | null; // "HH:MM"
}

export interface RsvpEntry {
  playerId: string;
  playerName: string;
  status: Status; // ANYTIME = in, UNAVAILABLE = out
}

export interface VoteEntry {
  playerId: string;
  playerName: string;
  level: VoteLevel;
}

export interface SessionResponse {
  id: string;
  teamId: string;
  venue: VenueSummary | null;
  kind: SessionKind;
  groupId: string | null; // shared by sibling candidate time slots; null = standalone session
  date: string; // ISO date string
  fromTime: string;
  toTime: string;
  costTotal: number | null; // cents
  minPlayers: number | null;
  proposedById: string | null; // playerId of proposer; null for legacy rows
  status: SessionStatus;
  rsvps: RsvpEntry[];
  votes: VoteEntry[]; // only meaningful when groupId is set
}

export interface CreateSessionBody {
  venueId?: string;
  kind?: SessionKind; // defaults to PRACTICE (Prisma column default) when omitted
  groupId?: string; // shared client-generated id linking sibling candidate slots proposed together
  date: string; // ISO date string "YYYY-MM-DD"
  fromTime: string; // "HH:MM"
  toTime: string; // "HH:MM"
  costTotal?: number; // cents, RENTED_GYM only
  minPlayers?: number; // RENTED_GYM booking threshold, or GAME forfeit threshold
  proposedById?: string; // playerId of the proposer
}

export interface UpsertRsvpBody {
  playerId: string;
  status: "ANYTIME" | "UNAVAILABLE"; // in or out
}

export interface CastVoteBody {
  playerId: string;
  level: VoteLevel;
}

export interface EditSessionBody {
  venueId?: string | null;
  date: string; // "YYYY-MM-DD"
  fromTime: string; // "HH:MM"
  toTime: string; // "HH:MM"
  costTotal?: number | null; // cents, RENTED_GYM only
  minPlayers?: number | null; // RENTED_GYM only
}

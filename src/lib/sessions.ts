import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { SessionResponse } from "@/types/api";

export const sessionInclude = {
  venue: true,
  rsvps: { include: { player: { select: { id: true, name: true } } } },
  votes: { include: { player: { select: { id: true, name: true } } } },
} satisfies Prisma.SessionInclude;

type SessionWithRelations = Prisma.SessionGetPayload<{
  include: typeof sessionInclude;
}>;

export function toSessionResponse(
  session: SessionWithRelations,
): SessionResponse {
  return {
    id: session.id,
    teamId: session.teamId,
    kind: session.kind,
    groupId: session.groupId,
    venue: session.venue
      ? {
          id: session.venue.id,
          name: session.venue.name,
          type: session.venue.type,
          address: session.venue.address,
          bookingUrl: session.venue.bookingUrl,
          costPerHour: session.venue.costPerHour,
          openTime: session.venue.openTime,
          closeTime: session.venue.closeTime,
        }
      : null,
    date: session.date.toISOString(),
    fromTime: session.fromTime,
    toTime: session.toTime,
    costTotal: session.costTotal,
    minPlayers: session.minPlayers,
    proposedById: session.proposedById,
    status: session.status,
    rsvps: session.rsvps.map((r) => ({
      playerId: r.playerId,
      playerName: r.player.name,
      status: r.status,
    })),
    votes: session.votes.map((v) => ({
      playerId: v.playerId,
      playerName: v.player.name,
      level: v.level,
    })),
  };
}

/**
 * The real team is based in Charlotte, NC — see the identical
 * TEAM_TIMEZONE rationale in src/lib/teams.ts. Duplicated as a single
 * constant here rather than shared, since this file has no other
 * dependency on that module.
 */
const TEAM_TIMEZONE = "America/New_York";

/** "YYYY-MM-DD" and "HH:MM" for the current instant, in TEAM_TIMEZONE. */
function getLocalNowParts(): { date: string; time: string } {
  const now = new Date();
  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TEAM_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = dateParts.find((p) => p.type === "year")?.value;
  const month = dateParts.find((p) => p.type === "month")?.value;
  const day = dateParts.find((p) => p.type === "day")?.value;

  const timeParts = new Intl.DateTimeFormat("en-US", {
    timeZone: TEAM_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = timeParts.find((p) => p.type === "hour")?.value;
  const minute = timeParts.find((p) => p.type === "minute")?.value;

  return { date: `${year}-${month}-${day}`, time: `${hour}:${minute}` };
}

/** True once a session's calendar date + end time has passed, in TEAM_TIMEZONE. */
function hasSessionEnded(session: { date: Date; toTime: string }): boolean {
  const isoDate = session.date.toISOString().slice(0, 10);
  const { date: today, time: nowTime } = getLocalNowParts();
  if (isoDate < today) return true;
  if (isoDate > today) return false;
  return session.toTime <= nowTime;
}

/**
 * Fetches all sessions for a team, ordered by date, mapped to the API
 * response shape — excluding sessions whose date + end time has already
 * passed. Nothing is deleted; an expired session just stops appearing in
 * the list a player sees, the same non-destructive treatment already
 * given to cancelled sessions (kept, not deleted, just no longer
 * actionable). A group of candidate slots where one has expired but a
 * sibling hasn't degrades gracefully via SessionsSection's existing
 * isOpenGroup check, same as deleting a slot down to one.
 */
export async function getSessionsForTeam(
  teamId: string,
): Promise<SessionResponse[]> {
  const sessions = await prisma.session.findMany({
    where: { teamId },
    orderBy: { date: "asc" },
    include: sessionInclude,
  });

  return sessions.filter((s) => !hasSessionEnded(s)).map(toSessionResponse);
}

/** Fetches a single session scoped to a team, mapped to the API response shape. Returns null if not found or not owned by this team. */
export async function getSessionForTeam(
  teamId: string,
  sessionId: string,
): Promise<SessionResponse | null> {
  const session = await prisma.session.findFirst({
    where: { id: sessionId, teamId },
    include: sessionInclude,
  });
  if (!session) return null;

  return toSessionResponse(session);
}

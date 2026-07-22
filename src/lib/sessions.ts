import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { SessionResponse } from "@/types/api";

export const sessionInclude = {
  venue: true,
  rsvps: { include: { player: { select: { id: true, name: true } } } },
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
  };
}

/** Fetches all sessions for a team, ordered by date, mapped to the API response shape. */
export async function getSessionsForTeam(
  teamId: string,
): Promise<SessionResponse[]> {
  const sessions = await prisma.session.findMany({
    where: { teamId },
    orderBy: { date: "asc" },
    include: sessionInclude,
  });

  return sessions.map(toSessionResponse);
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

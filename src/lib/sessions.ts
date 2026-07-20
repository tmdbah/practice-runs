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
    venue: session.venue
      ? {
          id: session.venue.id,
          name: session.venue.name,
          type: session.venue.type,
          address: session.venue.address,
          bookingUrl: session.venue.bookingUrl,
          costPerSession: session.venue.costPerSession,
        }
      : null,
    date: session.date.toISOString(),
    fromTime: session.fromTime,
    toTime: session.toTime,
    costTotal: session.costTotal,
    minPlayers: session.minPlayers,
    proposedById: session.proposedById,
    rsvps: session.rsvps.map((r) => ({
      playerId: r.playerId,
      playerName: r.player.name,
      status: r.status,
    })),
  };
}

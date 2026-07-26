import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sessionInclude, toSessionResponse } from "@/lib/sessions";
import type { Status } from "@/generated/prisma/enums";
import type { SessionResponse, ApiError } from "@/types/api";

interface RouteParams {
  params: Promise<{ slug: string; sessionId: string }>;
}

/**
 * Locks in one slot as the winner among a grouped multi-slot proposal:
 * confirms this session, cancels every sibling sharing the same groupId, and
 * carries each roster player's vote over into a real Rsvp on the winner
 * (PREFER/OK -> "in", CANT/no vote -> "out") so the winner immediately reuses
 * the existing single-session display/cost-split code with no new UI needed.
 * Proposer-only in the UI, not enforced server-side (matches the rest of this
 * app's Edit/Delete/RSVP trust model). Idempotent when already CONFIRMED.
 * The only route in this app using an interactive transaction: a partial
 * failure here would leave a confirmed winner alongside a still-votable
 * sibling, which breaks the feature's core guarantee.
 */
export async function PATCH(
  _req: Request,
  { params }: RouteParams,
): Promise<NextResponse<SessionResponse[] | ApiError>> {
  const { slug, sessionId } = await params;

  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const existing = await prisma.session.findFirst({
    where: { id: sessionId, teamId: team.id },
    include: sessionInclude,
  });
  if (!existing) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (!existing.groupId) {
    return NextResponse.json(
      { error: "This session has no alternative slots to lock in" },
      { status: 400 },
    );
  }

  if (existing.status === "CANCELLED") {
    return NextResponse.json(
      { error: "Cannot lock in a cancelled slot" },
      { status: 400 },
    );
  }

  const siblingWhere = {
    groupId: existing.groupId,
    teamId: team.id,
    id: { not: sessionId },
  };

  if (existing.status === "CONFIRMED") {
    const siblings = await prisma.session.findMany({
      where: siblingWhere,
      include: sessionInclude,
    });
    return NextResponse.json([
      toSessionResponse(existing),
      ...siblings.map(toSessionResponse),
    ]);
  }

  const rosterPlayers = await prisma.player.findMany({
    where: { teamId: team.id },
    select: { id: true },
  });

  const voteLevelByPlayerId = new Map(
    existing.votes.map((v) => [v.playerId, v.level]),
  );

  const rsvpUpserts = rosterPlayers.map((p) => {
    const level = voteLevelByPlayerId.get(p.id);
    const status: Status =
      level === "PREFER" || level === "OK" ? "ANYTIME" : "UNAVAILABLE";
    return prisma.rsvp.upsert({
      where: { sessionId_playerId: { sessionId, playerId: p.id } },
      update: { status },
      create: { sessionId, playerId: p.id, status },
    });
  });

  await prisma.$transaction([
    prisma.session.update({
      where: { id: sessionId },
      data: { status: "CONFIRMED" },
    }),
    prisma.session.updateMany({
      where: siblingWhere,
      data: { status: "CANCELLED" },
    }),
    ...rsvpUpserts,
  ]);

  const [winner, siblings] = await Promise.all([
    prisma.session.findUnique({
      where: { id: sessionId },
      include: sessionInclude,
    }),
    prisma.session.findMany({
      where: siblingWhere,
      include: sessionInclude,
    }),
  ]);

  if (!winner) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json([
    toSessionResponse(winner),
    ...siblings.map(toSessionResponse),
  ]);
}

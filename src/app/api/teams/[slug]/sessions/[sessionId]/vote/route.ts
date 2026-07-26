import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sessionInclude, toSessionResponse } from "@/lib/sessions";
import type { SessionResponse, CastVoteBody, ApiError } from "@/types/api";

interface RouteParams {
  params: Promise<{ slug: string; sessionId: string }>;
}

/**
 * Upserts the calling player's per-slot vote (PREFER/OK/CANT) on one candidate
 * slot within a grouped multi-slot proposal. Only legal while the session still
 * has a groupId and is still PROPOSED — voting closes once a slot is locked in
 * or the group is otherwise resolved.
 */
export async function PUT(
  req: Request,
  { params }: RouteParams,
): Promise<NextResponse<SessionResponse | ApiError>> {
  const { slug, sessionId } = await params;

  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { playerId, level } = body as CastVoteBody;

  if (!playerId || (level !== "PREFER" && level !== "OK" && level !== "CANT")) {
    return NextResponse.json(
      { error: "playerId and level ('PREFER' | 'OK' | 'CANT') are required" },
      { status: 400 },
    );
  }

  // Verify session belongs to this team
  const session = await prisma.session.findFirst({
    where: { id: sessionId, teamId: team.id },
  });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (!session.groupId) {
    return NextResponse.json(
      { error: "This session doesn't support slot voting" },
      { status: 400 },
    );
  }

  if (session.status !== "PROPOSED") {
    return NextResponse.json(
      { error: "Voting is closed for this slot" },
      { status: 400 },
    );
  }

  // Verify player belongs to this team
  const player = await prisma.player.findFirst({
    where: { id: playerId, teamId: team.id },
  });
  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  await prisma.slotVote.upsert({
    where: { sessionId_playerId: { sessionId, playerId } },
    update: { level },
    create: { sessionId, playerId, level },
  });

  // Return the full updated session
  const updated = await prisma.session.findUnique({
    where: { id: sessionId },
    include: sessionInclude,
  });

  if (!updated) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json(toSessionResponse(updated));
}

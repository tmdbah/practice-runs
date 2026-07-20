import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sessionInclude, toSessionResponse } from "@/lib/sessions";
import type { SessionResponse, UpsertRsvpBody, ApiError } from "@/types/api";

interface RouteParams {
  params: Promise<{ slug: string; sessionId: string }>;
}

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

  const { playerId, status } = body as UpsertRsvpBody;

  if (!playerId || (status !== "ANYTIME" && status !== "UNAVAILABLE")) {
    return NextResponse.json(
      { error: "playerId and status ('ANYTIME' | 'UNAVAILABLE') are required" },
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

  // Verify player belongs to this team
  const player = await prisma.player.findFirst({
    where: { id: playerId, teamId: team.id },
  });
  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  await prisma.rsvp.upsert({
    where: { sessionId_playerId: { sessionId, playerId } },
    update: { status },
    create: { sessionId, playerId, status },
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

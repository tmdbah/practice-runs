import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sessionInclude, toSessionResponse } from "@/lib/sessions";
import type { SessionResponse, EditSessionBody, ApiError } from "@/types/api";

interface RouteParams {
  params: Promise<{ slug: string; sessionId: string }>;
}

/** Edits an existing session in place — proposer-only in the UI, not enforced server-side (matches DELETE/RSVP's trust model). RSVPs are untouched. */
export async function PATCH(
  req: Request,
  { params }: RouteParams,
): Promise<NextResponse<SessionResponse | ApiError>> {
  const { slug, sessionId } = await params;

  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const existing = await prisma.session.findFirst({
    where: { id: sessionId, teamId: team.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { venueId, date, fromTime, toTime, costTotal, minPlayers } =
    body as EditSessionBody;

  if (!date || !fromTime || !toTime) {
    return NextResponse.json(
      { error: "date, fromTime, and toTime are required" },
      { status: 400 },
    );
  }

  // Validate date string
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  // Validate venue exists if provided
  if (venueId) {
    const venue = await prisma.venue.findUnique({ where: { id: venueId } });
    if (!venue) {
      return NextResponse.json({ error: "Venue not found" }, { status: 400 });
    }
  }

  const updated = await prisma.session.update({
    where: { id: sessionId },
    data: {
      venueId: venueId ?? null,
      date: parsedDate,
      fromTime,
      toTime,
      costTotal: costTotal ?? null,
      minPlayers: minPlayers ?? null,
    },
    include: sessionInclude,
  });

  return NextResponse.json(toSessionResponse(updated));
}

export async function DELETE(
  _req: Request,
  { params }: RouteParams,
): Promise<NextResponse<null | ApiError>> {
  const { slug, sessionId } = await params;

  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const session = await prisma.session.findFirst({
    where: { id: sessionId, teamId: team.id },
  });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // RSVPs cascade-delete via the schema relation
  await prisma.session.delete({ where: { id: sessionId } });

  return new NextResponse(null, { status: 204 });
}

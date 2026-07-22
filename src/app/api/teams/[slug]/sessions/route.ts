import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sessionInclude, toSessionResponse } from "@/lib/sessions";
import { SessionKind } from "@/generated/prisma/enums";
import type { SessionResponse, CreateSessionBody, ApiError } from "@/types/api";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(
  _req: Request,
  { params }: RouteParams,
): Promise<NextResponse<SessionResponse[] | ApiError>> {
  const { slug } = await params;

  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const sessions = await prisma.session.findMany({
    where: { teamId: team.id },
    orderBy: { date: "asc" },
    include: sessionInclude,
  });

  return NextResponse.json(sessions.map(toSessionResponse));
}

export async function POST(
  req: Request,
  { params }: RouteParams,
): Promise<NextResponse<SessionResponse | ApiError>> {
  const { slug } = await params;

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

  const {
    venueId,
    kind,
    date,
    fromTime,
    toTime,
    costTotal,
    minPlayers,
    proposedById,
  } = body as CreateSessionBody;

  if (!date || !fromTime || !toTime) {
    return NextResponse.json(
      { error: "date, fromTime, and toTime are required" },
      { status: 400 },
    );
  }

  if (kind !== undefined && !Object.values(SessionKind).includes(kind as SessionKind)) {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
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

  const session = await prisma.session.create({
    data: {
      teamId: team.id,
      venueId: venueId ?? null,
      proposedById: proposedById ?? null,
      kind: kind ?? undefined,
      date: parsedDate,
      fromTime,
      toTime,
      costTotal: costTotal ?? null,
      minPlayers: minPlayers ?? null,
    },
    include: sessionInclude,
  });

  return NextResponse.json(toSessionResponse(session), { status: 201 });
}

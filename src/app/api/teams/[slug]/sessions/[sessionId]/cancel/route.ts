import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sessionInclude, toSessionResponse } from "@/lib/sessions";
import type { SessionResponse, ApiError } from "@/types/api";

interface RouteParams {
  params: Promise<{ slug: string; sessionId: string }>;
}

/**
 * Marks a session's slot as no longer available (e.g. the venue got booked
 * by someone else) rather than deleting it — RSVPs stay as a historical
 * record of who committed to that slot. Reachable from PROPOSED or
 * CONFIRMED; idempotent when already CANCELLED. Proposer-only in the UI,
 * not enforced server-side (matches Edit/Delete/RSVP's trust model).
 */
export async function PATCH(
  _req: Request,
  { params }: RouteParams,
): Promise<NextResponse<SessionResponse | ApiError>> {
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

  if (existing.status === "CANCELLED") {
    return NextResponse.json(toSessionResponse(existing));
  }

  const updated = await prisma.session.update({
    where: { id: sessionId },
    data: { status: "CANCELLED" },
    include: sessionInclude,
  });

  return NextResponse.json(toSessionResponse(updated));
}

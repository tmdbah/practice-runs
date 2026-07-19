import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ApiError } from "@/types/api";
import type { Status } from "@/generated/prisma/enums";

interface RouteParams {
  params: Promise<{ slug: string; playerId: string }>;
}

interface PatchBody {
  date: string; // ISO date "YYYY-MM-DD"
  status: Status;
  fromTime?: string | null;
  toTime?: string | null;
  note?: string | null;
}

export async function PATCH(
  req: Request,
  { params }: RouteParams,
): Promise<NextResponse<Record<string, never> | ApiError>> {
  const { slug, playerId } = await params;

  // Verify player belongs to this team
  const player = await prisma.player.findFirst({
    where: { id: playerId, team: { slug } },
    select: { id: true },
  });

  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  const body = (await req.json()) as PatchBody;
  const { date, status, fromTime, toTime, note } = body;

  // Validate date format YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }

  const validStatuses: Status[] = ["ANYTIME", "SPECIFIC", "UNAVAILABLE"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  // Normalize to UTC midnight for the unique key
  const dateUtc = new Date(`${date}T00:00:00.000Z`);

  // fromTime/toTime only persisted for SPECIFIC; cleared otherwise
  const resolvedFromTime = status === "SPECIFIC" ? (fromTime ?? null) : null;
  const resolvedToTime = status === "SPECIFIC" ? (toTime ?? null) : null;

  await prisma.dateOverride.upsert({
    where: { playerId_date: { playerId, date: dateUtc } },
    update: {
      status,
      fromTime: resolvedFromTime,
      toTime: resolvedToTime,
      note: note ?? null,
    },
    create: {
      playerId,
      date: dateUtc,
      status,
      fromTime: resolvedFromTime,
      toTime: resolvedToTime,
      note: note ?? null,
    },
  });

  return NextResponse.json({}, { status: 200 });
}

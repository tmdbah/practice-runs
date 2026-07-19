import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ApiError } from "@/types/api";
import type { Status } from "@/generated/prisma/enums";

interface RouteParams {
  params: Promise<{ slug: string; playerId: string }>;
}

interface PatchBody {
  dayOfWeek: number;
  status: Status;
  fromTime?: string | null;
  toTime?: string | null;
  note?: string | null;
}

export async function PATCH(
  req: Request,
  { params }: RouteParams
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
  const { dayOfWeek, status, fromTime, toTime, note } = body;

  // Validate dayOfWeek
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    return NextResponse.json({ error: "Invalid dayOfWeek" }, { status: 400 });
  }

  const validStatuses: Status[] = ["ANYTIME", "SPECIFIC", "UNAVAILABLE"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  // fromTime/toTime only persisted for SPECIFIC; cleared otherwise
  const resolvedFromTime = status === "SPECIFIC" ? (fromTime ?? null) : null;
  const resolvedToTime = status === "SPECIFIC" ? (toTime ?? null) : null;

  await prisma.dayDefault.upsert({
    where: { playerId_dayOfWeek: { playerId, dayOfWeek } },
    update: {
      status,
      fromTime: resolvedFromTime,
      toTime: resolvedToTime,
      note: note ?? null,
    },
    create: {
      playerId,
      dayOfWeek,
      status,
      fromTime: resolvedFromTime,
      toTime: resolvedToTime,
      note: note ?? null,
    },
  });

  return NextResponse.json({}, { status: 200 });
}

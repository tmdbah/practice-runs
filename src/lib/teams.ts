import { prisma } from "@/lib/prisma";
import type { TeamGridResponse, ScheduleEntry } from "@/types/api";
import type { Status } from "@/generated/prisma/enums";

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6] as const;

export async function getTeamGrid(
  slug: string
): Promise<TeamGridResponse | null> {
  const team = await prisma.team.findUnique({
    where: { slug },
    include: {
      players: {
        orderBy: { name: "asc" },
        include: { defaults: true },
      },
    },
  });

  if (!team) return null;

  const players = team.players.map((player) => {
    const defaultsByDay = new Map(
      player.defaults.map((d) => [d.dayOfWeek, d])
    );

    const schedule: ScheduleEntry[] = ALL_DAYS.map((day) => {
      const row = defaultsByDay.get(day);
      return {
        dayOfWeek: day,
        status: (row?.status ?? "UNAVAILABLE") as Status,
        fromTime: row?.fromTime ?? null,
        toTime: row?.toTime ?? null,
        note: row?.note ?? null,
      };
    });

    return {
      id: player.id,
      name: player.name,
      number: player.number,
      schedule,
    };
  });

  return {
    team: { slug: team.slug, name: team.name },
    players,
  };
}

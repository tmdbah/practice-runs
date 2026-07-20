import { prisma } from "@/lib/prisma";
import type {
  TeamGridResponse,
  ScheduleEntry,
  DayCell,
  TeamWindow,
} from "@/types/api";
import type { Status } from "@/generated/prisma/enums";

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6] as const;

/** Returns the next 7 calendar dates (UTC midnight) starting from today. */
function getNext7Dates(): Date[] {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() + i);
    return d;
  });
}

/** Formats a Date to "YYYY-MM-DD" in UTC. */
function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * For team window calculation: treat ANYTIME as full day,
 * SPECIFIC uses its own times. Returns null for UNAVAILABLE.
 */
function effectiveTimes(
  status: Status,
  fromTime: string | null,
  toTime: string | null,
): { from: string; to: string } | null {
  if (status === "UNAVAILABLE") return null;
  if (status === "ANYTIME") return { from: "00:00", to: "23:59" };
  // SPECIFIC — only count if both times are present
  if (fromTime && toTime) return { from: fromTime, to: toTime };
  // SPECIFIC without times: treat as ANYTIME
  return { from: "00:00", to: "23:59" };
}

export async function getTeamGrid(
  slug: string,
): Promise<TeamGridResponse | null> {
  const dates = getNext7Dates();
  const rangeStart = dates[0];
  const rangeEnd = new Date(dates[6].getTime() + 86_400_000); // exclusive end

  const team = await prisma.team.findUnique({
    where: { slug },
    include: {
      players: {
        orderBy: { name: "asc" },
        include: {
          defaults: true,
          overrides: {
            where: { date: { gte: rangeStart, lt: rangeEnd } },
          },
        },
      },
    },
  });

  if (!team) return null;

  const players = team.players.map((player) => {
    const defaultsByDay = new Map(player.defaults.map((d) => [d.dayOfWeek, d]));
    const overrideByDate = new Map(
      player.overrides.map((o) => [toIsoDate(o.date), o]),
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

    const thisWeek: DayCell[] = dates.map((date) => {
      const isoDate = toIsoDate(date);
      const dow = date.getUTCDay();
      const override = overrideByDate.get(isoDate);
      const def = defaultsByDay.get(dow);

      if (override) {
        return {
          date: isoDate,
          dayOfWeek: dow,
          effectiveStatus: override.status as Status,
          fromTime: override.fromTime ?? null,
          toTime: override.toTime ?? null,
          note: override.note ?? null,
          isOverridden: true,
        };
      }

      return {
        date: isoDate,
        dayOfWeek: dow,
        effectiveStatus: (def?.status ?? "UNAVAILABLE") as Status,
        fromTime: def?.fromTime ?? null,
        toTime: def?.toTime ?? null,
        note: def?.note ?? null,
        isOverridden: false,
      };
    });

    return {
      id: player.id,
      name: player.name,
      number: player.number,
      schedule,
      thisWeek,
    };
  });

  // Compute per-day team windows
  const teamWindows: TeamWindow[] = dates.map((date) => {
    const isoDate = toIsoDate(date);
    const dow = date.getUTCDay();

    const available = players
      .map((p) => p.thisWeek.find((c) => c.date === isoDate))
      .filter((c): c is DayCell => c !== undefined)
      .map((c) => effectiveTimes(c.effectiveStatus, c.fromTime, c.toTime))
      .filter((t): t is { from: string; to: string } => t !== null);

    const availableCount = available.length;

    let window: { from: string; to: string } | null = null;
    if (availableCount > 0) {
      const latestFrom = available.reduce(
        (max, t) => (t.from > max ? t.from : max),
        available[0].from,
      );
      const earliestTo = available.reduce(
        (min, t) => (t.to < min ? t.to : min),
        available[0].to,
      );
      // Valid only if the window is positive
      if (latestFrom < earliestTo) {
        window = { from: latestFrom, to: earliestTo };
      }
    }

    return { date: isoDate, dayOfWeek: dow, availableCount, window };
  });

  return {
    team: { id: team.id, slug: team.slug, name: team.name },
    players,
    teamWindows,
  };
}

/** Returns the upcoming Date for a given dayOfWeek (0=Sun…6=Sat), starting from today. */
export function upcomingDateForDow(dow: number): Date {
  const dates = getNext7Dates();
  return dates.find((d) => d.getUTCDay() === dow) ?? dates[dow];
}

/** Formats "HH:MM" to "H:MMam/pm". */
export function formatTime(t: string): string {
  const [hStr, mStr] = t.split(":");
  const h = parseInt(hStr, 10);
  const m = mStr;
  const period = h < 12 ? "am" : "pm";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m}${period}`;
}

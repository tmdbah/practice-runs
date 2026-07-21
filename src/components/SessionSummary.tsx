import { formatTime } from "@/lib/format-time";
import { VENUE_TYPE_LABELS } from "@/types/api";
import type { SessionResponse } from "@/types/api";

interface Props {
  session: SessionResponse;
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function costPerPerson(costTotal: number, inCount: number): string {
  if (inCount === 0) return "—";
  return formatCents(Math.ceil(costTotal / inCount));
}

/**
 * Cancelled banner + venue/date/time header. Split out from the cost/RSVP block below
 * so a consumer can lay this out next to action buttons while letting the cost box span
 * the full card width underneath, instead of both being squeezed into the same column.
 */
export function SessionHeader({ session }: Props): React.ReactElement {
  const isCancelled = session.status === "CANCELLED";
  const isConfirmed = session.status === "CONFIRMED";
  const sessionDate = new Date(session.date);

  return (
    <div className="flex flex-col gap-2">
      {isCancelled && (
        <p className="text-xs font-semibold text-red-400 bg-red-950/40 border border-red-900 rounded px-2 py-1">
          This slot fell through — no longer available.
        </p>
      )}

      <div>
        <p className="font-semibold text-white flex items-center gap-2">
          {session.venue?.name ?? "TBD"}
          {isConfirmed && (
            <span className="text-[10px] font-bold text-gold bg-gold-soft border border-gold/40 rounded px-1.5 py-0.5">
              Booked ✓
            </span>
          )}
        </p>
        <p className="text-sm text-gray-400">
          {sessionDate.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            timeZone: "UTC",
          })}{" "}
          · {formatTime(session.fromTime)}–{formatTime(session.toTime)}
        </p>
        {session.venue && (
          <p className="text-xs text-gray-500">
            {VENUE_TYPE_LABELS[session.venue.type]}
            {session.venue.address ? ` · ${session.venue.address}` : ""}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Cost-split/headcount box + RSVP list. Split out from the header above so a consumer
 * can render this full-width, below a header-row that's sharing space with action buttons.
 */
export function SessionCostAndRsvps({ session }: Props): React.ReactElement {
  const inRsvps = session.rsvps.filter((r) => r.status === "ANYTIME");
  const outRsvps = session.rsvps.filter((r) => r.status === "UNAVAILABLE");
  const isRented = session.venue?.type === "RENTED_GYM";
  const isCancelled = session.status === "CANCELLED";

  return (
    <div className="flex flex-col gap-2">
      {isRented && session.costTotal != null && !isCancelled && (
        <div className="flex flex-col gap-1 rounded bg-gray-750 border border-gray-700 px-3 py-2 bg-gray-900/60">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">
              RSVP&apos;d:{" "}
              <span className="text-white font-semibold">
                {inRsvps.length}
                {session.minPlayers != null ? ` / ${session.minPlayers}` : ""}
              </span>
            </span>
            <span
              className={
                session.minPlayers != null &&
                inRsvps.length >= session.minPlayers
                  ? "text-green-400 text-xs font-semibold"
                  : "text-yellow-400 text-xs"
              }
            >
              {session.minPlayers != null
                ? inRsvps.length >= session.minPlayers
                  ? "✓ Enough to book"
                  : `Need ${session.minPlayers - inRsvps.length} more`
                : null}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Cost / person now</span>
            <span className="text-white font-semibold">
              {costPerPerson(session.costTotal, inRsvps.length)}
            </span>
          </div>
          {session.minPlayers != null && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">
                Cost if {session.minPlayers} join
              </span>
              <span className="text-white font-semibold">
                {formatCents(Math.ceil(session.costTotal / session.minPlayers))}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-4 text-xs text-gray-400">
        {inRsvps.length > 0 && (
          <span>✅ {inRsvps.map((r) => r.playerName).join(", ")}</span>
        )}
        {outRsvps.length > 0 && (
          <span>❌ {outRsvps.map((r) => r.playerName).join(", ")}</span>
        )}
        {session.rsvps.length === 0 && <span>No RSVPs yet</span>}
      </div>
    </div>
  );
}

/**
 * Read-only session display: cancelled banner, venue/date/time header, cost-split +
 * headcount block, and the RSVP list, stacked full-width. Used by the standalone
 * shareable session-detail page, where there's no competing action-buttons column —
 * SessionsView's list item instead uses SessionHeader/SessionCostAndRsvps directly so
 * the cost box can span the card while the header shares a row with action buttons.
 */
export function SessionSummary({ session }: Props): React.ReactElement {
  return (
    <div className="flex flex-col gap-2">
      <SessionHeader session={session} />
      <SessionCostAndRsvps session={session} />
    </div>
  );
}

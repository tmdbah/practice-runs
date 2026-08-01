import { SessionHeader, headcountStatus } from "@/components/SessionSummary";
import { ShareButton } from "@/components/ShareButton";
import { computeSlotTally } from "@/lib/slot-scoring";
import { VOTE_LEVEL_LABELS } from "@/types/api";
import type { PlayerRow, SessionResponse, VoteLevel } from "@/types/api";

interface Props {
  slots: SessionResponse[];
  players: PlayerRow[];
  slug: string;
  currentPlayerId: string | null;
  isProposer: boolean;
  onVote: (sessionId: string, level: VoteLevel) => Promise<void>;
  onLockIn: (sessionId: string) => Promise<void>;
  lockingInId: string | null;
  voteErrors: Record<string, string>;

  startEdit: (session: SessionResponse) => void;
  handleDelete: (sessionId: string) => Promise<void>;
  deletingId: string | null;
  confirmDeleteId: string | null;
  setConfirmDeleteId: (id: string | null) => void;
}

const VOTE_LEVELS: VoteLevel[] = ["PREFER", "OK", "CANT"];

/**
 * Renders a group of candidate time slots proposed together for the same session,
 * still awaiting a decision. Each slot keeps its own venue/date/time (slots don't
 * need to share a venue) and its own Prefer/OK/Can't vote per player. Turnout
 * (Prefer + OK) is the headline number, shown against minPlayers with the same
 * RSVP'd/headcount language a normal booked session already uses — preference
 * strength and the Can't/no-response split are secondary detail, not a blended
 * score. The proposer can lock in any row — not necessarily the highest-turnout
 * one — mirroring how Confirm/Cancel are manual, deliberate actions everywhere
 * else in this app.
 */
export function SlotGroupCard({
  slots,
  players,
  slug,
  currentPlayerId,
  isProposer,
  onVote,
  onLockIn,
  lockingInId,
  voteErrors,
  startEdit,
  handleDelete,
  deletingId,
  confirmDeleteId,
  setConfirmDeleteId,
}: Props): React.ReactElement {
  const rosterPlayerIds = players.map((p) => p.id);

  return (
    <div className="rounded-lg bg-gray-800 border border-gold/40 px-4 py-3 flex flex-col gap-3">
      <p className="text-xs font-semibold text-gold uppercase tracking-wide">
        {slots.length} time options — still deciding
      </p>
      {slots.map((slot) => {
        const myVote = currentPlayerId
          ? slot.votes.find((v) => v.playerId === currentPlayerId)
          : null;
        const tally = computeSlotTally(slot.votes, rosterPlayerIds);
        const status =
          slot.minPlayers != null
            ? headcountStatus("PRACTICE", slot.minPlayers, tally.turnout)
            : null;

        return (
          <div
            key={slot.id}
            className="rounded-md bg-gray-900/60 border border-gray-700 px-3 py-2 flex flex-col gap-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <SessionHeader session={slot} />
              </div>
              <ShareButton
                path={`/team/${slug}/sessions/${slot.id}`}
                title={slot.venue?.name ?? "Session"}
                text="Check out this time option"
                className="shrink-0"
              />
            </div>

            <div className="flex flex-col gap-1 text-xs text-gray-400">
              {slot.minPlayers != null ? (
                <div className="flex items-center justify-between">
                  <span>
                    RSVP&apos;d:{" "}
                    <span className="text-white font-semibold">
                      {tally.turnout} / {slot.minPlayers}
                    </span>
                  </span>
                  {status && (
                    <span className={status.className}>{status.text}</span>
                  )}
                </div>
              ) : (
                <span>
                  <span className="text-white font-semibold">
                    {tally.turnout} of {players.length}
                  </span>{" "}
                  can make it
                </span>
              )}
              <span>
                {tally.preferCount} Prefer · {tally.okCount}{" "}OK
              </span>
              {(tally.cantCount > 0 || tally.noResponseCount > 0) && (
                <span>
                  {tally.cantCount} Can&apos;t · {tally.noResponseCount}{" "}haven&apos;t responded
                </span>
              )}
            </div>

            {currentPlayerId ? (
              <div className="flex gap-1">
                {VOTE_LEVELS.map((level) => (
                  <button
                    key={level}
                    onClick={() => onVote(slot.id, level)}
                    className={`flex-1 rounded px-2 py-1 text-xs font-semibold transition-colors ${
                      myVote?.level === level
                        ? level === "CANT"
                          ? "bg-red-600 text-white"
                          : level === "PREFER"
                            ? "bg-green-600 text-white"
                            : "bg-gray-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white"
                    }`}
                  >
                    {VOTE_LEVEL_LABELS[level]}
                  </button>
                ))}
              </div>
            ) : (
              <span className="text-xs text-gray-500">
                Pick your name above to vote
              </span>
            )}

            {voteErrors[slot.id] && (
              <p className="text-red-400 text-xs">{voteErrors[slot.id]}</p>
            )}

            {isProposer && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onLockIn(slot.id)}
                  disabled={lockingInId === slot.id}
                  className="rounded px-2.5 py-1 text-xs font-semibold bg-gold text-gray-900 hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {lockingInId === slot.id
                    ? "Locking in…"
                    : "Lock in this slot"}
                </button>
                {confirmDeleteId === slot.id ? (
                  <>
                    <span className="text-[10px] text-gray-400">
                      Delete this time option?
                    </span>
                    <button
                      onClick={() => handleDelete(slot.id)}
                      disabled={deletingId === slot.id}
                      className="text-[10px] font-semibold text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors"
                    >
                      {deletingId === slot.id ? "Deleting…" : "Yes, delete"}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      Never mind
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => startEdit(slot)}
                      className="text-[10px] text-gray-500 hover:text-orange-400 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(slot.id)}
                      className="text-[10px] text-gray-500 hover:text-red-400 transition-colors"
                      aria-label="Delete time option"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

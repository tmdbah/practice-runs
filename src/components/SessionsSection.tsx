import type { Dispatch, SetStateAction } from "react";
import { SessionHeader, SessionCostAndRsvps } from "@/components/SessionSummary";
import { ShareButton } from "@/components/ShareButton";
import type { SessionKind, SessionResponse } from "@/types/api";

interface Props {
  kind: SessionKind;
  title: string;
  proposeLabel: string;
  sessions: SessionResponse[]; // already filtered to this kind + sorted
  slug: string;
  currentPlayerId: string | null;
  isFormOpenHere: boolean;
  onToggleForm: () => void;
  formSlot: React.ReactNode;
  extraHeaderAction?: React.ReactNode;

  rsvpErrors: Record<string, string>;
  deletingId: string | null;
  confirmDeleteId: string | null;
  confirmingId: string | null;
  cancellingId: string | null;
  confirmCancelId: string | null;
  setConfirmDeleteId: Dispatch<SetStateAction<string | null>>;
  setConfirmCancelId: Dispatch<SetStateAction<string | null>>;

  handleRsvp: (
    sessionId: string,
    status: "ANYTIME" | "UNAVAILABLE",
  ) => Promise<void>;
  handleDelete: (sessionId: string) => Promise<void>;
  handleConfirm: (sessionId: string) => Promise<void>;
  handleCancel: (sessionId: string) => Promise<void>;
  startEdit: (session: SessionResponse) => void;
  startAlternate: (session: SessionResponse) => void;
}

/**
 * Renders one kind-homogeneous section ("Game Day" or "Sessions") of the sessions list:
 * header row with a propose-toggle button, the shared propose/edit form when open for
 * this section, and the list itself. Extracted from SessionsView so the per-session
 * list-item JSX (RSVP/proposer actions, cost/headcount box) isn't duplicated across
 * the two kind sections — all mutation handlers and transient UI state live in the
 * parent and are threaded through as props since they already need `setSessions`.
 */
export function SessionsSection({
  kind,
  title,
  proposeLabel,
  sessions,
  slug,
  currentPlayerId,
  isFormOpenHere,
  onToggleForm,
  formSlot,
  extraHeaderAction,
  rsvpErrors,
  deletingId,
  confirmDeleteId,
  confirmingId,
  cancellingId,
  confirmCancelId,
  setConfirmDeleteId,
  setConfirmCancelId,
  handleRsvp,
  handleDelete,
  handleConfirm,
  handleCancel,
  startEdit,
  startAlternate,
}: Props): React.ReactElement {
  const noun = kind === "GAME" ? "game" : "session";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <div className="flex gap-2">
          <button
            onClick={onToggleForm}
            className="rounded-md bg-orange-600 hover:bg-orange-500 px-3 py-1.5 text-sm font-semibold text-white transition-colors"
          >
            {isFormOpenHere ? "Cancel" : proposeLabel}
          </button>
          {extraHeaderAction}
        </div>
      </div>

      {formSlot}

      {sessions.length === 0 ? (
        <p className="text-gray-400 text-sm">
          {kind === "GAME"
            ? "No games proposed yet."
            : "No sessions proposed yet."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {sessions.map((session) => {
            const myRsvp = currentPlayerId
              ? session.rsvps.find((r) => r.playerId === currentPlayerId)
              : null;
            const isCancelled = session.status === "CANCELLED";
            const isConfirmed = session.status === "CONFIRMED";
            const isProposer =
              currentPlayerId != null &&
              session.proposedById === currentPlayerId;

            return (
              <li
                key={session.id}
                className={`rounded-lg bg-gray-800 border border-gray-700 px-4 py-3 flex flex-col gap-2 ${
                  isCancelled ? "opacity-60" : ""
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <SessionHeader session={session} />
                  </div>
                  {/* RSVP buttons + proposer actions */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <ShareButton
                      path={`/team/${slug}/sessions/${session.id}`}
                      title={session.venue?.name ?? "Session"}
                      text="Check out this session"
                    />
                    {isCancelled ? (
                      currentPlayerId && (
                        <button
                          onClick={() => startAlternate(session)}
                          className="rounded px-2.5 py-1 text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white transition-colors"
                        >
                          Propose alternate time here
                        </button>
                      )
                    ) : currentPlayerId ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleRsvp(session.id, "ANYTIME")}
                          className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                            myRsvp?.status === "ANYTIME"
                              ? "bg-green-600 text-white"
                              : "bg-gray-700 text-gray-300 hover:bg-green-700 hover:text-white"
                          }`}
                        >
                          In
                        </button>
                        <button
                          onClick={() => handleRsvp(session.id, "UNAVAILABLE")}
                          className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                            myRsvp?.status === "UNAVAILABLE"
                              ? "bg-red-600 text-white"
                              : "bg-gray-700 text-gray-300 hover:bg-red-700 hover:text-white"
                          }`}
                        >
                          Out
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">
                        Pick your name above to RSVP
                      </span>
                    )}
                    {/* Proposer-only actions */}
                    {isProposer && (
                      <div className="flex items-center gap-2 justify-end">
                        {confirmDeleteId === session.id ? (
                          <>
                            <span className="text-[10px] text-gray-400">
                              Delete this {noun}?
                            </span>
                            <button
                              onClick={() => handleDelete(session.id)}
                              disabled={deletingId === session.id}
                              className="text-[10px] font-semibold text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors"
                            >
                              {deletingId === session.id
                                ? "Deleting…"
                                : "Yes, delete"}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
                            >
                              Never mind
                            </button>
                          </>
                        ) : confirmCancelId === session.id ? (
                          <>
                            <span className="text-[10px] text-gray-400">
                              Cancel this {noun}?
                            </span>
                            <button
                              onClick={() => handleCancel(session.id)}
                              disabled={cancellingId === session.id}
                              className="text-[10px] font-semibold text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors"
                            >
                              {cancellingId === session.id
                                ? "Cancelling…"
                                : "Yes, cancel"}
                            </button>
                            <button
                              onClick={() => setConfirmCancelId(null)}
                              className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
                            >
                              Never mind
                            </button>
                          </>
                        ) : (
                          <>
                            {!isCancelled && (
                              <button
                                onClick={() => startEdit(session)}
                                className="text-[10px] text-gray-600 hover:text-orange-400 transition-colors"
                              >
                                Edit
                              </button>
                            )}
                            {kind === "PRACTICE" && !isConfirmed && !isCancelled && (
                              <button
                                onClick={() => handleConfirm(session.id)}
                                disabled={confirmingId === session.id}
                                className="text-[10px] text-gray-600 hover:text-gold disabled:opacity-50 transition-colors"
                              >
                                {confirmingId === session.id
                                  ? "Booking…"
                                  : "Mark as Booked"}
                              </button>
                            )}
                            {!isCancelled && (
                              <button
                                onClick={() => setConfirmCancelId(session.id)}
                                className="text-[10px] text-gray-600 hover:text-red-400 transition-colors"
                              >
                                Cancel
                              </button>
                            )}
                            <button
                              onClick={() => setConfirmDeleteId(session.id)}
                              className="text-[10px] text-gray-600 hover:text-red-400 transition-colors"
                              aria-label={`Delete ${noun}`}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Cost split + headcount + RSVP list — full card width, below the header/actions row */}
                <SessionCostAndRsvps session={session} />

                {/* RSVP error */}
                {rsvpErrors[session.id] && (
                  <p className="text-red-400 text-xs">
                    {rsvpErrors[session.id]}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

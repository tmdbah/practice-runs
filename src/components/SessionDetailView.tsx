"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useIdentity } from "@/hooks/use-identity";
import { putRsvp, RsvpError } from "@/lib/session-rsvp";
import { SessionSummary } from "@/components/SessionSummary";
import { ShareButton } from "@/components/ShareButton";
import type { PlayerRow, SessionResponse } from "@/types/api";

interface Props {
  slug: string;
  teamName: string;
  players: PlayerRow[];
  initialSession: SessionResponse;
}

/**
 * Standalone shareable page for a single session — read-only details are always
 * visible (no identity required); RSVPing prompts a compact inline name picker if the
 * visitor has no stored identity for this team yet. Session management (Edit/Confirm/
 * Cancel/Delete) intentionally lives only on SessionsView's list, not here.
 */
export function SessionDetailView({
  slug,
  teamName,
  players,
  initialSession,
}: Props): React.ReactElement {
  const { playerId, setPlayerId, isLoaded } = useIdentity(slug);
  const [session, setSession] = useState<SessionResponse>(initialSession);
  const [rsvping, setRsvping] = useState(false);
  const [rsvpError, setRsvpError] = useState<string | null>(null);

  const isValidPlayer =
    playerId != null && players.some((p) => p.id === playerId);
  const currentPlayerId = isValidPlayer ? playerId : null;

  // Same stale-identity handling as TeamGrid: clear a stored id that's no longer on the roster.
  useEffect(() => {
    if (isLoaded && playerId && !isValidPlayer) {
      setPlayerId("");
    }
  }, [isLoaded, playerId, isValidPlayer, setPlayerId]);

  const myRsvp = currentPlayerId
    ? session.rsvps.find((r) => r.playerId === currentPlayerId)
    : null;
  const isCancelled = session.status === "CANCELLED";

  async function handleRsvp(status: "ANYTIME" | "UNAVAILABLE"): Promise<void> {
    if (!currentPlayerId) return;

    const prevSession = session;
    setSession((s) => {
      const existing = s.rsvps.find((r) => r.playerId === currentPlayerId);
      const rsvps = existing
        ? s.rsvps.map((r) =>
            r.playerId === currentPlayerId ? { ...r, status } : r,
          )
        : [...s.rsvps, { playerId: currentPlayerId, playerName: "You", status }];
      return { ...s, rsvps };
    });
    setRsvping(true);
    setRsvpError(null);

    try {
      const updated = await putRsvp(slug, session.id, currentPlayerId, status);
      setSession(updated);
    } catch (err) {
      setSession(prevSession);
      setRsvpError(err instanceof RsvpError ? err.message : "Network error");
    } finally {
      setRsvping(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg text-text px-3 py-4 flex justify-center">
      <div className="w-full max-w-md lg:max-w-xl">
        <Link
          href={`/team/${slug}`}
          className="flex items-center gap-1 text-xs text-text-mute hover:text-text transition-colors mb-3"
        >
          <span aria-hidden="true">‹</span> Back to Grid
        </Link>

        <header className="mb-4 px-3 py-2 rounded-xl bg-surface border border-border flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-bold leading-tight truncate">
              {teamName}
            </div>
            <div className="text-[10px] uppercase tracking-wide text-text-mute leading-tight">
              Session
            </div>
          </div>
          <ShareButton
            path={`/team/${slug}/sessions/${session.id}`}
            title={session.venue?.name ?? "Session"}
            text="Check out this session"
            className="shrink-0 text-xs font-semibold text-accent hover:text-accent-dim transition-colors"
          />
        </header>

        <div className="rounded-lg bg-gray-800 border border-gray-700 px-4 py-3 flex flex-col gap-3">
          <SessionSummary session={session} />

          {rsvpError && <p className="text-red-400 text-xs">{rsvpError}</p>}

          {!isCancelled && isLoaded && (
            <>
              {currentPlayerId ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRsvp("ANYTIME")}
                    disabled={rsvping}
                    className={`flex-1 rounded px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
                      myRsvp?.status === "ANYTIME"
                        ? "bg-green-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-green-700 hover:text-white"
                    }`}
                  >
                    I&apos;m in
                  </button>
                  <button
                    onClick={() => handleRsvp("UNAVAILABLE")}
                    disabled={rsvping}
                    className={`flex-1 rounded px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
                      myRsvp?.status === "UNAVAILABLE"
                        ? "bg-red-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-red-700 hover:text-white"
                    }`}
                  >
                    I&apos;m out
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-text-mute">
                    Pick your name to RSVP:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {players.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPlayerId(p.id)}
                        className="rounded-full bg-surface-2 border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface transition-colors"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

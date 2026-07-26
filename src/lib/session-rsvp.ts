import type { SessionResponse, VoteLevel } from "@/types/api";

/** Thrown when the server rejects an RSVP or slot-vote request; `.message` is user-facing. */
export class RsvpError extends Error {}

/**
 * Upserts the calling player's RSVP for a session (ANYTIME = in, UNAVAILABLE = out).
 * Dependency-free (no `@/lib/prisma`) so it's safe to import from client components —
 * shared between SessionsView's list and the standalone session-detail page, each of
 * which manages its own optimistic update / rollback around this call.
 */
export async function putRsvp(
  slug: string,
  sessionId: string,
  playerId: string,
  status: "ANYTIME" | "UNAVAILABLE",
): Promise<SessionResponse> {
  const res = await fetch(`/api/teams/${slug}/sessions/${sessionId}/rsvp`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId, status }),
  });

  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new RsvpError(errBody.error ?? "RSVP failed");
  }

  return (await res.json()) as SessionResponse;
}

/**
 * Upserts the calling player's per-slot vote (PREFER/OK/CANT) on one candidate
 * slot within a grouped multi-slot proposal. Same dependency-free shape as
 * `putRsvp`, and shared the same way between SessionsView and the standalone
 * session-detail page.
 */
export async function putVote(
  slug: string,
  sessionId: string,
  playerId: string,
  level: VoteLevel,
): Promise<SessionResponse> {
  const res = await fetch(`/api/teams/${slug}/sessions/${sessionId}/vote`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId, level }),
  });

  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new RsvpError(errBody.error ?? "Vote failed");
  }

  return (await res.json()) as SessionResponse;
}

"use client";

import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useIdentity } from "@/hooks/use-identity";
import type { SessionResponse, VenueSummary } from "@/types/api";

interface Props {
  slug: string;
  sessions: SessionResponse[];
  setSessions: Dispatch<SetStateAction<SessionResponse[]>>;
  venues: VenueSummary[];
}

const VENUE_TYPE_LABELS: Record<string, string> = {
  RENTED_GYM: "Rented Gym",
  OPEN_GYM: "Open Gym",
  PARK: "Park",
};

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function costPerPerson(costTotal: number, inCount: number): string {
  if (inCount === 0) return "—";
  return formatCents(Math.ceil(costTotal / inCount));
}

export function SessionsView({
  slug,
  sessions,
  setSessions,
  venues,
}: Props): React.ReactElement {
  const { playerId: currentPlayerId } = useIdentity(slug);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [rsvpErrors, setRsvpErrors] = useState<Record<string, string>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function handleDelete(sessionId: string): Promise<void> {
    setDeletingId(sessionId);
    setConfirmDeleteId(null);
    try {
      const res = await fetch(`/api/teams/${slug}/sessions/${sessionId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      }
    } finally {
      setDeletingId(null);
    }
  }

  // Form state
  const [venueId, setVenueId] = useState(venues[0]?.id ?? "");
  const [date, setDate] = useState("");
  const [fromTime, setFromTime] = useState("");
  const [toTime, setToTime] = useState("");
  const [costTotal, setCostTotal] = useState("");
  const [minPlayers, setMinPlayers] = useState("");

  const selectedVenue = venues.find((v) => v.id === venueId) ?? null;
  const isRentedGym = selectedVenue?.type === "RENTED_GYM";

  function resetForm(): void {
    setShowForm(false);
    setEditingId(null);
    setVenueId(venues[0]?.id ?? "");
    setDate("");
    setFromTime("");
    setToTime("");
    setCostTotal("");
    setMinPlayers("");
    setProposalError(null);
  }

  function startEdit(session: SessionResponse): void {
    setEditingId(session.id);
    setVenueId(session.venue?.id ?? "");
    setDate(session.date.slice(0, 10)); // ISO -> "YYYY-MM-DD" for <input type="date">
    setFromTime(session.fromTime);
    setToTime(session.toTime);
    setCostTotal(session.costTotal != null ? String(session.costTotal / 100) : "");
    setMinPlayers(session.minPlayers != null ? String(session.minPlayers) : "");
    setProposalError(null);
    setShowForm(true);
  }

  async function handleFormSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!date || !fromTime || !toTime) return;
    setSubmitting(true);
    setProposalError(null);
    try {
      const body = {
        venueId: venueId || undefined,
        date,
        fromTime,
        toTime,
        costTotal:
          isRentedGym && costTotal
            ? Math.round(parseFloat(costTotal) * 100)
            : undefined,
        minPlayers:
          isRentedGym && minPlayers ? parseInt(minPlayers, 10) : undefined,
        ...(editingId ? {} : { proposedById: currentPlayerId ?? undefined }),
      };
      const url = editingId
        ? `/api/teams/${slug}/sessions/${editingId}`
        : `/api/teams/${slug}/sessions`;
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error: string };
        throw new Error(
          err.error ??
            (editingId ? "Failed to update session" : "Failed to propose session"),
        );
      }
      const saved = (await res.json()) as SessionResponse;
      setSessions((prev) =>
        editingId
          ? prev.map((s) => (s.id === editingId ? saved : s))
          : [...prev, saved],
      );
      resetForm();
    } catch (err) {
      setProposalError(err instanceof Error ? err.message : "Error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRsvp(
    sessionId: string,
    status: "ANYTIME" | "UNAVAILABLE",
  ): Promise<void> {
    if (!currentPlayerId) return;

    // Snapshot for revert on failure
    const prevSessions = sessions;

    // Optimistic update
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== sessionId) return s;
        const existing = s.rsvps.find((r) => r.playerId === currentPlayerId);
        const rsvps = existing
          ? s.rsvps.map((r) =>
              r.playerId === currentPlayerId ? { ...r, status } : r,
            )
          : [
              ...s.rsvps,
              { playerId: currentPlayerId, playerName: "You", status },
            ];
        return { ...s, rsvps };
      }),
    );

    try {
      const res = await fetch(`/api/teams/${slug}/sessions/${sessionId}/rsvp`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: currentPlayerId, status }),
      });
      if (!res.ok) {
        const errBody = (await res.json()) as { error?: string };
        setSessions(prevSessions);
        setRsvpErrors((prev) => ({
          ...prev,
          [sessionId]: errBody.error ?? "RSVP failed",
        }));
      } else {
        const updated = (await res.json()) as SessionResponse;
        setSessions((prev) =>
          prev.map((s) => (s.id === sessionId ? updated : s)),
        );
        setRsvpErrors((prev) => {
          const next = { ...prev };
          delete next[sessionId];
          return next;
        });
      }
    } catch {
      setSessions(prevSessions);
      setRsvpErrors((prev) => ({ ...prev, [sessionId]: "Network error" }));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Sessions</h2>
        <button
          onClick={() => (showForm ? resetForm() : setShowForm(true))}
          className="rounded-md bg-orange-600 hover:bg-orange-500 px-3 py-1.5 text-sm font-semibold text-white transition-colors"
        >
          {showForm ? "Cancel" : "+ Propose"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleFormSubmit}
          className="flex flex-col gap-3 rounded-lg bg-gray-800 border border-gray-700 p-4"
        >
          <h3 className="font-semibold text-white">
            {editingId ? "Edit Session" : "Propose a Session"}
          </h3>

          {venues.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Venue</label>
              <select
                value={venueId}
                onChange={(e) => setVenueId(e.target.value)}
                className="rounded bg-gray-700 border border-gray-600 px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({VENUE_TYPE_LABELS[v.type]})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Date</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded bg-gray-700 border border-gray-600 px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="flex gap-2">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs text-gray-400">From</label>
              <input
                type="time"
                required
                value={fromTime}
                onChange={(e) => setFromTime(e.target.value)}
                className="rounded bg-gray-700 border border-gray-600 px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs text-gray-400">To</label>
              <input
                type="time"
                required
                value={toTime}
                onChange={(e) => setToTime(e.target.value)}
                className="rounded bg-gray-700 border border-gray-600 px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {isRentedGym && (
            <div className="flex gap-2">
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs text-gray-400">Total cost ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={
                    selectedVenue?.costPerSession != null
                      ? String(selectedVenue.costPerSession / 100)
                      : "100.00"
                  }
                  value={costTotal}
                  onChange={(e) => setCostTotal(e.target.value)}
                  className="rounded bg-gray-700 border border-gray-600 px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs text-gray-400">Min players</label>
                <input
                  type="number"
                  min="1"
                  placeholder="10"
                  value={minPlayers}
                  onChange={(e) => setMinPlayers(e.target.value)}
                  className="rounded bg-gray-700 border border-gray-600 px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          )}

          {proposalError && (
            <p className="text-red-400 text-sm">{proposalError}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-orange-600 hover:bg-orange-500 disabled:opacity-50 px-4 py-2 font-semibold text-white text-sm transition-colors"
          >
            {submitting
              ? editingId
                ? "Saving…"
                : "Proposing…"
              : editingId
                ? "Save Changes"
                : "Propose Session"}
          </button>
        </form>
      )}

      {sessions.length === 0 ? (
        <p className="text-gray-400 text-sm">No sessions proposed yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {sessions.map((session) => {
            const inRsvps = session.rsvps.filter((r) => r.status === "ANYTIME");
            const outRsvps = session.rsvps.filter(
              (r) => r.status === "UNAVAILABLE",
            );
            const myRsvp = currentPlayerId
              ? session.rsvps.find((r) => r.playerId === currentPlayerId)
              : null;
            const isRented = session.venue?.type === "RENTED_GYM";
            const sessionDate = new Date(session.date);

            return (
              <li
                key={session.id}
                className="rounded-lg bg-gray-800 border border-gray-700 px-4 py-3 flex flex-col gap-2"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-white">
                      {session.venue?.name ?? "TBD"}
                    </p>
                    <p className="text-sm text-gray-400">
                      {sessionDate.toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      · {session.fromTime}–{session.toTime}
                    </p>
                    {session.venue && (
                      <p className="text-xs text-gray-500">
                        {VENUE_TYPE_LABELS[session.venue.type]}
                        {session.venue.address
                          ? ` · ${session.venue.address}`
                          : ""}
                      </p>
                    )}
                  </div>
                  {/* RSVP buttons + delete */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {currentPlayerId ? (
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
                    {/* Delete — only shown to the proposer */}
                    {currentPlayerId &&
                      session.proposedById === currentPlayerId && (
                        <div className="flex items-center gap-2 justify-end">
                          {confirmDeleteId === session.id ? (
                            <>
                              <span className="text-[10px] text-gray-400">
                                Delete this session?
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
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEdit(session)}
                                className="text-[10px] text-gray-600 hover:text-orange-400 transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(session.id)}
                                className="text-[10px] text-gray-600 hover:text-red-400 transition-colors"
                                aria-label="Delete session"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      )}
                  </div>
                </div>

                {/* Cost split (RENTED_GYM only) */}
                {isRented && session.costTotal != null && (
                  <div className="flex flex-col gap-1 rounded bg-gray-750 border border-gray-700 px-3 py-2 bg-gray-900/60">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">
                        RSVP&apos;d:{" "}
                        <span className="text-white font-semibold">
                          {inRsvps.length}
                          {session.minPlayers != null
                            ? ` / ${session.minPlayers}`
                            : ""}
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
                          {formatCents(
                            Math.ceil(session.costTotal / session.minPlayers),
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* RSVP error */}
                {rsvpErrors[session.id] && (
                  <p className="text-red-400 text-xs">
                    {rsvpErrors[session.id]}
                  </p>
                )}

                {/* RSVP list */}
                <div className="flex gap-4 text-xs text-gray-400">
                  {inRsvps.length > 0 && (
                    <span>
                      ✅ {inRsvps.map((r) => r.playerName).join(", ")}
                    </span>
                  )}
                  {outRsvps.length > 0 && (
                    <span>
                      ❌ {outRsvps.map((r) => r.playerName).join(", ")}
                    </span>
                  )}
                  {session.rsvps.length === 0 && <span>No RSVPs yet</span>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

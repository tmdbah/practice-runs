"use client";

import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import Link from "next/link";
import { useIdentity } from "@/hooks/use-identity";
import { putRsvp, RsvpError } from "@/lib/session-rsvp";
import { SessionsSection } from "@/components/SessionsSection";
import { VENUE_TYPE_LABELS } from "@/types/api";
import type { SessionKind, SessionResponse, VenueSummary } from "@/types/api";

interface Props {
  slug: string;
  sessions: SessionResponse[];
  setSessions: Dispatch<SetStateAction<SessionResponse[]>>;
  venues: VenueSummary[];
}

/** Estimates a session's total cost from a venue's hourly rate and the chosen time range. Returns null if the range isn't computable (missing/invalid times). */
function estimateCostFromHourlyRate(
  costPerHourCents: number,
  fromTime: string,
  toTime: string,
): number | null {
  if (!fromTime || !toTime) return null;
  const [fromHours, fromMinutes] = fromTime.split(":").map(Number);
  const [toHours, toMinutes] = toTime.split(":").map(Number);
  const durationMinutes =
    toHours * 60 + toMinutes - (fromHours * 60 + fromMinutes);
  if (!(durationMinutes > 0)) return null;
  return (costPerHourCents / 100) * (durationMinutes / 60);
}

/** Sorts sessions by date, then by from-time as a same-day tiebreaker. */
function sortByDateTime(list: SessionResponse[]): SessionResponse[] {
  return [...list].sort((a, b) =>
    a.date !== b.date
      ? a.date < b.date
        ? -1
        : 1
      : a.fromTime.localeCompare(b.fromTime),
  );
}

export function SessionsView({
  slug,
  sessions,
  setSessions,
  venues,
}: Props): React.ReactElement {
  const { playerId: currentPlayerId } = useIdentity(slug);
  const [showForm, setShowForm] = useState(false);
  const [formKind, setFormKind] = useState<SessionKind>("PRACTICE");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [rsvpErrors, setRsvpErrors] = useState<Record<string, string>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

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

  /** Marks a session booked for sure. Not optimistic — a mistaken "booked" flash would mislead the team. */
  async function handleConfirm(sessionId: string): Promise<void> {
    setConfirmingId(sessionId);
    try {
      const res = await fetch(
        `/api/teams/${slug}/sessions/${sessionId}/confirm`,
        { method: "PATCH" },
      );
      if (res.ok) {
        const updated = (await res.json()) as SessionResponse;
        setSessions((prev) =>
          prev.map((s) => (s.id === sessionId ? updated : s)),
        );
      }
    } finally {
      setConfirmingId(null);
    }
  }

  /** Marks a session's slot as fallen through. Keeps the session and its RSVPs as a historical record instead of deleting. */
  async function handleCancel(sessionId: string): Promise<void> {
    setCancellingId(sessionId);
    setConfirmCancelId(null);
    try {
      const res = await fetch(
        `/api/teams/${slug}/sessions/${sessionId}/cancel`,
        { method: "PATCH" },
      );
      if (res.ok) {
        const updated = (await res.json()) as SessionResponse;
        setSessions((prev) =>
          prev.map((s) => (s.id === sessionId ? updated : s)),
        );
      }
    } finally {
      setCancellingId(null);
    }
  }

  // Form state
  const [venueId, setVenueId] = useState(venues[0]?.id ?? "");
  const [date, setDate] = useState("");
  const [fromTime, setFromTime] = useState("");
  const [toTime, setToTime] = useState("");
  const [costTotal, setCostTotal] = useState("");
  const [minPlayers, setMinPlayers] = useState("");
  // Tracks whether the proposer has typed into the cost field themselves —
  // once true, time/venue changes stop auto-filling it so we never clobber
  // a deliberate override.
  const [costManuallyEdited, setCostManuallyEdited] = useState(false);

  const selectedVenue = venues.find((v) => v.id === venueId) ?? null;
  const isRentedGym = selectedVenue?.type === "RENTED_GYM";
  // Games are never rentals — cost UI is hidden regardless of the venue picked.
  const showCostField = isRentedGym && formKind !== "GAME";
  const showMinPlayersField = formKind === "GAME" || isRentedGym;
  const estimatedCost =
    selectedVenue?.costPerHour != null
      ? estimateCostFromHourlyRate(selectedVenue.costPerHour, fromTime, toTime)
      : null;

  /** Recomputes and fills the total-cost field from the venue's hourly rate x chosen duration, unless the proposer has already typed their own value in. */
  function maybeAutoFillCost(
    nextVenueId: string,
    nextFromTime: string,
    nextToTime: string,
  ): void {
    if (costManuallyEdited || formKind === "GAME") return;
    const venue = venues.find((v) => v.id === nextVenueId) ?? null;
    if (venue?.type !== "RENTED_GYM" || venue.costPerHour == null) return;
    const estimate = estimateCostFromHourlyRate(
      venue.costPerHour,
      nextFromTime,
      nextToTime,
    );
    if (estimate != null) setCostTotal(estimate.toFixed(2));
  }

  function resetForm(): void {
    setShowForm(false);
    setFormKind("PRACTICE");
    setEditingId(null);
    setVenueId(venues[0]?.id ?? "");
    setDate("");
    setFromTime("");
    setToTime("");
    setCostTotal("");
    setMinPlayers("");
    setCostManuallyEdited(false);
    setProposalError(null);
  }

  /** Opens the shared propose form pre-set to `kind`, or closes it if it's already open for that kind (acts as the section's "Cancel"). */
  function handleProposeClick(kind: SessionKind): void {
    if (showForm && formKind === kind) {
      resetForm();
      return;
    }
    resetForm();
    setFormKind(kind);
    if (kind === "GAME") setMinPlayers("5"); // real forfeit threshold, still editable
    setShowForm(true);
  }

  function startEdit(session: SessionResponse): void {
    setEditingId(session.id);
    setFormKind(session.kind);
    setVenueId(session.venue?.id ?? "");
    setDate(session.date.slice(0, 10)); // ISO -> "YYYY-MM-DD" for <input type="date">
    setFromTime(session.fromTime);
    setToTime(session.toTime);
    setCostTotal(session.costTotal != null ? String(session.costTotal / 100) : "");
    setMinPlayers(session.minPlayers != null ? String(session.minPlayers) : "");
    // Editing an existing session shouldn't silently recompute its already-agreed cost.
    setCostManuallyEdited(true);
    setProposalError(null);
    setShowForm(true);
  }

  /** Opens the propose form pre-filled from a cancelled session's venue/cost/minPlayers, with date/time left blank — for proposing an alternate time at the same spot. Creates a new session (POST), doesn't touch the cancelled one. */
  function startAlternate(session: SessionResponse): void {
    setEditingId(null);
    setFormKind(session.kind);
    setVenueId(session.venue?.id ?? venues[0]?.id ?? "");
    setDate("");
    setFromTime("");
    setToTime("");
    setCostTotal(session.costTotal != null ? String(session.costTotal / 100) : "");
    setMinPlayers(session.minPlayers != null ? String(session.minPlayers) : "");
    // A fresh proposal — let auto-fill recompute once new times are picked.
    setCostManuallyEdited(false);
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
          showCostField && costTotal
            ? Math.round(parseFloat(costTotal) * 100)
            : undefined,
        minPlayers:
          showMinPlayersField && minPlayers ? parseInt(minPlayers, 10) : undefined,
        ...(editingId
          ? {}
          : { proposedById: currentPlayerId ?? undefined, kind: formKind }),
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
      const updated = await putRsvp(slug, sessionId, currentPlayerId, status);
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? updated : s)),
      );
      setRsvpErrors((prev) => {
        const next = { ...prev };
        delete next[sessionId];
        return next;
      });
    } catch (err) {
      setSessions(prevSessions);
      setRsvpErrors((prev) => ({
        ...prev,
        [sessionId]: err instanceof RsvpError ? err.message : "Network error",
      }));
    }
  }

  const gameSessions = sortByDateTime(
    sessions.filter((s) => s.kind === "GAME"),
  );
  const practiceSessions = sortByDateTime(
    sessions.filter((s) => s.kind === "PRACTICE"),
  );

  const proposeForm = (
    <form
      onSubmit={handleFormSubmit}
      className="flex flex-col gap-3 rounded-lg bg-gray-800 border border-gray-700 p-4"
    >
      <h3 className="font-semibold text-white">
        {editingId
          ? formKind === "GAME"
            ? "Edit Game"
            : "Edit Session"
          : formKind === "GAME"
            ? "Propose a Game"
            : "Propose a Session"}
      </h3>

      {venues.length > 0 && (
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">Venue</label>
          <select
            value={venueId}
            onChange={(e) => {
              setVenueId(e.target.value);
              maybeAutoFillCost(e.target.value, fromTime, toTime);
            }}
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
          className="rounded bg-gray-700 border border-gray-600 px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 [color-scheme:dark]"
        />
      </div>

      <div className="flex gap-2">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-xs text-gray-400">From</label>
          <input
            type="time"
            required
            value={fromTime}
            onChange={(e) => {
              setFromTime(e.target.value);
              maybeAutoFillCost(venueId, e.target.value, toTime);
            }}
            className="rounded bg-gray-700 border border-gray-600 px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 [color-scheme:dark]"
          />
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-xs text-gray-400">To</label>
          <input
            type="time"
            required
            value={toTime}
            onChange={(e) => {
              setToTime(e.target.value);
              maybeAutoFillCost(venueId, fromTime, e.target.value);
            }}
            className="rounded bg-gray-700 border border-gray-600 px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 [color-scheme:dark]"
          />
        </div>
      </div>

      {(showCostField || showMinPlayersField) && (
        <div className="flex gap-2">
          {showCostField && (
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs text-gray-400">Total cost ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder={
                  estimatedCost != null
                    ? estimatedCost.toFixed(2)
                    : selectedVenue?.costPerHour != null
                      ? String(selectedVenue.costPerHour / 100)
                      : "100.00"
                }
                value={costTotal}
                onChange={(e) => {
                  setCostTotal(e.target.value);
                  setCostManuallyEdited(true);
                }}
                className="rounded bg-gray-700 border border-gray-600 px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          )}
          {showMinPlayersField && (
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs text-gray-400">
                {formKind === "GAME" ? "Min to avoid forfeit" : "Min players"}
              </label>
              <input
                type="number"
                min="1"
                placeholder={formKind === "GAME" ? "5" : "10"}
                value={minPlayers}
                onChange={(e) => setMinPlayers(e.target.value)}
                className="rounded bg-gray-700 border border-gray-600 px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          )}
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
            : formKind === "GAME"
              ? "Propose Game"
              : "Propose Session"}
      </button>
    </form>
  );

  const sharedSectionProps = {
    slug,
    currentPlayerId,
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
  };

  return (
    <div className="flex flex-col gap-8">
      <SessionsSection
        kind="GAME"
        title="Game Day"
        proposeLabel="+ Propose Game"
        sessions={gameSessions}
        isFormOpenHere={showForm && formKind === "GAME"}
        onToggleForm={() => handleProposeClick("GAME")}
        formSlot={showForm && formKind === "GAME" ? proposeForm : null}
        {...sharedSectionProps}
      />
      <SessionsSection
        kind="PRACTICE"
        title="Sessions"
        proposeLabel="+ Propose Session"
        sessions={practiceSessions}
        isFormOpenHere={showForm && formKind === "PRACTICE"}
        onToggleForm={() => handleProposeClick("PRACTICE")}
        formSlot={showForm && formKind === "PRACTICE" ? proposeForm : null}
        extraHeaderAction={
          <Link
            href={`/venues?from=${encodeURIComponent(slug)}`}
            className="rounded-md bg-gray-700 hover:bg-gray-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors"
          >
            Venues
          </Link>
        }
        {...sharedSectionProps}
      />
    </div>
  );
}

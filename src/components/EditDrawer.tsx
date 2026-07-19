"use client";

import { useState } from "react";
import type { JSX } from "react";
import type { ScheduleEntry } from "@/types/api";
import type { Status } from "@/generated/prisma/enums";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const STATUS_LABELS: Record<Status, string> = {
  ANYTIME: "Anytime",
  SPECIFIC: "Specific hours",
  UNAVAILABLE: "Unavailable",
};

interface EditDrawerProps {
  playerName: string;
  dayOfWeek: number;
  entry: ScheduleEntry;
  onSave: (entry: ScheduleEntry) => Promise<void>;
  onClose: () => void;
}

export function EditDrawer({
  playerName,
  dayOfWeek,
  entry,
  onSave,
  onClose,
}: EditDrawerProps): JSX.Element {
  const [status, setStatus] = useState<Status>(entry.status);
  const [fromTime, setFromTime] = useState(entry.fromTime ?? "");
  const [toTime, setToTime] = useState(entry.toTime ?? "");
  const [note, setNote] = useState(entry.note ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave(): Promise<void> {
    setSaving(true);
    const updatedEntry: ScheduleEntry = {
      dayOfWeek,
      status,
      fromTime: status === "SPECIFIC" ? fromTime || null : null,
      toTime: status === "SPECIFIC" ? toTime || null : null,
      note: note.trim() || null,
    };
    await onSave(updatedEntry);
    setSaving(false);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Edit ${playerName} – ${DAY_NAMES[dayOfWeek]}`}
        className="fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-border rounded-t-2xl px-4 pt-4 pb-8 safe-bottom"
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-border-strong mx-auto mb-4" />

        <p className="text-[10px] uppercase tracking-wide text-text-mute mb-1">
          Availability
        </p>
        <h2 className="text-base font-semibold text-text mb-4">
          {DAY_NAMES[dayOfWeek]} &middot; {playerName}
        </h2>

        {/* Status options */}
        <div className="space-y-2 mb-4">
          {(["ANYTIME", "SPECIFIC", "UNAVAILABLE"] as const).map((s) => (
            <label
              key={s}
              className={[
                "flex items-center justify-between gap-3 px-4 py-3 rounded-xl cursor-pointer transition-colors border",
                status === s
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border text-text-dim hover:border-border-strong",
              ].join(" ")}
            >
              <input
                type="radio"
                name="status"
                value={s}
                checked={status === s}
                onChange={() => setStatus(s)}
                className="sr-only"
              />
              <span className="font-medium text-sm">{STATUS_LABELS[s]}</span>
              {status === s && (
                <span
                  className="w-2 h-2 rounded-full bg-accent shrink-0"
                  aria-hidden="true"
                />
              )}
            </label>
          ))}
        </div>

        {/* Time inputs — only when SPECIFIC */}
        {status === "SPECIFIC" && (
          <div className="flex gap-3 mb-4">
            <div className="flex-1">
              <label className="block text-[10px] uppercase tracking-wide text-text-mute mb-1">
                From
              </label>
              <input
                type="time"
                value={fromTime}
                onChange={(e) => setFromTime(e.target.value)}
                className="w-full bg-surface-2 text-text rounded-lg px-3 py-2 text-sm border border-border focus:outline-none focus:border-accent"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] uppercase tracking-wide text-text-mute mb-1">
                To
              </label>
              <input
                type="time"
                value={toTime}
                onChange={(e) => setToTime(e.target.value)}
                className="w-full bg-surface-2 text-text rounded-lg px-3 py-2 text-sm border border-border focus:outline-none focus:border-accent"
              />
            </div>
          </div>
        )}

        {/* Note */}
        <div className="mb-6">
          <label className="block text-[10px] uppercase tracking-wide text-text-mute mb-1">
            Note <span className="normal-case text-text-mute">(optional)</span>
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. church, work until 4:30"
            className="w-full bg-surface-2 text-text rounded-lg px-3 py-2 text-sm border border-border focus:outline-none focus:border-accent placeholder:text-text-mute"
          />
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 rounded-xl bg-accent hover:bg-accent-dim disabled:opacity-50 text-bg font-semibold text-sm transition-colors"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </>
  );
}

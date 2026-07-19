"use client";

import { useState } from "react";
import type { JSX } from "react";
import type { ScheduleEntry } from "@/types/api";
import type { Status } from "@/generated/prisma/enums";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
        className="fixed bottom-0 left-0 right-0 z-50 bg-neutral-900 rounded-t-2xl px-4 pt-4 pb-8 safe-bottom"
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-neutral-700 mx-auto mb-4" />

        <h2 className="text-base font-semibold text-white mb-4">
          {playerName} &mdash; {DAY_NAMES[dayOfWeek]}
        </h2>

        {/* Status options */}
        <div className="space-y-2 mb-4">
          {(["ANYTIME", "SPECIFIC", "UNAVAILABLE"] as const).map((s) => (
            <label
              key={s}
              className={[
                "flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-colors",
                status === s
                  ? "bg-teal-600 text-white"
                  : "bg-neutral-800 text-neutral-200 hover:bg-neutral-700",
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
              <span className="font-medium text-sm capitalize">
                {s === "ANYTIME"
                  ? "Anytime"
                  : s === "SPECIFIC"
                  ? "Specific hours"
                  : "Unavailable"}
              </span>
            </label>
          ))}
        </div>

        {/* Time inputs — only when SPECIFIC */}
        {status === "SPECIFIC" && (
          <div className="flex gap-3 mb-4">
            <div className="flex-1">
              <label className="block text-xs text-neutral-400 mb-1">From</label>
              <input
                type="time"
                value={fromTime}
                onChange={(e) => setFromTime(e.target.value)}
                className="w-full bg-neutral-800 text-white rounded-lg px-3 py-2 text-sm border border-neutral-700 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-neutral-400 mb-1">To</label>
              <input
                type="time"
                value={toTime}
                onChange={(e) => setToTime(e.target.value)}
                className="w-full bg-neutral-800 text-white rounded-lg px-3 py-2 text-sm border border-neutral-700 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>
        )}

        {/* Note */}
        <div className="mb-6">
          <label className="block text-xs text-neutral-400 mb-1">
            Note <span className="text-neutral-600">(optional)</span>
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. church, work until 4:30"
            className="w-full bg-neutral-800 text-white rounded-lg px-3 py-2 text-sm border border-neutral-700 focus:outline-none focus:border-teal-500 placeholder:text-neutral-600"
          />
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-white font-semibold text-sm transition-colors"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </>
  );
}

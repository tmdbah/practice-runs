"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { JSX } from "react";
import type { TourStep } from "@/lib/tour-steps";
import { TOUR_COPY, TOUR_STEP_ORDER } from "@/lib/tour-steps";
import { computeTooltipPlacement } from "@/lib/tour-position";

interface OnboardingTourProps {
  step: Exclude<TourStep, "complete">;
  targetRect: DOMRect | null;
  onSkip: () => void;
  onAcknowledge: () => void;
}

/** Padding (px) between the spotlight ring and the highlighted element. */
const SPOTLIGHT_PADDING = 6;

/**
 * Presentational-only tour overlay: a spotlight ring around `targetRect`
 * plus a positioned tooltip. Has no knowledge of grids, players, or
 * storage — the parent decides what's being spotlighted and what happens
 * on skip/acknowledge.
 */
export function OnboardingTour({
  step,
  targetRect,
  onSkip,
  onAcknowledge,
}: OnboardingTourProps): JSX.Element | null {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<{
    top: number;
    left: number;
  } | null>(null);

  useLayoutEffect(() => {
    if (!targetRect || !tooltipRef.current) {
      setPlacement(null);
      return;
    }
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const result = computeTooltipPlacement(
      {
        top: targetRect.top,
        left: targetRect.left,
        width: targetRect.width,
        height: targetRect.height,
      },
      { width: window.innerWidth, height: window.innerHeight },
      { width: tooltipRect.width, height: tooltipRect.height },
    );
    setPlacement({ top: result.top, left: result.left });
  }, [targetRect, step]);

  if (!targetRect) return null;

  const copy = TOUR_COPY[step];
  const stepNumber = TOUR_STEP_ORDER.indexOf(step) + 1;

  return (
    <>
      <div
        className="fixed rounded-lg ring-2 ring-accent shadow-[0_0_0_2000px_rgba(0,0,0,0.6)] pointer-events-none transition-all duration-300 z-40"
        style={{
          top: targetRect.top - SPOTLIGHT_PADDING,
          left: targetRect.left - SPOTLIGHT_PADDING,
          width: targetRect.width + SPOTLIGHT_PADDING * 2,
          height: targetRect.height + SPOTLIGHT_PADDING * 2,
        }}
        aria-hidden="true"
      />
      <div
        ref={tooltipRef}
        role="dialog"
        aria-label={copy.title}
        className="fixed bg-surface border border-border-strong rounded-xl p-3 shadow-lg max-w-[280px] z-50 text-sm text-text transition-all duration-300"
        style={
          placement
            ? { top: placement.top, left: placement.left }
            : { top: -9999, left: -9999 }
        }
      >
        <p className="text-[10px] uppercase tracking-wide text-text-mute mb-1">
          Step {stepNumber} of {TOUR_STEP_ORDER.length}
        </p>
        <h2 className="font-semibold mb-1">{copy.title}</h2>
        <p className="text-text-dim mb-3">{copy.body}</p>
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-text-mute hover:text-text transition-colors"
          >
            Skip tour
          </button>
          {copy.primaryLabel && (
            <button
              type="button"
              onClick={onAcknowledge}
              className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-dim text-bg font-semibold text-sm transition-colors"
            >
              {copy.primaryLabel}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

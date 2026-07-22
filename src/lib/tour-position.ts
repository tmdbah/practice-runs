export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface TooltipPlacement {
  top: number;
  left: number;
  placement: "above" | "below";
}

/** Minimum gap kept between the tooltip and the target/viewport edges, in px. */
const GAP = 8;

/**
 * Positions the tour tooltip relative to a spotlighted target: below by
 * default, flipped above when there isn't enough room below; horizontally
 * clamped so it never clips off either edge of the viewport.
 */
export function computeTooltipPlacement(
  targetRect: Rect,
  viewport: { width: number; height: number },
  tooltip: { width: number; height: number },
): TooltipPlacement {
  const spaceBelow = viewport.height - (targetRect.top + targetRect.height);
  const placement: TooltipPlacement["placement"] =
    spaceBelow >= tooltip.height + GAP ? "below" : "above";

  const idealTop =
    placement === "below"
      ? targetRect.top + targetRect.height + GAP
      : targetRect.top - tooltip.height - GAP;
  // When the target is tall relative to the viewport (or sits near an edge),
  // neither "below" nor "above" may leave room for the full tooltip height —
  // clamp so it always stays fully on-screen vertically, even if that means
  // overlapping the spotlighted target in extreme cases.
  const maxTop = viewport.height - tooltip.height - GAP;
  const top = Math.max(GAP, Math.min(idealTop, maxTop));

  const idealLeft =
    targetRect.left + targetRect.width / 2 - tooltip.width / 2;
  const maxLeft = viewport.width - tooltip.width - GAP;
  const left = Math.max(GAP, Math.min(idealLeft, maxLeft));

  return { top, left, placement };
}

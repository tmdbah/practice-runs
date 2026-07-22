import { describe, it, expect } from "vitest";
import { computeTooltipPlacement } from "@/lib/tour-position";

const viewport = { width: 375, height: 667 };
const tooltip = { width: 280, height: 100 };

describe("computeTooltipPlacement", () => {
  it("places the tooltip below the target when there's room", () => {
    const targetRect = { top: 100, left: 50, width: 40, height: 40 };
    const result = computeTooltipPlacement(targetRect, viewport, tooltip);

    expect(result.placement).toBe("below");
    expect(result.top).toBe(100 + 40 + 8);
  });

  it("flips above the target when there isn't enough room below", () => {
    const targetRect = { top: 600, left: 50, width: 40, height: 40 };
    const result = computeTooltipPlacement(targetRect, viewport, tooltip);

    expect(result.placement).toBe("above");
    expect(result.top).toBe(600 - 100 - 8);
  });

  it("clamps left so the tooltip never clips the left edge", () => {
    const targetRect = { top: 100, left: -10, width: 20, height: 20 };
    const result = computeTooltipPlacement(targetRect, viewport, tooltip);

    expect(result.left).toBe(8);
  });

  it("clamps left so the tooltip never clips the right edge", () => {
    const targetRect = { top: 100, left: 360, width: 20, height: 20 };
    const result = computeTooltipPlacement(targetRect, viewport, tooltip);

    expect(result.left).toBe(viewport.width - tooltip.width - 8);
  });

  it("centers the tooltip under a target with plenty of room on both sides", () => {
    const targetRect = { top: 100, left: 140, width: 40, height: 40 };
    const result = computeTooltipPlacement(targetRect, viewport, tooltip);

    expect(result.left).toBe(140 + 20 - 140);
  });

  it("clamps top so a tall target in a short viewport never pushes the tooltip off the top", () => {
    const shortViewport = { width: 420, height: 350 };
    const tallTooltip = { width: 280, height: 176 };
    // Target starts just above the viewport and is taller than the space
    // either above or below it can offer the full tooltip height.
    const targetRect = { top: -6, left: 10, width: 385, height: 216 };
    const result = computeTooltipPlacement(targetRect, shortViewport, tallTooltip);

    expect(result.top).toBeGreaterThanOrEqual(8);
    expect(result.top + tallTooltip.height).toBeLessThanOrEqual(
      shortViewport.height,
    );
  });
});

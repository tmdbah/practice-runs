import { describe, it, expect } from "vitest";
import { formatTime } from "@/lib/format-time";

describe("formatTime", () => {
  it("should format a morning time", () => {
    expect(formatTime("09:30")).toBe("9:30am");
  });

  it("should format an afternoon time", () => {
    expect(formatTime("18:00")).toBe("6:00pm");
  });

  it("should format noon as pm", () => {
    expect(formatTime("12:00")).toBe("12:00pm");
  });

  it("should format midnight as am", () => {
    expect(formatTime("00:00")).toBe("12:00am");
  });
});

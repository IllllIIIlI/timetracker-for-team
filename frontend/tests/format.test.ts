import { describe, it, expect } from "vitest";
import { formatDuration } from "../src/format";

describe("formatDuration", () => {
  it("formats zero", () => {
    expect(formatDuration(0)).toBe("00:00:00");
  });

  it("formats seconds, minutes and hours", () => {
    expect(formatDuration(5)).toBe("00:00:05");
    expect(formatDuration(65)).toBe("00:01:05");
    expect(formatDuration(3661)).toBe("01:01:01");
  });

  it("prefixes negative durations with a minus sign instead of wrapping", () => {
    expect(formatDuration(-5)).toBe("-00:00:05");
    expect(formatDuration(-3661)).toBe("-01:01:01");
  });

  it("truncates fractional seconds", () => {
    expect(formatDuration(65.9)).toBe("00:01:05");
  });
});

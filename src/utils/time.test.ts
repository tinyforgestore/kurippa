import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { formatRelativeTime } from "@/utils/time";

describe("formatRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const now = new Date("2025-01-01T12:00:00.000Z").getTime();

  it('returns "just now" for 0 seconds ago', () => {
    expect(formatRelativeTime(now)).toBe("just now");
  });

  it('returns "just now" for 59 seconds ago', () => {
    expect(formatRelativeTime(now - 59_000)).toBe("just now");
  });

  it('returns "1 min ago" for 60 seconds ago', () => {
    expect(formatRelativeTime(now - 60_000)).toBe("1 min ago");
  });

  it('returns "2 mins ago" for 2 minutes ago', () => {
    expect(formatRelativeTime(now - 2 * 60_000)).toBe("2 mins ago");
  });

  it('returns "59 mins ago" for 59 minutes ago', () => {
    expect(formatRelativeTime(now - 59 * 60_000)).toBe("59 mins ago");
  });

  it('returns "1 hour ago" for 60 minutes ago', () => {
    expect(formatRelativeTime(now - 60 * 60_000)).toBe("1 hour ago");
  });

  it('returns "2 hours ago" for 2 hours ago', () => {
    expect(formatRelativeTime(now - 2 * 60 * 60_000)).toBe("2 hours ago");
  });

  it('returns "23 hours ago" for 23 hours ago', () => {
    expect(formatRelativeTime(now - 23 * 60 * 60_000)).toBe("23 hours ago");
  });

  it('returns "1 day ago" for exactly 24 hours ago', () => {
    expect(formatRelativeTime(now - 24 * 60 * 60_000)).toBe("1 day ago");
  });

  it('returns "3 days ago" for 3 days ago', () => {
    expect(formatRelativeTime(now - 3 * 24 * 60 * 60_000)).toBe("3 days ago");
  });

  it('returns "just now" for a future timestamp (clock skew)', () => {
    expect(formatRelativeTime(now + 60_000)).toBe("just now");
  });
});

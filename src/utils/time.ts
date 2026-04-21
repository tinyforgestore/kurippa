/**
 * Returns a human-readable relative time string for a Unix timestamp in milliseconds.
 * Examples: "just now", "3 mins ago", "2 hours ago", "5 days ago"
 */
export function formatRelativeTime(unixMs: number): string {
  const diffMs = Date.now() - unixMs;
  if (diffMs < 0) return "just now"; // clock skew or future timestamp
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min${diffMin === 1 ? "" : "s"} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
}

/**
 * Best-effort, in-memory sliding-window rate limiter for a single server
 * instance. This does NOT coordinate across multiple serverless instances —
 * on a platform that scales horizontally (Vercel, etc.) it slows down abuse
 * from any one instance but isn't a hard guarantee. For a real production
 * ceiling, put a shared store (e.g. Upstash Redis) behind this same
 * function signature; nothing else needs to change.
 */
const hits = new Map<string, number[]>();

export function isRateLimited(key: string, { max, windowMs }: { max: number; windowMs: number }) {
  const now = Date.now();
  const timestamps = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  timestamps.push(now);
  hits.set(key, timestamps);

  // Bound the map itself so long-running instances don't leak memory from
  // an ever-growing set of distinct keys.
  if (hits.size > 5000) {
    const oldestKey = hits.keys().next().value;
    if (oldestKey) hits.delete(oldestKey);
  }

  return timestamps.length > max;
}

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

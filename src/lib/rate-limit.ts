// In-memory sliding-window rate limiter. Only correct on a single server
// instance/replica — if this app is ever scaled horizontally, this needs to
// move to a shared store (e.g. Redis) or the limit becomes per-instance.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX = 120;

export function checkRateLimit(
  key: string,
  opts?: { max?: number; windowMs?: number }
): boolean {
  const max = opts?.max ?? DEFAULT_MAX;
  const windowMs = opts?.windowMs ?? DEFAULT_WINDOW_MS;
  const now = Date.now();

  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= max) return false;
  bucket.count += 1;
  return true;
}

// Periodic cleanup so the map doesn't grow unbounded with one-off IPs/users.
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}, DEFAULT_WINDOW_MS);
cleanupInterval.unref?.();

export function getClientIp(hdrs: Headers): string {
  const forwardedFor = hdrs.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return hdrs.get("x-real-ip") ?? "unknown";
}

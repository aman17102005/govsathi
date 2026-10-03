/** Privacy and abuse guards. */

/** True when text looks like it contains an Aadhaar number, a bank/card number, or a credential hint. */
export function looksSensitive(text: string): boolean {
  const compact = text.replace(/[\s-]/g, '');
  if (/\d{12}/.test(compact)) return true; // Aadhaar-length digit run
  if (/\d{9,18}/.test(compact)) return true; // account / card style numbers
  if (/\b(password|passcode|pin\s*number|otp|cvv)\b/i.test(text)) return true;
  return false;
}

/** Fixed-window per-client limiter (in memory; adequate for a single-instance deployment). */
export class RateLimiter {
  private hits = new Map<string, { count: number; resetAt: number }>();
  constructor(private readonly limit: number, private readonly windowMs = 60_000) {}
  allow(key: string, now = Date.now()): boolean {
    const h = this.hits.get(key);
    if (!h || now >= h.resetAt) {
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
      if (this.hits.size > 5000) this.prune(now);
      return true;
    }
    h.count += 1;
    return h.count <= this.limit;
  }
  private prune(now: number) {
    for (const [k, v] of this.hits) if (now >= v.resetAt) this.hits.delete(k);
  }
}

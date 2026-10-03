/**
 * Polite, SSRF-safe fetcher for official sources: https only, allow-listed hosts, public IPs only (checked at connect
 * time), manual redirect handling with re-validation, size/time limits, robots.txt, per-host rate limiting, retries with
 * backoff, and conditional requests.
 */
import dns from 'node:dns';
import https from 'node:https';
import { assertAllowedUrl, assertPublicAddresses, BlockedTargetError, type TargetPolicy } from './netguard';

export const USER_AGENT = 'GovSathiBot/0.1 (civic scheme-information project; respects robots.txt)';

export interface RawResponse {
  status: number;
  headers: Record<string, string>;
  body: Buffer;
}
export interface RequestOptions {
  headers: Record<string, string>;
  timeoutMs: number;
  maxBytes: number;
}
/** Low-level transport; replaced by a fake in tests. */
export type Transport = (url: URL, opts: RequestOptions) => Promise<RawResponse>;

/** Real transport: the DNS lookup used for the connection is the checked one (no TOCTOU between check and connect). */
export const httpsTransport: Transport = (url, opts) =>
  new Promise((resolve, reject) => {
    const req = https.request(
      {
        protocol: 'https:',
        hostname: url.hostname,
        port: 443,
        path: url.pathname + url.search,
        method: 'GET',
        headers: opts.headers,
        timeout: opts.timeoutMs,
        lookup: ((host: string, lookupOpts: { all?: boolean }, cb: (err: Error | null, address?: unknown, family?: number) => void) => {
          dns.lookup(host, { all: true }, (err, addrs) => {
            if (err) return cb(err);
            try {
              assertPublicAddresses(addrs.map((a) => a.address));
            } catch (e) {
              return cb(e as Error);
            }
            // Node asks for the address list when the connection uses autoSelectFamily; otherwise for one address.
            if (lookupOpts?.all) cb(null, addrs);
            else cb(null, addrs[0]!.address, addrs[0]!.family);
          });
        }) as never,
      },
      (res) => {
        const chunks: Buffer[] = [];
        let size = 0;
        res.on('data', (c: Buffer) => {
          size += c.length;
          if (size > opts.maxBytes) {
            req.destroy(new Error('response too large'));
            return;
          }
          chunks.push(c);
        });
        res.on('end', () =>
          resolve({
            status: res.statusCode ?? 0,
            headers: Object.fromEntries(Object.entries(res.headers).map(([k, v]) => [k.toLowerCase(), Array.isArray(v) ? v.join(', ') : (v ?? '')])),
            body: Buffer.concat(chunks),
          }),
        );
        res.on('error', reject);
      },
    );
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
    req.end();
  });

export interface FetchResult {
  url: string;
  finalUrl: string;
  status: number;
  contentType: string;
  text: string;
  etag?: string;
  lastModified?: string;
  notModified: boolean;
  retrievedAt: string;
  ms: number;
}

export class FetchError extends Error {
  constructor(public readonly code: 'blocked' | 'robots' | 'http' | 'network' | 'content-type' | 'too-many-redirects', message: string, public readonly status?: number) {
    super(message);
    this.name = 'FetchError';
  }
}

export interface FetcherOptions {
  transport?: Transport;
  policy?: TargetPolicy;
  /** Minimum gap between requests to one host. */
  minIntervalMs?: number;
  retries?: number;
  timeoutMs?: number;
  maxBytes?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => Date;
  userAgent?: string;
}

interface Rules {
  allow: string[];
  disallow: string[];
}

/** Minimal robots.txt parser: our agent group first, then `*`. Longest matching rule wins; Allow beats Disallow on ties. */
export function parseRobots(txt: string, agent = 'govsathibot'): Rules {
  const groups: { agents: string[]; allow: string[]; disallow: string[] }[] = [];
  let cur: (typeof groups)[number] | undefined;
  let lastWasAgent = false;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    const m = /^([a-z-]+)\s*:\s*(.*)$/i.exec(line);
    if (!m) continue;
    const k = m[1]!.toLowerCase();
    const v = m[2]!.trim();
    if (k === 'user-agent') {
      if (!lastWasAgent || !cur) {
        cur = { agents: [], allow: [], disallow: [] };
        groups.push(cur);
      }
      cur.agents.push(v.toLowerCase());
      lastWasAgent = true;
    } else {
      lastWasAgent = false;
      if (!cur) continue;
      if (k === 'allow' && v) cur.allow.push(v);
      if (k === 'disallow' && v) cur.disallow.push(v);
    }
  }
  const own = groups.filter((g) => g.agents.some((a) => a !== '*' && agent.includes(a)));
  const pick = own.length > 0 ? own : groups.filter((g) => g.agents.includes('*'));
  return { allow: pick.flatMap((g) => g.allow), disallow: pick.flatMap((g) => g.disallow) };
}

const toRegex = (rule: string) => new RegExp('^' + rule.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$'));
export function robotsAllows(rules: Rules, pathAndQuery: string): boolean {
  let best = { len: -1, allow: true };
  for (const r of rules.disallow) if (toRegex(r).test(pathAndQuery) && r.length > best.len) best = { len: r.length, allow: false };
  for (const r of rules.allow) if (toRegex(r).test(pathAndQuery) && r.length >= best.len) best = { len: r.length, allow: true };
  return best.allow;
}

const TEXT_TYPES = /^(text\/|application\/(xhtml\+xml|xml|json))/i;

export class OfficialFetcher {
  private readonly transport: Transport;
  private readonly lastHit = new Map<string, number>();
  private readonly robots = new Map<string, Rules | 'deny-all'>();
  private readonly o: Required<Omit<FetcherOptions, 'transport' | 'policy'>> & { policy: TargetPolicy };

  constructor(opts: FetcherOptions = {}) {
    this.transport = opts.transport ?? httpsTransport;
    this.o = {
      policy: opts.policy ?? {},
      minIntervalMs: opts.minIntervalMs ?? 2000,
      retries: opts.retries ?? 2,
      timeoutMs: opts.timeoutMs ?? 20_000,
      maxBytes: opts.maxBytes ?? 3_000_000,
      sleep: opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms))),
      now: opts.now ?? (() => new Date()),
      userAgent: opts.userAgent ?? USER_AGENT,
    };
  }

  private async pace(host: string): Promise<void> {
    const wait = (this.lastHit.get(host) ?? 0) + this.o.minIntervalMs - this.o.now().getTime();
    if (wait > 0) await this.o.sleep(wait);
    this.lastHit.set(host, this.o.now().getTime());
  }

  private async rawGet(url: URL, extra: Record<string, string> = {}): Promise<RawResponse> {
    let attempt = 0;
    for (;;) {
      await this.pace(url.hostname);
      try {
        const res = await this.transport(url, {
          headers: { 'user-agent': this.o.userAgent, accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.5', ...extra },
          timeoutMs: this.o.timeoutMs,
          maxBytes: this.o.maxBytes,
        });
        if ((res.status === 429 || res.status >= 500) && attempt < this.o.retries) {
          const ra = Number(res.headers['retry-after']);
          await this.o.sleep(Number.isFinite(ra) && ra > 0 ? Math.min(ra, 60) * 1000 : 1000 * 2 ** attempt);
          attempt++;
          continue;
        }
        return res;
      } catch (e) {
        if (e instanceof BlockedTargetError || (e as Error).message?.includes('non-public address')) throw new FetchError('blocked', (e as Error).message);
        if (attempt < this.o.retries) {
          await this.o.sleep(1000 * 2 ** attempt);
          attempt++;
          continue;
        }
        throw new FetchError('network', (e as Error).message);
      }
    }
  }

  private async robotsFor(u: URL): Promise<Rules | 'deny-all'> {
    const cached = this.robots.get(u.hostname);
    if (cached) return cached;
    let rules: Rules | 'deny-all';
    try {
      let target = new URL('/robots.txt', u);
      let res = await this.rawGet(target);
      for (let hop = 0; hop < 3 && res.status >= 300 && res.status < 400 && res.headers.location; hop++) {
        target = assertAllowedUrl(new URL(res.headers.location, target).toString(), this.o.policy);
        res = await this.rawGet(target);
      }
      if (res.status >= 200 && res.status < 300) rules = parseRobots(res.body.toString('utf8'));
      else if (res.status >= 400 && res.status < 500) rules = { allow: [], disallow: [] }; // no robots.txt: no restrictions
      else rules = 'deny-all'; // server trouble: be conservative
    } catch {
      rules = 'deny-all';
    }
    this.robots.set(u.hostname, rules);
    return rules;
  }

  async get(rawUrl: string, cond: { etag?: string; lastModified?: string } = {}): Promise<FetchResult> {
    const started = this.o.now().getTime();
    let url = assertAllowedUrl(rawUrl, this.o.policy);
    for (let hop = 0; hop <= 4; hop++) {
      const rules = await this.robotsFor(url);
      if (rules === 'deny-all' || !robotsAllows(rules, url.pathname + url.search)) throw new FetchError('robots', `robots.txt does not allow ${url.pathname}`);
      const extra: Record<string, string> = {};
      if (cond.etag) extra['if-none-match'] = cond.etag;
      if (cond.lastModified) extra['if-modified-since'] = cond.lastModified;
      const res = await this.rawGet(url, extra);
      if (res.status >= 300 && res.status < 400 && res.headers.location) {
        url = assertAllowedUrl(new URL(res.headers.location, url).toString(), this.o.policy); // re-validate every hop
        continue;
      }
      const base = { url: rawUrl, finalUrl: url.toString(), status: res.status, etag: res.headers.etag, lastModified: res.headers['last-modified'], retrievedAt: this.o.now().toISOString(), ms: this.o.now().getTime() - started };
      if (res.status === 304) return { ...base, contentType: '', text: '', notModified: true };
      if (res.status < 200 || res.status >= 300) throw new FetchError('http', `HTTP ${res.status}`, res.status);
      const contentType = res.headers['content-type'] ?? '';
      if (!TEXT_TYPES.test(contentType)) throw new FetchError('content-type', `unsupported content type: ${contentType || 'none'}`, res.status);
      return { ...base, contentType, text: res.body.toString('utf8'), notModified: false };
    }
    throw new FetchError('too-many-redirects', 'too many redirects');
  }
}

/**
 * Change detection for existing schemes. Fetch -> fingerprint -> compare with the stored snapshot.
 * Safety direction is one-way: a material change (or a vanished page) DEMOTES a scheme to `pending-verification`
 * automatically so it leaves the public catalogue; promotion back never happens here.
 */
import type { Scheme } from '@govsathi/shared';
import { OfficialFetcher, FetchError } from './fetcher';
import { extractTitle, FINGERPRINT_VERSION, fingerprint, htmlToText } from './extract';
import type { IngestStore } from './store';

export type ChangeKind = 'baseline' | 'unchanged' | 'minor' | 'material' | 'gone' | 'error' | 'skipped-assisted';

export interface ChangeEvent {
  schemeId: string;
  src: number;
  url: string;
  kind: ChangeKind;
  detail: string;
  demoted: boolean;
}

export interface MonitorOptions {
  fetcher: OfficialFetcher;
  store: IngestStore;
  now?: () => Date;
  /** Source indices to skip (client-rendered pages: refreshed through assisted import). */
  skip?: (s: Scheme, src: number) => boolean;
}

const BY = 'ingest-monitor';

export function demote(store: IngestStore, s: Scheme, reason: string, at: string, sourceUrl?: string): Scheme {
  if (s.lifecycle === 'pending-verification' || s.lifecycle === 'discontinued' || s.lifecycle === 'archived') return s;
  const version = s.dataVersion + 1;
  const next: Scheme = {
    ...s,
    lifecycle: 'pending-verification',
    dataVersion: version,
    updatedOn: at.slice(0, 10),
    history: [...s.history, { version, date: at.slice(0, 10), lifecycle: 'pending-verification', change: reason, by: BY, ...(sourceUrl ? { sourceUrl } : {}) }],
  };
  store.saveScheme(next);
  store.audit({ type: 'demoted', schemeId: s.id, detail: reason, by: BY, ...(sourceUrl ? { url: sourceUrl } : {}) });
  return next;
}

export async function monitorScheme(scheme: Scheme, o: MonitorOptions): Promise<ChangeEvent[]> {
  const events: ChangeEvent[] = [];
  const now = (o.now ?? (() => new Date()))();
  const at = now.toISOString();
  let current = scheme;
  for (let i = 0; i < scheme.sources.length; i++) {
    const src = scheme.sources[i]!;
    const base = { schemeId: scheme.id, src: i, url: src.url };
    if (o.skip?.(scheme, i)) {
      events.push({ ...base, kind: 'skipped-assisted', detail: 'client-rendered source; refreshed by assisted import', demoted: false });
      continue;
    }
    const prev = o.store.getSnapshot(scheme.id, i);
    try {
      const r = await o.fetcher.get(src.url, prev?.method === 'http' ? { etag: prev.etag, lastModified: prev.lastModified } : {});
      o.store.recordHealth(src.url, true, at);
      if (r.notModified && prev) {
        events.push({ ...base, kind: 'unchanged', detail: 'HTTP 304', demoted: false });
        continue;
      }
      const text = htmlToText(r.text);
      const fp = fingerprint(text);
      const snap = { schemeId: scheme.id, src: i, url: src.url, finalUrl: r.finalUrl, method: 'http' as const, retrievedAt: r.retrievedAt, title: extractTitle(r.text), etag: r.etag, lastModified: r.lastModified, ...fp, text };
      let kind: ChangeKind;
      let detail: string;
      if (!prev) {
        kind = 'baseline';
        detail = `first snapshot (${fp.claimCount} claim sentences)`;
      } else if ((prev.fpVersion ?? 1) !== FINGERPRINT_VERSION) {
        kind = 'baseline';
        detail = 'fingerprint algorithm changed; re-baselined (not a source change)';
      } else if (prev.claimHash !== fp.claimHash) {
        kind = 'material';
        detail = `claim-bearing text changed (${prev.claimCount} -> ${fp.claimCount} claim sentences)`;
      } else if (prev.textHash !== fp.textHash) {
        kind = 'minor';
        detail = 'page text changed, claim-bearing text identical';
      } else {
        kind = 'unchanged';
        detail = 'identical';
      }
      o.store.saveSnapshot(snap);
      let demoted = false;
      if (kind === 'material') {
        const before = current;
        current = demote(o.store, current, `Official source changed (${src.url}): ${detail}. Re-verify before republishing.`, at, src.url);
        demoted = current !== before;
      }
      if (kind !== 'unchanged') o.store.audit({ type: `source-${kind}`, schemeId: scheme.id, url: src.url, detail, by: BY, at });
      events.push({ ...base, kind, detail, demoted });
    } catch (e) {
      const fe = e instanceof FetchError ? e : undefined;
      const code = fe?.code ?? 'network';
      o.store.recordHealth(src.url, code === 'blocked' ? 'blocked' : code === 'robots' ? 'robots' : false, at, (e as Error).message);
      if (fe?.code === 'http' && (fe.status === 404 || fe.status === 410)) {
        // A vanished official page may mean the scheme ended. Never decide that automatically: demote and flag for a person.
        current = demote(o.store, current, `Official source returned HTTP ${fe.status} (${src.url}); the scheme may have been withdrawn. Needs human review.`, at, src.url);
        o.store.audit({ type: 'source-gone', schemeId: scheme.id, url: src.url, detail: `HTTP ${fe.status}`, by: BY, at });
        events.push({ ...base, kind: 'gone', detail: `HTTP ${fe.status}`, demoted: true });
      } else {
        o.store.audit({ type: 'source-error', schemeId: scheme.id, url: src.url, detail: (e as Error).message, by: BY, at });
        events.push({ ...base, kind: 'error', detail: `${code}: ${(e as Error).message}`, demoted: false });
      }
    }
  }
  return events;
}

/**
 * Discovery of potentially new schemes from official listing pages and sitemaps. Candidates are leads only:
 * they carry no scheme facts, are never shown to citizens, and need extraction + verification + the publication gate.
 */
import { isOfficialUrl } from '@govsathi/shared';
import { OfficialFetcher } from './fetcher';
import { extractLinks, sitemapUrls } from './extract';
import type { Candidate, IngestStore } from './store';

export interface DiscoverySource {
  id: string;
  kind: 'sitemap' | 'listing-page';
  url: string;
  /** Regex (as string) a URL or link text must match to be considered scheme-like. */
  include: string;
  note?: string;
}

const norm = (u: string) => {
  try {
    const x = new URL(u);
    x.hash = '';
    return x.toString().replace(/\/$/, '');
  } catch {
    return u;
  }
};

export async function discover(sources: DiscoverySource[], knownUrls: Set<string>, o: { fetcher: OfficialFetcher; store: IngestStore; now?: () => Date }): Promise<{ added: Candidate[]; errors: { source: string; error: string }[] }> {
  const at = (o.now ?? (() => new Date()))().toISOString();
  const known = new Set([...knownUrls].map(norm));
  const existing = o.store.candidates();
  for (const c of existing) known.add(norm(c.url));
  const added: Candidate[] = [];
  const errors: { source: string; error: string }[] = [];

  for (const src of sources) {
    const re = new RegExp(src.include, 'i');
    try {
      const r = await o.fetcher.get(src.url);
      o.store.recordHealth(src.url, true, at);
      const found: { url: string; text: string }[] =
        src.kind === 'sitemap' ? sitemapUrls(r.text).map((u) => ({ url: u, text: '' })) : extractLinks(r.text, r.finalUrl);
      for (const f of found) {
        if (!isOfficialUrl(f.url) || !(re.test(f.url) || re.test(f.text))) continue;
        const key = norm(f.url);
        if (known.has(key)) continue;
        known.add(key);
        added.push({ url: f.url, title: f.text || undefined, discoveredOn: at.slice(0, 10), discoveredVia: src.id, status: 'discovered', note: 'Lead only. Not extracted, not verified, never shown to citizens.' });
      }
    } catch (e) {
      errors.push({ source: src.id, error: (e as Error).message });
      o.store.recordHealth(src.url, false, at, (e as Error).message);
    }
  }
  if (added.length > 0) {
    o.store.saveCandidates([...existing, ...added]);
    for (const c of added) o.store.audit({ type: 'candidate-discovered', url: c.url, detail: `via ${c.discoveredVia}`, by: 'ingest-discover', at });
  }
  return { added, errors };
}

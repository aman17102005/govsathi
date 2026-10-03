/**
 * Scheme ingestion / verification CLI.
 *   npm run ingest -- run              monitor every scheme's official sources + run discovery (safe to schedule)
 *   npm run ingest -- discover         discovery only
 *   npm run ingest -- import <file>    import assisted snapshots (JSON array) for client-rendered sources
 *   npm run ingest -- cite             rebuild claim-level citations from stored snapshots
 *   npm run ingest -- promote [--demote-only]   publish schemes that pass the gate (not with --demote-only); demote published ones that fail
 *   npm run ingest -- status           print the pipeline state
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isOfficialUrl, isoDay, publicationBlockers, type Scheme } from '@govsathi/shared';
import { buildCitations, discover, fingerprint, IngestStore, monitorScheme, OfficialFetcher, type DiscoverySource, type Snapshot } from '@govsathi/ingest';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const store = new IngestStore(root);
const registry = JSON.parse(fs.readFileSync(path.join(root, 'data/sources/registry.json'), 'utf8')) as { discovery: DiscoverySource[]; assistedSources: { host: string }[] };
const assistedHosts = new Set(registry.assistedSources.map((a) => a.host));
const isAssisted = (s: Scheme, i: number) => assistedHosts.has(new URL(s.sources[i]!.url).hostname);
const today = isoDay(new Date());
const cmd = process.argv[2] ?? 'status';

function snapsFor(s: Scheme): Snapshot[] {
  return s.sources.map((_, i) => store.getSnapshot(s.id, i)).filter((x): x is Snapshot => !!x);
}

async function run() {
  const fetcher = new OfficialFetcher({ minIntervalMs: 2500 });
  const counts: Record<string, number> = {};
  for (const s of store.listSchemes()) {
    for (const ev of await monitorScheme(s, { fetcher, store, skip: isAssisted })) {
      counts[ev.kind] = (counts[ev.kind] ?? 0) + 1;
      if (ev.kind !== 'unchanged' && ev.kind !== 'skipped-assisted') console.log(`${ev.kind.padEnd(9)} ${ev.schemeId} [${ev.src}] ${ev.detail}${ev.demoted ? '  -> DEMOTED' : ''}`);
    }
  }
  console.log('monitor:', counts);
}

async function runDiscover() {
  const fetcher = new OfficialFetcher({ minIntervalMs: 2500 });
  const known = new Set(store.listSchemes().flatMap((s) => s.sources.map((x) => x.url)));
  const r = await discover(registry.discovery, known, { fetcher, store });
  console.log(`discovery: ${r.added.length} new candidate(s); ${r.errors.length} source error(s)`);
  for (const e of r.errors) console.log(`  error ${e.source}: ${e.error}`);
  for (const c of r.added.slice(0, 20)) console.log(`  + ${c.url}`);
}

function importSnapshots(file: string) {
  const rows = JSON.parse(fs.readFileSync(file, 'utf8')) as { schemeId: string; src: number; url: string; title?: string; text: string; retrievedAt: string }[];
  const byId = new Map(store.listSchemes().map((s) => [s.id, s]));
  let n = 0;
  for (const r of rows) {
    const s = byId.get(r.schemeId);
    if (!s || s.sources[r.src]?.url !== r.url) { console.error(`skip ${r.schemeId}[${r.src}]: unknown scheme/source`); continue; }
    if (!isAssisted(s, r.src)) { console.error(`skip ${r.schemeId}[${r.src}]: source is fetchable by the pipeline; assisted import not allowed`); continue; }
    const text = r.text.replace(/\s+\n/g, '\n').trim();
    const prev = store.getSnapshot(s.id, r.src);
    const fp = fingerprint(text);
    store.saveSnapshot({ schemeId: s.id, src: r.src, url: r.url, finalUrl: r.url, method: 'assisted-import', retrievedAt: r.retrievedAt, title: r.title, ...fp, text });
    store.audit({ type: prev && prev.claimHash !== fp.claimHash ? 'source-material' : 'source-baseline', schemeId: s.id, url: r.url, detail: 'assisted import', by: 'ingest-import', at: r.retrievedAt });
    n++;
  }
  console.log(`imported ${n} snapshot(s)`);
}

function cite() {
  let cited = 0, total = 0;
  for (const s of store.listSchemes()) {
    const snaps = snapsFor(s);
    const built = buildCitations(s, snaps);
    const citations = [...built.citations];
    let uncited = built.uncited;
    if (uncited.includes('apply.url') && s.apply.url && isOfficialUrl(s.apply.url)) {
      // Not machine-checkable (the portal is robots-blocked or client-rendered). Recorded as DECLARED, never as text-match.
      const src = Math.max(0, s.sources.findIndex((x) => isOfficialUrl(x.url)));
      citations.push({ claim: 'apply.url', src, evidence: 'declared', quote: 'Apply link recorded by the maintainer from the official scheme page; not machine-checked.', readOn: today });
      uncited = uncited.filter((c) => c !== 'apply.url');
    }
    const required = uncited.filter((c) => !c.startsWith('document:'));
    cited += citations.length; total += citations.length + uncited.length;
    store.saveScheme({ ...s, citations });
    console.log(`${s.id.padEnd(28)} cited ${String(citations.length).padStart(2)}  uncited: ${uncited.join(', ') || '-'}${required.length ? '   <-- required claims missing' : ''}`);
  }
  console.log(`claims cited: ${cited}/${total}`);
}

function promote(demoteOnly = false) {
  for (const s0 of store.listSchemes()) {
    const snaps = snapsFor(s0);
    const s: Scheme = { ...s0, verification: snaps.length > 0 && s0.verification.level === 'unverified' ? { level: 'automated', by: 'ingest-pipeline', on: today, method: 'Claims matched against fetched official source text (keyword/number evidence). Not checked by a person.' } : s0.verification };
    const probe: Scheme = { ...s, lifecycle: 'published', lastVerified: snaps.length > 0 ? today : s.lastVerified };
    const blockers = publicationBlockers(probe, today);
    const wasPublic = s0.lifecycle === 'published' || s0.lifecycle === 'updated';
    if (s0.lifecycle === 'discontinued' || s0.lifecycle === 'archived' || s0.lifecycle === 'suspended') { console.log(`keep      ${s0.id} (${s0.lifecycle})`); continue; }
    if (blockers.length === 0) {
      if (!wasPublic && demoteOnly) console.log(`ready     ${s0.id} (passes the gate; publish with: npm run ingest -- promote)`);
      else if (!wasPublic) {
        const version = s0.dataVersion + 1;
        store.saveScheme({ ...probe, dataVersion: version, updatedOn: today, history: [...s0.history, { version, date: today, lifecycle: 'published', change: 'Passed the automated publication gate (official sources, claim citations, no open discrepancy, current).', by: 'ingest-pipeline' }] });
        store.audit({ type: 'published', schemeId: s0.id, detail: 'passed publication gate', by: 'ingest-pipeline' });
      }
      console.log(`${wasPublic ? 'stay ' : 'PUBLISH'}   ${s0.id}`);
    } else {
      if (wasPublic) {
        const version = s0.dataVersion + 1;
        store.saveScheme({ ...s0, lifecycle: 'pending-verification', dataVersion: version, updatedOn: today, history: [...s0.history, { version, date: today, lifecycle: 'pending-verification', change: `Failed the publication gate: ${blockers.join('; ')}`, by: 'ingest-pipeline' }] });
        store.audit({ type: 'demoted', schemeId: s0.id, detail: blockers.join('; '), by: 'ingest-pipeline' });
      }
      console.log(`hold      ${s0.id}: ${blockers.join('; ')}`);
    }
  }
}

function status() {
  const all = store.listSchemes();
  const by: Record<string, number> = {};
  for (const s of all) by[s.lifecycle] = (by[s.lifecycle] ?? 0) + 1;
  console.log('lifecycle:', by);
  console.log('candidates (discovered, unverified):', store.candidates().length);
  const bad = Object.values(store.health()).filter((h) => h.consecutiveFailures > 0);
  console.log(`source health: ${bad.length} source(s) failing`);
  for (const h of bad) console.log(`  ${h.lastStatus} x${h.consecutiveFailures} ${h.url} ${h.lastError ?? ''}`);
}

const arg = process.argv[3];
switch (cmd) {
  case 'run': await run(); await runDiscover(); break;
  case 'discover': await runDiscover(); break;
  case 'import': if (!arg) throw new Error('usage: ingest import <file.json>'); importSnapshots(arg); break;
  case 'cite': cite(); break;
  case 'promote': promote(process.argv.includes('--demote-only')); break;
  default: status();
}

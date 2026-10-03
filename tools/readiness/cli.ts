/**
 * Launch-readiness report. Reads only facts that exist on disk; anything that needs a human or a live service is reported
 * NOT DONE until a record with "passed": true proves otherwise. Exit code 1 while not launch-ready.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LANGUAGES, isoDay, publicationBlockers, type Scheme } from '@govsathi/shared';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const readJson = (p: string) => JSON.parse(fs.readFileSync(p, 'utf8'));
const today = isoDay(new Date());
const rows: { item: string; done: boolean; detail: string }[] = [];

// Languages
const metas = LANGUAGES.map((l) => ({ code: l.code, ...readJson(path.join(root, 'locales', l.code, 'meta.json')) }));
const pending = metas.filter((m) => m.status !== 'reviewed');
console.log('\nLanguage readiness (internal)');
for (const pr of ['critical', 'high', 'normal']) {
  const codes = pending.filter((m) => (m.reviewPriority ?? 'normal') === pr).map((m) => m.code + (m.limitedResource ? '*' : ''));
  if (codes.length) console.log(`  needs native review [${pr}]: ${codes.join(' ')}`);
}
console.log(`  reviewed: ${metas.filter((m) => m.status === 'reviewed').map((m) => m.code).join(' ') || '-'}   (* = limited linguistic resources)`);
rows.push({ item: 'Multilingual translation review', done: pending.length === 0, detail: `${pending.length} of ${metas.length} locales unreviewed` });
rows.push({ item: 'Rajasthani resource/licence review', done: metas.find((m) => m.code === 'raj')?.status === 'reviewed', detail: 'no verified Rajasthani resource; draft only' });

// Scheme catalogue
const schemes: Scheme[] = [];
const walk = (d: string) => {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    if (f.isDirectory()) walk(path.join(d, f.name));
    else if (f.name.endsWith('.json')) schemes.push(readJson(path.join(d, f.name)));
  }
};
walk(path.join(root, 'data', 'schemes'));
const publishable = schemes.filter((s) => publicationBlockers(s, today).length === 0);
const held = schemes.filter((s) => s.hold);
const human = schemes.filter((s) => s.verification.level === 'human');
const openDisc = schemes.flatMap((s) => (s.discrepancies ?? []).filter((d) => d.status === 'open').map(() => s.id));
const claims = schemes.flatMap((s) => [...s.benefits.map((_, i) => `benefit:${i}`), ...s.rules.map((r) => `rule:${r.id}`)].map((c) => s.citations.some((x) => x.claim === c)));
console.log(`\nCatalogue: ${schemes.length} records | ${publishable.length} pass the publication gate today (${today}) | ${schemes.length - publishable.length} do not (${held.length} on hold) | ${human.length} human-verified`);
console.log(`Claim citations (benefits+rules): ${claims.filter(Boolean).length}/${claims.length}`);
rows.push({ item: 'Human review of automatically verified schemes', done: publishable.length > 0 && human.length >= publishable.length, detail: `${human.length} of ${publishable.length} publishable schemes checked by a person (the rest: automated evidence only)` });
rows.push({ item: 'Source verification', done: false, detail: `${openDisc.length} open discrepancies; every URL still needs a human check; ${schemes.length - publishable.length} records withheld` });
const stale = schemes.filter((s) => s.lifecycle === 'published' && publicationBlockers(s, today).length > 0);
rows.push({ item: 'Scheme data currentness', done: stale.length === 0, detail: stale.length ? `${stale.length} published records now fail the gate: ${stale.map((s) => s.id).join(', ')}` : 'all published records pass today' });

// AI providers
const aiRows = ['gemini', 'openai', 'anthropic', 'xai'].map((p) => {
  const f = path.join(root, 'docs', 'verification', `ai-live-${p}.json`);
  if (!fs.existsSync(f)) return { p, state: 'not verified live' };
  const r = readJson(f);
  return { p, state: `${r.passed ? 'PASSED' : 'FAILED'} ${r.date} (${r.model})` };
});
console.log('\nAI providers (bring-your-own-key; no shared key exists)');
for (const a of aiRows) console.log(`  ${a.p.padEnd(10)} ${a.state}`);
rows.push({ item: 'AI provider live verification', done: aiRows.some((a) => a.state.startsWith('PASSED')), detail: 'run: GOVSATHI_VERIFY_KEY=... npm run verify:ai -- <provider> (at least one provider must pass; the others stay labelled unverified)' });

// Review items
const details: Record<string, string> = {
  'security-review': 'independent review not performed', 'privacy-review': 'legal/DPDP review not performed', 'accessibility-testing': 'no screen-reader testing yet',
  'responsive-testing': 'no real-device matrix', 'ai-hallucination-testing': 'live adversarial run needs a user-supplied key', 'fallback-testing': 'live quota/outage untested',
  'localization-completeness-testing': 'semantic quality unreviewed',
};
for (const [key, fallback] of Object.entries(details)) {
  const rec = path.join(root, 'docs', 'verification', `${key}.json`);
  const r = fs.existsSync(rec) ? readJson(rec) : null;
  const detail = r ? `${r.passed ? 'passed' : `partial: ${(r.done ?? []).length} done, ${(r.notDone ?? []).length} open`} (${r.date})` : fallback;
  rows.push({ item: key.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase()), done: r?.passed === true, detail });
}

console.log('\nPre-launch checklist');
for (const r of rows) console.log(`  [${r.done ? 'x' : ' '}] ${r.item} - ${r.detail}`);
const ready = rows.every((r) => r.done);
console.log(`\n${ready ? 'READY' : 'NOT READY'} for public launch.\n`);
process.exit(ready ? 0 : 1);

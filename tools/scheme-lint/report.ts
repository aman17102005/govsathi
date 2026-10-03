/** Data-governance report: discrepancies, staleness and claim attribution. Informational; exit 1 if open discrepancies exist. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Scheme } from '@govsathi/shared';
import { listSchemeFiles } from './lint';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const schemes = listSchemeFiles(path.join(root, 'data/schemes')).map((f) => JSON.parse(fs.readFileSync(f, 'utf8')) as Scheme);
const today = new Date().toISOString().slice(0, 10);
const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

console.log(`\n${schemes.length} schemes\n`);
console.log('Discrepancies');
let open = 0;
for (const s of schemes) for (const d of s.discrepancies ?? []) {
  if (d.status === 'open') open++;
  console.log(`  [${d.status}] ${s.id} ${d.field}: ${d.values.map((v) => `${v.value} (${s.sources[v.src]!.publisher})`).join(' vs ')} -> using ${s.sources[d.used]!.publisher}`);
}
const claims = schemes.flatMap((s) => [...s.benefits, ...s.rules]);
console.log(`\nClaim attribution: ${claims.filter((c) => c.src !== undefined).length}/${claims.length} claims point to a specific source`);
const stale = schemes.filter((s) => days(s.lastVerified, today) > 90);
console.log(`Stale (>90 days since verification): ${stale.length ? stale.map((s) => s.id).join(', ') : 'none'}`);
console.log(`Oldest verification: ${schemes.map((s) => s.lastVerified).sort()[0]}\n`);
process.exit(open > 0 ? 1 : 0);

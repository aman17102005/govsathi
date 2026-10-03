import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { lintAll } from './lint';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const reference: Record<string, string> = {};
for (const f of fs.readdirSync(path.join(root, 'locales/en'))) {
  if (f.endsWith('.json') && f !== 'meta.json') Object.assign(reference, JSON.parse(fs.readFileSync(path.join(root, 'locales/en', f), 'utf8')));
}
const { issues, count } = lintAll(path.join(root, 'data/schemes'), reference);
if (issues.length > 0) {
  console.error(`scheme lint FAILED: ${issues.length} issue(s) in ${count} file(s)\n`);
  for (const i of issues) console.error(`  ${i.file}: ${i.message}`);
  process.exit(1);
}
console.log(`scheme lint passed: ${count} schemes, all with sources and valid vocabulary.`);

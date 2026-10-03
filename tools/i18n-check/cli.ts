import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LANGUAGES } from '@govsathi/shared';
import { checkLocales, readStatuses } from './check';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const localesDir = path.join(root, 'locales');

// `--lang hi,ta` checks a subset (useful while locales are being added); the build always checks everything.
const only = process.argv.find((a) => a.startsWith('--lang='))?.slice(7).split(',');
const languages = only ? LANGUAGES.filter((l) => l.code === 'en' || only.includes(l.code)) : LANGUAGES;
const issues = checkLocales({ localesDir, languages }).filter((i) => !(only && i.kind === 'unknown-locale-dir'));
const statuses = readStatuses(localesDir, languages);

const counts = new Map<string, string[]>();
for (const [code, s] of Object.entries(statuses)) counts.set(s, [...(counts.get(s) ?? []), code]);
console.log('Locale quality status (internal metadata):');
for (const [s, codes] of counts) console.log(`  ${s.padEnd(20)} ${codes.length}  ${codes.join(' ')}`);

if (issues.length > 0) {
  console.error(`\ni18n check FAILED: ${issues.length} issue(s)\n`);
  for (const i of issues) console.error(`  [${i.locale}] ${i.kind}${i.key ? ` (${i.key})` : ''}: ${i.message}`);
  process.exit(1);
}
console.log(`\ni18n check passed: ${languages.length} locales complete.`);

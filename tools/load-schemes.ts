import fs from 'node:fs';
import path from 'node:path';
import type { Scheme } from '@govsathi/shared';

/** Shared by tests and tools: read every scheme JSON under data/schemes. */
export function loadSchemesFromDisk(root: string): Scheme[] {
  const out: Scheme[] = [];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.json')) out.push(JSON.parse(fs.readFileSync(p, 'utf8')) as Scheme);
    }
  };
  walk(path.join(root, 'data/schemes'));
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

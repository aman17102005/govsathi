import fs from 'node:fs';
import path from 'node:path';
import type { Scheme } from '@govsathi/shared';

export interface Snapshot {
  schemeId: string;
  src: number;
  url: string;
  finalUrl: string;
  /** `http`: fetched by the pipeline. `assisted-import`: page needs a rendering browser; text was imported with provenance. */
  method: 'http' | 'assisted-import';
  retrievedAt: string;
  title?: string;
  etag?: string;
  lastModified?: string;
  textHash: string;
  claimHash: string;
  claimCount: number;
  /** Fingerprint algorithm version; absent = 1. */
  fpVersion?: number;
  text: string;
}

export interface AuditEvent {
  at: string;
  type: string;
  schemeId?: string;
  url?: string;
  detail: string;
  by: string;
}

export interface SourceHealth {
  url: string;
  lastAttempt: string;
  lastOk?: string;
  lastStatus: 'ok' | 'error' | 'blocked' | 'robots';
  lastError?: string;
  consecutiveFailures: number;
}

export interface Candidate {
  url: string;
  title?: string;
  discoveredOn: string;
  discoveredVia: string;
  status: 'discovered';
  note: string;
}

/** File-backed state under data/ingest. Everything the pipeline decides is written here so it can be audited. */
export class IngestStore {
  constructor(readonly root: string) {}
  private p(...x: string[]) {
    return path.join(this.root, 'data/ingest', ...x);
  }
  private readJson<T>(file: string, fallback: T): T {
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
    } catch {
      return fallback;
    }
  }
  private writeJson(file: string, value: unknown) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
  }

  snapshotPath(schemeId: string, src: number) {
    return this.p('snapshots', `${schemeId}.${src}.json`);
  }
  getSnapshot(schemeId: string, src: number): Snapshot | undefined {
    return this.readJson<Snapshot | undefined>(this.snapshotPath(schemeId, src), undefined);
  }
  saveSnapshot(s: Snapshot) {
    this.writeJson(this.snapshotPath(s.schemeId, s.src), s);
  }

  audit(e: Omit<AuditEvent, 'at'> & { at?: string }) {
    fs.mkdirSync(this.p(), { recursive: true });
    fs.appendFileSync(this.p('audit.jsonl'), JSON.stringify({ at: new Date().toISOString(), ...e }) + '\n');
  }

  health(): Record<string, SourceHealth> {
    return this.readJson(this.p('source-health.json'), {});
  }
  recordHealth(url: string, ok: boolean | 'blocked' | 'robots', at: string, error?: string) {
    const all = this.health();
    const prev = all[url];
    const status: SourceHealth['lastStatus'] = ok === true ? 'ok' : ok === false ? 'error' : ok;
    all[url] = {
      url,
      lastAttempt: at,
      lastOk: ok === true ? at : prev?.lastOk,
      lastStatus: status,
      lastError: ok === true ? undefined : error,
      consecutiveFailures: ok === true ? 0 : (prev?.consecutiveFailures ?? 0) + 1,
    };
    this.writeJson(this.p('source-health.json'), all);
  }

  candidates(): Candidate[] {
    return this.readJson(this.p('candidates.json'), []);
  }
  saveCandidates(c: Candidate[]) {
    this.writeJson(this.p('candidates.json'), c);
  }

  schemeFile(id: string): string | undefined {
    const dir = path.join(this.root, 'data/schemes');
    for (const sub of fs.readdirSync(dir)) {
      const f = path.join(dir, sub, `${id}.json`);
      if (fs.existsSync(f)) return f;
    }
    return undefined;
  }
  listSchemes(): Scheme[] {
    const dir = path.join(this.root, 'data/schemes');
    const out: Scheme[] = [];
    for (const sub of fs.readdirSync(dir)) {
      const d = path.join(dir, sub);
      if (!fs.statSync(d).isDirectory()) continue;
      for (const f of fs.readdirSync(d)) if (f.endsWith('.json')) out.push(JSON.parse(fs.readFileSync(path.join(d, f), 'utf8')) as Scheme);
    }
    return out.sort((a, b) => a.id.localeCompare(b.id));
  }
  saveScheme(s: Scheme) {
    const f = this.schemeFile(s.id);
    if (!f) throw new Error(`unknown scheme ${s.id}`);
    fs.writeFileSync(f, JSON.stringify(s, null, 2) + '\n');
  }
}

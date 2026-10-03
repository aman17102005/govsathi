import crypto from 'node:crypto';

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', ndash: '–', mdash: '—', hellip: '…', copy: '©' };

export function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1]!.toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** HTML -> plain text. Scripts, styles and comments are dropped; the result is DATA, never instructions. */
export function htmlToText(html: string): string {
  const stripped = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|template|svg)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|div|li|tr|h[1-6]|br|section|article|table|ul|ol)\s*>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  return decodeEntities(stripped).replace(/[ \t\f\v ]+/g, ' ').replace(/ ?\n ?/g, '\n').replace(/\n{2,}/g, '\n').trim();
}

export function extractTitle(html: string): string | undefined {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return m ? decodeEntities(m[1]!).replace(/\s+/g, ' ').trim().slice(0, 200) : undefined;
}

/** Absolute http(s) links on the page. */
export function extractLinks(html: string, base: string): { url: string; text: string }[] {
  const out: { url: string; text: string }[] = [];
  const re = /<a\b[^>]*?href\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>([\s\S]*?)<\/a>/gi;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    try {
      const u = new URL(decodeEntities(m[1] ?? m[2] ?? ''), base);
      if (u.protocol !== 'https:' && u.protocol !== 'http:') continue;
      u.hash = '';
      out.push({ url: u.toString(), text: htmlToText(m[3]!).slice(0, 160) });
    } catch {
      /* skip malformed href */
    }
  }
  return out;
}

export function sitemapUrls(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => decodeEntities(m[1]!));
}

export const sha256 = (s: string): string => crypto.createHash('sha256').update(s).digest('hex');

/** Sentences that carry factual claims (amounts, ages, dates, eligibility words). */
const CLAIM_WORDS = /(?:₹|\brs\.?\b|\binr\b|lakh|crore|per month|per year|monthly|annual|\byears?\b|\bage\b|last date|deadline|eligib|benefit|assistance|pension|subsid|scholarship|loan|insurance|premium|document|apply|application|income|cover|stipend)/i;
/** Live counters and dashboards that change every day and say nothing about the scheme's rules. */
const NOISE = /(?:total|sanctioned|disbursed|beneficiaries|registered|applications? (?:received|sanctioned)|visitors?|last updated|hits|counter)/i;

/** Dashboard counters such as ₹ 53,53,47,75,354 (four or more digit groups): live statistics, not scheme rules. */
const COUNTER = /\d{1,3}(?:,\d{2,3}){4,}/;

const abbrevSafe = (t: string): string => t.replace(/\b(Rs|No|Sh|Smt|Dr|Mr|Mrs|St)\.\s*/g, '$1 ');

/** Bump when claimSentences/fingerprint logic changes so stored snapshots are re-baselined instead of reported as source changes. */
export const FINGERPRINT_VERSION = 2;

export function claimSentences(text: string): string[] {
  return abbrevSafe(text)
    .split(/(?<![Rr]s|[Nn]o|[Ss]h|[Ss]mt|[Dd]r|[Mm]r|[Mm]rs|[Ss]t|vs|etc|i\.e|e\.g)(?<=[.!?])\s+|\n/)
    .map((x) => x.replace(/\s+/g, ' ').trim())
    .filter((x) => x.length > 25 && x.length < 600 && x.split(' ').length >= 4 && CLAIM_WORDS.test(x) && !COUNTER.test(x) && !(NOISE.test(x) && /\d{2,},\d{2},\d{2,}|\d{5,}/.test(x)));
}

/** Fingerprint of the claim-bearing content: a change here is "material", a change only in `textHash` is "minor". */
export function fingerprint(text: string): { textHash: string; claimHash: string; claimCount: number; fpVersion: number } {
  const claims = [...new Set(claimSentences(text).map((s) => s.toLowerCase()))].sort();
  return { textHash: sha256(text), claimHash: sha256(claims.join('\n')), claimCount: claims.length, fpVersion: FINGERPRINT_VERSION };
}

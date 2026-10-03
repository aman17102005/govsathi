/**
 * SSRF protection for the official-source fetcher. The fetcher only ever contacts hosts that (a) are on the official
 * allow-list and (b) resolve to public addresses. Both checks run at connect time, so DNS rebinding and redirects cannot
 * smuggle a request to an internal address.
 */
import net from 'node:net';
import { isOfficialHost } from '@govsathi/shared';

export class BlockedTargetError extends Error {
  override name = 'BlockedTargetError';
}

/** True for loopback, private, link-local, CGNAT, multicast, reserved, ULA and IPv4-mapped-private addresses. */
export function isPrivateAddress(ip: string): boolean {
  const kind = net.isIP(ip);
  if (kind === 4) {
    const [a, b] = ip.split('.').map(Number) as [number, number];
    return (
      a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)) || a >= 224
    );
  }
  if (kind === 6) {
    const v = ip.toLowerCase();
    if (v === '::' || v === '::1') return true;
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v);
    if (mapped) return isPrivateAddress(mapped[1]!);
    return /^(fc|fd)/.test(v) || /^fe[89ab]/.test(v) || v.startsWith('ff') || v.startsWith('2001:db8');
  }
  return true; // not an IP: treat as unsafe
}

export interface TargetPolicy {
  /** Extra hosts allowed besides official gov.in / nic.in domains (exact host match). */
  extraHosts?: string[];
}

/** Static checks on the URL itself. Throws BlockedTargetError. */
export function assertAllowedUrl(raw: string, policy: TargetPolicy = {}): URL {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new BlockedTargetError('invalid URL');
  }
  if (u.protocol !== 'https:') throw new BlockedTargetError('only https is allowed');
  if (u.username || u.password) throw new BlockedTargetError('credentials in URL are not allowed');
  if (u.port && u.port !== '443') throw new BlockedTargetError('non-standard port');
  if (net.isIP(u.hostname.replace(/^\[|\]$/g, ''))) throw new BlockedTargetError('IP literals are not allowed');
  if (!isOfficialHost(u.hostname) && !(policy.extraHosts ?? []).includes(u.hostname.toLowerCase())) {
    throw new BlockedTargetError(`host not on the official allow-list: ${u.hostname}`);
  }
  return u;
}

/** Resolver result check; used both by the real connector and by tests with a fake resolver. */
export function assertPublicAddresses(addrs: string[]): void {
  if (addrs.length === 0) throw new BlockedTargetError('host did not resolve');
  for (const a of addrs) if (isPrivateAddress(a)) throw new BlockedTargetError('host resolves to a non-public address');
}

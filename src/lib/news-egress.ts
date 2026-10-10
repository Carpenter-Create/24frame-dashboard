import { lookup as dnsLookup } from "node:dns/promises";

import { NEWS_SOURCES } from "@/lib/news";

// P0-3 / GC-P2-5 — news ingest egress. Feed / OG / thumb URLs may come
// from parsed items. HTTPS + public IP after DNS + redirect cap, then a
// host allowlist from NEWS_SOURCES feed hosts and their apex/www twins
// (canonicalize strips www). Unknown hosts
// never fetch. Literal public IPs are not publisher hosts. Do not invent
// NEWS_S3_*. Mirrored thumbs stay title S3_BUCKET + CLOUDFRONT_DOMAIN
// and skip this fetch. Residual: DNS rebinding between lookup and
// connect is not pinned.

export const NEWS_EGRESS_MAX_REDIRECTS = 3;

export type NewsDnsLookup = (
  hostname: string,
) => Promise<{ address: string; family: number }>;

export function isPublicIpAddress(address: string): boolean {
  const trimmed = address.trim().toLowerCase();
  if (!trimmed) return false;
  if (trimmed.includes(":")) return isPublicIpv6(trimmed);
  return isPublicIpv4(trimmed);
}

function isPublicIpv4(address: string): boolean {
  const parts = address.split(".");
  if (parts.length !== 4) return false;
  const octets = parts.map((part) => Number(part));
  if (octets.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = octets;
  if (a === 0 || a === 10 || a === 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 198 && (b === 18 || b === 19)) return false;
  if (a >= 224) return false;
  return true;
}

function isPublicIpv6(address: string): boolean {
  if (address === "::" || address === "::1") return false;
  if (address.startsWith("fe80:") || address.startsWith("fe8") || address.startsWith("fe9") || address.startsWith("fea") || address.startsWith("feb")) {
    return false;
  }
  if (address.startsWith("fc") || address.startsWith("fd")) return false;
  const mapped = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped?.[1]) return isPublicIpv4(mapped[1]);
  return true;
}

function newsEgressHostVariants(hostname: string): readonly string[] {
  const host = hostname.trim().toLowerCase();
  if (!host) return [];
  if (host.startsWith("www.")) {
    const apex = host.slice(4);
    return apex ? [host, apex] : [host];
  }
  return [host, `www.${host}`];
}

/** Feed hosts from NEWS_SOURCES, plus the apex/www twin used in-tree. */
function newsEgressAllowlist(): ReadonlySet<string> {
  const hosts = new Set<string>();
  for (const source of NEWS_SOURCES) {
    for (const feedUrl of source.feedUrls) {
      let hostname: string;
      try {
        hostname = new URL(feedUrl).hostname;
      } catch {
        continue;
      }
      for (const variant of newsEgressHostVariants(hostname)) hosts.add(variant);
    }
  }
  return hosts;
}

const NEWS_EGRESS_ALLOWLIST = newsEgressAllowlist();

export function isNewsEgressAllowlistedHost(hostname: string): boolean {
  return NEWS_EGRESS_ALLOWLIST.has(hostname.trim().toLowerCase());
}

export async function assertNewsEgressUrl(
  raw: string,
  init: { lookup?: NewsDnsLookup } = {},
): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("invalid news egress URL");
  }
  if (parsed.protocol !== "https:") throw new Error("news egress URL must be https");
  if (parsed.username || parsed.password) throw new Error("news egress URL must not carry credentials");
  const host = parsed.hostname.trim().toLowerCase();
  if (!host) throw new Error("news egress URL missing host");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
    throw new Error("news egress host is not public");
  }
  // Public literals are not allowlisted publisher hosts. Private literals
  // stay "not public" so metadata IPs fail before any fetch.
  if (isPublicIpAddress(host)) throw new Error("news egress host is not allowlisted");
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(":")) {
    throw new Error("news egress host is not public");
  }
  const lookupFn = init.lookup ?? dnsLookup;
  const { address } = await lookupFn(host);
  if (!isPublicIpAddress(address)) throw new Error("news egress resolved to a private address");
  if (!isNewsEgressAllowlistedHost(host)) {
    throw new Error("news egress host is not allowlisted");
  }
  return parsed;
}

export async function newsEgressFetch(
  url: string,
  init: {
    fetchImpl?: typeof fetch;
    lookup?: NewsDnsLookup;
    maxRedirects?: number;
    request: RequestInit;
  },
): Promise<Response> {
  const fetchImpl = init.fetchImpl ?? fetch;
  const maxRedirects = init.maxRedirects ?? NEWS_EGRESS_MAX_REDIRECTS;
  let current = url;
  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    await assertNewsEgressUrl(current, { lookup: init.lookup });
    const res = await fetchImpl(current, { ...init.request, redirect: "manual" });
    if (res.status < 300 || res.status >= 400) return res;
    const location = res.headers.get("location")?.trim();
    if (!location) throw new Error("news egress redirect missing location");
    if (hop === maxRedirects) throw new Error("news egress exceeded redirect cap");
    current = new URL(location, current).href;
  }
  throw new Error("news egress exceeded redirect cap");
}

const STATIC_ALLOWED_HOSTS = new Set<string>([
  "bebituslab.com",
  "www.bebituslab.com",
]);

const STATIC_ALLOWED_PATTERNS: RegExp[] = [
  /^([a-z0-9-]+\.)*vercel\.app$/i,
  /^localhost(:\d+)?$/,
  /^127\.0\.0\.1(:\d+)?$/,
];

function getExtraAllowedHosts(): string[] {
  const raw = process.env.ALLOWED_ORIGIN_HOSTS;
  if (raw === undefined || raw.trim() === "") return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s !== "");
}

function hostMatches(host: string): boolean {
  const normalized = host.toLowerCase();
  if (STATIC_ALLOWED_HOSTS.has(normalized)) return true;
  if (STATIC_ALLOWED_PATTERNS.some((re) => re.test(normalized))) return true;
  return getExtraAllowedHosts().includes(normalized);
}

function hostFromUrl(value: string): string | null {
  try {
    const u = new URL(value);
    return u.host;
  } catch {
    return null;
  }
}

export interface SameOriginResult {
  ok: boolean;
  reason: "allowed" | "no-origin-header" | "host-not-allowed";
  host: string | null;
}

export function verifySameOrigin(req: Request): SameOriginResult {
  const origin = req.headers.get("origin");
  if (origin !== null && origin.trim() !== "") {
    const host = hostFromUrl(origin);
    if (host === null) {
      return { ok: false, reason: "host-not-allowed", host: null };
    }
    if (hostMatches(host)) {
      return { ok: true, reason: "allowed", host };
    }
    return { ok: false, reason: "host-not-allowed", host };
  }

  const referer = req.headers.get("referer");
  if (referer !== null && referer.trim() !== "") {
    const host = hostFromUrl(referer);
    if (host === null) {
      return { ok: false, reason: "host-not-allowed", host: null };
    }
    if (hostMatches(host)) {
      return { ok: true, reason: "allowed", host };
    }
    return { ok: false, reason: "host-not-allowed", host };
  }

  return { ok: false, reason: "no-origin-header", host: null };
}

export function sameOriginForbiddenResponse(): Response {
  return new Response(
    JSON.stringify({ error: "허용되지 않은 출처입니다." }),
    {
      status: 403,
      headers: { "Content-Type": "application/json" },
    },
  );
}

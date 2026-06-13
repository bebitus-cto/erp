import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export interface RateLimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfterSeconds: number;
}

interface LimiterSpec {
  limit: number;
  windowSeconds: number;
}

const SPECS = {
  // 상담·교육: IP+카테고리(product/program) 조합당 12시간 1건
  // → 같은 사람이 다른 카테고리는 신청 가능 (cross-sell), 같은 카테고리 반복은 차단
  consultation: { limit: 1, windowSeconds: 43200 },
  education: { limit: 1, windowSeconds: 43200 },
  diagnosisEmail: { limit: 3, windowSeconds: 600 },
  // 예약: 가용성 조회는 브라우징이라 넉넉히, 생성은 빡빡하게(이메일 기준).
  booking: { limit: 30, windowSeconds: 600 },
  bookingCreate: { limit: 3, windowSeconds: 3600 },
  // 어드민 로그인 brute-force 방어 (IP당 15분 5회).
  adminLogin: { limit: 5, windowSeconds: 900 },
} as const satisfies Record<string, LimiterSpec>;

export type LimiterKey = keyof typeof SPECS;

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const hasUpstash =
  upstashUrl !== undefined &&
  upstashUrl.trim() !== "" &&
  upstashToken !== undefined &&
  upstashToken.trim() !== "";

const redisClient = hasUpstash
  ? new Redis({ url: upstashUrl, token: upstashToken })
  : null;

const upstashLimiters = new Map<LimiterKey, Ratelimit>();
function getUpstashLimiter(key: LimiterKey): Ratelimit | null {
  if (redisClient === null) return null;
  const cached = upstashLimiters.get(key);
  if (cached !== undefined) return cached;
  const spec = SPECS[key];
  const limiter = new Ratelimit({
    redis: redisClient,
    limiter: Ratelimit.slidingWindow(spec.limit, `${spec.windowSeconds} s`),
    prefix: `bebituslab:rl:${key}`,
    analytics: false,
  });
  upstashLimiters.set(key, limiter);
  return limiter;
}

interface MemoryBucket {
  timestamps: number[];
}
const memoryStore = new Map<string, MemoryBucket>();
const useMemoryFallback =
  !hasUpstash && process.env.NODE_ENV !== "production";

function checkMemory(key: LimiterKey, identifier: string): RateLimitResult {
  const spec = SPECS[key];
  const now = Date.now();
  const windowMs = spec.windowSeconds * 1000;
  const cutoff = now - windowMs;
  const bucketKey = `${key}:${identifier}`;
  const bucket = memoryStore.get(bucketKey) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);

  if (bucket.timestamps.length >= spec.limit) {
    const oldest = bucket.timestamps[0];
    const reset = oldest + windowMs;
    memoryStore.set(bucketKey, bucket);
    return {
      ok: false,
      limit: spec.limit,
      remaining: 0,
      reset,
      retryAfterSeconds: Math.max(1, Math.ceil((reset - now) / 1000)),
    };
  }

  bucket.timestamps.push(now);
  memoryStore.set(bucketKey, bucket);
  return {
    ok: true,
    limit: spec.limit,
    remaining: spec.limit - bucket.timestamps.length,
    reset: now + windowMs,
    retryAfterSeconds: 0,
  };
}

export async function checkRateLimit(
  key: LimiterKey,
  identifier: string,
): Promise<RateLimitResult | null> {
  const limiter = getUpstashLimiter(key);
  if (limiter !== null) {
    const r = await limiter.limit(identifier);
    const nowSec = Math.ceil(Date.now() / 1000);
    const resetSec = Math.ceil(r.reset / 1000);
    return {
      ok: r.success,
      limit: r.limit,
      remaining: r.remaining,
      reset: r.reset,
      retryAfterSeconds: Math.max(1, resetSec - nowSec),
    };
  }
  if (useMemoryFallback) {
    return checkMemory(key, identifier);
  }
  return null;
}

/**
 * 환경변수 RATE_LIMIT_WHITELIST_IPS에 콤마 구분으로 등록된 IP는 rate-limit 우회.
 * 운영자 본인 테스트용. 예: "203.0.113.99,198.51.100.42"
 */
export function isIpWhitelisted(ip: string): boolean {
  const raw = process.env.RATE_LIMIT_WHITELIST_IPS;
  if (raw === undefined || raw.trim() === "") return false;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s !== "")
    .includes(ip);
}

export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff !== null && xff.trim() !== "") {
    const first = xff.split(",")[0].trim();
    if (first !== "") return first;
  }
  const real = req.headers.get("x-real-ip");
  if (real !== null && real.trim() !== "") return real.trim();
  const vercelIp = req.headers.get("x-vercel-forwarded-for");
  if (vercelIp !== null && vercelIp.trim() !== "") {
    return vercelIp.split(",")[0].trim();
  }
  return "anonymous";
}

export function rateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
      retryAfter: result.retryAfterSeconds,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(result.retryAfterSeconds),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(Math.ceil(result.reset / 1000)),
      },
    },
  );
}

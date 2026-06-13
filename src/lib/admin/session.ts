/**
 * 어드민 세션 (Node 런타임 전용 — API 라우트·서버 컴포넌트에서 사용).
 * 미들웨어(Edge)는 session-edge.ts 의 Web Crypto 버전을 쓴다. 토큰 포맷은 둘이 공유.
 *
 * 토큰: base64url(JSON{sub,iat,exp}) + "." + base64url(HMAC-SHA256(secret, body))
 * 페이로드는 비밀이 아니며(서명만으로 위조·만료연장 방지) Slack 서명 검증과 동일한 신뢰모델.
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE_NAME = "bbl_admin_session";
export const SESSION_TTL_SECONDS = 8 * 3600;

interface SessionPayload {
  sub: string;
  iat: number;
  exp: number;
}

function getSecret(): string | null {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (s === undefined || s.trim() === "") return null;
  return s;
}

export function sha256Hex(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

export function isAdminConfigured(): boolean {
  if (getSecret() === null) return false;
  const hash = process.env.ADMIN_PASSWORD_HASH;
  const plain = process.env.ADMIN_PASSWORD;
  return (
    (hash !== undefined && hash.trim() !== "") ||
    (plain !== undefined && plain.trim() !== "")
  );
}

/** 입력 비밀번호를 상수시간으로 검증. ADMIN_PASSWORD_HASH(sha256 hex) 우선, 없으면 ADMIN_PASSWORD. */
export function verifyPassword(input: string): boolean {
  const hash = process.env.ADMIN_PASSWORD_HASH;
  const plain = process.env.ADMIN_PASSWORD;
  let expectedHex: string | null = null;
  if (hash !== undefined && hash.trim() !== "") {
    expectedHex = hash.trim().toLowerCase();
  } else if (plain !== undefined && plain.trim() !== "") {
    expectedHex = sha256Hex(plain);
  }
  if (expectedHex === null) return false;
  if (!/^[0-9a-f]{64}$/.test(expectedHex)) return false;
  const a = Buffer.from(sha256Hex(input), "hex");
  const b = Buffer.from(expectedHex, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function createSessionToken(): string | null {
  const secret = getSecret();
  if (secret === null) return null;
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    sub: "admin",
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifySessionToken(token: string): boolean {
  const secret = getSecret();
  if (secret === null) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const body = parts[0];
  const sig = parts[1];
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  if (!timingSafeEqual(a, b)) return false;
  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as Partial<SessionPayload>;
    if (typeof payload.exp !== "number") return false;
    return payload.exp >= Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export interface SessionCookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "strict";
  path: string;
  maxAge: number;
}

export function getSessionCookieOptions(): SessionCookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

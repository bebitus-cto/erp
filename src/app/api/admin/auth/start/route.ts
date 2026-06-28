import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import {
  buildAuthUrl,
  getLoginOAuthClient,
  safeNextPath,
} from "@/lib/admin/oauth";

export const runtime = "nodejs";

const STATE_COOKIE = "bbl_oauth_state";
const STATE_TTL_SECONDS = 300;

/**
 * Google 로그인 시작.
 * top-level 네비게이션(버튼 클릭)이라 Origin 헤더가 없을 수 있어 same-origin 은 강제하지 않는다 —
 * CSRF(login CSRF) 방어는 state 더블서밋(쿠키↔쿼리)이 담당한다.
 */
export async function GET(req: Request) {
  const cfg = getLoginOAuthClient();
  if (cfg === null) {
    return NextResponse.redirect(
      new URL("/login?error=oauth_unconfigured", req.url),
    );
  }

  const url = new URL(req.url);
  const next = safeNextPath(url.searchParams.get("next"), req.url);
  const state = randomBytes(32).toString("base64url");
  const nonce = randomBytes(32).toString("base64url");
  // PKCE(S256) — RFC 7636. challenge = base64url(sha256(verifier)).
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");

  const authUrl = buildAuthUrl(cfg.client, { state, nonce, codeChallenge });

  const cookieValue = Buffer.from(
    JSON.stringify({ state, nonce, codeVerifier, next }),
  ).toString("base64url");

  const res = NextResponse.redirect(authUrl);
  res.cookies.set(STATE_COOKIE, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // 콜백이 google → 우리 도메인으로 cross-site 복귀라 strict 면 쿠키가 안 실림(=항상 403). 반드시 lax.
    sameSite: "lax",
    path: "/",
    maxAge: STATE_TTL_SECONDS,
  });
  return res;
}

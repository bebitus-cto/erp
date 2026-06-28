import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  exchangeAndVerify,
  getLoginOAuthClient,
  safeNextPath,
} from "@/lib/admin/oauth";
import {
  SESSION_COOKIE_NAME,
  createSessionToken,
  getSessionCookieOptions,
} from "@/lib/admin/session";

export const runtime = "nodejs";

const STATE_COOKIE = "bbl_oauth_state";

interface StateData {
  state: string;
  nonce: string;
  codeVerifier: string;
  next: string;
}

function parseState(raw: string | undefined): StateData | null {
  if (raw === undefined || raw === "") return null;
  try {
    const d = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf8"),
    ) as Partial<StateData>;
    if (
      typeof d.state === "string" &&
      typeof d.nonce === "string" &&
      typeof d.codeVerifier === "string" &&
      typeof d.next === "string"
    ) {
      return { state: d.state, nonce: d.nonce, codeVerifier: d.codeVerifier, next: d.next };
    }
    return null;
  } catch {
    return null;
  }
}

/** 실패 시 /login?error=… 로 보내고 state 쿠키를 정리한다. */
function fail(req: Request, code: string): NextResponse {
  const res = NextResponse.redirect(new URL(`/login?error=${code}`, req.url));
  res.cookies.set(STATE_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}

/**
 * Google 로그인 콜백.
 * state(쿠키↔쿼리) 일치 → code 교환·id_token 검증·nonce·화이트리스트 → 통과 시 기존 세션토큰 발급.
 * 검증은 전부 여기 한 곳에만 — 미들웨어·가드·verify 는 무변경(서명+만료만 본다).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const qState = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const oauthError = url.searchParams.get("error");

  if (oauthError !== null) return fail(req, "access_denied");

  const cfg = getLoginOAuthClient();
  if (cfg === null) return fail(req, "oauth_unconfigured");

  const store = await cookies();
  const stateData = parseState(store.get(STATE_COOKIE)?.value);
  if (stateData === null) return fail(req, "state_missing");
  if (qState === null || qState !== stateData.state) {
    return fail(req, "state_mismatch");
  }
  if (code === null || code === "") return fail(req, "no_code");

  let verified;
  try {
    verified = await exchangeAndVerify(
      cfg,
      code,
      stateData.codeVerifier,
      stateData.nonce,
    );
  } catch {
    return fail(req, "exchange_failed");
  }
  if (verified === null) return fail(req, "not_allowed");

  const token = createSessionToken(verified.email);
  if (token === null) return fail(req, "session_failed");

  const next = safeNextPath(stateData.next, req.url);
  const res = NextResponse.redirect(new URL(next, req.url));
  res.cookies.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions());
  res.cookies.set(STATE_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}

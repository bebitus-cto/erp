/**
 * 어드민 Google 로그인 전용 OAuth2 헬퍼.
 *
 * Drive/Calendar 용(google/clients.ts, GOOGLE_OAUTH_*)과 **완전히 분리된** 별도 클라이언트
 * (GOOGLE_LOGIN_*)를 쓴다 — 기존 refresh token 흐름을 한 글자도 건드리지 않기 위해.
 * id_token 검증·이메일 화이트리스트는 콜백 한 곳(callback route)에서만 호출한다.
 */
import { google } from "googleapis";

// googleapis 가 내부 번들한 google-auth-library 의 OAuth2Client 와 최상위 패키지의 타입이
// 별개 선언이라 충돌한다 → google.auth.OAuth2 인스턴스 타입을 그대로 쓴다.
type LoginClient = InstanceType<typeof google.auth.OAuth2>;

// 민감하지 않은 기본 스코프만 — 동의화면 심사·"확인되지 않은 앱" 경고를 피한다.
const LOGIN_SCOPES = ["openid", "email", "profile"];

export interface LoginOAuthConfig {
  client: LoginClient;
  clientId: string;
}

/** GOOGLE_LOGIN_* 가 모두 설정됐을 때만 클라이언트를 만든다. 하나라도 없으면 null. */
export function getLoginOAuthClient(): LoginOAuthConfig | null {
  const clientId = process.env.GOOGLE_LOGIN_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_LOGIN_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_LOGIN_REDIRECT_URI;
  if (
    clientId === undefined ||
    clientId.trim() === "" ||
    clientSecret === undefined ||
    clientSecret.trim() === "" ||
    redirectUri === undefined ||
    redirectUri.trim() === ""
  ) {
    return null;
  }
  const client = new google.auth.OAuth2(
    clientId.trim(),
    clientSecret.trim(),
    redirectUri.trim(),
  );
  return { client, clientId: clientId.trim() };
}

export interface AuthUrlParams {
  state: string;
  nonce: string;
  codeChallenge: string;
}

/**
 * 인가(consent) URL 생성.
 * access_type=online → refresh token 미발급 = 동의화면 Testing 모드의 7일 만료 이슈를 원천 회피.
 * nonce·PKCE 파라미터는 generateAuthUrl 옵션 타입에 깔끔히 안 맞아 URL 에 직접 덧붙인다.
 */
export function buildAuthUrl(client: LoginClient, p: AuthUrlParams): string {
  const base = client.generateAuthUrl({
    access_type: "online",
    scope: LOGIN_SCOPES,
    state: p.state,
    prompt: "select_account",
  });
  const u = new URL(base);
  u.searchParams.set("nonce", p.nonce);
  u.searchParams.set("code_challenge", p.codeChallenge);
  u.searchParams.set("code_challenge_method", "S256");
  return u.toString();
}

export interface VerifiedLogin {
  email: string;
}

/**
 * code → token 교환 후 id_token 을 검증한다.
 * verifyIdToken 이 서명·발급자(iss)·대상(aud)·만료(exp)를 대행 검증하고,
 * 여기서 nonce 일치·email_verified·화이트리스트를 추가로 확인한다.
 * 통과하면 이메일을, 하나라도 실패하면 null 을 반환(콜백이 거부로 처리).
 */
export async function exchangeAndVerify(
  cfg: LoginOAuthConfig,
  code: string,
  codeVerifier: string,
  expectedNonce: string,
): Promise<VerifiedLogin | null> {
  const { tokens } = await cfg.client.getToken({ code, codeVerifier });
  const idToken = tokens.id_token;
  if (idToken === undefined || idToken === null || idToken === "") return null;

  const ticket = await cfg.client.verifyIdToken({
    idToken,
    audience: cfg.clientId,
  });
  const payload = ticket.getPayload();
  if (payload === undefined) return null;
  if (payload.nonce !== expectedNonce) return null;
  if (payload.email_verified !== true) return null;

  const email = payload.email;
  if (email === undefined || email === "") return null;
  if (!isEmailAllowed(email)) return null;

  return { email };
}

/** ADMIN_ALLOWED_EMAILS(콤마 구분) 에 포함된 이메일만 허용. 대소문자·공백 무시. */
export function isEmailAllowed(email: string): boolean {
  const raw = process.env.ADMIN_ALLOWED_EMAILS;
  if (raw === undefined || raw.trim() === "") return false;
  const allowed = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s !== "");
  return allowed.includes(email.trim().toLowerCase());
}

/**
 * 오픈리다이렉트 방어 — base 와 같은 origin 인 내부 경로만 반환, 아니면 "/".
 * 단순 문자열 검사(startsWith)는 백슬래시(/\evil.com)가 WHATWG URL 에서 //evil.com 으로
 * 정규화돼 우회되므로, URL 파싱 후 origin 일치로 판정한다.
 */
export function safeNextPath(
  raw: string | null | undefined,
  base: string,
): string {
  if (raw === undefined || raw === null || raw === "") return "/";
  try {
    const u = new URL(raw, base);
    if (u.origin === new URL(base).origin) {
      return u.pathname + u.search + u.hash;
    }
  } catch {
    // 파싱 실패 → 기본값
  }
  return "/";
}

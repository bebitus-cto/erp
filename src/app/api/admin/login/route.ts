import { NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  createSessionToken,
  getSessionCookieOptions,
  isAdminConfigured,
  verifyPassword,
} from "@/lib/admin/session";
import {
  checkRateLimit,
  getClientIp,
  isIpWhitelisted,
  rateLimitResponse,
} from "@/lib/security/rate-limit";
import {
  sameOriginForbiddenResponse,
  verifySameOrigin,
} from "@/lib/security/same-origin";

export const runtime = "nodejs";

interface LoginBody {
  password?: unknown;
}

export async function POST(req: Request) {
  // 비밀번호 로그인 백도어 토글 — Google 로그인 전환 후 ADMIN_PASSWORD_LOGIN_ENABLED=false 로
  // 끄면 비번 진입을 차단한다. 미설정/그 외 값은 허용(락아웃 방지 우선 — 명시적 "false" 일 때만 차단).
  if (process.env.ADMIN_PASSWORD_LOGIN_ENABLED?.toLowerCase() === "false") {
    return NextResponse.json(
      { error: "비밀번호 로그인이 비활성화되어 있습니다. Google 로그인을 사용해 주세요." },
      { status: 403 },
    );
  }

  const originCheck = verifySameOrigin(req);
  if (!originCheck.ok) {
    return sameOriginForbiddenResponse();
  }

  // 비교 전에 rate-limit (brute-force 방어).
  const ip = getClientIp(req);
  if (!isIpWhitelisted(ip)) {
    const rl = await checkRateLimit("adminLogin", ip);
    if (rl !== null && !rl.ok) {
      return rateLimitResponse(rl);
    }
  }

  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "관리자 인증이 설정되지 않았습니다." },
      { status: 500 },
    );
  }

  let body: LoginBody;
  try {
    body = (await req.json()) as LoginBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (password === "" || !verifyPassword(password)) {
    return NextResponse.json(
      { error: "비밀번호가 올바르지 않습니다." },
      { status: 401 },
    );
  }

  const token = createSessionToken();
  if (token === null) {
    return NextResponse.json({ error: "세션 생성 실패" }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions());
  return res;
}

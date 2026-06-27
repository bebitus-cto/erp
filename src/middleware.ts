import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SESSION_COOKIE_NAME,
  verifySessionTokenEdge,
} from "@/lib/admin/session-edge";

// erp 전체가 관리자 화면 → 전 경로 보호. /login·/api·정적 자원은 제외.
export const config = {
  matcher: [
    "/",
    "/((?!login|api|_next/static|_next/image|favicon.ico).*)",
  ],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (
    token !== undefined &&
    token !== "" &&
    (await verifySessionTokenEdge(token))
  ) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", req.url);
  // 루트(/)면 next 생략 — 로그인 후 기본이 / 라 URL 깔끔하게.
  if (pathname !== "/") loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

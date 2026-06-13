import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SESSION_COOKIE_NAME,
  verifySessionTokenEdge,
} from "@/lib/admin/session-edge";

// /admin/* 를 보호. /admin/login 은 통과(리다이렉트 루프 방지).
export const config = {
  matcher: ["/bridge-2030/:path*"],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/bridge-2030/login") {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (
    token !== undefined &&
    token !== "" &&
    (await verifySessionTokenEdge(token))
  ) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/bridge-2030/login", req.url);
  // 상대 경로(/admin*)만 next 로 전달 — open-redirect 방지.
  if (pathname.startsWith("/bridge-2030")) {
    loginUrl.searchParams.set("next", pathname);
  }
  return NextResponse.redirect(loginUrl);
}

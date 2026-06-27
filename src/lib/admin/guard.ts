import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME, verifySessionToken } from "./session";

/**
 * 서버 컴포넌트용 이중 방어 — 미들웨어가 이미 /admin/* 를 막지만,
 * 페이지에서도 쿠키를 재검증해 미들웨어 우회/오설정 시 fail-closed.
 */
export async function requireAdminOrRedirect(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (token === undefined || token === "" || !verifySessionToken(token)) {
    redirect("/login");
  }
}

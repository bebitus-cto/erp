import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * 서버 전용 Supabase 클라이언트 (service_role).
 * service_role 은 RLS 를 우회하므로 **절대 클라이언트 번들로 노출 금지** ("server-only" 가드).
 * 모든 상담/예약 접근은 서버(API 라우트·서버 컴포넌트)에서만.
 *
 * 환경 스위치: SUPABASE_ENV=prod|test (기본 prod)
 *   prod → SUPABASE_URL_PROD, SUPABASE_SERVICE_ROLE_KEY_PROD
 *   test → SUPABASE_URL_TEST, SUPABASE_SERVICE_ROLE_KEY_TEST
 * 미설정/빈값이면 null → 호출부에서 503/graceful 처리.
 */
let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (cached !== null) return cached;
  const env = (process.env.SUPABASE_ENV ?? "prod").trim().toLowerCase();
  const suffix = env === "test" ? "TEST" : "PROD";
  const url = process.env[`SUPABASE_URL_${suffix}`];
  const key = process.env[`SUPABASE_SERVICE_ROLE_KEY_${suffix}`];
  if (
    url === undefined ||
    url.trim() === "" ||
    key === undefined ||
    key.trim() === ""
  ) {
    return null;
  }
  cached = createClient(url.trim(), key.trim(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

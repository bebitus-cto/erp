import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * 서버 전용 Supabase 클라이언트 (service_role).
 * service_role 은 RLS 를 우회하므로 **절대 클라이언트 번들로 노출 금지** ("server-only" 가드).
 * 모든 상담/예약 접근은 서버(API 라우트·서버 컴포넌트)에서만.
 *
 * 필요 env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * 미설정 시 null → 호출부에서 503/graceful 처리.
 */
let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (cached !== null) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
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

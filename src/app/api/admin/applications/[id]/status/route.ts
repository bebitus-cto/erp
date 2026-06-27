import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from "@/lib/admin/session";
import {
  sameOriginForbiddenResponse,
  verifySameOrigin,
} from "@/lib/security/same-origin";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

// 부트캠프 신청 상태 변경 (입금확인 paid / 취소 cancelled / 복원 pending).
// 삭제(DELETE)는 제공하지 않는다 — soft 상태 변경만.
const ALLOWED = ["pending", "paid", "cancelled"];

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const originCheck = verifySameOrigin(req);
  if (!originCheck.ok) {
    return sameOriginForbiddenResponse();
  }
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (token === undefined || token === "" || !verifySessionToken(token)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { status?: string };
  const status = body.status ?? "";
  if (!ALLOWED.includes(status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }
  const sb = getSupabaseAdmin();
  if (sb === null) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 },
    );
  }
  const { error } = await sb
    .from("applications")
    .update({ status })
    .eq("id", id);
  if (error !== null) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

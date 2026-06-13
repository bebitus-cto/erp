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
import { rejectBooking } from "@/lib/booking/approve";

export const runtime = "nodejs";

interface Body {
  reason?: unknown;
}

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
  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    body = {};
  }
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  const { id } = await params;
  const result = await rejectBooking(id, reason);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "처리 실패" },
      { status: result.status },
    );
  }
  return NextResponse.json({ ok: true });
}

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
import { approveBooking } from "@/lib/booking/approve";

export const runtime = "nodejs";

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
  const result = await approveBooking(id);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "처리 실패" },
      { status: result.status },
    );
  }
  return NextResponse.json({ ok: true, meetLink: result.meetLink ?? "" });
}

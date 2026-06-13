import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * 예약 승인/거절 원클릭 서명 토큰 (어드민 로그인 없이 알림 링크로 처리).
 * ADMIN_SESSION_SECRET 재사용. 7일 만료.
 * 포맷: base64url(JSON{bid,action,exp}) + "." + base64url(HMAC-SHA256).
 */
const TTL_SECONDS = 7 * 24 * 3600;

type Action = "approve" | "reject";

interface ApprovalPayload {
  bid: string;
  action: Action;
  exp: number;
}

function getSecret(): string | null {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (s === undefined || s.trim() === "") return null;
  return s;
}

export function createApprovalToken(
  bookingId: string,
  action: Action,
): string | null {
  const secret = getSecret();
  if (secret === null) return null;
  const payload: ApprovalPayload = {
    bid: bookingId,
    action,
    exp: Math.floor(Date.now() / 1000) + TTL_SECONDS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyApprovalToken(
  token: string,
): { bookingId: string; action: Action } | null {
  const secret = getSecret();
  if (secret === null) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const body = parts[0];
  const sig = parts[1];
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as Partial<ApprovalPayload>;
    if (
      typeof p.bid !== "string" ||
      (p.action !== "approve" && p.action !== "reject") ||
      typeof p.exp !== "number"
    ) {
      return null;
    }
    if (p.exp < Math.floor(Date.now() / 1000)) return null;
    return { bookingId: p.bid, action: p.action };
  } catch {
    return null;
  }
}

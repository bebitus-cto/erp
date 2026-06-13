/**
 * 어드민 세션 검증 — Edge 런타임(middleware) 전용. Web Crypto 사용(비동기).
 * Node 의 crypto 는 Edge 번들에서 신뢰할 수 없으므로 분리한다.
 * ⚠️ middleware 는 이 파일만 import 한다(session.ts·sheets.ts·googleapis 금지 → Edge 번들 깨짐).
 * 토큰 포맷은 session.ts 와 동일.
 */
export const SESSION_COOKIE_NAME = "bbl_admin_session";

function base64urlToBytes(s: string): Uint8Array<ArrayBuffer> {
  const padLen = s.length % 4 === 0 ? 0 : 4 - (s.length % 4);
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(padLen);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export async function verifySessionTokenEdge(token: string): Promise<boolean> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (secret === undefined || secret.trim() === "") return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const body = parts[0];
  const sig = parts[1];

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64urlToBytes(sig),
      new TextEncoder().encode(body),
    );
    if (!valid) return false;

    const json = new TextDecoder().decode(base64urlToBytes(body));
    const payload = JSON.parse(json) as { exp?: number };
    if (typeof payload.exp !== "number") return false;
    return payload.exp >= Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

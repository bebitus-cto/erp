/**
 * 사이트 절대 URL 헬퍼.
 * 내부 링크는 상대경로("/booking")로 충분하지만, 이메일·외부 컨텍스트에선
 * 절대 URL 이 필요하다(메일 클라이언트는 상대경로를 열 수 없다).
 */
export function getBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit !== undefined && explicit.trim() !== "") {
    return explicit.trim().replace(/\/$/, "");
  }
  const vercel = process.env.VERCEL_URL;
  if (vercel !== undefined && vercel.trim() !== "") {
    return `https://${vercel.trim()}`;
  }
  return "https://bebituslab.com";
}

export const BOOKING_PATH = "/booking";

export function getBookingUrlAbsolute(): string {
  return `${getBaseUrl()}${BOOKING_PATH}`;
}

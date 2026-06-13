/**
 * 블로그 상세 메타용 날짜·시간.
 * 형식: "Jan 12, 2025 · 10:34" (영문 short + 24h KST 시간)
 */
export function formatBlogDateTime(iso: string): string {
  if (iso === "") return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const datePart = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
  const timePart = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  return `${datePart} · ${timePart}`;
}

/**
 * 블로그 카드용 짧은 editorial 날짜.
 * 형식: "May 26" (영문 short month + day, 시간 X)
 * 같은 해라면 연도 생략, 다른 해면 "May 26, 2025" 같이.
 */
export function formatBlogDate(iso: string): string {
  if (iso === "") return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const now = new Date();
  const sameYear = d.getUTCFullYear() === now.getUTCFullYear();
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  }).format(d);
}

/**
 * ISO 8601 문자열을 운영자 시각용 KST 포맷으로 변환.
 * 형식: "MM-DD HH:mm" (예: "05-24 01:26")
 * 파싱 실패 시 원본 그대로 반환.
 */
export function formatKstShort(iso: string): string {
  if (iso === "") return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;

  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);

  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const month = map.month ?? "";
  const day = map.day ?? "";
  // hour12:false인데 "24:00"이 오는 경우 (자정) → "00"으로 보정
  const hour = map.hour === "24" ? "00" : (map.hour ?? "");
  const minute = map.minute ?? "";
  return `${month}-${day} ${hour}:${minute}`;
}

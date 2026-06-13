/**
 * 예약 타임존 유틸. 서버는 UTC 로 돌 수 있으므로 `new Date(y, m, d, h)`(서버 로컬 tz)
 * 는 절대 쓰지 않는다. KST 는 DST 가 없어 항상 +09:00 고정.
 */
import { BOOKING_TZ } from "./config";

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** "YYYY-MM-DD" + HH:MM (KST 벽시계) → RFC3339(+09:00). */
export function kstRfc3339(dateStr: string, hour: number, minute: number): string {
  return `${dateStr}T${pad2(hour)}:${pad2(minute)}:00+09:00`;
}

/** KST 벽시계(자정 기준 분) → epoch ms (서버 tz 무관). */
export function kstEpochMs(dateStr: string, minutesFromMidnight: number): number {
  const hour = Math.floor(minutesFromMidnight / 60);
  const minute = minutesFromMidnight % 60;
  return Date.parse(kstRfc3339(dateStr, hour, minute));
}

/** 현재 시각을 KST 달력 날짜 "YYYY-MM-DD" 로. (en-CA 로케일이 해당 형식 보장) */
export function todayKst(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BOOKING_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** "YYYY-MM-DD" 의 요일(0=일 ~ 6=토). 달력 날짜 고유 속성이라 tz 무관. */
export function weekdayKst(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00Z`).getUTCDay();
}

/** 달력 날짜 + 일수 → "YYYY-MM-DD". tz 무관 UTC 산술. */
export function addDaysKst(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** 자정 기준 분 → "HH:MM". */
export function slotLabel(minutesFromMidnight: number): string {
  const hour = Math.floor(minutesFromMidnight / 60);
  const minute = minutesFromMidnight % 60;
  return `${pad2(hour)}:${pad2(minute)}`;
}

/** "YYYY-MM" → 그 달 1일 "YYYY-MM-01". */
export function monthFirstDate(month: string): string {
  return `${month}-01`;
}

/** "YYYY-MM" → 그 달 말일 "YYYY-MM-DD". */
export function monthLastDate(month: string): string {
  const parts = month.split("-").map((s) => parseInt(s, 10));
  const year = parts[0];
  const mon = parts[1]; // 1-based
  // Date.UTC 의 월은 0-based 이므로 mon(=다음 달 인덱스) 의 0일 = 이번 달 말일.
  const d = new Date(Date.UTC(year, mon, 0));
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** "YYYY-MM" 형식 검증. */
export function isValidMonth(month: string): boolean {
  return /^\d{4}-\d{2}$/.test(month);
}

/**
 * RFC3339 시작/종료(+09:00) → Google 캘린더 추가 URL 의 dates 파라미터(UTC compact).
 * 예: 14:00 KST → "20260615T050000Z/20260615T053000Z"
 */
export function googleCalDates(startIso: string, endIso: string): string {
  const fmt = (iso: string): string =>
    new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  return `${fmt(startIso)}/${fmt(endIso)}`;
}

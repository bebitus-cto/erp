/**
 * 예약(booking) 설정. 가용 시간·정책은 여기 한 곳에서 조정한다.
 */

export const BOOKING_TZ = "Asia/Seoul";
export const BOOKING_TZ_LABEL = "대한민국/서울";
export const SLOT_MINUTES = 30;

export interface WorkWindow {
  /** 자정 기준 분 (KST). 예: 14:00 = 840 */
  startMin: number;
  endMin: number;
}

/**
 * 요일(0=일 ~ 6=토) → 가용 시간 창. null = 휴무.
 * 기본: 평일 14:00–18:00 KST. **가용 시간을 바꾸려면 여기만 고친다.**
 */
export const WORKING_HOURS: Record<number, WorkWindow | null> = {
  0: null,
  1: { startMin: 14 * 60, endMin: 18 * 60 },
  2: { startMin: 14 * 60, endMin: 18 * 60 },
  3: { startMin: 14 * 60, endMin: 18 * 60 },
  4: { startMin: 14 * 60, endMin: 18 * 60 },
  5: { startMin: 14 * 60, endMin: 18 * 60 },
  6: null,
};

/** 지금부터 최소 N분 뒤 슬롯만 노출(임박 예약 방지). */
export const MIN_NOTICE_MINUTES = 120;
/** 오늘부터 최대 N일 뒤까지만 예약 가능. */
export const MAX_DAYS_OUT = 30;

export const MEETING_TITLE = "베비투스랩 문의 및 상담 (30분)";

/** 수동 휴무일(KST, "YYYY-MM-DD"). 공휴일 등은 여기에 추가. */
export const BLOCKED_DATES: ReadonlySet<string> = new Set<string>([]);

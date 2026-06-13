import { randomUUID } from "node:crypto";
import { getBookingCalendarId, getCalendarClient } from "@/lib/google/clients";
import { BOOKING_TZ, MEETING_TITLE } from "./config";
import { googleCalDates } from "./time";
import {
  getBookingById,
  setBookingConfirmed,
  setBookingRejected,
} from "./store";
import { sendBookingRejectEmail, sendBookingUserEmail } from "./notify";

export interface ApprovalResult {
  ok: boolean;
  status: number;
  error?: string;
  meetLink?: string;
}

function whenLabelKst(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: BOOKING_TZ,
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

/** 예약 승인 — 캘린더 이벤트+Meet 생성 → confirmed → 방문자 확정메일. 멱등(confirmed면 그대로). */
export async function approveBooking(id: string): Promise<ApprovalResult> {
  const booking = await getBookingById(id);
  if (booking === null) {
    return { ok: false, status: 404, error: "예약을 찾을 수 없습니다." };
  }
  if (booking.status === "confirmed") {
    return { ok: true, status: 200, meetLink: booking.google_meet_link ?? "" };
  }
  if (booking.status !== "pending") {
    return {
      ok: false,
      status: 409,
      error: `이미 처리된 예약입니다 (${booking.status}).`,
    };
  }

  const cal = getCalendarClient();
  if (cal === null) {
    return { ok: false, status: 503, error: "캘린더 연동이 설정되지 않았습니다." };
  }

  const description = [
    `신청자: ${booking.name}`,
    booking.phone !== null && booking.phone !== "" ? `연락처: ${booking.phone}` : null,
    `이메일: ${booking.email}`,
    booking.company_name !== null ? `회사: ${booking.company_name}` : null,
    booking.topic !== null ? `주제: ${booking.topic}` : null,
    booking.memo !== null ? `메모: ${booking.memo}` : null,
  ]
    .filter((l): l is string => l !== null)
    .join("\n");

  let meetLink = "";
  let eventId = "";
  try {
    const ev = await cal.events.insert({
      calendarId: getBookingCalendarId(),
      conferenceDataVersion: 1,
      sendUpdates: "all",
      requestBody: {
        summary: MEETING_TITLE,
        description,
        start: { dateTime: booking.slot_start_iso, timeZone: BOOKING_TZ },
        end: { dateTime: booking.slot_end_iso, timeZone: BOOKING_TZ },
        attendees: [{ email: booking.email }],
        conferenceData: {
          createRequest: {
            requestId: randomUUID(),
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
        reminders: { useDefault: true },
      },
    });
    eventId = ev.data.id ?? "";
    if (ev.data.hangoutLink !== undefined && ev.data.hangoutLink !== null) {
      meetLink = ev.data.hangoutLink;
    } else {
      const video = (ev.data.conferenceData?.entryPoints ?? []).find(
        (p) => p.entryPointType === "video",
      );
      meetLink = video?.uri ?? "";
    }
  } catch (err) {
    console.error("[booking-approve] events.insert 실패:", err);
    return { ok: false, status: 502, error: "캘린더 이벤트 생성에 실패했습니다." };
  }

  // 이벤트는 생성됨 → DB 업데이트·메일 실패해도 ok(상태 불일치는 로그로 추적, 중복 이벤트 방지).
  try {
    await setBookingConfirmed(id, eventId, meetLink);
  } catch (err) {
    console.error("[booking-approve] confirmed 업데이트 실패(이벤트는 생성됨):", err);
  }

  const whenLabel = whenLabelKst(booking.slot_start_iso);
  const addToGoogleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    MEETING_TITLE,
  )}&dates=${googleCalDates(
    booking.slot_start_iso,
    booking.slot_end_iso,
  )}&details=${encodeURIComponent(
    meetLink !== "" ? `Google Meet: ${meetLink}` : "베비투스랩 미팅",
  )}&location=${encodeURIComponent(meetLink)}`;

  try {
    await sendBookingUserEmail({
      name: booking.name,
      email: booking.email,
      phone: booking.phone ?? "",
      companyName: booking.company_name ?? "",
      topic: booking.topic ?? "",
      memo: booking.memo ?? "",
      whenLabel,
      meetLink,
      addToGoogleUrl,
      attribSummary: "",
    });
  } catch (err) {
    console.error("[booking-approve] 확정메일 실패:", err);
  }

  return { ok: true, status: 200, meetLink };
}

/** 예약 거절 — rejected 처리 + 방문자 거절 안내메일. */
export async function rejectBooking(
  id: string,
  reason: string,
): Promise<ApprovalResult> {
  const booking = await getBookingById(id);
  if (booking === null) {
    return { ok: false, status: 404, error: "예약을 찾을 수 없습니다." };
  }
  if (booking.status === "rejected") {
    return { ok: true, status: 200 };
  }
  if (booking.status !== "pending") {
    return {
      ok: false,
      status: 409,
      error: `이미 처리된 예약입니다 (${booking.status}).`,
    };
  }
  await setBookingRejected(id, reason);
  try {
    await sendBookingRejectEmail({
      name: booking.name,
      email: booking.email,
      whenLabel: whenLabelKst(booking.slot_start_iso),
    });
  } catch (err) {
    console.error("[booking-reject] 거절메일 실패:", err);
  }
  return { ok: true, status: 200 };
}

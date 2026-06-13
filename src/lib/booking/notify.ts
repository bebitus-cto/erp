/**
 * 예약 알림 — Discord / 운영자 메일 / 신청자 메일.
 * 상담(quick) 라우트의 헬퍼 구조를 미러링. 각 함수는 env 미설정 시 no-op.
 * 호출부(create 라우트)는 best-effort 로 감싸 실패해도 200 을 반환한다(이벤트는 이미 생성됨).
 */
import fs from "node:fs";
import path from "node:path";

const BUSINESS_CARD_PATH = path.join(
  process.cwd(),
  "src/assets/business-card.png",
);
let businessCardBase64: string | null = null;
try {
  businessCardBase64 = fs.readFileSync(BUSINESS_CARD_PATH).toString("base64");
} catch {
  businessCardBase64 = null;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br/>");
}

export interface BookingNotifyPayload {
  name: string;
  email: string;
  phone: string;
  companyName: string;
  topic: string;
  memo: string;
  /** 사람이 읽는 KST 일시. 예: "2026년 6월 15일 (월) 14:00" */
  whenLabel: string;
  meetLink: string;
  addToGoogleUrl: string;
  attribSummary: string;
  /** 소유자 알림용 원클릭 승인/거절 링크 (요청 단계에서만 채움). */
  approveUrl?: string;
  rejectUrl?: string;
}

export async function sendBookingDiscord(
  p: BookingNotifyPayload,
): Promise<void> {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (url === undefined || url.trim() === "") return;

  const lines = [
    `📅 **새 예약** — ${p.companyName !== "" ? p.companyName : p.name}`,
    "",
    `🕒 ${p.whenLabel}`,
    `👤 ${p.name} · ${p.email} · ${p.phone}`,
    p.topic !== "" ? `📌 ${p.topic}` : null,
    p.memo !== "" ? `💬 ${p.memo}` : null,
    p.meetLink !== "" ? `🎥 ${p.meetLink}` : null,
    p.attribSummary !== "" ? `🌐 유입: ${p.attribSummary}` : null,
    p.approveUrl !== undefined ? `\n✅ 승인: ${p.approveUrl}` : null,
    p.rejectUrl !== undefined ? `❌ 거절: ${p.rejectUrl}` : null,
  ].filter((l): l is string => l !== null);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: lines.join("\n").slice(0, 1900) }),
  });
  if (!res.ok) {
    throw new Error(`Discord booking webhook failed: ${res.status}`);
  }
}

export async function sendBookingInternalEmail(
  p: BookingNotifyPayload,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey === undefined || apiKey.trim() === "") return;

  const to = process.env.DIAGNOSIS_TO_EMAIL ?? "contact@bebituslab.com";
  const from =
    process.env.DIAGNOSIS_FROM_EMAIL ?? "예약 알림 <onboarding@resend.dev>";

  const rows: ReadonlyArray<readonly [string, string]> = [
    ["미팅 일시", p.whenLabel],
    ["이름", p.name],
    ...(p.companyName !== ""
      ? [["회사/소속", p.companyName] as const]
      : []),
    ["이메일", p.email],
    ["휴대폰", p.phone],
    ...(p.topic !== "" ? [["주제", p.topic] as const] : []),
    ...(p.memo !== "" ? [["메모", p.memo] as const] : []),
    ...(p.meetLink !== "" ? [["Meet", p.meetLink] as const] : []),
  ];
  const summaryHtml = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:10px 14px;border:1px solid #e6e6e6;background:#f7f7f7;font-weight:600;width:140px;vertical-align:top;color:#444">${escapeHtml(k)}</td><td style="padding:10px 14px;border:1px solid #e6e6e6;vertical-align:top;white-space:pre-wrap;word-break:break-word">${escapeHtml(v)}</td></tr>`,
    )
    .join("");

  const attribHtml =
    p.attribSummary !== ""
      ? `<p style="margin:20px 0 0;color:#888;font-size:13px">🌐 유입: ${escapeHtml(p.attribSummary)}</p>`
      : "";

  const actionsHtml =
    p.approveUrl !== undefined && p.rejectUrl !== undefined
      ? `<div style="margin:24px 0 0">
          <a href="${p.approveUrl}" style="display:inline-block;padding:11px 22px;margin-right:8px;background:#0e6027;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px">✅ 승인</a>
          <a href="${p.rejectUrl}" style="display:inline-block;padding:11px 22px;background:#a2191f;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px">❌ 거절</a>
        </div>`
      : "";

  const html = `<div style="font-family:system-ui,-apple-system,sans-serif;color:#111;max-width:680px">
    <h2 style="margin:0 0 8px">📅 새 예약 요청 — ${escapeHtml(p.companyName !== "" ? p.companyName : p.name)}</h2>
    <p style="margin:0 0 20px;color:#666;font-size:14px">${escapeHtml(p.whenLabel)} · ${escapeHtml(p.name)} (${escapeHtml(p.email)} · ${escapeHtml(p.phone)})</p>
    <table style="width:100%;border-collapse:collapse">${summaryHtml}</table>
    ${actionsHtml}
    ${attribHtml}
  </div>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: `[예약 요청] ${p.companyName !== "" ? p.companyName : "(개인)"} / ${p.name} · ${p.whenLabel}`,
      html,
      reply_to: p.email,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Booking internal email failed: ${res.status} ${text}`);
  }
}

export async function sendBookingUserEmail(
  p: BookingNotifyPayload,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey === undefined || apiKey.trim() === "") return;

  const from =
    process.env.DIAGNOSIS_FROM_EMAIL ?? "베비투스랩 <onboarding@resend.dev>";

  const meetButton =
    p.meetLink !== ""
      ? `<a href="${p.meetLink}" style="display:inline-block;padding:12px 24px;background:#111;color:#fff;text-decoration:none;border-radius:24px;font-weight:600;font-size:14px">화상회의 입장 (Google Meet) →</a>`
      : `<p style="margin:0;color:#555;font-size:14px">화상회의 링크는 미팅 전 별도로 안내드리겠습니다.</p>`;

  const addToCal =
    p.addToGoogleUrl !== ""
      ? `<p style="margin:14px 0 0"><a href="${p.addToGoogleUrl}" style="color:#2563EB;text-decoration:underline;font-size:14px">구글 캘린더에 추가하기</a></p>`
      : "";

  const cardBlock =
    businessCardBase64 !== null
      ? `<div style="margin:32px 0 16px;padding-top:24px;border-top:1px solid #eee">
          <p style="margin:0 0 12px;color:#555;font-size:13px;line-height:1.6">담당자 명함을 함께 보내 드립니다. 필요하실 때 언제든 연락 부탁드립니다.</p>
          <img src="data:image/png;base64,${businessCardBase64}" alt="베비투스랩 담당자 명함" style="display:block;max-width:360px;width:100%;height:auto;border-radius:8px"/>
        </div>`
      : "";

  const html = `<div style="font-family:system-ui,-apple-system,sans-serif;color:#111;max-width:560px;line-height:1.7">
    <p style="margin:0 0 12px;font-size:15px">${escapeHtml(p.name)}님, 안녕하세요. 베비투스랩입니다.</p>
    <p style="margin:0 0 16px;font-size:15px"><strong>미팅 예약이 확정</strong>되었습니다.</p>

    <div style="margin:16px 0 24px;padding:20px 22px;background:#f5f5f5;border-radius:12px">
      <p style="margin:0 0 6px;color:#888;font-size:13px">미팅 일시</p>
      <p style="margin:0 0 18px;font-size:18px;font-weight:700">${escapeHtml(p.whenLabel)} (30분)</p>
      ${meetButton}
      ${addToCal}
    </div>

    <p style="margin:0 0 8px;font-size:14px;color:#555">일정 변경이나 취소가 필요하시면 이 메일에 회신해 주세요.</p>

    <p style="margin:28px 0 0;font-size:14px;color:#111">감사합니다.<br/><strong>베비투스랩 드림</strong></p>
    ${cardBlock}
    <p style="margin:24px 0 0;color:#888;font-size:13px">베비투스랩 · contact@bebituslab.com</p>
  </div>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: p.email,
      subject: `[베비투스랩] 미팅 예약이 확정되었습니다 — ${p.whenLabel}`,
      html,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Booking user email failed: ${res.status} ${text}`);
  }
}

export async function sendBookingRejectEmail(p: {
  name: string;
  email: string;
  whenLabel: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey === undefined || apiKey.trim() === "") return;
  const from =
    process.env.DIAGNOSIS_FROM_EMAIL ?? "베비투스랩 <onboarding@resend.dev>";
  const html = `<div style="font-family:system-ui,-apple-system,sans-serif;color:#111;max-width:520px;line-height:1.7">
    <p style="margin:0 0 12px;font-size:15px">${escapeHtml(p.name)}님, 안녕하세요. 베비투스랩입니다.</p>
    <p style="margin:0 0 16px;font-size:15px">요청해 주신 <strong>${escapeHtml(p.whenLabel)}</strong> 미팅은 일정상 확정이 어려웠습니다. 양해 부탁드립니다.</p>
    <p style="margin:0 0 16px;font-size:14px;color:#555">다른 시간으로 다시 예약해 주시거나, 이 메일에 회신 주시면 일정을 함께 조율해 드리겠습니다.</p>
    <p style="margin:24px 0 0;font-size:14px;color:#111">감사합니다.<br/><strong>베비투스랩 드림</strong></p>
  </div>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: p.email,
      subject: "[베비투스랩] 미팅 예약 안내",
      html,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Booking reject email failed: ${res.status} ${text}`);
  }
}

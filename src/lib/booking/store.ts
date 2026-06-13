import { getSupabaseAdmin } from "@/lib/supabase/server";

export interface BookingRecord {
  id: string;
  created_at: string;
  status: string; // pending | confirmed | rejected | cancelled
  name: string;
  email: string;
  phone: string | null;
  company_name: string | null;
  topic: string | null;
  memo: string | null;
  applicant_type: string | null;
  slot_start_iso: string;
  slot_end_iso: string;
  google_event_id: string | null;
  google_meet_link: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  reject_reason: string | null;
  attrib_source: string | null;
  attrib_campaign: string | null;
  attrib_captured_at: string | null;
}

export interface NewBooking {
  name: string;
  email: string;
  phone?: string;
  companyName?: string;
  topic?: string;
  memo?: string;
  applicantType?: string;
  slotStartIso: string;
  slotEndIso: string;
  attribSource?: string;
  attribCampaign?: string;
  attribCapturedAt?: string;
}

function orNull(v: string | undefined): string | null {
  return v !== undefined && v !== "" ? v : null;
}

/** pending 예약 insert → id 반환. 실패 시 throw. */
export async function insertPendingBooking(b: NewBooking): Promise<string> {
  const sb = getSupabaseAdmin();
  if (sb === null) throw new Error("Supabase 가 설정되지 않았습니다.");
  const { data, error } = await sb
    .from("bookings")
    .insert({
      status: "pending",
      name: b.name,
      email: b.email,
      phone: orNull(b.phone),
      company_name: orNull(b.companyName),
      topic: orNull(b.topic),
      memo: orNull(b.memo),
      applicant_type: orNull(b.applicantType),
      slot_start_iso: b.slotStartIso,
      slot_end_iso: b.slotEndIso,
      attrib_source: orNull(b.attribSource),
      attrib_campaign: orNull(b.attribCampaign),
      attrib_captured_at: orNull(b.attribCapturedAt),
    })
    .select("id")
    .single();
  if (error !== null) throw new Error(`booking insert 실패: ${error.message}`);
  return (data as { id: string }).id;
}

/** pending|confirmed 슬롯 시작 ISO 집합 — 가용성에서 차감(슬롯 점유). */
export async function getHoldingSlotStarts(): Promise<Set<string>> {
  const result = new Set<string>();
  const sb = getSupabaseAdmin();
  if (sb === null) return result;
  const { data, error } = await sb
    .from("bookings")
    .select("slot_start_iso")
    .in("status", ["pending", "confirmed"]);
  if (error !== null) {
    console.warn("[booking] holding 조회 실패:", error.message);
    return result;
  }
  for (const r of (data ?? []) as Array<{ slot_start_iso: string }>) {
    if (r.slot_start_iso !== "") result.add(r.slot_start_iso);
  }
  return result;
}

/** 같은 이메일 또는 전화의 활성(pending|confirmed) 미래 예약 존재 여부 — 중복 차단. */
export async function hasActiveBooking(
  email: string,
  phone: string,
): Promise<boolean> {
  const sb = getSupabaseAdmin();
  if (sb === null) return false;
  const { data, error } = await sb
    .from("bookings")
    .select("email, phone, slot_start_iso")
    .in("status", ["pending", "confirmed"]);
  if (error !== null) {
    console.warn("[booking] 중복 조회 실패:", error.message);
    return false;
  }
  const now = Date.now();
  return (data ?? []).some((r) => {
    const row = r as { email: string; phone: string | null; slot_start_iso: string };
    const contactMatch =
      row.email === email || (phone !== "" && row.phone === phone);
    return contactMatch && Date.parse(row.slot_start_iso) >= now;
  });
}

export async function getBookingById(id: string): Promise<BookingRecord | null> {
  const sb = getSupabaseAdmin();
  if (sb === null) return null;
  const { data, error } = await sb
    .from("bookings")
    .select("*")
    .eq("id", id)
    .single();
  if (error !== null) return null;
  return data as BookingRecord;
}

export async function setBookingConfirmed(
  id: string,
  eventId: string,
  meetLink: string,
): Promise<void> {
  const sb = getSupabaseAdmin();
  if (sb === null) throw new Error("Supabase 가 설정되지 않았습니다.");
  const { error } = await sb
    .from("bookings")
    .update({
      status: "confirmed",
      google_event_id: eventId !== "" ? eventId : null,
      google_meet_link: meetLink !== "" ? meetLink : null,
      approved_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error !== null) throw new Error(`booking confirm 실패: ${error.message}`);
}

export async function setBookingRejected(
  id: string,
  reason: string,
): Promise<void> {
  const sb = getSupabaseAdmin();
  if (sb === null) throw new Error("Supabase 가 설정되지 않았습니다.");
  const { error } = await sb
    .from("bookings")
    .update({
      status: "rejected",
      rejected_at: new Date().toISOString(),
      reject_reason: reason !== "" ? reason : null,
    })
    .eq("id", id);
  if (error !== null) throw new Error(`booking reject 실패: ${error.message}`);
}

/** 어드민 목록 — 최신순. */
export async function listBookings(): Promise<BookingRecord[]> {
  const sb = getSupabaseAdmin();
  if (sb === null) return [];
  const { data, error } = await sb
    .from("bookings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error !== null) {
    console.warn("[booking] list 실패:", error.message);
    return [];
  }
  return (data ?? []) as BookingRecord[];
}

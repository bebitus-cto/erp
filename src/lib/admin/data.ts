import { getSupabaseAdmin } from "@/lib/supabase/server";
import { formatKstShort } from "@/lib/format-date";
import { listBookings } from "@/lib/booking/store";

export interface AdminBookingRow {
  id: string;
  status: string;
  createdAt: string;
  scheduledLabel: string;
  slotStartIso: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  topic: string;
  meetLink: string;
}

export async function getAdminBookings(): Promise<AdminBookingRow[]> {
  const rows = await listBookings();
  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    createdAt: formatKstShort(r.created_at),
    scheduledLabel: formatKstShort(r.slot_start_iso),
    slotStartIso: r.slot_start_iso,
    name: r.name,
    email: r.email,
    phone: r.phone ?? "",
    company: r.company_name ?? "",
    topic: r.topic ?? "",
    meetLink: r.google_meet_link ?? "",
  }));
}

export interface AdminConsultationRow {
  id: string;
  createdAt: string;
  category: string;
  status: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  inquiry: string;
  fileUrls: string[];
}

export async function getAdminConsultations(): Promise<AdminConsultationRow[]> {
  const sb = getSupabaseAdmin();
  if (sb === null) return [];
  const { data, error } = await sb
    .from("consultations")
    .select(
      "id, created_at, category, status, name, email, phone, company_name, inquiry, file_url_1, file_url_2, file_url_3",
    )
    .order("created_at", { ascending: false })
    .limit(500);
  if (error !== null) {
    console.warn("[admin] consultations 조회 실패:", error.message);
    return [];
  }
  const s = (v: unknown): string =>
    v === null || v === undefined ? "" : String(v);
  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: s(row.id),
      createdAt: formatKstShort(s(row.created_at)),
      category: s(row.category),
      status: s(row.status),
      name: s(row.name),
      email: s(row.email),
      phone: s(row.phone),
      company: s(row.company_name),
      inquiry: s(row.inquiry),
      fileUrls: [row.file_url_1, row.file_url_2, row.file_url_3]
        .map(s)
        .filter((u) => u !== ""),
    };
  });
}

export interface AdminApplicationRow {
  id: string;
  createdAt: string;
  bootcamp: string;
  name: string;
  email: string;
  phone: string;
  amount: number;
  status: string;
  projectIdea: string;
  answers: Record<string, unknown> | null;
}

export async function getAdminApplications(): Promise<AdminApplicationRow[]> {
  const sb = getSupabaseAdmin();
  if (sb === null) return [];
  const { data, error } = await sb
    .from("applications")
    .select(
      "id, created_at, bootcamp, name, email, phone, amount, status, answers",
    )
    .order("created_at", { ascending: false })
    .limit(500);
  if (error !== null) {
    console.warn("[admin] applications 조회 실패:", error.message);
    return [];
  }
  const s = (v: unknown): string =>
    v === null || v === undefined ? "" : String(v);
  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    const answers = (row.answers ?? null) as Record<string, unknown> | null;
    return {
      id: s(row.id),
      createdAt: formatKstShort(s(row.created_at)),
      bootcamp: s(row.bootcamp),
      name: s(row.name),
      email: s(row.email),
      phone: s(row.phone),
      amount: typeof row.amount === "number" ? row.amount : Number(row.amount ?? 0),
      status: s(row.status),
      projectIdea: answers !== null ? s(answers.project_idea) : "",
      answers,
    };
  });
}

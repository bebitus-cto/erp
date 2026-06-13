import type { Metadata } from "next";
import { requireAdminOrRedirect } from "@/lib/admin/guard";
import { getAdminBookings, getAdminConsultations } from "@/lib/admin/data";
import AdminShell from "@/components/admin/AdminShell";
import Tile from "@/components/admin/Tile";
import BookingsTable from "@/components/admin/BookingsTable";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata: Metadata = {
  title: "대시보드 · Admin",
  robots: { index: false, follow: false },
};

export default async function AdminDashboard() {
  await requireAdminOrRedirect();
  const [bookings, consultations] = await Promise.all([
    getAdminBookings(),
    getAdminConsultations(),
  ]);

  const now = Date.now();
  const pending = bookings.filter((b) => b.status === "pending").length;
  const upcoming = bookings.filter(
    (b) => b.status === "confirmed" && Date.parse(b.slotStartIso) >= now,
  ).length;
  const newLeads = consultations.filter((c) => c.status === "new").length;
  const recent = bookings.slice(0, 5);

  return (
    <AdminShell>
      <div className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold mb-6 text-[var(--cds-text-primary)]">
          대시보드
        </h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <Tile label="대기 예약" value={String(pending)} />
          <Tile label="다가오는 미팅" value={String(upcoming)} />
          <Tile label="신규 리드" value={String(newLeads)} />
          <Tile label="총 상담" value={String(consultations.length)} />
        </div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--cds-text-secondary)] mb-3">
          최근 예약
        </h2>
        <BookingsTable rows={recent} />
      </div>
    </AdminShell>
  );
}

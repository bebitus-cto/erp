import type { Metadata } from "next";
import { requireAdminOrRedirect } from "@/lib/admin/guard";
import { getAdminBookings } from "@/lib/admin/data";
import AdminShell from "@/components/admin/AdminShell";
import BookingsTable from "@/components/admin/BookingsTable";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata: Metadata = {
  title: "예약 · Admin",
  robots: { index: false, follow: false },
};

export default async function AdminBookings() {
  await requireAdminOrRedirect();
  const rows = await getAdminBookings();

  return (
    <AdminShell>
      <div className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold mb-1 text-[var(--cds-text-primary)]">
          예약
        </h1>
        <p className="text-sm text-[var(--cds-text-secondary)] mb-6">
          총 {rows.length}건 · 대기 건은 승인/거절할 수 있습니다.
        </p>
        <BookingsTable rows={rows} />
      </div>
    </AdminShell>
  );
}

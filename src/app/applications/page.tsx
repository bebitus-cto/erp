import type { Metadata } from "next";
import { requireAdminOrRedirect } from "@/lib/admin/guard";
import { getAdminApplications } from "@/lib/admin/data";
import AdminShell from "@/components/admin/AdminShell";
import ApplicationsTable from "@/components/admin/ApplicationsTable";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata: Metadata = {
  title: "부트캠프 신청 · Admin",
  robots: { index: false, follow: false },
};

export default async function AdminApplications() {
  await requireAdminOrRedirect();
  const rows = await getAdminApplications();
  const pending = rows.filter((r) => r.status === "pending").length;
  const paid = rows.filter((r) => r.status === "paid").length;

  return (
    <AdminShell>
      <div className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold mb-1 text-[var(--cds-text-primary)]">
          부트캠프 신청
        </h1>
        <p className="text-sm text-[var(--cds-text-secondary)] mb-6">
          총 {rows.length}건 · 입금대기 {pending} · 확정 {paid}
        </p>
        <ApplicationsTable rows={rows} />
      </div>
    </AdminShell>
  );
}

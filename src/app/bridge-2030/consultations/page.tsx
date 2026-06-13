import type { Metadata } from "next";
import { requireAdminOrRedirect } from "@/lib/admin/guard";
import { getAdminConsultations } from "@/lib/admin/data";
import AdminShell from "@/components/admin/AdminShell";
import ConsultationsTable from "@/components/admin/ConsultationsTable";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata: Metadata = {
  title: "상담 · Admin",
  robots: { index: false, follow: false },
};

export default async function AdminConsultations() {
  await requireAdminOrRedirect();
  const rows = await getAdminConsultations();

  return (
    <AdminShell>
      <div className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold mb-1 text-[var(--cds-text-primary)]">
          상담 리드
        </h1>
        <p className="text-sm text-[var(--cds-text-secondary)] mb-6">
          총 {rows.length}건
        </p>
        <ConsultationsTable rows={rows} />
      </div>
    </AdminShell>
  );
}

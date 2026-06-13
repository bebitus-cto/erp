import TableSkeleton from "@/components/admin/TableSkeleton";

export default function AdminLoading() {
  return (
    <div className="pt-12 min-h-screen bg-[var(--cds-gray-10)]">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="h-8 w-40 bg-[var(--cds-gray-20)] animate-pulse mb-6" />
        <TableSkeleton />
      </div>
    </div>
  );
}

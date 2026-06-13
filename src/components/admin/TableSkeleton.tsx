interface TableSkeletonProps {
  rows?: number;
  cols?: number;
}

export default function TableSkeleton({
  rows = 6,
  cols = 6,
}: TableSkeletonProps) {
  return (
    <div className="border border-[var(--cds-border-subtle)]">
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="flex border-b border-[var(--cds-border-subtle)] last:border-b-0"
        >
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="flex-1 px-4 py-3">
              <div className="h-3 bg-[var(--cds-gray-20)] animate-pulse" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

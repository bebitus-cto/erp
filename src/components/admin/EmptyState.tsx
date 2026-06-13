interface EmptyStateProps {
  title: string;
  hint?: string;
}

export default function EmptyState({ title, hint }: EmptyStateProps) {
  return (
    <div className="grid place-items-center py-20 text-center border border-[var(--cds-border-subtle)] bg-[var(--cds-layer-01)]">
      <p className="font-medium text-[var(--cds-text-primary)] mb-1">{title}</p>
      {hint !== undefined ? (
        <p className="text-sm text-[var(--cds-text-secondary)]">{hint}</p>
      ) : null}
    </div>
  );
}

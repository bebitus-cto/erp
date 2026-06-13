interface TileProps {
  label: string;
  value: string;
  hint?: string;
}

export default function Tile({ label, value, hint }: TileProps) {
  return (
    <div className="bg-[var(--cds-layer-01)] border border-[var(--cds-border-subtle)] p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--cds-text-secondary)] mb-2">
        {label}
      </p>
      <p className="text-3xl font-semibold leading-none text-[var(--cds-text-primary)]">
        {value}
      </p>
      {hint !== undefined ? (
        <p className="text-xs text-[var(--cds-text-secondary)] mt-2">{hint}</p>
      ) : null}
    </div>
  );
}

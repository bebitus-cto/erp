export type TagTone = "info" | "success" | "error" | "warning" | "gray";

const TONE: Record<TagTone, string> = {
  info: "bg-[#edf5ff] text-[#0043ce]",
  success: "bg-[#defbe6] text-[#0e6027]",
  error: "bg-[#fff1f1] text-[#a2191f]",
  warning: "bg-[#fcf4d6] text-[#684e00]",
  gray: "bg-[var(--cds-gray-20)] text-[var(--cds-text-secondary)]",
};

interface TagProps {
  label: string;
  tone?: TagTone;
}

export default function Tag({ label, tone = "gray" }: TagProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs rounded-sm ${TONE[tone]}`}
    >
      {label}
    </span>
  );
}

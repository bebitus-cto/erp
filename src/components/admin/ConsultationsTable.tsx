"use client";

import { useMemo, useState } from "react";
import type { AdminConsultationRow } from "@/lib/admin/data";
import DataTable, { type Column } from "./DataTable";
import EmptyState from "./EmptyState";
import Tag from "./Tag";

const CATEGORY_LABEL: Record<string, string> = {
  quick: "빠른",
  ax: "AX",
  productbuilding: "프로덕트",
  aftercare: "A/S",
  education: "교육",
};

const CATS = [
  { v: "", l: "전체" },
  { v: "quick", l: "빠른" },
  { v: "ax", l: "AX" },
  { v: "productbuilding", l: "프로덕트" },
  { v: "aftercare", l: "A/S" },
  { v: "education", l: "교육" },
] as const;

export default function ConsultationsTable({
  rows,
}: {
  rows: AdminConsultationRow[];
}) {
  const [cat, setCat] = useState("");
  const filtered = useMemo(
    () => (cat === "" ? rows : rows.filter((r) => r.category === cat)),
    [rows, cat],
  );

  const columns: Column<AdminConsultationRow>[] = [
    { key: "createdAt", header: "신청시각", mono: true, width: "7rem" },
    {
      key: "category",
      header: "종류",
      width: "5rem",
      render: (r) => (
        <Tag label={CATEGORY_LABEL[r.category] ?? r.category} tone="info" />
      ),
    },
    { key: "name", header: "이름", width: "5rem" },
    { key: "company", header: "회사", width: "7rem" },
    {
      key: "email",
      header: "이메일",
      mono: true,
      render: (r) => (
        <span title={r.email} className="block max-w-[11rem] truncate">
          {r.email}
        </span>
      ),
    },
    { key: "phone", header: "연락처", mono: true, width: "7rem" },
    {
      key: "inquiry",
      header: "궁금한 점",
      sortable: false,
      render: (r) => (
        <span title={r.inquiry} className="block max-w-[18rem] truncate">
          {r.inquiry}
        </span>
      ),
    },
    {
      key: "fileUrls",
      header: "첨부",
      sortable: false,
      width: "5rem",
      render: (r) =>
        r.fileUrls.length === 0 ? (
          <span className="text-[var(--cds-text-secondary)]">—</span>
        ) : (
          <div className="flex flex-col gap-0.5">
            {r.fileUrls.map((u, i) => (
              <a
                key={u}
                href={u}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--cds-interactive)] underline"
              >
                파일{i + 1}
              </a>
            ))}
          </div>
        ),
    },
  ];

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {CATS.map((c) => (
          <button
            key={c.v}
            type="button"
            onClick={() => setCat(c.v)}
            className={`px-3 py-1 text-xs border transition ${
              cat === c.v
                ? "bg-[var(--cds-gray-100)] text-white border-[var(--cds-gray-100)]"
                : "bg-[var(--cds-layer-01)] text-[var(--cds-text-secondary)] border-[var(--cds-border-subtle)]"
            }`}
          >
            {c.l}
          </button>
        ))}
      </div>
      <DataTable<AdminConsultationRow>
        columns={columns}
        rows={filtered}
        initialSortKey="createdAt"
        initialSortDir="desc"
        emptyState={
          <EmptyState
            title="표시할 상담이 없습니다"
            hint="상담 신청이 들어오면 여기에 표시됩니다."
          />
        }
      />
    </div>
  );
}

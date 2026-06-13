"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminBookingRow } from "@/lib/admin/data";
import DataTable, { type Column } from "./DataTable";
import EmptyState from "./EmptyState";
import Tag, { type TagTone } from "./Tag";

function statusTone(s: string): TagTone {
  if (s === "confirmed") return "success";
  if (s === "pending") return "warning";
  if (s === "rejected" || s === "cancelled") return "error";
  return "gray";
}
function statusLabel(s: string): string {
  if (s === "pending") return "대기";
  if (s === "confirmed") return "확정";
  if (s === "rejected") return "거절";
  if (s === "cancelled") return "취소";
  return s;
}

function ActionCell({ row }: { row: AdminBookingRow }) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [err, setErr] = useState("");

  const act = async (kind: "approve" | "reject") => {
    if (working) return;
    if (kind === "reject" && !window.confirm("이 예약을 거절할까요?")) return;
    setWorking(true);
    setErr("");
    try {
      const res = await fetch(`/api/admin/bookings/${row.id}/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setErr(d.error ?? "실패");
        setWorking(false);
        return;
      }
      router.refresh();
    } catch {
      setErr("네트워크 오류");
      setWorking(false);
    }
  };

  if (row.status === "pending") {
    return (
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={working}
          onClick={() => act("approve")}
          className="px-2 py-1 text-xs font-medium text-white bg-[var(--cds-support-success)] disabled:opacity-50"
        >
          승인
        </button>
        <button
          type="button"
          disabled={working}
          onClick={() => act("reject")}
          className="px-2 py-1 text-xs font-medium text-white bg-[var(--cds-support-error)] disabled:opacity-50"
        >
          거절
        </button>
        {err !== "" ? (
          <span className="text-xs text-[var(--cds-support-error)]">{err}</span>
        ) : null}
      </div>
    );
  }
  if (row.status === "confirmed" && row.meetLink !== "") {
    return (
      <a
        href={row.meetLink}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[var(--cds-interactive)] underline text-xs"
      >
        Meet
      </a>
    );
  }
  return <span className="text-[var(--cds-text-secondary)]">—</span>;
}

const STATUSES = [
  { v: "", l: "전체" },
  { v: "pending", l: "대기" },
  { v: "confirmed", l: "확정" },
  { v: "rejected", l: "거절" },
] as const;

export default function BookingsTable({ rows }: { rows: AdminBookingRow[] }) {
  const [filter, setFilter] = useState("");
  const filtered = useMemo(
    () => (filter === "" ? rows : rows.filter((r) => r.status === filter)),
    [rows, filter],
  );

  const columns: Column<AdminBookingRow>[] = [
    { key: "createdAt", header: "요청시각", mono: true, width: "7rem" },
    { key: "scheduledLabel", header: "미팅 일시", mono: true, width: "7rem" },
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
    { key: "topic", header: "주제", width: "6rem" },
    {
      key: "status",
      header: "상태",
      sortable: false,
      render: (r) => <Tag label={statusLabel(r.status)} tone={statusTone(r.status)} />,
    },
    {
      key: "id",
      header: "처리",
      sortable: false,
      render: (r) => <ActionCell row={r} />,
    },
  ];

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {STATUSES.map((s) => (
          <button
            key={s.v}
            type="button"
            onClick={() => setFilter(s.v)}
            className={`px-3 py-1 text-xs border transition ${
              filter === s.v
                ? "bg-[var(--cds-gray-100)] text-white border-[var(--cds-gray-100)]"
                : "bg-[var(--cds-layer-01)] text-[var(--cds-text-secondary)] border-[var(--cds-border-subtle)]"
            }`}
          >
            {s.l}
          </button>
        ))}
      </div>
      <DataTable<AdminBookingRow>
        columns={columns}
        rows={filtered}
        initialSortKey="createdAt"
        initialSortDir="desc"
        emptyState={
          <EmptyState
            title="표시할 예약이 없습니다"
            hint="예약 요청이 들어오면 여기에 표시됩니다."
          />
        }
      />
    </div>
  );
}

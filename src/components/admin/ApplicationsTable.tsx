"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminApplicationRow } from "@/lib/admin/data";
import DataTable, { type Column } from "./DataTable";
import EmptyState from "./EmptyState";
import Tag, { type TagTone } from "./Tag";

function statusTone(s: string): TagTone {
  if (s === "paid") return "success";
  if (s === "pending") return "warning";
  if (s === "cancelled") return "error";
  return "gray";
}
function statusLabel(s: string): string {
  if (s === "pending") return "입금대기";
  if (s === "paid") return "확정";
  if (s === "cancelled") return "취소";
  return s;
}

// answers(jsonb) 키 → 한글 라벨. 없는 키는 키 그대로 표시(폼이 바뀌어도 안 깨짐).
const ANSWER_LABELS: Record<string, string> = {
  project_idea: "만들고 싶은 것",
  target_user: "누가 쓰나",
  job: "직업",
  writing_skill: "글 표현",
  skill_level: "코딩 수준",
  ai_tools: "써본 AI",
  vibe_tools: "써본 바이브툴",
  prev_courses: "이전 수업",
  expectation: "바라는 점",
  target_platform: "플랫폼",
  needs_payment: "결제",
  needs_realtime: "실시간",
  needs_data: "데이터 저장",
  needs_login: "로그인",
  screen_count: "화면 수",
  scope_verdict: "스코프 판정",
};

function fmtVal(v: unknown): string {
  if (Array.isArray(v)) return v.join(", ");
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

function ActionCell({ row }: { row: AdminApplicationRow }) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [err, setErr] = useState("");

  const setStatus = async (status: string, confirmMsg?: string) => {
    if (working) return;
    if (confirmMsg !== undefined && !window.confirm(confirmMsg)) return;
    setWorking(true);
    setErr("");
    try {
      const res = await fetch(`/api/admin/applications/${row.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
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

  return (
    <div className="flex items-center gap-1.5">
      {row.status !== "paid" ? (
        <button
          type="button"
          disabled={working}
          onClick={() => setStatus("paid", "이 신청을 입금확인(확정) 처리할까요?")}
          className="px-2 py-1 text-xs font-medium text-white bg-[var(--cds-support-success)] disabled:opacity-50"
        >
          입금확인
        </button>
      ) : null}
      {row.status !== "cancelled" ? (
        <button
          type="button"
          disabled={working}
          onClick={() => setStatus("cancelled", "이 신청을 취소할까요?")}
          className="px-2 py-1 text-xs font-medium text-white bg-[var(--cds-support-error)] disabled:opacity-50"
        >
          취소
        </button>
      ) : (
        <button
          type="button"
          disabled={working}
          onClick={() => setStatus("pending")}
          className="px-2 py-1 text-xs font-medium border border-[var(--cds-border-subtle)] text-[var(--cds-text-secondary)] disabled:opacity-50"
        >
          복원
        </button>
      )}
      {err !== "" ? (
        <span className="text-xs text-[var(--cds-support-error)]">{err}</span>
      ) : null}
    </div>
  );
}

const STATUSES = [
  { v: "", l: "전체" },
  { v: "pending", l: "입금대기" },
  { v: "paid", l: "확정" },
  { v: "cancelled", l: "취소" },
] as const;

export default function ApplicationsTable({
  rows,
}: {
  rows: AdminApplicationRow[];
}) {
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<AdminApplicationRow | null>(null);
  const filtered = useMemo(
    () => (filter === "" ? rows : rows.filter((r) => r.status === filter)),
    [rows, filter],
  );

  const columns: Column<AdminApplicationRow>[] = [
    { key: "createdAt", header: "신청시각", mono: true, width: "7rem" },
    { key: "name", header: "이름", width: "5rem" },
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
      key: "projectIdea",
      header: "만들고 싶은 것",
      sortable: false,
      render: (r) => (
        <span title={r.projectIdea} className="block max-w-[15rem] truncate">
          {r.projectIdea}
        </span>
      ),
    },
    {
      key: "amount",
      header: "금액",
      mono: true,
      width: "6rem",
      render: (r) => <span>{r.amount.toLocaleString()}원</span>,
    },
    {
      key: "status",
      header: "상태",
      sortable: false,
      render: (r) => <Tag label={statusLabel(r.status)} tone={statusTone(r.status)} />,
    },
    {
      key: "answers",
      header: "상세",
      sortable: false,
      width: "3rem",
      render: (r) => (
        <button
          type="button"
          onClick={() => setSelected(r)}
          className="px-2 py-1 text-xs border border-[var(--cds-border-subtle)] text-[var(--cds-text-secondary)] can-hover:hover:bg-[var(--cds-gray-20)]"
        >
          보기
        </button>
      ),
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
      <DataTable<AdminApplicationRow>
        columns={columns}
        rows={filtered}
        initialSortKey="createdAt"
        initialSortDir="desc"
        emptyState={
          <EmptyState
            title="표시할 신청이 없습니다"
            hint="부트캠프 신청이 들어오면 여기에 표시됩니다."
          />
        }
      />

      {selected !== null ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white max-w-lg w-full max-h-[80vh] overflow-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-[var(--cds-text-primary)]">
                  {selected.name}
                </h3>
                <p className="text-sm text-[var(--cds-text-secondary)]">
                  {selected.email} · {selected.phone}
                </p>
                <p className="text-xs text-[var(--cds-text-secondary)] mt-1">
                  {selected.createdAt} · {selected.amount.toLocaleString()}원 ·{" "}
                  {statusLabel(selected.status)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-[var(--cds-text-secondary)] text-sm px-2"
              >
                닫기
              </button>
            </div>
            <dl className="flex flex-col gap-3 text-sm">
              {selected.answers !== null ? (
                Object.entries(selected.answers).map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs text-[var(--cds-text-secondary)]">
                      {ANSWER_LABELS[k] ?? k}
                    </dt>
                    <dd className="text-[var(--cds-text-primary)] whitespace-pre-wrap">
                      {fmtVal(v)}
                    </dd>
                  </div>
                ))
              ) : (
                <p className="text-[var(--cds-text-secondary)]">
                  상세 답변이 없습니다.
                </p>
              )}
            </dl>
          </div>
        </div>
      ) : null}
    </div>
  );
}

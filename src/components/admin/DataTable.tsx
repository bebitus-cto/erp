"use client";

import { type ReactNode, useMemo, useState } from "react";
import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react";

export interface Column<T> {
  key: Extract<keyof T, string>;
  header: string;
  sortable?: boolean;
  width?: string;
  mono?: boolean;
  render?: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  initialSortKey?: Extract<keyof T, string>;
  initialSortDir?: "asc" | "desc";
  emptyState?: ReactNode;
}

export default function DataTable<T>({
  columns,
  rows,
  initialSortKey,
  initialSortDir = "desc",
  emptyState,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<Extract<keyof T, string> | null>(
    initialSortKey ?? null,
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">(initialSortDir);

  const sorted = useMemo(() => {
    if (sortKey === null) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = String(a[sortKey] ?? "");
      const bv = String(b[sortKey] ?? "");
      const cmp = av.localeCompare(bv, "ko");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  if (rows.length === 0 && emptyState !== undefined) {
    return <>{emptyState}</>;
  }

  const toggleSort = (key: Extract<keyof T, string>) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return (
    <div className="overflow-x-auto border border-[var(--cds-border-subtle)]">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="bg-[var(--cds-gray-10)]">
            {columns.map((col) => {
              const sortable = col.sortable !== false;
              const active = sortKey === col.key;
              return (
                <th
                  key={col.key}
                  role="columnheader"
                  aria-sort={
                    active
                      ? sortDir === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                  scope="col"
                  style={col.width !== undefined ? { width: col.width } : undefined}
                  className="text-left font-semibold text-xs text-[var(--cds-text-primary)] border-b border-[var(--cds-border-strong)] px-4 py-2.5 whitespace-nowrap"
                >
                  {sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className="inline-flex items-center gap-1 can-hover:hover:text-[var(--cds-interactive)]"
                    >
                      {col.header}
                      {active ? (
                        sortDir === "asc" ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )
                      ) : (
                        <ChevronsUpDown className="w-3.5 h-3.5 text-[var(--cds-gray-50)]" />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr
              key={i}
              className={`${
                i % 2 === 0
                  ? "bg-[var(--cds-background)]"
                  : "bg-[var(--cds-gray-10)]"
              } can-hover:hover:bg-[var(--cds-gray-20)] border-b border-[var(--cds-border-subtle)] last:border-b-0`}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-4 py-2.5 align-top text-[var(--cds-text-primary)] ${
                    col.mono === true ? "carbon-mono" : ""
                  }`}
                >
                  {col.render !== undefined
                    ? col.render(row)
                    : String(row[col.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

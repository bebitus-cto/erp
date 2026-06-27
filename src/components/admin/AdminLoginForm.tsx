"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading || password === "") return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.status === 429) {
        setError("시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.");
        setLoading(false);
        return;
      }
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setError(d.error ?? "로그인에 실패했습니다.");
        setLoading(false);
        return;
      }
      const params = new URLSearchParams(window.location.search);
      const next = params.get("next");
      const dest =
        next !== null && next.startsWith("/") && !next.startsWith("//")
          ? next
          : "/";
      router.replace(dest);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm border border-[var(--cds-border-subtle)] bg-[var(--cds-layer-01)] p-8"
      >
        <p className="text-xs tracking-wide uppercase text-[var(--cds-text-secondary)] mb-1">
          베비투스랩
        </p>
        <h1 className="text-2xl font-semibold text-[var(--cds-text-primary)] mb-6">
          Admin
        </h1>

        <label
          htmlFor="admin-password"
          className="block text-xs text-[var(--cds-text-secondary)] mb-1"
        >
          비밀번호
        </label>
        <input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2.5 mb-4 bg-[var(--cds-field-01)] text-[var(--cds-text-primary)] border-0 border-b-2 border-[var(--cds-border-strong)] outline-none focus:border-[var(--cds-focus)]"
        />

        {error !== null ? (
          <p className="text-sm text-[var(--cds-support-error)] mb-4">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={loading || password === ""}
          className="w-full px-4 py-3 bg-[var(--cds-interactive)] text-[var(--cds-text-on-color)] font-medium transition can-hover:hover:bg-[var(--cds-interactive-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "확인 중…" : "로그인"}
        </button>
      </form>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function oauthErrorMessage(code: string): string {
  switch (code) {
    case "not_allowed":
      return "허용되지 않은 계정입니다.";
    case "access_denied":
      return "로그인이 취소되었습니다.";
    case "state_mismatch":
    case "state_missing":
      return "세션이 만료되었어요. 다시 시도해 주세요.";
    case "oauth_unconfigured":
      return "Google 로그인이 아직 설정되지 않았습니다.";
    default:
      return "로그인에 실패했습니다.";
  }
}

/** 현재 URL 의 next 파라미터(같은 origin 내부 경로일 때만 — 백슬래시 우회 차단). */
function currentNext(): string | null {
  const raw = new URLSearchParams(window.location.search).get("next");
  if (raw === null || raw === "") return null;
  try {
    const u = new URL(raw, window.location.origin);
    if (u.origin === window.location.origin) {
      return u.pathname + u.search + u.hash;
    }
  } catch {
    // invalid
  }
  return null;
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A8.99 8.99 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}

export default function AdminLoginForm({
  googleEnabled = true,
  passwordEnabled = true,
}: {
  googleEnabled?: boolean;
  passwordEnabled?: boolean;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 콜백 실패 시 /login?error=… 로 돌아오므로 메시지를 띄운다.
  useEffect(() => {
    const e = new URLSearchParams(window.location.search).get("error");
    if (e !== null) setError(oauthErrorMessage(e));
  }, []);

  const goGoogle = () => {
    const next = currentNext();
    const q = next !== null ? `?next=${encodeURIComponent(next)}` : "";
    window.location.href = `/api/admin/auth/start${q}`;
  };

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
      router.replace(currentNext() ?? "/");
    } catch {
      setError("네트워크 오류가 발생했습니다.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-sm border border-[var(--cds-border-subtle)] bg-[var(--cds-layer-01)] p-8">
        <p className="text-xs tracking-wide uppercase text-[var(--cds-text-secondary)] mb-1">
          베비투스랩
        </p>
        <h1 className="text-2xl font-semibold text-[var(--cds-text-primary)] mb-6">
          Admin
        </h1>

        {error !== null ? (
          <p className="text-sm text-[var(--cds-support-error)] mb-4">{error}</p>
        ) : null}

        {googleEnabled ? (
          <button
            type="button"
            onClick={goGoogle}
            className="w-full px-4 py-3 flex items-center justify-center gap-2.5 bg-[var(--cds-field-01)] text-[var(--cds-text-primary)] font-medium border border-[var(--cds-border-strong)] transition can-hover:hover:border-[var(--cds-focus)]"
          >
            <GoogleIcon />
            Google로 로그인
          </button>
        ) : null}

        {googleEnabled && passwordEnabled ? (
          <div className="flex items-center gap-3 my-5 text-xs text-[var(--cds-text-secondary)]">
            <span className="h-px flex-1 bg-[var(--cds-border-subtle)]" />
            또는
            <span className="h-px flex-1 bg-[var(--cds-border-subtle)]" />
          </div>
        ) : null}

        {passwordEnabled ? (
          <form onSubmit={handleSubmit}>
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
            <button
              type="submit"
              disabled={loading || password === ""}
              className="w-full px-4 py-3 bg-[var(--cds-interactive)] text-[var(--cds-text-on-color)] font-medium transition can-hover:hover:bg-[var(--cds-interactive-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "확인 중…" : "로그인"}
            </button>
          </form>
        ) : null}

        {!googleEnabled && !passwordEnabled ? (
          <p className="text-sm text-[var(--cds-text-secondary)]">
            로그인 수단이 설정되지 않았습니다.
          </p>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { label: "대시보드", href: "/" },
  { label: "예약", href: "/bookings" },
  { label: "상담", href: "/consultations" },
  { label: "부트캠프 신청", href: "/applications" },
] as const;

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      // 무시하고 로그인으로 이동
    }
    router.replace("/login");
  };

  return (
    <div>
      <aside className="fixed left-0 inset-y-0 w-60 z-50 flex flex-col bg-[var(--cds-gray-100)] text-white">
        <div className="flex items-center h-12 px-4 border-b border-white/10 font-semibold text-sm">
          베비투스랩 · Admin
        </div>
        <nav className="flex flex-col py-2">
          {NAV.map((n) => {
            const active =
              n.href === "/"
                ? pathname === "/"
                : pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex items-center h-11 px-4 text-sm border-l-2 transition ${
                  active
                    ? "bg-white/10 text-white border-white"
                    : "text-white/70 border-transparent can-hover:hover:bg-white/5"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-auto flex items-center h-11 px-4 text-sm text-white/70 border-t border-white/10 transition can-hover:hover:bg-white/5"
        >
          로그아웃
        </button>
      </aside>
      <main className="pl-60 min-h-screen bg-[var(--cds-gray-10)]">
        {children}
      </main>
    </div>
  );
}

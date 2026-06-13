"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { label: "대시보드", href: "/bridge-2030" },
  { label: "예약", href: "/bridge-2030/bookings" },
  { label: "상담", href: "/bridge-2030/consultations" },
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
    router.replace("/bridge-2030/login");
  };

  return (
    <div>
      <header className="fixed top-0 inset-x-0 h-12 z-50 flex items-center bg-[var(--cds-gray-100)] text-white">
        <div className="flex items-center h-full px-4 border-r border-white/10 font-semibold text-sm">
          베비투스랩 · Admin
        </div>
        <nav className="flex items-center h-full">
          {NAV.map((n) => {
            const active =
              n.href === "/bridge-2030"
                ? pathname === "/bridge-2030"
                : pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex items-center h-full px-4 text-sm transition ${
                  active
                    ? "bg-white/10 text-white"
                    : "text-white/70 can-hover:hover:bg-white/5"
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
          className="ml-auto h-full px-4 text-sm text-white/70 transition can-hover:hover:bg-white/5"
        >
          로그아웃
        </button>
      </header>
      <main className="pt-12 min-h-screen bg-[var(--cds-gray-10)]">
        {children}
      </main>
    </div>
  );
}

import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";

export const metadata: Metadata = {
  title: "Admin · 베비투스랩",
  robots: { index: false, follow: false },
};

// Carbon(Gray 10 라이트) 토큰을 인라인으로 정의 — Tailwind/Turbopack 의 raw-CSS 처리에
// 의존하지 않고 .carbon 트리 전체에 변수를 보장한다. 마케팅 다크 테마와도 격리됨.
const CARBON_VARS = {
  "--cds-gray-10": "#f4f4f4",
  "--cds-gray-20": "#e0e0e0",
  "--cds-gray-30": "#c6c6c6",
  "--cds-gray-50": "#8d8d8d",
  "--cds-gray-70": "#525252",
  "--cds-gray-100": "#161616",
  "--cds-background": "#ffffff",
  "--cds-layer-01": "#f4f4f4",
  "--cds-field-01": "#f4f4f4",
  "--cds-border-subtle": "#e0e0e0",
  "--cds-border-strong": "#8d8d8d",
  "--cds-text-primary": "#161616",
  "--cds-text-secondary": "#525252",
  "--cds-text-on-color": "#ffffff",
  "--cds-interactive": "#0f62fe",
  "--cds-interactive-hover": "#0353e9",
  "--cds-focus": "#0f62fe",
  "--cds-support-success": "#24a148",
  "--cds-support-warning": "#f1c21b",
  "--cds-support-error": "#da1e28",
  "--cds-support-info": "#4589ff",
  background: "#ffffff",
  color: "#161616",
  fontFamily: '"IBM Plex Sans", system-ui, -apple-system, "Pretendard", sans-serif',
} as CSSProperties;

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="carbon min-h-screen" style={CARBON_VARS}>
      {children}
    </div>
  );
}

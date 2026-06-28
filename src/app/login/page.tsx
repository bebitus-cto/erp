import type { Metadata } from "next";
import AdminLoginForm from "@/components/admin/AdminLoginForm";
import { getLoginOAuthClient } from "@/lib/admin/oauth";

export const metadata: Metadata = {
  title: "로그인 · Admin",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  const googleEnabled = getLoginOAuthClient() !== null;
  // 명시적 "false" 일 때만 비번 UI 숨김(라우트 가드와 동일 기준).
  const passwordEnabled =
    process.env.ADMIN_PASSWORD_LOGIN_ENABLED?.toLowerCase() !== "false";
  return (
    <AdminLoginForm
      googleEnabled={googleEnabled}
      passwordEnabled={passwordEnabled}
    />
  );
}

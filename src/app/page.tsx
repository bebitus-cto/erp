import { redirect } from "next/navigation";

// 어드민 도메인 루트 → 대시보드(미인증 시 미들웨어가 로그인으로)
export default function Home() {
  redirect("/bridge-2030");
}

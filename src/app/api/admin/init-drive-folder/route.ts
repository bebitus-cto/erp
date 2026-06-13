import { NextResponse } from "next/server";
import { getDriveClient } from "@/lib/google/clients";

export const runtime = "nodejs";

const FOLDER_NAME = "베비투스랩 상담 신청";

/**
 * 일회용 부트스트랩 — bebitus92 본인 Drive 루트에 상담 신청 백업 폴더 1개 생성.
 *
 * 보호 조치:
 * 1) `Authorization: Bearer <ADMIN_BOOTSTRAP_SECRET>` 헤더 검증
 * 2) `GOOGLE_DRIVE_FOLDER_ID`가 이미 설정돼 있으면 자동 거부
 *
 * 시크릿이 환경변수에 없으면 누구도 호출 불가(잠금 상태).
 */
function isAuthorized(req: Request): boolean {
  const secret = process.env.ADMIN_BOOTSTRAP_SECRET;
  if (secret === undefined || secret.trim() === "") return false;
  const header = req.headers.get("authorization") ?? "";
  const provided = header.replace(/^Bearer\s+/i, "").trim();
  if (provided === "") return false;
  return provided === secret;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if ((process.env.GOOGLE_DRIVE_FOLDER_ID ?? "").trim() !== "") {
    return NextResponse.json(
      {
        ok: false,
        error:
          "GOOGLE_DRIVE_FOLDER_ID가 이미 설정되어 있습니다. 새로 만들려면 먼저 비워주세요.",
      },
      { status: 400 },
    );
  }

  const drive = getDriveClient();
  if (drive === null) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Drive 클라이언트 초기화 실패. GOOGLE_OAUTH_CLIENT_ID / _CLIENT_SECRET / _REFRESH_TOKEN 환경변수를 확인하세요.",
      },
      { status: 500 },
    );
  }

  try {
    const res = await drive.files.create({
      requestBody: {
        name: FOLDER_NAME,
        mimeType: "application/vnd.google-apps.folder",
      },
      fields: "id, name, webViewLink",
    });

    const folderId = res.data.id;
    if (typeof folderId !== "string") {
      throw new Error("Drive 응답에 폴더 ID가 없습니다");
    }

    return NextResponse.json({
      ok: true,
      folderId,
      name: res.data.name,
      webViewLink: res.data.webViewLink,
      message:
        "위 folderId를 GOOGLE_DRIVE_FOLDER_ID 환경변수에 저장하세요 (.env.local + Vercel).",
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 },
    );
  }
}

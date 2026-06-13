import { google } from "googleapis";
import type { sheets_v4, drive_v3, calendar_v3 } from "googleapis";

// OAuth 클라이언트가 동의받아야 하는 스코프 (= scripts/google-oauth-consent.ts 가 요청).
// 기존 Drive 업로드 유지 + 예약용 Calendar free/busy·이벤트(Meet) 생성.
export const GOOGLE_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/calendar.freebusy",
  "https://www.googleapis.com/auth/calendar.events",
] as const;

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
}

function parseServiceAccount(): ServiceAccountKey | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (raw === undefined || raw.trim() === "") return null;
  try {
    const parsed = JSON.parse(raw) as ServiceAccountKey;
    if (
      typeof parsed.client_email !== "string" ||
      typeof parsed.private_key !== "string"
    ) {
      return null;
    }
    return {
      client_email: parsed.client_email,
      // 환경변수에 줄바꿈 escape 처리되어 들어오는 경우 복원
      private_key: parsed.private_key.replace(/\\n/g, "\n"),
    };
  } catch (err) {
    console.error("[google] Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON:", err);
    return null;
  }
}

function getServiceAccountAuth(scopes: string[]) {
  const key = parseServiceAccount();
  if (key === null) return null;
  return new google.auth.JWT({
    email: key.client_email,
    key: key.private_key,
    scopes,
  });
}

// Drive 전용 — bebitus92 본인 계정의 권한으로 동작.
// service account는 storage quota 0이라 파일 생성 불가 → OAuth refresh token 사용.
function getOAuth2Client() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  if (
    clientId === undefined ||
    clientId.trim() === "" ||
    clientSecret === undefined ||
    clientSecret.trim() === "" ||
    refreshToken === undefined ||
    refreshToken.trim() === ""
  ) {
    return null;
  }
  const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
  oauth2.setCredentials({ refresh_token: refreshToken });
  return oauth2;
}

export function getSheetsClient(): sheets_v4.Sheets | null {
  const auth = getServiceAccountAuth([
    "https://www.googleapis.com/auth/spreadsheets",
  ]);
  if (auth === null) return null;
  return google.sheets({ version: "v4", auth });
}

export function getDriveClient(): drive_v3.Drive | null {
  const oauthClient = getOAuth2Client();
  if (oauthClient !== null) {
    return google.drive({ version: "v3", auth: oauthClient });
  }
  // OAuth 미설정 시 service account fallback — quota 에러 발생할 수 있음.
  const saAuth = getServiceAccountAuth([
    "https://www.googleapis.com/auth/drive",
  ]);
  if (saAuth === null) return null;
  return google.drive({ version: "v3", auth: saAuth });
}

// 예약(booking)용 — bebitus92 본인 계정의 권한으로 동작.
// service account 는 개인 캘린더 접근·Meet 생성이 불가 → OAuth refresh token 전용(SA 폴백 없음).
// null 이면 라우트에서 503(점검 중)으로 응답한다.
export function getCalendarClient(): calendar_v3.Calendar | null {
  const oauthClient = getOAuth2Client();
  if (oauthClient === null) return null;
  return google.calendar({ version: "v3", auth: oauthClient });
}

// 예약 가용성·이벤트를 조회/생성할 캘린더 ID. 기본은 본인 기본 캘린더(primary).
export function getBookingCalendarId(): string {
  const id = process.env.GOOGLE_BOOKING_CALENDAR_ID;
  if (id !== undefined && id.trim() !== "") return id.trim();
  return "primary";
}

export function getSpreadsheetId(): string | null {
  const id = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (id === undefined || id.trim() === "") return null;
  return id.trim();
}

export function getDriveFolderId(): string | null {
  const id = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (id === undefined || id.trim() === "") return null;
  return id.trim();
}

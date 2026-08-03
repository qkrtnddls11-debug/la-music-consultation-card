import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "ra_admin_session";
// 기기당 한 번만 로그인하면 다시 묻지 않는다 (10년). 학생 개인정보 보호를 위해 로그인 자체는 유지.
export const ADMIN_SESSION_SECONDS = 60 * 60 * 24 * 365 * 10;

function required(name: "ADMIN_PASSWORD" | "ADMIN_SESSION_SECRET") {
  const value = process.env[name];
  if (!value) throw new Error(`${name} 환경변수가 설정되지 않았습니다.`);
  return value;
}

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

export function isPasswordValid(password: unknown) {
  if (typeof password !== "string") return false;
  return timingSafeEqual(digest(password), digest(required("ADMIN_PASSWORD")));
}

export function createAdminSessionToken() {
  const expires = Math.floor(Date.now() / 1000) + ADMIN_SESSION_SECONDS;
  const signature = createHmac("sha256", required("ADMIN_SESSION_SECRET"))
    .update(String(expires))
    .digest("hex");
  return `${expires}.${signature}`;
}

function isTokenValid(token: string | undefined) {
  if (!token) return false;
  const [expiresText, signature] = token.split(".");
  if (!/^\d+$/.test(expiresText) || !/^[a-f0-9]{64}$/.test(signature ?? "")) {
    return false;
  }

  const expires = Number(expiresText);
  if (!Number.isSafeInteger(expires) || expires <= Date.now() / 1000) return false;

  const expected = createHmac("sha256", required("ADMIN_SESSION_SECRET"))
    .update(expiresText)
    .digest("hex");
  return timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
}

export async function hasAdminSession() {
  // 운영자 결정(2026-08-03)으로 관리자 로그인을 사용하지 않는다.
  // 다시 켜려면 아래 두 줄 주석을 해제하고 `return true`를 지우면 된다.
  // const cookieStore = await cookies();
  // return isTokenValid(cookieStore.get(ADMIN_COOKIE)?.value);
  return true;
}

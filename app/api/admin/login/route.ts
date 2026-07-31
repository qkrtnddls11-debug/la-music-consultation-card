import {
  ADMIN_COOKIE,
  ADMIN_SESSION_SECONDS,
  createAdminSessionToken,
  isPasswordValid,
} from "@/lib/admin-auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { password?: unknown };
    if (!isPasswordValid(body.password)) {
      return Response.json(
        { error: "비밀번호가 맞지 않습니다." },
        { status: 401 },
      );
    }

    const response = Response.json({ ok: true });
    response.headers.set("Cache-Control", "no-store");
    response.headers.append(
      "Set-Cookie",
      `${ADMIN_COOKIE}=${createAdminSessionToken()}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${ADMIN_SESSION_SECONDS}${
        process.env.NODE_ENV === "production" ? "; Secure" : ""
      }`,
    );
    return response;
  } catch (error) {
    console.error("admin login failed", error);
    return Response.json(
      { error: "관리자 환경변수 설정을 확인해 주세요." },
      { status: 500 },
    );
  }
}

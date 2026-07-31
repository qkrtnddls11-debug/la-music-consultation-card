import { ADMIN_COOKIE } from "@/lib/admin-auth";

export async function POST() {
  const response = Response.json({ ok: true });
  response.headers.set("Cache-Control", "no-store");
  response.headers.append(
    "Set-Cookie",
    `${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${
      process.env.NODE_ENV === "production" ? "; Secure" : ""
    }`,
  );
  return response;
}

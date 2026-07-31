import { hasAdminSession } from "@/lib/admin-auth";

export async function GET() {
  const authenticated = await hasAdminSession();
  return Response.json(
    { authenticated },
    { status: authenticated ? 200 : 401, headers: { "Cache-Control": "no-store" } },
  );
}

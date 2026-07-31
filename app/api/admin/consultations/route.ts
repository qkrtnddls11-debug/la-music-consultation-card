import { hasAdminSession } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase-server";

export async function GET() {
  try {
    if (!(await hasAdminSession())) {
      return Response.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { data, error } = await createAdminSupabase()
      .from("consultations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      console.error("admin consultations query failed", {
        code: error.code,
        message: error.message,
      });
      return Response.json({ error: "목록을 불러오지 못했습니다." }, { status: 502 });
    }

    return Response.json(data ?? [], {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("admin consultations route failed", error);
    return Response.json(
      { error: "관리자 저장소 설정을 확인해 주세요." },
      { status: 500 },
    );
  }
}

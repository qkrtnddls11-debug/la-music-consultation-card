import { hasAdminSession } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase-server";
import { DEFAULT_BRANCH } from "@/lib/types";

// 체험수업 배정용 강사·연습실 목록.
// 목록은 CRM이 주기적으로 crm_schedule_options 테이블에 채워 넣으며, 여기서는 그 값을 읽기만 한다.
export async function GET(request: Request) {
  try {
    if (!(await hasAdminSession())) return Response.json({ error: "인증이 필요합니다." }, { status: 401 });
    const branch = new URL(request.url).searchParams.get("branch")?.trim() || DEFAULT_BRANCH;

    const { data, error } = await createAdminSupabase()
      .from("crm_schedule_options")
      .select("teachers,rooms")
      .eq("branch_name", branch)
      .maybeSingle();

    if (error) {
      console.error("crm options query failed", { code: error.code, message: error.message });
      return Response.json({ error: "강사·연습실 목록을 불러오지 못했습니다." }, { status: 502 });
    }

    return Response.json(
      {
        teachers: Array.isArray(data?.teachers) ? data.teachers : [],
        rooms: Array.isArray(data?.rooms) ? data.rooms : []
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    console.error("crm options route failed", error);
    return Response.json({ error: "강사·연습실 목록을 불러오는 중 오류가 발생했습니다." }, { status: 500 });
  }
}

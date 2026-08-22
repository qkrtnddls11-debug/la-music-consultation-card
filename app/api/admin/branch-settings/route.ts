import { hasAdminSession } from "@/lib/admin-auth";
import { DEFAULT_LINK_MESSAGE } from "@/lib/branch-config";
import { createAdminSupabase } from "@/lib/supabase-server";
import { DEFAULT_BRANCH } from "@/lib/types";

// 지점별 상담 설정(상담 링크 안내 메시지 등)
export async function GET(request: Request) {
  try {
    if (!(await hasAdminSession())) return Response.json({ error: "인증이 필요합니다." }, { status: 401 });
    const branch = new URL(request.url).searchParams.get("branch")?.trim() || DEFAULT_BRANCH;
    const { data, error } = await createAdminSupabase()
      .from("branch_settings")
      .select("link_message")
      .eq("branch_name", branch)
      .maybeSingle();
    if (error) {
      console.error("branch settings query failed", { code: error.code, message: error.message });
      return Response.json({ linkMessage: DEFAULT_LINK_MESSAGE, isDefault: true }, { headers: { "Cache-Control": "private, no-store" } });
    }
    const saved = typeof data?.link_message === "string" ? data.link_message : "";
    return Response.json(
      { linkMessage: saved || DEFAULT_LINK_MESSAGE, isDefault: !saved },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    console.error("branch settings route failed", error);
    return Response.json({ linkMessage: DEFAULT_LINK_MESSAGE, isDefault: true });
  }
}

export async function PATCH(request: Request) {
  try {
    if (!(await hasAdminSession())) return Response.json({ error: "인증이 필요합니다." }, { status: 401 });
    const body = await request.json() as { branch?: string; linkMessage?: string | null };
    const branch = (body.branch || "").trim() || DEFAULT_BRANCH;
    // 빈 값으로 저장하면 기본 안내문으로 되돌아간다
    const linkMessage = typeof body.linkMessage === "string" ? body.linkMessage.trim().slice(0, 2000) : "";

    const { error } = await createAdminSupabase()
      .from("branch_settings")
      .upsert({ branch_name: branch, link_message: linkMessage || null, updated_at: new Date().toISOString() }, { onConflict: "branch_name" });
    if (error) {
      console.error("branch settings save failed", { code: error.code, message: error.message });
      return Response.json({ error: "안내 메시지를 저장하지 못했습니다." }, { status: 502 });
    }
    return Response.json({ ok: true, linkMessage: linkMessage || DEFAULT_LINK_MESSAGE, isDefault: !linkMessage });
  } catch (error) {
    console.error("branch settings update failed", error);
    return Response.json({ error: "안내 메시지를 저장하는 중 오류가 발생했습니다." }, { status: 500 });
  }
}

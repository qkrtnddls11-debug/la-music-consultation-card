import { hasAdminSession } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase-server";
import type { ConsultationStatus } from "@/lib/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await hasAdminSession())) {
      return Response.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;
    const body = (await request.json()) as { status?: ConsultationStatus };
    if (body.status !== "상담" && body.status !== "등록") {
      return Response.json({ error: "상태값이 올바르지 않습니다." }, { status: 400 });
    }

    const { error } = await createAdminSupabase()
      .from("consultations")
      .update({ status: body.status })
      .eq("id", id);

    if (error) {
      console.error("consultation status update failed", {
        code: error.code,
        message: error.message,
      });
      return Response.json({ error: "상태를 변경하지 못했습니다." }, { status: 502 });
    }

    return Response.json(
      { ok: true },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("consultation status route failed", error);
    return Response.json({ error: "상태 변경 중 오류가 발생했습니다." }, { status: 500 });
  }
}

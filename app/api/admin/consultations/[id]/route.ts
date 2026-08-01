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
    const body = (await request.json()) as { status?: ConsultationStatus; admin_memo?: string };
    const hasStatus = body.status === "상담" || body.status === "등록";
    const hasMemo = typeof body.admin_memo === "string";
    if (!hasStatus && !hasMemo) {
      return Response.json({ error: "상태값이 올바르지 않습니다." }, { status: 400 });
    }

    const supabase = createAdminSupabase();
    if (hasStatus && body.status === "등록") {
      const { data: consent, error: consentError } = await supabase
        .from("consents")
        .select("id")
        .eq("consultation_id", id)
        .maybeSingle();
      if (consentError) {
        return Response.json({ error: "동의서 완료 여부를 확인하지 못했습니다." }, { status: 502 });
      }
      if (!consent) {
        return Response.json({ error: "동의서와 전자서명을 먼저 완료해 주세요." }, { status: 409 });
      }
    }

    const updates: { status?: ConsultationStatus; admin_memo?: string } = {};
    if (hasStatus) updates.status = body.status;
    if (hasMemo) updates.admin_memo = body.admin_memo!.trim().slice(0, 4000);
    const { error } = await supabase
      .from("consultations")
      .update(updates)
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

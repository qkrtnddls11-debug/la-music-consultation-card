import { hasAdminSession } from "@/lib/admin-auth";
import { requestConsultationSummary } from "@/lib/crm-assist";
import { createAdminSupabase } from "@/lib/supabase-server";
import type { ConsultationRecord } from "@/lib/types";

// 상담 카드 AI 요약을 (다시) 만든다. 제출 때 요약이 안 붙었거나 카드가 바뀌었을 때 관리자가 누른다.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await hasAdminSession())) return Response.json({ error: "인증이 필요합니다." }, { status: 401 });
    const { id } = await params;
    const supabase = createAdminSupabase();
    const { data: record, error } = await supabase.from("consultations").select("*").eq("id", id).maybeSingle();
    if (error) return Response.json({ error: "상담 기록을 불러오지 못했습니다." }, { status: 502 });
    if (!record) return Response.json({ error: "상담 기록을 찾지 못했습니다." }, { status: 404 });

    const consultation = record as ConsultationRecord;
    const { data: reservation } = consultation.reservation_id
      ? await supabase.from("reservations").select("learning_goal,schedule_note").eq("id", consultation.reservation_id).maybeSingle()
      : { data: null };
    const summary = await requestConsultationSummary(consultation, reservation);
    if (!summary) return Response.json({ error: "AI 요약을 받지 못했습니다. 잠시 후 다시 눌러주세요." }, { status: 502 });

    const { error: saveError } = await supabase.from("consultations").update({ ai_summary: summary }).eq("id", id);
    if (saveError) {
      console.error("consultation summary save failed", { code: saveError.code, message: saveError.message });
      return Response.json({ error: "요약을 저장하지 못했습니다. (ai_summary 칸을 만드는 SQL 을 실행했는지 확인)" }, { status: 502 });
    }
    return Response.json({ ok: true, ai_summary: summary }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("consultation summary route failed", error);
    return Response.json({ error: "요약을 만드는 중 오류가 발생했습니다." }, { status: 500 });
  }
}

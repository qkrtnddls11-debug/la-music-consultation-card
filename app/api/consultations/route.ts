import { after } from "next/server";
import { hasAdminSession } from "@/lib/admin-auth";
import { normalizeConsultation } from "@/lib/consultation-validation";
import { requestConsultationSummary } from "@/lib/crm-assist";
import { validReservationId } from "@/lib/reservation-validation";
import { createAdminSupabase, createAnonymousSupabase } from "@/lib/supabase-server";
import type { ConsultationInput } from "@/lib/types";

// 제출이 끝난 뒤(응답을 보낸 뒤) AI 요약을 만들어 붙인다. 학생은 기다리지 않고, 요약이 실패해도 제출은 그대로다.
function scheduleSummary(id: string, data: ConsultationInput) {
  after(async () => {
    try {
      const summary = await requestConsultationSummary(data);
      if (!summary) return;
      const { error } = await createAdminSupabase().from("consultations").update({ ai_summary: summary }).eq("id", id);
      if (error) console.error("consultation summary save failed", { code: error.code, message: error.message });
    } catch (error) {
      console.error("consultation summary failed", error instanceof Error ? error.message : error);
    }
  });
}

export async function POST(request: Request) {
  try {
    const validation = normalizeConsultation(await request.json());
    if (!validation.data) {
      return Response.json({ error: validation.error }, { status: 400 });
    }

    const reservationId = validation.data.reservation_id;
    if (reservationId) {
      if (!validReservationId(reservationId) || !(await hasAdminSession())) {
        return Response.json({ error: "예약 연결 권한이 없거나 예약 번호가 올바르지 않습니다." }, { status: 401 });
      }
      const supabase = createAdminSupabase();
      const { data: reservation, error: reservationError } = await supabase.from("reservations").select("id,status,branch_name").eq("id", reservationId).maybeSingle();
      if (reservationError || !reservation) return Response.json({ error: "연결된 예약을 찾지 못했습니다." }, { status: 404 });

      // 지점은 예약의 지점을 그대로 따라간다
      const linkedPayload = {
        ...validation.data,
        branch_name: (reservation as { branch_name?: string | null }).branch_name || validation.data.branch_name,
      };
      const { data: consultation, error: insertError } = await supabase.from("consultations").insert(linkedPayload).select("id").single();
      if (insertError || !consultation) {
        console.error("linked consultation insert failed", { code: insertError?.code, message: insertError?.message });
        return Response.json({ error: insertError?.code === "23505" ? "이미 상담이 완료된 예약입니다." : "상담 카드를 저장하지 못했습니다." }, { status: insertError?.code === "23505" ? 409 : 502 });
      }
      const { error: statusError } = await supabase.from("reservations").update({ status: "상담완료" }).eq("id", reservationId);
      if (statusError) {
        await supabase.from("consultations").delete().eq("id", consultation.id);
        return Response.json({ error: "예약과 상담을 연결하지 못했습니다." }, { status: 502 });
      }
      scheduleSummary(consultation.id, linkedPayload);
      return Response.json({ ok: true, id: consultation.id }, { status: 201, headers: { "Cache-Control": "no-store" } });
    }

    // 익명(링크·태블릿) 제출은 저장된 행을 되읽을 권한이 없어, 서버가 id 를 정해서 넣고 그 id 로 요약을 붙인다.
    const anonymousId = crypto.randomUUID();
    const anonymousPayload = { ...validation.data, reservation_id: undefined };
    const anonymous = createAnonymousSupabase();
    let { error } = await anonymous.from("consultations").insert({ ...anonymousPayload, id: anonymousId });
    let summaryId: string | null = anonymousId;
    if (error && (error.code === "42501" || /permission|column "id"/i.test(error.message))) {
      // 아직 id 입력 권한 SQL 을 안 돌린 상태: 예전 방식으로 저장하고 요약은 붙이지 않는다 (제출이 막히면 안 된다)
      console.error("consultation insert with id refused, retrying without id", { code: error.code, message: error.message });
      ({ error } = await anonymous.from("consultations").insert(anonymousPayload));
      summaryId = null;
    }

    if (error) {
      console.error("consultation insert failed", {
        code: error.code,
        message: error.message,
      });
      return Response.json(
        { error: "저장하지 못했습니다. 잠시 후 다시 눌러 주세요." },
        { status: 502 },
      );
    }

    if (summaryId) scheduleSummary(summaryId, validation.data);
    return Response.json(
      { ok: true },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("consultation route failed", error);
    return Response.json(
      { error: "저장 설정을 확인해 주세요." },
      { status: 500 },
    );
  }
}

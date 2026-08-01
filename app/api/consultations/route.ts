import { hasAdminSession } from "@/lib/admin-auth";
import { normalizeConsultation } from "@/lib/consultation-validation";
import { validReservationId } from "@/lib/reservation-validation";
import { createAdminSupabase, createAnonymousSupabase } from "@/lib/supabase-server";

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
      const { data: reservation, error: reservationError } = await supabase.from("reservations").select("id,status").eq("id", reservationId).maybeSingle();
      if (reservationError || !reservation) return Response.json({ error: "연결된 예약을 찾지 못했습니다." }, { status: 404 });

      const { data: consultation, error: insertError } = await supabase.from("consultations").insert(validation.data).select("id").single();
      if (insertError || !consultation) {
        console.error("linked consultation insert failed", { code: insertError?.code, message: insertError?.message });
        return Response.json({ error: insertError?.code === "23505" ? "이미 상담이 완료된 예약입니다." : "상담 카드를 저장하지 못했습니다." }, { status: insertError?.code === "23505" ? 409 : 502 });
      }
      const { error: statusError } = await supabase.from("reservations").update({ status: "상담완료" }).eq("id", reservationId);
      if (statusError) {
        await supabase.from("consultations").delete().eq("id", consultation.id);
        return Response.json({ error: "예약과 상담을 연결하지 못했습니다." }, { status: 502 });
      }
      return Response.json({ ok: true, id: consultation.id }, { status: 201, headers: { "Cache-Control": "no-store" } });
    }

    const anonymousPayload = { ...validation.data, reservation_id: undefined };
    const { error } = await createAnonymousSupabase().from("consultations").insert(anonymousPayload);

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

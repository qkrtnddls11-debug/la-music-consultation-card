import { hasAdminSession } from "@/lib/admin-auth";
import { normalizeReservationPatch, validReservationId } from "@/lib/reservation-validation";
import { createAdminSupabase } from "@/lib/supabase-server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await hasAdminSession())) return Response.json({ error: "인증이 필요합니다." }, { status: 401 });
    const { id } = await params;
    if (!validReservationId(id)) return Response.json({ error: "예약 번호가 올바르지 않습니다." }, { status: 400 });
    const { data, error } = await createAdminSupabase().from("reservations").select("*").eq("id", id).maybeSingle();
    if (error) return Response.json({ error: "예약을 불러오지 못했습니다." }, { status: 502 });
    if (!data) return Response.json({ error: "예약을 찾지 못했습니다." }, { status: 404 });
    return Response.json(data, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("reservation detail route failed", error);
    return Response.json({ error: "예약을 불러오는 중 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await hasAdminSession())) return Response.json({ error: "인증이 필요합니다." }, { status: 401 });
    const { id } = await params;
    if (!validReservationId(id)) return Response.json({ error: "예약 번호가 올바르지 않습니다." }, { status: 400 });
    const body = await request.json() as Record<string, unknown> & { confirmed_at?: string | null; trial_teacher?: string | null; trial_room?: string | null; trial_slots?: Array<Record<string, unknown>> | null };
    const confirmedAt = typeof body.confirmed_at === "string" && body.confirmed_at ? new Date(body.confirmed_at) : null;
    if (confirmedAt && Number.isNaN(confirmedAt.getTime())) return Response.json({ error: "확정 일시가 올바르지 않습니다." }, { status: 400 });

    // 인적정보(이름·전화·과목 등)만 고치는 요청도 받는다. 보낸 칸만 검사한다.
    const patch = normalizeReservationPatch(body);
    if (patch.error) return Response.json({ error: patch.error }, { status: 400 });

    const supabase = createAdminSupabase();
    const { data: existing } = await supabase.from("reservations").select("status").eq("id", id).maybeSingle();
    if (!existing) return Response.json({ error: "예약을 찾지 못했습니다." }, { status: 404 });
    const updates: Record<string, unknown> = { ...(patch.data || {}) };
    // 배정(확정일시·슬롯)을 보낸 경우에만 확정일시와 상태를 건드린다.
    // 예전에는 이름만 고쳐도 확정일시가 지워져 배정이 날아갔다.
    const touchesSchedule = "confirmed_at" in body || Array.isArray(body.trial_slots) || "trial_teacher" in body || "trial_room" in body;
    if (touchesSchedule) {
      updates.confirmed_at = confirmedAt?.toISOString() ?? null;
      updates.status = existing.status === "상담완료" ? "상담완료" : confirmedAt ? "확정" : "대기";
    }
    if (Object.keys(updates).length === 0) return Response.json({ error: "바꿀 내용이 없습니다." }, { status: 400 });
    if (body.trial_teacher !== undefined) updates.trial_teacher = typeof body.trial_teacher === "string" ? body.trial_teacher.trim().slice(0, 40) || null : null;
    if (body.trial_room !== undefined) updates.trial_room = typeof body.trial_room === "string" ? body.trial_room.trim().slice(0, 40) || null : null;
    if (Array.isArray(body.trial_slots)) {
      updates.trial_slots = body.trial_slots.slice(0, 12).map((slot) => ({
        subject: String(slot?.subject || "").trim().slice(0, 60),
        at: typeof slot?.at === "string" && slot.at ? slot.at : null,
        teacher: String(slot?.teacher || "").trim().slice(0, 40),
        room: String(slot?.room || "").trim().slice(0, 40)
      })).filter((slot) => slot.subject);
    }
    const { data, error } = await supabase.from("reservations").update(updates).eq("id", id).select("*").single();
    if (error) return Response.json({ error: "예약을 저장하지 못했습니다." }, { status: 502 });
    return Response.json(data, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("reservation update route failed", error);
    return Response.json({ error: "예약을 수정하는 중 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await hasAdminSession())) return Response.json({ error: "인증이 필요합니다." }, { status: 401 });
    const { id } = await params;
    if (!validReservationId(id)) return Response.json({ error: "예약 번호가 올바르지 않습니다." }, { status: 400 });

    const { data, error } = await createAdminSupabase()
      .from("reservations")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("reservation delete failed", { code: error.code, message: error.message });
      return Response.json({ error: "예약을 삭제하지 못했습니다." }, { status: 502 });
    }
    if (!data) return Response.json({ error: "예약을 찾지 못했습니다." }, { status: 404 });
    return Response.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("reservation delete route failed", error);
    return Response.json({ error: "예약 삭제 중 오류가 발생했습니다." }, { status: 500 });
  }
}
